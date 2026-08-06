const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
  }
});

// Enable Foreign Key support in SQLite
db.run('PRAGMA foreign_keys = ON;', (err) => {
  if (err) console.error('Failed to enable foreign keys:', err.message);
});

// Promisified DB helpers
const dbQuery = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
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

// Initialize database schema with safe migrations
async function initDb() {
  try {
    // 1. Users Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'student',
        profile_pic TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Teams Table (base)
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_name TEXT UNIQUE NOT NULL,
        leader_id INTEGER UNIQUE NOT NULL,
        problem_type TEXT NOT NULL,
        problem_statement TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(leader_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 3. Team Members Table (base)
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
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

    // -- Perform safe migrations for new columns (if they don't already exist)
    // Helper to check for column existence
    const hasColumn = async (tableName, columnName) => {
      const cols = await dbQuery.all(`PRAGMA table_info(${tableName});`);
      return cols.some(c => c.name === columnName);
    };

    // Add roll_no column to team_members
    if (!(await hasColumn('team_members', 'roll_no'))) {
      await dbQuery.run(`ALTER TABLE team_members ADD COLUMN roll_no TEXT DEFAULT NULL;`);
      console.log('Added roll_no column to team_members');
    }

    // Add phone_no column to team_members
    if (!(await hasColumn('team_members', 'phone_no'))) {
      await dbQuery.run(`ALTER TABLE team_members ADD COLUMN phone_no TEXT DEFAULT NULL;`);
      console.log('Added phone_no column to team_members');
    }

    // Add ppt_path and doc_path columns to teams
    if (!(await hasColumn('teams', 'ppt_path'))) {
      await dbQuery.run(`ALTER TABLE teams ADD COLUMN ppt_path TEXT DEFAULT NULL;`);
      console.log('Added ppt_path column to teams');
    }
    if (!(await hasColumn('teams', 'doc_path'))) {
      await dbQuery.run(`ALTER TABLE teams ADD COLUMN doc_path TEXT DEFAULT NULL;`);
      console.log('Added doc_path column to teams');
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
