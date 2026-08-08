// Database client using PostgreSQL (configured for Supabase)
// Manages tables, schemas, migrations, and default administrator seeding
// Automatically translates SQLite SQL queries to PostgreSQL compatibility.

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
  });
  console.log('PostgreSQL connection pool initialized.');
} else {
  console.warn('⚠️ WARNING: DATABASE_URL is not configured in .env! Database operations will fail.');
}

// Translate SQLite SQL syntax to PostgreSQL compatibility
function convertSql(sql) {
  if (typeof sql !== 'string') return sql;

  let pgSql = sql;

  // Convert SQLite DDL data types and definitions to Postgres compatibility
  if (pgSql.toUpperCase().includes('CREATE TABLE')) {
    pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    pgSql = pgSql.replace(/DATETIME/gi, 'TIMESTAMP');
  }

  // Convert SQLite parameter placeholders (?) to Postgres placeholders ($1, $2, etc.)
  let paramIndex = 1;
  pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

  return pgSql;
}

// Promisified query wrappers for server-side async/await
const dbQuery = {
  run: async (sql, params = []) => {
    if (!pool) {
      throw new Error('Database pool is not initialized. Configure DATABASE_URL in .env.');
    }
    const pgSql = convertSql(sql);

    // If it's an INSERT statement, append "RETURNING *" to fetch the auto-generated primary key
    if (pgSql.trim().toUpperCase().startsWith('INSERT ')) {
      const res = await pool.query(pgSql + ' RETURNING *', params);
      const insertedRow = res.rows[0];
      const insertedId = insertedRow ? (insertedRow.id !== undefined ? insertedRow.id : insertedRow.key) : null;
      return { id: insertedId, lastID: insertedId, changes: res.rowCount };
    } else {
      const res = await pool.query(pgSql, params);
      return { changes: res.rowCount };
    }
  },
  get: async (sql, params = []) => {
    if (!pool) {
      throw new Error('Database pool is not initialized. Configure DATABASE_URL in .env.');
    }
    const pgSql = convertSql(sql);
    const res = await pool.query(pgSql, params);
    return res.rows[0] || null;
  },
  all: async (sql, params = []) => {
    if (!pool) {
      throw new Error('Database pool is not initialized. Configure DATABASE_URL in .env.');
    }
    const pgSql = convertSql(sql);
    const res = await pool.query(pgSql, params);
    return res.rows;
  }
};

// Initialize schema tables
async function initDb() {
  if (!pool) {
    console.warn('Skipping database schema initialization: pool is not configured.');
    return;
  }

  try {
    // 1. Users Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('student', 'admin')) DEFAULT 'student',
        profile_pic TEXT DEFAULT '/uploads/profiles/default.png',
        semester TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Teams Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_name TEXT UNIQUE NOT NULL,
        problem_type TEXT NOT NULL,
        problem_statement TEXT NOT NULL,
        leader_id INTEGER NOT NULL,
        status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
        ppt_path TEXT DEFAULT NULL,
        doc_path TEXT DEFAULT NULL,
        pitch_order INTEGER DEFAULT 0,
        pitch_completed BOOLEAN DEFAULT FALSE,
        pitch_time TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(leader_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 3. Team Members Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        roll_no TEXT NOT NULL,
        phone_no TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
      )
    `);

    // 4. Student Notes Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS student_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        note_text TEXT NOT NULL,
        image_path TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 5. Settings Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT UNIQUE PRIMARY KEY,
        value TEXT
      )
    `);

    // Apply auto-migrations for existing tables
    await dbQuery.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT NULL');
    await dbQuery.run('ALTER TABLE teams ADD COLUMN IF NOT EXISTS pitch_order INTEGER DEFAULT 0');
    await dbQuery.run('ALTER TABLE teams ADD COLUMN IF NOT EXISTS pitch_completed BOOLEAN DEFAULT FALSE');
    await dbQuery.run('ALTER TABLE teams ADD COLUMN IF NOT EXISTS pitch_time TEXT DEFAULT NULL');

    // Seed default settings
    const defaultDeadline = '2026-09-30T23:59:59';
    const defaultStages = [
      {
        id: 1,
        title: "Stage 1: Registration & Roster Setup",
        date: "Aug 15 – Sept 30, 2026",
        status: "Active",
        description: "Form a team of 1 to 5 members (Degree or Diploma streams) and sign up. Roster names, emails, and credentials can be updated dynamically via the dashboard.",
        deliverable: "Online Team Roster Registration",
        icon: "dollar"
      },
      {
        id: 2,
        title: "Stage 2: Challenge Lock",
        date: "Oct 1 – Oct 25, 2026",
        status: "Upcoming",
        description: "Explore all 40 Predefined Problem Statements or set up your custom innovation proposal, and lock your primary track in the student dashboard.",
        deliverable: "Locked Problem Statement Choice",
        icon: "clock"
      },
      {
        id: 3,
        title: "Stage 3: Executive Pitch Deck Submission",
        date: "Nov 1 – Nov 20, 2026",
        status: "Upcoming",
        description: "Once approved, download the official presentation template. Upload your finalized pitch deck (.pptx or .pdf format) directly onto the portal.",
        deliverable: "Standardized Pitch Deck (.pptx)",
        icon: "shield"
      },
      {
        id: 4,
        title: "Stage 4: Expert Mentorship & Review",
        date: "Dec 5 – Dec 15, 2026",
        status: "Upcoming",
        description: "Shortlisted teams undergo intensive evaluations and receive 1-on-1 industry mentorship to refine financial projections, market fit, and technical prototypes.",
        deliverable: "Refined Prototype & Business Model",
        icon: "users"
      },
      {
        id: 5,
        title: "Stage 5: Live Pitch Arena",
        date: "January 2026 (Live Stage)",
        status: "Final",
        description: "Present your startup business model live on stage at the SIT Tech Fest 2026. Pitch for 7-8 minutes followed by Q&A with real venture capitalists, angel investors, and judges.",
        deliverable: "Live Pitch & Prize Ceremony",
        icon: "star"
      }
    ];

    const deadlineExists = await dbQuery.get('SELECT * FROM settings WHERE key = ?', ['countdown_deadline']);
    if (!deadlineExists) {
      await dbQuery.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['countdown_deadline', defaultDeadline]);
      console.log('Seeded default countdown deadline');
    }

    const stagesExists = await dbQuery.get('SELECT * FROM settings WHERE key = ?', ['stages']);
    if (!stagesExists) {
      await dbQuery.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['stages', JSON.stringify(defaultStages)]);
      console.log('Seeded default timeline stages');
    }

    console.log('Database tables verified/created successfully on PostgreSQL.');

    // Seed default admin account
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@eureka.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';

    const adminExists = await dbQuery.get('SELECT * FROM users WHERE email = ?', [adminEmail]);
    if (!adminExists) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await dbQuery.run(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['System Admin', adminEmail, hash, 'admin']
      );
      console.log(`Seeded default admin user: ${adminEmail}`);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initDb();

module.exports = {
  db: pool,
  dbQuery
};
