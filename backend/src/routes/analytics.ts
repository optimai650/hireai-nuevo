import { Router, Request, Response } from 'express';
import { db } from '../db/client';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /analytics/overview
router.get('/overview', (req: Request, res: Response) => {
  const cid = req.user!.companyId;

  const totalCandidates = (db.prepare('SELECT COUNT(*) as c FROM candidates WHERE company_id = ?').get(cid) as { c: number }).c;
  const totalPositions = (db.prepare('SELECT COUNT(*) as c FROM positions WHERE company_id = ?').get(cid) as { c: number }).c;
  const activePositions = (db.prepare("SELECT COUNT(*) as c FROM positions WHERE company_id = ? AND status = 'open'").get(cid) as { c: number }).c;
  const avgRow = db.prepare('SELECT AVG(overall_score) as avg FROM candidates WHERE company_id = ?').get(cid) as { avg: number | null };
  const averageScore = avgRow.avg ? Math.round(avgRow.avg * 10) / 10 : 0;
  const shortlistedCandidates = (db.prepare("SELECT COUNT(*) as c FROM candidates WHERE company_id = ? AND status = 'shortlisted'").get(cid) as { c: number }).c;
  const totalInterviews = (db.prepare('SELECT COUNT(*) as c FROM interviews WHERE company_id = ?').get(cid) as { c: number }).c;
  const completedInterviews = (db.prepare("SELECT COUNT(*) as c FROM interviews WHERE company_id = ? AND status = 'completed'").get(cid) as { c: number }).c;
  const interviewCompletionRate = totalInterviews > 0 ? Math.round((completedInterviews / totalInterviews) * 100) : 0;

  return res.json({
    totalCandidates,
    totalPositions,
    activePositions,
    averageScore,
    shortlistedCandidates,
    totalInterviews,
    completedInterviews,
    interviewCompletionRate,
  });
});

// GET /analytics/candidates-by-status
router.get('/candidates-by-status', (req: Request, res: Response) => {
  const data = db
    .prepare('SELECT status, COUNT(*) as count FROM candidates WHERE company_id = ? GROUP BY status ORDER BY count DESC')
    .all(req.user!.companyId);

  return res.json(data);
});

// GET /analytics/candidates-over-time
router.get('/candidates-over-time', (req: Request, res: Response) => {
  const data = db
    .prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as count,
        ROUND(AVG(overall_score), 1) as avg_score
      FROM candidates
      WHERE company_id = ?
        AND created_at >= datetime('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `)
    .all(req.user!.companyId);

  return res.json(data);
});

// GET /analytics/top-skills
router.get('/top-skills', (req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT extracted_skills FROM candidates WHERE company_id = ? AND extracted_skills IS NOT NULL AND extracted_skills != ""')
    .all(req.user!.companyId) as { extracted_skills: string }[];

  // Count skill occurrences
  const skillCount: Record<string, number> = {};
  for (const row of rows) {
    const skills = row.extracted_skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    for (const skill of skills) {
      skillCount[skill] = (skillCount[skill] || 0) + 1;
    }
  }

  const topSkills = Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  return res.json(topSkills);
});

// GET /analytics/score-distribution
router.get('/score-distribution', (req: Request, res: Response) => {
  const ranges = [
    { label: '0-20', min: 0, max: 20 },
    { label: '20-40', min: 20, max: 40 },
    { label: '40-60', min: 40, max: 60 },
    { label: '60-80', min: 60, max: 80 },
    { label: '80-100', min: 80, max: 101 },
  ];

  const distribution = ranges.map(range => {
    const row = db
      .prepare(`
        SELECT COUNT(*) as count FROM candidates
        WHERE company_id = ? AND overall_score >= ? AND overall_score < ?
      `)
      .get(req.user!.companyId, range.min, range.max) as { count: number };
    return { range: range.label, count: row.count };
  });

  return res.json(distribution);
});

export default router;
