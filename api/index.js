const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { dbQuery } = require('../db');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Render's reverse proxy so req.protocol reports 'https' correctly
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Ensure uploads directories exist
const uploadsDir = process.env.VERCEL
  ? '/tmp'
  : path.join(process.cwd(), 'public', 'uploads');
const profilesDir = path.join(uploadsDir, 'profiles');
const notesDir = path.join(uploadsDir, 'notes');

if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}
if (!fs.existsSync(notesDir)) {
  fs.mkdirSync(notesDir, { recursive: true });
}

// Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'super_secret_purple_neon_session_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    secure: process.env.NODE_ENV === 'production', // HTTPS-only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : false
  }
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Files
app.use(express.static(path.join(process.cwd(), 'public')));

// Configure Multer Disk Storage for Profile Pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilesDir);
  },
  filename: (req, file, cb) => {
    const userId = req.session.user ? req.session.user.id : 'temp';
    const ext = path.extname(file.originalname);
    cb(null, `profile-${userId}-${Date.now()}${ext}`);
  }
});
const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg, jpeg, png, gif, webp) are allowed!'));
  }
});

// Configure Multer Storage for Admin Dashboard Notes/Images
const noteStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, notesDir);
  },
  filename: (req, file, cb) => {
    const studentId = req.params.id || 'all';
    const ext = path.extname(file.originalname);
    cb(null, `note-${studentId}-${Date.now()}${ext}`);
  }
});
const uploadNoteImage = multer({
  storage: noteStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed!'));
  }
});

// Ensure presentation & document directories exist
const presentationsDir = path.join(uploadsDir, 'presentations');
const docsDir = path.join(uploadsDir, 'documents');
if (!fs.existsSync(presentationsDir)) {
  fs.mkdirSync(presentationsDir, { recursive: true });
}
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Multer storage for team files (presentation/document)
const teamStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'presentation') cb(null, presentationsDir);
    else if (file.fieldname === 'document') cb(null, docsDir);
    else cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const leaderId = req.session && req.session.user ? req.session.user.id : 'anon';
    const ext = path.extname(file.originalname);
    const safeField = file.fieldname.replace(/[^a-z0-9_-]/gi, '_');
    cb(null, `${safeField}-${leaderId}-${Date.now()}${ext}`);
  }
});

const uploadTeamFiles = multer({
  storage: teamStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|ppt|pptx|doc|docx/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext)) return cb(null, true);
    cb(new Error('Only presentation/document files are allowed (pdf, ppt, pptx, doc, docx)'));
  }
});

// Configure Nodemailer for Brevo SMTP
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASSWORD
  }
});

// Email dispatch helper with Console fallback
async function sendRegistrationEmail(leaderEmail, leaderName, teamName, problemStatement, members) {
  const memberRows = members.map(m => `<li>${m.name} (${m.email})</li>`).join('');
  const mailOptions = {
    from: process.env.BREVO_SMTP_FROM || '"Eureka Competition" <no-reply@eureka.com>',
    to: leaderEmail,
    subject: `🚀 Startup Registration Confirmed: ${teamName}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b001a; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 600px; margin: auto; border: 2px solid #a855f7; box-shadow: 0 0 15px #a855f7;">
        <h2 style="color: #d8b4fe; border-bottom: 2px solid #a855f7; padding-bottom: 10px; margin-top: 0;">Registration Success!</h2>
        <p style="font-size: 16px;">Hello <strong>${leaderName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6;">Your team has been successfully registered for the <strong>Eureka Startup Competition</strong>. Below are the registration details:</p>
        
        <div style="background-color: #1a082e; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #d8b4fe;">
          <p style="margin: 5px 0;"><strong>Team Name:</strong> ${teamName}</p>
          <p style="margin: 5px 0;"><strong>Problem Statement:</strong> ${problemStatement}</p>
          <p style="margin: 5px 0;"><strong>Leader Email:</strong> ${leaderEmail}</p>
        </div>
        
        <h4 style="color: #d8b4fe; margin-bottom: 5px;">Team Members:</h4>
        <ul style="margin-top: 0; font-size: 14px; line-height: 1.6;">
          ${memberRows}
        </ul>
        
        <p style="font-size: 14px; font-weight: bold; color: #a855f7; margin-top: 25px;">Status: Pending Admin Review</p>
        <p style="font-size: 12px; color: #d8b4fe; opacity: 0.7; margin-top: 30px; border-top: 1px solid #331155; padding-top: 15px;">If you have any questions, please contact the Eureka Organizing Committee.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent successfully to leader: ${leaderEmail}`);
    return true;
  } catch (err) {
    console.log('--- NODEMAILER LOG FALLBACK (Brevo SMTP config might be incomplete/incorrect) ---');
    console.log(`To: ${leaderEmail}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Body HTML Summary:`);
    console.log(mailOptions.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('--- END OF FALLBACK LOG ---');
    console.error('Nodemailer Error:', err.message);
    return false;
  }
}

