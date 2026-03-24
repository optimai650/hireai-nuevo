import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { runMigrations } from './db/migrations/001_initial';

// Validate required env vars
const required = ['JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// Static uploads (access control handled at route level)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Run migrations on startup
runMigrations();

// Routes
import authRouter from './routes/auth';
import candidatesRouter from './routes/candidates';
import positionsRouter from './routes/positions';
import interviewsRouter from './routes/interviews';
import analyticsRouter from './routes/analytics';

app.use('/api/auth', authRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/positions', positionsRouter);
app.use('/api/interviews', interviewsRouter);
app.use('/api/analytics', analyticsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
