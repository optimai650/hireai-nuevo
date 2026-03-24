import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const positionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  department: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional(),
  status: z.enum(['open', 'closed', 'paused']).optional(),
  salary_min: z.number().int().min(0).optional(),
  salary_max: z.number().int().min(0).optional(),
});

const updatePositionSchema = positionSchema.partial();

// GET /positions
router.get('/', (req: Request, res: Response) => {
  const positions = db
    .prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM candidates c WHERE c.position_id = p.id) as candidate_count,
        (SELECT AVG(c.overall_score) FROM candidates c WHERE c.position_id = p.id) as avg_score
      FROM positions p
      WHERE p.company_id = ?
      ORDER BY p.created_at DESC
    `)
    .all(req.user!.companyId);

  return res.json(positions);
});

// POST /positions
router.post('/', requireRole('admin', 'recruiter'), (req: Request, res: Response) => {
  const parsed = positionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const { title, department, description, requirements, location, type, status, salary_min, salary_max } = parsed.data;

  db.prepare(`
    INSERT INTO positions (id, company_id, title, department, description, requirements, location, type, status, salary_min, salary_max, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.user!.companyId,
    title,
    department || null,
    description || null,
    requirements || null,
    location || null,
    type || 'full-time',
    status || 'open',
    salary_min ?? null,
    salary_max ?? null,
    req.user!.userId,
    now,
    now
  );

  const position = db
    .prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM candidates c WHERE c.position_id = p.id) as candidate_count,
        (SELECT AVG(c.overall_score) FROM candidates c WHERE c.position_id = p.id) as avg_score
      FROM positions p WHERE p.id = ?
    `)
    .get(id);

  return res.status(201).json(position);
});

// GET /positions/:id
router.get('/:id', (req: Request, res: Response) => {
  const position = db
    .prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM candidates c WHERE c.position_id = p.id) as candidate_count,
        (SELECT AVG(c.overall_score) FROM candidates c WHERE c.position_id = p.id) as avg_score
      FROM positions p
      WHERE p.id = ? AND p.company_id = ?
    `)
    .get(req.params.id, req.user!.companyId);

  if (!position) return res.status(404).json({ error: 'Position not found' });

  const candidates = db
    .prepare('SELECT id, name, email, status, overall_score, created_at FROM candidates WHERE position_id = ? ORDER BY overall_score DESC')
    .all(req.params.id);

  return res.json({ ...position as object, candidates });
});

// PATCH /positions/:id
router.patch('/:id', requireRole('admin', 'recruiter'), (req: Request, res: Response) => {
  const parsed = updatePositionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const existing = db
    .prepare('SELECT id FROM positions WHERE id = ? AND company_id = ?')
    .get(req.params.id, req.user!.companyId);
  if (!existing) return res.status(404).json({ error: 'Position not found' });

  const data = parsed.data;
  const updates: string[] = [];
  const values: unknown[] = [];

  const fields = ['title', 'department', 'description', 'requirements', 'location', 'type', 'status', 'salary_min', 'salary_max'] as const;
  for (const field of fields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  updates.push('updated_at = ?');
  values.push(new Date().toISOString(), req.params.id);

  db.prepare(`UPDATE positions SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const position = db
    .prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM candidates c WHERE c.position_id = p.id) as candidate_count,
        (SELECT AVG(c.overall_score) FROM candidates c WHERE c.position_id = p.id) as avg_score
      FROM positions p WHERE p.id = ?
    `)
    .get(req.params.id);

  return res.json(position);
});

// DELETE /positions/:id
router.delete('/:id', requireRole('admin'), (req: Request, res: Response) => {
  const existing = db
    .prepare('SELECT id FROM positions WHERE id = ? AND company_id = ?')
    .get(req.params.id, req.user!.companyId);
  if (!existing) return res.status(404).json({ error: 'Position not found' });

  db.prepare('DELETE FROM positions WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Position deleted successfully' });
});

export default router;
