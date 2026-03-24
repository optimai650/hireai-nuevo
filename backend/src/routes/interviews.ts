import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { db } from '../db/client';
import { authenticate, requireRole } from '../middleware/auth';
import { generateInterviewQuestions, evaluateResponse, evaluateInterview } from '../services/ai';

const router = Router();

const generateSchema = z.object({
  candidateId: z.string().uuid('Invalid candidate ID'),
  type: z.enum(['general', 'technical', 'behavioral', 'cultural']).default('general'),
  numQuestions: z.number().int().min(1).max(15).default(8),
});

const respondSchema = z.object({
  token: z.string().min(1),
  responses: z.record(z.string(), z.string().max(5000)),
});

// GET /interviews — requires auth
router.get('/', authenticate, (req: Request, res: Response) => {
  const interviews = db
    .prepare(`
      SELECT i.id, i.company_id, i.candidate_id, i.position_id, i.type, i.status,
             i.expires_at, i.completed_at, i.score, i.ai_evaluation, i.created_at,
             c.name as candidate_name, c.email as candidate_email,
             p.title as position_title
      FROM interviews i
      LEFT JOIN candidates c ON i.candidate_id = c.id
      LEFT JOIN positions p ON i.position_id = p.id
      WHERE i.company_id = ?
      ORDER BY i.created_at DESC
    `)
    .all(req.user!.companyId);

  return res.json(interviews);
});

