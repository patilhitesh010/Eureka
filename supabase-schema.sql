-- Supabase PostgreSQL Database Schema
-- Run this schema in your Supabase SQL Editor to initialize all tables, indexes, constraints, and default settings.

-- Enable UUID extension if needed (not strictly required since we use Serial IDs to match existing SQLite code structure)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) CHECK(role IN ('student', 'admin')) DEFAULT 'student',
  profile_pic TEXT DEFAULT NULL,
  semester VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  team_name VARCHAR(255) UNIQUE NOT NULL,
  problem_type VARCHAR(255) NOT NULL,
  problem_statement TEXT NOT NULL,
  leader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  ppt_path TEXT DEFAULT NULL,
  doc_path TEXT DEFAULT NULL,
  pitch_order INTEGER DEFAULT 9999,
  pitch_completed BOOLEAN DEFAULT FALSE,
  pitch_time VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  roll_no VARCHAR(100) NOT NULL,
  phone_no VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Student Notes / Notices Table
CREATE TABLE IF NOT EXISTS student_notes (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  image_path TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Competition Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) UNIQUE PRIMARY KEY,
  value TEXT
);

-- 6. Connect PG Simple Session Store Table
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

-- Add primary key constraint and indexes to session store if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey') THEN
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Create Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_student_id ON student_notes(student_id);

-- Seed default competition stages setting
INSERT INTO settings (key, value) VALUES (
  'stages',
  '[{"id":1,"title":"Stage 1: Registration & Roster Setup","date":"Aug 15 – Sept 30, 2026","status":"Active","description":"Form a team of 1 to 5 members (Degree or Diploma streams) and sign up. Roster names, emails, and credentials can be updated dynamically via the dashboard.","deliverable":"Online Team Roster Registration","icon":"dollar"},{"id":2,"title":"Stage 2: Challenge Lock","date":"Oct 1 – Oct 25, 2026","status":"Upcoming","description":"Explore all 40 Predefined Problem Statements or set up your custom innovation proposal, and lock your primary track in the student dashboard.","deliverable":"Locked Problem Statement Choice","icon":"clock"},{"id":3,"title":"Stage 3: Executive Pitch Deck Submission","date":"Nov 1 – Nov 20, 2026","status":"Upcoming","description":"Once approved, download the official presentation template. Upload your finalized pitch deck (.pptx or .pdf format) directly onto the portal.","deliverable":"Standardized Pitch Deck (.pptx)","icon":"shield"},{"id":4,"title":"Stage 4: Expert Mentorship & Review","date":"Dec 5 – Dec 15, 2026","status":"Upcoming","description":"Shortlisted teams undergo intensive evaluations and receive 1-on-1 industry mentorship to refine financial projections, market fit, and technical prototypes.","deliverable":"Refined Prototype & Business Model","icon":"users"},{"id":5,"title":"Stage 5: Live Pitch Arena","date":"January 2026 (Live Stage)","status":"Final","description":"Present your startup business model live on stage at the SIT Tech Fest 2026. Pitch for 7-8 minutes followed by Q&A with real venture capitalists, angel investors, and judges.","deliverable":"Live Pitch & Prize Ceremony","icon":"star"}]'
) ON CONFLICT (key) DO NOTHING;

-- Seed default countdown deadline setting
INSERT INTO settings (key, value) VALUES (
  'countdown_deadline',
  '2026-09-30T23:59:59'
) ON CONFLICT (key) DO NOTHING;
