import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { db } from '../db/client';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters'),
  domain: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateMeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const updateCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  domain: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

function signToken(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as jwt.SignOptions);
}

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { companyName, email, password, name, domain } = parsed.data;

  try {
    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const companyId = uuidv4();
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    const insertCompany = db.transaction(() => {
      db.prepare(`
        INSERT INTO companies (id, name, domain, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(companyId, companyName, domain || null, now, now);

      db.prepare(`
        INSERT INTO users (id, company_id, email, password_hash, name, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'admin', ?, ?)
      `).run(userId, companyId, email, passwordHash, name, now, now);
    });

    insertCompany();

    const token = signToken({ userId, email, companyId, role: 'admin' });

    return res.status(201).json({
      token,
      user: { id: userId, name, email, role: 'admin', companyId },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;

  try {
    const user = db
      .prepare('SELECT id, company_id, email, password_hash, name, role FROM users WHERE email = ?')
      .get(email) as { id: string; company_id: string; email: string; password_hash: string; name: string; role: string } | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      companyId: user.company_id,
      role: user.role,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.company_id,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/me
router.get('/me', authenticate, (req: Request, res: Response) => {
  const user = db
    .prepare('SELECT id, name, email, role, company_id FROM users WHERE id = ?')
    .get(req.user!.userId) as { id: string; name: string; email: string; role: string; company_id: string } | undefined;

  if (!user) return res.status(404).json({ error: 'User not found' });

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.company_id,
  });
});

// PATCH /auth/me
router.patch('/me', authenticate, (req: Request, res: Response) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { name } = parsed.data;
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(name, now, req.user!.userId);

  const user = db
    .prepare('SELECT id, name, email, role, company_id FROM users WHERE id = ?')
    .get(req.user!.userId) as { id: string; name: string; email: string; role: string; company_id: string };

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.company_id,
  });
});

// GET /auth/company
router.get('/company', authenticate, (req: Request, res: Response) => {
  const company = db
    .prepare('SELECT id, name, domain, created_at FROM companies WHERE id = ?')
    .get(req.user!.companyId) as { id: string; name: string; domain: string | null; created_at: string } | undefined;

  if (!company) return res.status(404).json({ error: 'Company not found' });

  return res.json(company);
});

// PATCH /auth/company
router.patch('/company', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  const parsed = updateCompanySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { name, domain } = parsed.data;
  const now = new Date().toISOString();

  db.prepare('UPDATE companies SET name = ?, domain = ?, updated_at = ? WHERE id = ?').run(
    name,
    domain || null,
    now,
    req.user!.companyId
  );

  const company = db
    .prepare('SELECT id, name, domain, created_at FROM companies WHERE id = ?')
    .get(req.user!.companyId);

  return res.json(company);
});

// POST /auth/change-password
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const user = db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .get(req.user!.userId) as { password_hash: string } | undefined;

    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
      newHash,
      now,
      req.user!.userId
    );

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
