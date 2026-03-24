import { db } from '../client';

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','recruiter')) DEFAULT 'recruiter',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      title TEXT NOT NULL,
      department TEXT,
      description TEXT,
      requirements TEXT,
      location TEXT,
      type TEXT CHECK(type IN ('full-time','part-time','contract','internship')) DEFAULT 'full-time',
      status TEXT CHECK(status IN ('open','closed','paused')) DEFAULT 'open',
      salary_min INTEGER,
      salary_max INTEGER,
      created_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      position_id TEXT REFERENCES positions(id),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      location TEXT,
      cv_filename TEXT,
      cv_path TEXT,
      cv_text TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','shortlisted','interview_scheduled','interview_completed','offer_extended','hired','rejected')),
      overall_score REAL DEFAULT 0,
      experience_score REAL DEFAULT 0,
      skills_score REAL DEFAULT 0,
      education_score REAL DEFAULT 0,
      cultural_fit_score REAL DEFAULT 0,
      years_experience REAL DEFAULT 0,
      ai_summary TEXT,
      ai_strengths TEXT,
      ai_concerns TEXT,
      extracted_skills TEXT,
      extracted_experience TEXT,
      extracted_education TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      candidate_id TEXT NOT NULL REFERENCES candidates(id),
      position_id TEXT REFERENCES positions(id),
      type TEXT DEFAULT 'general' CHECK(type IN ('general','technical','behavioral','cultural')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','sent','in_progress','completed','expired')),
      public_token TEXT UNIQUE,
      expires_at TEXT,
      completed_at TEXT,
      score REAL,
      ai_evaluation TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interview_questions (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      type TEXT DEFAULT 'open',
      expected_keywords TEXT,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS interview_responses (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
      response_text TEXT,
      response_score REAL,
      ai_feedback TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_candidates_company ON candidates(company_id);
    CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position_id);
    CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
    CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_interviews_token ON interviews(public_token);
  `);

  console.log('Migrations ran successfully');
}