// POST /interviews/generate — requires auth
router.post('/generate', authenticate, async (req: Request, res: Response) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { candidateId, type, numQuestions } = parsed.data;

  try {
    const candidate = db
      .prepare('SELECT id, name, years_experience, extracted_skills, extracted_experience, extracted_education, ai_summary, position_id FROM candidates WHERE id = ? AND company_id = ?')
      .get(candidateId, req.user!.companyId) as Record<string, unknown> | undefined;

    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    let positionInfo: Record<string, unknown> = {};
    if (candidate.position_id) {
      const pos = db
        .prepare('SELECT title, description, requirements FROM positions WHERE id = ?')
        .get(candidate.position_id as string) as Record<string, unknown> | undefined;
      if (pos) positionInfo = pos;
    }

    const candidateInfo = {
      name: candidate.name,
      years_experience: candidate.years_experience,
      extracted_skills: candidate.extracted_skills,
      extracted_experience: candidate.extracted_experience,
      extracted_education: candidate.extracted_education,
      ai_summary: candidate.ai_summary,
    };

    const questions = await generateInterviewQuestions(candidateInfo, positionInfo, type, numQuestions);

    if (!questions || questions.length === 0) {
      return res.status(503).json({
        error: 'AI service unavailable. Could not generate interview questions. Please try again.',
      });
    }

    const interviewId = uuidv4();
    const publicToken = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const createInterview = db.transaction(() => {
      db.prepare(`
        INSERT INTO interviews (id, company_id, candidate_id, position_id, type, status, public_token, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      `).run(
        interviewId,
        req.user!.companyId,
        candidateId,
        candidate.position_id || null,
        type,
        publicToken,
        expiresAt,
        now
      );

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        db.prepare(`
          INSERT INTO interview_questions (id, interview_id, question, type, expected_keywords, order_index)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), interviewId, q.question, q.type || 'open', q.expected_keywords || '', i);
      }
    });

    createInterview();

    const interview = db.prepare(`SELECT id, candidate_id, position_id, type, status, public_token, expires_at, score, ai_evaluation, created_at FROM interviews WHERE id = ?`).get(interviewId);
    const createdQuestions = db
      .prepare(`SELECT id, interview_id, question, type, expected_keywords, order_index FROM interview_questions WHERE interview_id = ? ORDER BY order_index`)
      .all(interviewId);

    return res.status(201).json({ ...interview as object, questions: createdQuestions });
  } catch (err) {
    console.error('Generate interview error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /interviews/public/:token — no auth
router.get('/public/:token', (req: Request, res: Response) => {
  const interview = db
    .prepare(`
      SELECT i.id, i.type, i.status, i.expires_at,
        c.name as candidate_name, p.title as position_title
      FROM interviews i
      JOIN candidates c ON i.candidate_id = c.id
      LEFT JOIN positions p ON i.position_id = p.id
      WHERE i.public_token = ?
    `)
    .get(req.params.token) as Record<string, unknown> | undefined;

  if (!interview) return res.status(404).json({ error: 'Interview not found' });

  // Check expiry
  if (interview.expires_at && new Date(interview.expires_at as string) < new Date()) {
    return res.status(410).json({ error: 'This interview link has expired' });
  }

  if (interview.status === 'completed') {
    return res.status(410).json({ error: 'This interview has already been completed' });
  }

  // Return questions WITHOUT expected_keywords
  const questions = db
    .prepare(`
      SELECT id, question, type, order_index
      FROM interview_questions
      WHERE interview_id = ?
      ORDER BY order_index
    `)
    .all(interview.id as string);

  return res.json({ ...interview, questions });
});

const respondLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /interviews/:id/respond — no auth, uses public_token
router.post('/:id/respond', respondLimiter, async (req: Request, res: Response) => {
  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { token, responses } = parsed.data;

  try {
    const interview = db
      .prepare('SELECT id, candidate_id, position_id, type, status, public_token, expires_at, score, ai_evaluation, created_at FROM interviews WHERE id = ? AND public_token = ?')
      .get(req.params.id, token) as Record<string, unknown> | undefined;

    if (!interview) return res.status(404).json({ error: 'Interview not found or invalid token' });

    if (interview.expires_at && new Date(interview.expires_at as string) < new Date()) {
      return res.status(410).json({ error: 'Interview link has expired' });
    }

    if (interview.status === 'completed') {
      return res.status(409).json({ error: 'Interview already completed' });
    }

    const questions = db
      .prepare('SELECT id, interview_id, question, type, expected_keywords, order_index FROM interview_questions WHERE interview_id = ? ORDER BY order_index')
      .all(interview.id as string) as { id: string; question: string; expected_keywords: string }[];

    // Evaluate each response with AI
    const evaluatedResponses: { questionId: string; text: string; score: number; feedback: string }[] = [];
    for (const q of questions) {
      const responseText = responses[q.id] || '';
      const { score, feedback } = await evaluateResponse(q.question, q.expected_keywords || '', responseText);
      evaluatedResponses.push({ questionId: q.id, text: responseText, score, feedback });
    }

    // Evaluate overall interview
    const overallEval = await evaluateInterview(
      questions,
      evaluatedResponses.map(r => ({ response_text: r.text, response_score: r.score }))
    );

    const now = new Date().toISOString();

    const saveResponses = db.transaction(() => {
      for (const r of evaluatedResponses) {
        db.prepare(`
          INSERT INTO interview_responses (id, interview_id, question_id, response_text, response_score, ai_feedback, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), interview.id, r.questionId, r.text, r.score, r.feedback, now);
      }

      db.prepare(`
        UPDATE interviews SET status = 'completed', completed_at = ?, score = ?, ai_evaluation = ?
        WHERE id = ?
      `).run(now, overallEval.score, overallEval.evaluation, interview.id);
    });

    saveResponses();

    return res.json({
      message: 'Interview completed successfully',
      score: overallEval.score,
      evaluation: overallEval.evaluation,
    });
  } catch (err) {
    console.error('Interview respond error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /interviews/:id — requires auth
router.get('/:id', authenticate, (req: Request, res: Response) => {
  const interview = db
    .prepare(`
      SELECT i.id, i.company_id, i.candidate_id, i.position_id, i.type, i.status,
             i.expires_at, i.completed_at, i.score, i.ai_evaluation, i.created_at,
             c.name as candidate_name, c.email as candidate_email,
             p.title as position_title
      FROM interviews i
      LEFT JOIN candidates c ON i.candidate_id = c.id
      LEFT JOIN positions p ON i.position_id = p.id
      WHERE i.id = ? AND i.company_id = ?
    `)
    .get(req.params.id, req.user!.companyId) as Record<string, unknown> | undefined;

  if (!interview) return res.status(404).json({ error: 'Interview not found' });

  const questions = db
    .prepare('SELECT id, interview_id, question, type, expected_keywords, order_index FROM interview_questions WHERE interview_id = ? ORDER BY order_index')
    .all(req.params.id) as { id: string }[];

  const questionsWithResponses = questions.map(q => {
    const response = db
      .prepare('SELECT id, interview_id, question_id, response_text, response_score, ai_feedback, created_at FROM interview_responses WHERE interview_id = ? AND question_id = ?')
      .get(req.params.id, q.id);
    return { ...q, response: response || null };
  });

  return res.json({ ...interview, questions: questionsWithResponses });
});

// DELETE /interviews/:id — requires auth + role
router.delete('/:id', authenticate, requireRole('admin', 'recruiter'), (req: Request, res: Response) => {
  const existing = db
    .prepare('SELECT id FROM interviews WHERE id = ? AND company_id = ?')
    .get(req.params.id, req.user!.companyId);
  if (!existing) return res.status(404).json({ error: 'Interview not found' });

  db.transaction(() => {
    db.prepare('DELETE FROM interview_responses WHERE interview_id = ?').run(req.params.id);
    db.prepare('DELETE FROM interview_questions WHERE interview_id = ?').run(req.params.id);
    db.prepare('DELETE FROM interviews WHERE id = ?').run(req.params.id);
  })();

  return res.json({ message: 'Interview deleted successfully' });
});

export default router;