// Authentication Middlewares
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrators only.' });
  }
  next();
}

// ----------------------------------------------------
// AUTHENTICATION ENDPOINTS
// ----------------------------------------------------

// Check active session
app.get('/api/auth/me', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Register Student
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, semester } = req.body;

  if (!name || !email || !password || !semester) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Basic validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existingUser = await dbQuery.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await dbQuery.run(
      'INSERT INTO users (name, email, password_hash, role, semester) VALUES (?, ?, ?, ?, ?)',
      [name, email.toLowerCase(), hash, 'student', semester]
    );

    // Save session
    req.session.user = {
      id: result.id,
      name,
      email: email.toLowerCase(),
      role: 'student',
      profile_pic: null,
      semester
    };

    res.status(201).json({ message: 'Registration successful', user: req.session.user });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await dbQuery.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile_pic: user.profile_pic
    };

    res.json({ message: 'Login successful', user: req.session.user });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// ----------------------------------------------------
// PROFILE MANAGEMENT
// ----------------------------------------------------
app.put('/api/profile', requireAuth, uploadProfile.single('profile_pic'), async (req, res) => {
  const { name, email, password, semester } = req.body;
  const userId = req.session.user.id;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const user = await dbQuery.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being updated and if it belongs to someone else
    if (email.toLowerCase() !== user.email) {
      const emailTaken = await dbQuery.get('SELECT * FROM users WHERE email = ? AND id != ?', [email.toLowerCase(), userId]);
      if (emailTaken) {
        return res.status(400).json({ error: 'Email is already in use by another user' });
      }
    }

    let query = 'UPDATE users SET name = ?, email = ?, semester = ?';
    let params = [name, email.toLowerCase(), semester || user.semester];

    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const hash = await bcrypt.hash(password, 10);
      query += ', password_hash = ?';
      params.push(hash);
    }

    if (req.file) {
      const profilePicUrl = `/uploads/profiles/${req.file.filename}`;
      query += ', profile_pic = ?';
      params.push(profilePicUrl);
      req.session.user.profile_pic = profilePicUrl;
    }

    query += ' WHERE id = ?';
    params.push(userId);

    await dbQuery.run(query, params);

    // Update Session
    req.session.user.name = name;
    req.session.user.email = email.toLowerCase();
    req.session.user.semester = semester || user.semester;

    res.json({ message: 'Profile updated successfully', user: req.session.user });
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------
// TEAM REGISTRATION
// ----------------------------------------------------

// Get Student's Registered Team
app.get('/api/team/my-team', requireAuth, async (req, res) => {
  const userId = req.session.user.id;

  try {
    // A student can be either the team leader or a team member.
    // Let's first search if they are a leader:
    let team = await dbQuery.get('SELECT * FROM teams WHERE leader_id = ?', [userId]);
    let roleInTeam = 'leader';

    // If not leader, search if they are registered as a member by email:
    if (!team) {
      const user = await dbQuery.get('SELECT email FROM users WHERE id = ?', [userId]);
      const memberRecord = await dbQuery.get('SELECT team_id FROM team_members WHERE email = ?', [user.email]);
      if (memberRecord) {
        team = await dbQuery.get('SELECT * FROM teams WHERE id = ?', [memberRecord.team_id]);
        roleInTeam = 'member';
      }
    }

    if (!team) {
      return res.json({ team: null });
    }

    // Get members (include roll numbers and phone numbers)
    const members = await dbQuery.all('SELECT name, email, roll_no, phone_no FROM team_members WHERE team_id = ?', [team.id]);
    
    // Get leader details
    const leader = await dbQuery.get('SELECT name, email FROM users WHERE id = ?', [team.leader_id]);

    res.json({
      team: {
        id: team.id,
        team_name: team.team_name,
        problem_type: team.problem_type,
        problem_statement: team.problem_statement,
        status: team.status,
        ppt_path: team.ppt_path || null,
        doc_path: team.doc_path || null,
        created_at: team.created_at,
        role_in_team: roleInTeam,
        leader,
        members
      }
    });
  } catch (error) {
    console.error('Fetch Team Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register Team (no file uploads — files are submitted post-approval)
app.post('/api/team/register', requireAuth, express.json(), async (req, res) => {
  const { team_name, problem_type, problem_statement } = req.body;
  const membersRaw = req.body.members;
  const leaderId = req.session.user.id;

  // Validation
  if (!team_name || !problem_type || !problem_statement || !membersRaw) {
    return res.status(400).json({ error: 'All team details are required' });
  }

  let parsedMembers = [];
  try {
    parsedMembers = typeof membersRaw === 'string' ? JSON.parse(membersRaw) : membersRaw;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid members format' });
  }

  if (!Array.isArray(parsedMembers) || parsedMembers.length < 1 || parsedMembers.length > 5) {
    return res.status(400).json({ error: 'Team must have between 1 and 5 members' });
  }

  // Validate each member: email, roll_no, phone_no are all required
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const m of parsedMembers) {
    if (!m.name || !m.email) {
      return res.status(400).json({ error: 'All members must have a name and email' });
    }
    if (!emailRegex.test(m.email)) {
      return res.status(400).json({ error: `Invalid email: ${m.email}` });
    }
    if (!m.roll_no || !m.roll_no.trim()) {
      return res.status(400).json({ error: `Roll number is required for member: ${m.name}` });
    }
    if (!m.phone_no || !m.phone_no.trim()) {
      return res.status(400).json({ error: `Phone number is required for member: ${m.name}` });
    }
  }

  try {
    // 1. Verify if leader already registered a team
    const leaderHasTeam = await dbQuery.get('SELECT * FROM teams WHERE leader_id = ?', [leaderId]);
    if (leaderHasTeam) {
      return res.status(400).json({ error: 'You have already registered a team as a leader.' });
    }

    // 2. Verify if team name is unique
    const teamExists = await dbQuery.get('SELECT * FROM teams WHERE team_name = ?', [team_name]);
    if (teamExists) {
      return res.status(400).json({ error: 'Team name is already registered.' });
    }

    // 3. Verify if leader or any member is already registered in another team
    const leaderUser = await dbQuery.get('SELECT email FROM users WHERE id = ?', [leaderId]);
    
    // Check if leader email is listed as a member in any team
    const leaderIsMember = await dbQuery.get('SELECT * FROM team_members WHERE email = ?', [leaderUser.email]);
    if (leaderIsMember) {
      return res.status(400).json({ error: 'You are already registered as a member in another team.' });
    }

    // Check each proposed member
    for (const m of parsedMembers) {
      // Check if member is a team leader
      const memberIsLeader = await dbQuery.get('SELECT * FROM users u JOIN teams t ON u.id = t.leader_id WHERE u.email = ?', [m.email.toLowerCase()]);
      if (memberIsLeader) {
        return res.status(400).json({ error: `Member ${m.name} (${m.email}) is already a leader of another team.` });
      }
      
      // Check if member is in another team
      const memberIsMember = await dbQuery.get('SELECT * FROM team_members WHERE email = ?', [m.email.toLowerCase()]);
      if (memberIsMember) {
        return res.status(400).json({ error: `Member ${m.name} (${m.email}) is already registered in another team.` });
      }
    }

    // 4. Save to Database (no file paths at registration — files come after approval)
    const teamResult = await dbQuery.run(
      'INSERT INTO teams (team_name, leader_id, problem_type, problem_statement, status) VALUES (?, ?, ?, ?, ?)',
      [team_name, leaderId, problem_type, problem_statement, 'pending']
    );

    const teamId = teamResult.id;

    // Add members (roll_no and phone_no are required)
    for (const m of parsedMembers) {
      await dbQuery.run(
        'INSERT INTO team_members (team_id, name, email, roll_no, phone_no) VALUES (?, ?, ?, ?, ?)',
        [teamId, m.name, m.email.toLowerCase(), m.roll_no.trim(), m.phone_no.trim()]
      );
    }

    // No file uploads at registration time — files are submitted post-approval

    // Send confirmation email asynchronously (do not block client response)
    sendRegistrationEmail(leaderUser.email, req.session.user.name, team_name, problem_statement, parsedMembers);

    res.status(201).json({ message: 'Team registered successfully' });
  } catch (error) {
    console.error('Team Registration Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload PPT/Document — only allowed after team is approved
app.post('/api/team/upload-files', requireAuth, uploadTeamFiles.fields([
  { name: 'presentation', maxCount: 1 },
  { name: 'document', maxCount: 1 }
]), async (req, res) => {
  const leaderId = req.session.user.id;

  try {
    const team = await dbQuery.get('SELECT * FROM teams WHERE leader_id = ?', [leaderId]);

    if (!team) {
      return res.status(404).json({ error: 'No team found for this leader.' });
    }

    if (team.status !== 'approved') {
      return res.status(403).json({ error: 'File uploads are only allowed after your team has been approved.' });
    }

    const files = req.files || {};
    let pptPath = team.ppt_path;
    let docPath = team.doc_path;

    if (files.presentation && files.presentation[0]) {
      pptPath = `/uploads/presentations/${files.presentation[0].filename}`;
    }
    if (files.document && files.document[0]) {
      docPath = `/uploads/documents/${files.document[0].filename}`;
    }

    if (!files.presentation && !files.document) {
      return res.status(400).json({ error: 'Please select at least one file to upload.' });
    }

    await dbQuery.run('UPDATE teams SET ppt_path = ?, doc_path = ? WHERE id = ?', [pptPath, docPath, team.id]);

    res.json({ message: 'Files uploaded successfully.', ppt_path: pptPath, doc_path: docPath });
  } catch (error) {
    console.error('Team File Upload Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------
// STUDENT NOTES / NOTICES
// ----------------------------------------------------
app.get('/api/student/notes', requireAuth, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const notes = await dbQuery.all('SELECT * FROM student_notes WHERE student_id = ? ORDER BY created_at DESC', [userId]);
    res.json({ notes });
  } catch (error) {
    console.error('Fetch Notes Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ----------------------------------------------------
// ADMINISTRATOR ENDPOINTS
// ----------------------------------------------------

// List all students
app.get('/api/admin/students', requireAdmin, async (req, res) => {
  try {
    const students = await dbQuery.all('SELECT id, name, email, role, profile_pic, semester, created_at FROM users WHERE role = ?', ['student']);
    res.json({ students });
  } catch (error) {
    console.error('Admin Students Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit student details
app.put('/api/admin/students/:id', requireAdmin, async (req, res) => {
  const { name, email, role, semester } = req.body;
  const studentId = req.params.id;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const user = await dbQuery.get('SELECT * FROM users WHERE id = ?', [studentId]);
    if (!user) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const emailConflict = await dbQuery.get('SELECT * FROM users WHERE email = ? AND id != ?', [email.toLowerCase(), studentId]);
    if (emailConflict) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    await dbQuery.run(
      'UPDATE users SET name = ?, email = ?, role = ?, semester = ? WHERE id = ?',
      [name, email.toLowerCase(), role || user.role, semester || user.semester, studentId]
    );

    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    console.error('Admin Edit Student Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student account
app.delete('/api/admin/students/:id', requireAdmin, async (req, res) => {
  const studentId = req.params.id;

  try {
    const result = await dbQuery.run('DELETE FROM users WHERE id = ?', [studentId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Admin Delete Student Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all registered teams with members
app.get('/api/admin/teams', requireAdmin, async (req, res) => {
  try {
    const teams = await dbQuery.all(`
      SELECT t.*, u.name as leader_name, u.email as leader_email
      FROM teams t
      JOIN users u ON t.leader_id = u.id
      ORDER BY t.created_at DESC
    `);

    // Fetch members for each team
    for (const team of teams) {
      team.members = await dbQuery.all('SELECT name, email, roll_no, phone_no FROM team_members WHERE team_id = ?', [team.id]);
    }

    res.json({ teams });
  } catch (error) {
    console.error('Admin Fetch Teams Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve / Reject team status
app.put('/api/admin/teams/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const teamId = req.params.id;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const result = await dbQuery.run('UPDATE teams SET status = ? WHERE id = ?', [status, teamId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json({ message: `Team status updated to: ${status}` });
  } catch (error) {
    console.error('Admin Update Team Status Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit team details
app.put('/api/admin/teams/:id', requireAdmin, async (req, res) => {
  const { team_name, problem_type, problem_statement } = req.body;
  const teamId = req.params.id;

  if (!team_name || !problem_type || !problem_statement) {
    return res.status(400).json({ error: 'Team name and problem statements are required' });
  }

  try {
    const conflict = await dbQuery.get('SELECT * FROM teams WHERE team_name = ? AND id != ?', [team_name, teamId]);
    if (conflict) {
      return res.status(400).json({ error: 'Team name already in use' });
    }

    const result = await dbQuery.run(
      'UPDATE teams SET team_name = ?, problem_type = ?, problem_statement = ? WHERE id = ?',
      [team_name, problem_type, problem_statement, teamId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ message: 'Team details updated successfully' });
  } catch (error) {
    console.error('Admin Edit Team Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete team
app.delete('/api/admin/teams/:id', requireAdmin, async (req, res) => {
  const teamId = req.params.id;

  try {
    const result = await dbQuery.run('DELETE FROM teams WHERE id = ?', [teamId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Admin Delete Team Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add notes/images to student dashboard
app.post('/api/admin/students/:id/notes', requireAdmin, uploadNoteImage.single('note_image'), async (req, res) => {
  const studentId = req.params.id;
  const { note_text } = req.body;

  if (!note_text) {
    return res.status(400).json({ error: 'Note text is required' });
  }

  try {
    const student = await dbQuery.get('SELECT * FROM users WHERE id = ? AND role = ?', [studentId, 'student']);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/notes/${req.file.filename}`;
    }

    await dbQuery.run(
      'INSERT INTO student_notes (student_id, note_text, image_path) VALUES (?, ?, ?)',
      [studentId, note_text, imagePath]
    );

    res.status(201).json({ message: 'Note added to student dashboard successfully' });
  } catch (error) {
    console.error('Admin Add Note Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete dashboard note
app.delete('/api/admin/notes/:id', requireAdmin, async (req, res) => {
  const noteId = req.params.id;

  try {
    const result = await dbQuery.run('DELETE FROM student_notes WHERE id = ?', [noteId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Admin Delete Note Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------
// PITCH TIMETABLE ENDPOINTS
// ----------------------------------------------------

// Get all approved teams ordered by pitch order
app.get('/api/timetable', requireAuth, async (req, res) => {
  try {
    const teams = await dbQuery.all(
      'SELECT id, team_name, problem_type, problem_statement, leader_id, status, pitch_order, pitch_completed, pitch_time FROM teams WHERE status = ? ORDER BY pitch_order ASC',
      ['approved']
    );
    res.json({ teams });
  } catch (error) {
    console.error('Fetch Timetable Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update timetable (Admin only)
app.put('/api/admin/timetable', requireAdmin, async (req, res) => {
  const { schedule } = req.body; // array of { teamId, pitch_order, pitch_time, pitch_completed }
  if (!Array.isArray(schedule)) {
    return res.status(400).json({ error: 'Schedule must be an array' });
  }
  try {
    for (const item of schedule) {
      await dbQuery.run(
        'UPDATE teams SET pitch_order = ?, pitch_time = ?, pitch_completed = ? WHERE id = ?',
        [item.pitch_order, item.pitch_time, item.pitch_completed, item.teamId]
      );
    }
    res.json({ message: 'Timetable updated successfully' });
  } catch (error) {
    console.error('Update Timetable Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get next pitch turn (Next pending team)
app.get('/api/timetable/next-turn', requireAuth, async (req, res) => {
  try {
    const nextTeam = await dbQuery.get(
      'SELECT id, team_name, problem_type, problem_statement, leader_id, status, pitch_order, pitch_completed, pitch_time FROM teams WHERE status = ? AND pitch_completed = ? ORDER BY pitch_order ASC LIMIT 1',
      ['approved', false]
    );
    res.json({ nextTeam: nextTeam || null });
  } catch (error) {
    console.error('Fetch Next Turn Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------
// COMPETITION CONFIGURATION ENDPOINTS
// ----------------------------------------------------

// Get active configuration (deadline and stages)
app.get('/api/competition/config', async (req, res) => {
  try {
    const deadlineRow = await dbQuery.get('SELECT value FROM settings WHERE key = ?', ['countdown_deadline']);
    const stagesRow = await dbQuery.get('SELECT value FROM settings WHERE key = ?', ['stages']);
    
    res.json({
      countdown_deadline: deadlineRow ? deadlineRow.value : '2026-09-30T23:59:59',
      stages: stagesRow ? JSON.parse(stagesRow.value) : []
    });
  } catch (error) {
    console.error('Fetch Config Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update configuration (Admin only)
app.put('/api/admin/competition/config', requireAdmin, async (req, res) => {
  const { countdown_deadline, stages } = req.body;
  
  if (!countdown_deadline || !stages) {
    return res.status(400).json({ error: 'Deadline and stages are required' });
  }
  
  try {
    if (isNaN(Date.parse(countdown_deadline))) {
      return res.status(400).json({ error: 'Invalid deadline timestamp' });
    }
    
    let stagesStr = '';
    if (typeof stages === 'string') {
      stagesStr = stages;
      const parsed = JSON.parse(stages);
      if (!Array.isArray(parsed)) {
        return res.status(400).json({ error: 'Stages must be an array' });
      }
    } else if (Array.isArray(stages)) {
      stagesStr = JSON.stringify(stages);
    } else {
      return res.status(400).json({ error: 'Stages must be a JSON array' });
    }
    
    await dbQuery.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['countdown_deadline', countdown_deadline]);
    await dbQuery.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['stages', stagesStr]);
    
    res.json({ message: 'Competition settings updated successfully' });
  } catch (error) {
    console.error('Update Config Error:', error);
    res.status(500).json({ error: 'Internal server error or invalid stages format' });
  }
});

// Start Express Server
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
