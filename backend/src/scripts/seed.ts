import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client';
import { runMigrations } from '../db/migrations/001_initial';

async function seed() {
  runMigrations();

  const now = new Date().toISOString();

  // Check if already seeded
  const existing = db.prepare("SELECT id FROM companies WHERE name = 'Acme Corp'").get();
  if (existing) {
    console.log('Database already seeded. Skipping.');
    process.exit(0);
  }

  // Company
  const companyId = uuidv4();
  db.prepare(`
    INSERT INTO companies (id, name, domain, created_at, updated_at)
    VALUES (?, 'Acme Corp', 'acme.com', ?, ?)
  `).run(companyId, now, now);

  // Users
  const adminId = uuidv4();
  const recruiterId = uuidv4();
  const adminHash = await bcrypt.hash('Admin1234!', 12);
  const recruiterHash = await bcrypt.hash('Recruiter1234!', 12);

  db.prepare(`
    INSERT INTO users (id, company_id, email, password_hash, name, role, created_at, updated_at)
    VALUES (?, ?, 'admin@acme.com', ?, 'Alice Admin', 'admin', ?, ?)
  `).run(adminId, companyId, adminHash, now, now);

  db.prepare(`
    INSERT INTO users (id, company_id, email, password_hash, name, role, created_at, updated_at)
    VALUES (?, ?, 'recruiter@acme.com', ?, 'Bob Recruiter', 'recruiter', ?, ?)
  `).run(recruiterId, companyId, recruiterHash, now, now);

  // Positions
  const pos1Id = uuidv4();
  const pos2Id = uuidv4();
  const pos3Id = uuidv4();

  db.prepare(`
    INSERT INTO positions (id, company_id, title, department, description, requirements, location, type, status, salary_min, salary_max, created_by, created_at, updated_at)
    VALUES (?, ?, 'Senior Backend Engineer', 'Engineering', 'Lead backend development for our core platform.', 'Node.js, TypeScript, PostgreSQL, 5+ years experience', 'Remote', 'full-time', 'open', 120000, 160000, ?, ?, ?)
  `).run(pos1Id, companyId, adminId, now, now);

  db.prepare(`
    INSERT INTO positions (id, company_id, title, department, description, requirements, location, type, status, salary_min, salary_max, created_by, created_at, updated_at)
    VALUES (?, ?, 'Frontend Engineer', 'Engineering', 'Build beautiful, performant React applications.', 'React, TypeScript, Tailwind CSS, 3+ years experience', 'New York, NY', 'full-time', 'open', 90000, 130000, ?, ?, ?)
  `).run(pos2Id, companyId, adminId, now, now);

  db.prepare(`
    INSERT INTO positions (id, company_id, title, department, description, requirements, location, type, status, salary_min, salary_max, created_by, created_at, updated_at)
    VALUES (?, ?, 'Product Designer', 'Design', 'Create intuitive user experiences for our SaaS product.', 'Figma, UX research, Design systems, 4+ years experience', 'San Francisco, CA', 'full-time', 'open', 100000, 140000, ?, ?, ?)
  `).run(pos3Id, companyId, adminId, now, now);

  // Candidates
  const candidates = [
    {
      name: 'Carlos Mendez',
      email: 'carlos.mendez@email.com',
      phone: '+1 555-0101',
      location: 'Austin, TX',
      positionId: pos1Id,
      status: 'shortlisted',
      overall_score: 88,
      experience_score: 90,
      skills_score: 85,
      education_score: 80,
      cultural_fit_score: 92,
      years_experience: 7,
      ai_summary: 'Experienced backend engineer with strong Node.js skills and distributed systems knowledge.',
      ai_strengths: 'Node.js, TypeScript, Microservices, PostgreSQL, System Design',
      ai_concerns: 'Limited team lead experience',
      extracted_skills: 'Node.js, TypeScript, PostgreSQL, Redis, Docker, Kubernetes, AWS',
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah.j@techmail.com',
      phone: '+1 555-0202',
      location: 'New York, NY',
      positionId: pos2Id,
      status: 'interview_scheduled',
      overall_score: 76,
      experience_score: 75,
      skills_score: 82,
      education_score: 70,
      cultural_fit_score: 78,
      years_experience: 4,
      ai_summary: 'Frontend developer with solid React experience and a keen eye for design.',
      ai_strengths: 'React, TypeScript, CSS, Performance optimization',
      ai_concerns: 'Limited backend exposure, no SSR experience',
      extracted_skills: 'React, TypeScript, JavaScript, Tailwind CSS, GraphQL, Webpack',
    },
    {
      name: 'Michael Chen',
      email: 'mchen@devbox.io',
      phone: '+1 555-0303',
      location: 'San Francisco, CA',
      positionId: pos1Id,
      status: 'reviewing',
      overall_score: 62,
      experience_score: 60,
      skills_score: 68,
      education_score: 75,
      cultural_fit_score: 55,
      years_experience: 3,
      ai_summary: 'Mid-level developer with growing backend expertise and enthusiasm for new technologies.',
      ai_strengths: 'Fast learner, Python, Django, SQL fundamentals',
      ai_concerns: 'Limited Node.js experience, no cloud infrastructure knowledge',
      extracted_skills: 'Python, Django, PostgreSQL, Git, REST APIs, Docker basics',
    },
    {
      name: 'Emma Williams',
      email: 'emma.w@design.co',
      phone: '+1 555-0404',
      location: 'Los Angeles, CA',
      positionId: pos3Id,
      status: 'hired',
      overall_score: 94,
      experience_score: 95,
      skills_score: 92,
      education_score: 88,
      cultural_fit_score: 98,
      years_experience: 6,
      ai_summary: 'Senior product designer with exceptional portfolio and track record at top SaaS companies.',
      ai_strengths: 'Figma, User research, Design systems, Prototyping, Stakeholder communication',
      ai_concerns: 'May require senior title negotiation',
      extracted_skills: 'Figma, Sketch, Adobe XD, User research, Prototyping, Design systems, A/B testing',
    },
    {
      name: 'David Park',
      email: 'david.park@mail.com',
      phone: '+1 555-0505',
      location: 'Seattle, WA',
      positionId: pos2Id,
      status: 'rejected',
      overall_score: 41,
      experience_score: 35,
      skills_score: 45,
      education_score: 60,
      cultural_fit_score: 38,
      years_experience: 1,
      ai_summary: 'Junior developer with basic HTML/CSS/JS skills, not yet at the required level.',
      ai_strengths: 'HTML, CSS, JavaScript basics, Eager to learn',
      ai_concerns: 'Insufficient React experience, no TypeScript, no professional projects',
      extracted_skills: 'HTML, CSS, JavaScript, jQuery, Bootstrap',
    },
  ];

  for (const cand of candidates) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO candidates (
        id, company_id, position_id, name, email, phone, location,
        status, overall_score, experience_score, skills_score, education_score, cultural_fit_score,
        years_experience, ai_summary, ai_strengths, ai_concerns, extracted_skills,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, companyId, cand.positionId, cand.name, cand.email, cand.phone, cand.location,
      cand.status, cand.overall_score, cand.experience_score, cand.skills_score,
      cand.education_score, cand.cultural_fit_score, cand.years_experience,
      cand.ai_summary, cand.ai_strengths, cand.ai_concerns, cand.extracted_skills,
      now, now
    );
  }

  console.log('✅ Seed completed!');
  console.log('');
  console.log('Company: Acme Corp');
  console.log('Admin:     admin@acme.com     / Admin1234!');
  console.log('Recruiter: recruiter@acme.com / Recruiter1234!');
  console.log('Positions: 3 (Senior Backend, Frontend Engineer, Product Designer)');
  console.log('Candidates: 5');

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
