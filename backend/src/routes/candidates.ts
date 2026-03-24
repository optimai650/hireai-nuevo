import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';
import { uploadCV, validatePDF } from '../middleware/upload';
import { analyzeCV } from '../services/ai';

const router = Router();

// All routes require authentication
router.use(authenticate);

const VALID_SORT = new Set(['overall_score', 'created_at', 'name']);

const CANDIDATE_STATUSES = [
  'new', 'reviewing', 'shortlisted', 'interview_scheduled',
  'interview_completed', 'offer_extended', 'hired', 'rejected'
] as const;

const updateCandidateSchema = z.object({
  status: z.enum(CANDIDATE_STATUSES).optional(),
  notes: z.string().optional(),
});

// Sanitize a field value for CSV injection
function sanitizeCSV(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(str)) return `'${str}`;
  return str;
}

function buildCandidateFilters(
  query: Record<string, string | undefined>,
  companyId: string
): { where: string; params: unknown[] } {
  const conditions: string[] = ['c.company_id = ?'];
  const params: unknown[] = [companyId];

  if (query.status) {
    conditions.push('c.status = ?');
    params.push(query.status);
  }
  if (query.positionId) {
    conditions.push('c.position_id = ?');
    params.push(query.positionId);
  }
  if (query.minScore !== undefined) {
    conditions.push('c.overall_score >= ?');
    params.push(Number(query.minScore));
  }
  if (query.maxScore !== undefined) {
    conditions.push('c.overall_score <= ?');
    params.push(Number(query.maxScore));
  }
  if (query.search) {
    conditions.push('(c.name LIKE ? OR c.email LIKE ?)');
    params.push(`%${query.search}%`, `%${query.search}%`);
  }

  return { where: conditions.join(' AND '), params };
}

// GET /candidates
router.get('/', (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const page = Math.max(1, parseInt(q.page || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize || '20')));
  const sortBy = VALID_SORT.has(q.sortBy || '') ? q.sortBy! : 'created_at';
  const order = q.order === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * pageSize;

  const { where, params } = buildCandidateFilters(q, req.user!.companyId);

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM candidates c WHERE ${where}`).get(...params) as { cnt: number }).cnt;

  const data = db
    .prepare(
      `SELECT c.id, c.company_id, c.position_id, c.name, c.email, c.phone, c.location,
              c.cv_filename, c.status, c.overall_score, c.experience_score, c.skills_score,
              c.education_score, c.cultural_fit_score, c.years_experience,
              c.ai_summary, c.ai_strengths, c.ai_concerns, c.extracted_skills,
              c.extracted_experience, c.extracted_education, c.notes,
              c.created_at, c.updated_at, p.title as position_title
       FROM candidates c
       LEFT JOIN positions p ON c.position_id = p.id
       WHERE ${where}
       ORDER BY c.${sortBy} ${order}
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);

  return res.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// GET /candidates/export/csv — must be BEFORE /:id
