// Database client using SQLite3
// Manages tables, schemas, migrations, and default administrator seeding

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
  }
});

// Promisified query wrappers for server-side async/await
const dbQuery = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Initialize schema tables
async function initDb() {
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

    console.log('Database tables verified/created successfully.');

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
  db,
  dbQuery
};