router.get('/export/csv', (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const { where, params } = buildCandidateFilters(q, req.user!.companyId);

  const rows = db
    .prepare(
      `SELECT c.id, c.company_id, c.position_id, c.name, c.email, c.phone, c.location,
              c.cv_filename, c.status, c.overall_score, c.experience_score, c.skills_score,
              c.education_score, c.cultural_fit_score, c.years_experience,
              c.ai_summary, c.ai_strengths, c.ai_concerns, c.extracted_skills,
              c.extracted_experience, c.extracted_education, c.notes,
              c.created_at, c.updated_at, p.title as position_title
       FROM candidates c
       LEFT JOIN positions p ON c.position_id = p.id
       WHERE ${where}
       ORDER BY c.created_at DESC`
    )
    .all(...params) as Record<string, unknown>[];

  const headers = [
    'id', 'name', 'email', 'phone', 'location', 'status',
    'overall_score', 'experience_score', 'skills_score', 'education_score', 'cultural_fit_score',
    'years_experience', 'position_title', 'extracted_skills', 'ai_summary', 'notes', 'created_at'
  ];

  const csvLines: string[] = [headers.join(',')];
  for (const row of rows) {
    const line = headers.map(h => `"${sanitizeCSV(row[h]).replace(/"/g, '""')}"`).join(',');
    csvLines.push(line);
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="candidates.csv"');
  return res.send(csvLines.join('\n'));
});

// POST /candidates
router.post('/', uploadCV.single('cv'), validatePDF, async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CV file (PDF) is required' });
  }

  const { positionId, notes } = req.body as { positionId?: string; notes?: string };

  try {
    // Validate positionId if provided
    let validatedPosition: { id: string; title: string; requirements: string | null } | undefined;
    if (positionId) {
      validatedPosition = db
        .prepare('SELECT id, title, requirements FROM positions WHERE id = ? AND company_id = ?')
        .get(positionId, req.user!.companyId) as { id: string; title: string; requirements: string | null } | undefined;
      if (!validatedPosition) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Position not found' });
      }
    }

    // Extract text from PDF (basic approach: read buffer and extract printable text)
    const buffer = fs.readFileSync(req.file.path);
    let cvText = '';
    try {
      // Extract readable ASCII/UTF-8 text from PDF binary
      const raw = buffer.toString('latin1');
      // Extract text between BT/ET markers (PDF text operators) or just grab printable chars
      const matches = raw.match(/\(([^)]{1,500})\)/g) || [];
      cvText = matches
        .map(m => m.slice(1, -1))
        .join(' ')
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Fallback: grab all printable characters if PDF text extraction yields too little
      if (cvText.length < 100) {
        cvText = raw
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 10000);
      }
    } catch {
      cvText = 'Could not extract text from PDF';
    }

    // Get position info for AI analysis (reuse result from validation query above)
    const positionTitle: string | undefined = validatedPosition?.title;
    const positionRequirements: string | undefined = validatedPosition?.requirements || undefined;

    // Analyze CV with AI
    const analysis = await analyzeCV(cvText, positionTitle, positionRequirements);

    const candidateId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO candidates (
        id, company_id, position_id, name, email, phone, location,
        cv_filename, cv_path, cv_text, status,
        overall_score, experience_score, skills_score, education_score, cultural_fit_score,
        years_experience, ai_summary, ai_strengths, ai_concerns,
        extracted_skills, extracted_experience, extracted_education,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      candidateId,
      req.user!.companyId,
      positionId || null,
      analysis.name || req.file.originalname,
      analysis.email || null,
      analysis.phone || null,
      analysis.location || null,
      req.file.originalname,
      req.file.path,
      cvText,
      analysis.overall_score,
      analysis.experience_score,
      analysis.skills_score,
      analysis.education_score,
      analysis.cultural_fit_score,
      analysis.years_experience,
      analysis.ai_summary,
      analysis.ai_strengths,
      analysis.ai_concerns,
      analysis.extracted_skills,
      analysis.extracted_experience,
      analysis.extracted_education,
      notes || null,
      now,
      now
    );

    const candidate = db.prepare(`
      SELECT id, company_id, position_id, name, email, phone, location, cv_filename, status,
             overall_score, experience_score, skills_score, education_score, cultural_fit_score,
             years_experience, ai_summary, ai_strengths, ai_concerns, extracted_skills,
             extracted_experience, extracted_education, notes, created_at, updated_at
      FROM candidates WHERE id = ?
    `).get(candidateId);
    return res.status(201).json(candidate);
  } catch (err) {
    console.error('Create candidate error:', err);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /candidates/:id/cv — must be BEFORE /:id
router.get('/:id/cv', (req: Request, res: Response) => {
  const candidate = db
    .prepare('SELECT cv_path, cv_filename FROM candidates WHERE id = ? AND company_id = ?')
    .get(req.params.id, req.user!.companyId) as { cv_path: string | null; cv_filename: string | null } | undefined;
  if (!candidate || !candidate.cv_path) return res.status(404).json({ error: 'CV not found' });
  if (!fs.existsSync(candidate.cv_path)) return res.status(404).json({ error: 'CV file not found on disk' });
  res.setHeader('Content-Type', 'application/pdf');
  const safeName = (candidate.cv_filename || 'cv.pdf').replace(/[^\w.\-_ ]/g, '_');
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  return res.sendFile(path.resolve(candidate.cv_path));
});

// GET /candidates/:id
router.get('/:id', (req: Request, res: Response) => {
  const candidate = db
    .prepare(`
      SELECT c.id, c.company_id, c.position_id, c.name, c.email, c.phone, c.location,
             c.cv_filename, c.status, c.overall_score, c.experience_score, c.skills_score,
             c.education_score, c.cultural_fit_score, c.years_experience,
             c.ai_summary, c.ai_strengths, c.ai_concerns, c.extracted_skills,
             c.extracted_experience, c.extracted_education, c.notes,
             c.created_at, c.updated_at, p.title as position_title
      FROM candidates c
      LEFT JOIN positions p ON c.position_id = p.id
      WHERE c.id = ? AND c.company_id = ?
    `)
    .get(req.params.id, req.user!.companyId);

  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const interviews = db
    .prepare(`
      SELECT i.*, COUNT(iq.id) as question_count
      FROM interviews i
      LEFT JOIN interview_questions iq ON iq.interview_id = i.id
      WHERE i.candidate_id = ?
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `)
    .all(req.params.id);

  return res.json({ ...candidate as object, interviews });
});

// PATCH /candidates/:id
router.patch('/:id', (req: Request, res: Response) => {
  const parsed = updateCandidateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const existing = db
    .prepare('SELECT id FROM candidates WHERE id = ? AND company_id = ?')
    .get(req.params.id, req.user!.companyId);
  if (!existing) return res.status(404).json({ error: 'Candidate not found' });

  const updates: string[] = [];
  const values: unknown[] = [];

  if (parsed.data.status !== undefined) {
    updates.push('status = ?');
    values.push(parsed.data.status);
  }
  if (parsed.data.notes !== undefined) {
    updates.push('notes = ?');
    values.push(parsed.data.notes);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(req.params.id);

  db.prepare(`UPDATE candidates SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const candidate = db.prepare(`
    SELECT id, company_id, position_id, name, email, phone, location, cv_filename, status,
           overall_score, experience_score, skills_score, education_score, cultural_fit_score,
           years_experience, ai_summary, ai_strengths, ai_concerns, extracted_skills,
           extracted_experience, extracted_education, notes, created_at, updated_at
    FROM candidates WHERE id = ?
  `).get(req.params.id);
  return res.json(candidate);
});

// DELETE /candidates/:id
router.delete('/:id', (req: Request, res: Response) => {
  const existing = db
    .prepare('SELECT id, cv_path FROM candidates WHERE id = ? AND company_id = ?')
    .get(req.params.id, req.user!.companyId) as { id: string; cv_path: string | null } | undefined;

  if (!existing) return res.status(404).json({ error: 'Candidate not found' });

  const deleteAll = db.transaction(() => {
    // Get interview ids for this candidate
    const interviews = db
      .prepare('SELECT id FROM interviews WHERE candidate_id = ?')
      .all(req.params.id) as { id: string }[];

    for (const interview of interviews) {
      db.prepare('DELETE FROM interview_responses WHERE interview_id = ?').run(interview.id);
      db.prepare('DELETE FROM interview_questions WHERE interview_id = ?').run(interview.id);
    }
    db.prepare('DELETE FROM interviews WHERE candidate_id = ?').run(req.params.id);
    db.prepare('DELETE FROM candidates WHERE id = ?').run(req.params.id);
  });

  deleteAll();

  // Delete CV file
  if (existing.cv_path) {
    try { fs.unlinkSync(existing.cv_path); } catch { /* ignore */ }
  }

  return res.json({ message: 'Candidate deleted successfully' });
});

export default router;
