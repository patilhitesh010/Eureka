const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { supabase, db } = require('../db');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxies (needed for Vercel and secure cookies)
app.set('trust proxy', 1);

// Use Helmet for secure HTTP headers, disabling rigid CSP to allow inline assets
app.use(helmet({
  contentSecurityPolicy: false
}));

// Configure session store
let sessionStore;
if (db) {
  sessionStore = new PgSession({
    pool: db,
    tableName: 'session'
  });
}

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'super_secret_purple_neon_session_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : false
  }
}));

// Body Parsers with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Check database configuration availability
app.use('/api', (req, res, next) => {
  if (!supabase) {
    return res.status(500).json({
      error: 'Database configuration missing',
      details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are not configured in Vercel settings.'
    });
  }
  next();
});

// Serve static assets from public folder
app.use(express.static(path.join(process.cwd(), 'public')));

// Configure Multer Memory Storage (strictly serverless-compatible)
const uploadProfile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only images (jpg, jpeg, png, gif, webp) are allowed!'));
  }
});

const uploadNoteImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only images are allowed!'));
  }
});

const uploadTeamFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|ppt|pptx|doc|docx/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext)) return cb(null, true);
    cb(new Error('Only presentation/document files are allowed (pdf, ppt, pptx, doc, docx)'));
  }
});

// Helper: Upload memory buffer to Supabase Storage Bucket
async function uploadToSupabase(buffer, bucket, storagePath, mimeType) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return publicUrl;
}

// Rate Limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // Limit to 100 attempts per window
  message: { error: 'Too many authentication attempts, please try again later.' }
});

// Configure Nodemailer for Brevo SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Email dispatch helper with console fallback
async function sendRegistrationEmail(leaderEmail, leaderName, teamName, problemStatement, members) {
  const memberRows = members.map(m => `<li>${m.name} (${m.email})</li>`).join('');
  const mailOptions = {
    from: process.env.FROM_EMAIL || '"Eureka Competition" <no-reply@eureka.com>',
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
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials not configured');
    }
    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent successfully to leader: ${leaderEmail}`);
    return true;
  } catch (err) {
    console.log('--- NODEMAILER LOG FALLBACK (SMTP not configured) ---');
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

function formatDbError(error) {
  if (!error) return 'Unknown database error';
  let msg = error.message || 'Database error';
  if (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist')) {
    msg += ' (Database table not found. Please execute the SQL schema script inside your Supabase SQL Editor.)';
  }
  return msg;
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

// GET fallbacks to redirect users to HTML pages if direct browser access occurs
app.get('/api/auth/login', (req, res) => {
  res.redirect('/login.html');
});
app.get('/api/auth/register', (req, res) => {
  res.redirect('/register.html');
});

// Register Student
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { name, email, password, semester } = req.body;

  if (!name || !email || !password || !semester) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const { data: existingUser, error: checkErr } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password_hash: hash,
        role: 'student',
        semester
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Save session
    req.session.user = {
      id: newUser.id,
      name,
      email: email.toLowerCase(),
      role: 'student',
      profile_pic: null,
      semester
    };

    res.status(201).json({ message: 'Registration successful', user: req.session.user });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal server error', details: formatDbError(error) });
  }
});

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data: user, error: loginErr } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (loginErr) throw loginErr;
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
    res.status(500).json({ error: 'Internal server error', details: formatDbError(error) });
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
    const { data: user, error: getErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (getErr || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email.toLowerCase() !== user.email) {
      const { data: emailTaken, error: conflictErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .neq('id', userId)
        .maybeSingle();

      if (conflictErr) throw conflictErr;
      if (emailTaken) {
        return res.status(400).json({ error: 'Email is already in use by another user' });
      }
    }

    const updateData = {
      name,
      email: email.toLowerCase(),
      semester: semester || user.semester
    };

    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const storagePath = `profiles/profile-${userId}-${Date.now()}${ext}`;
      const profilePicUrl = await uploadToSupabase(req.file.buffer, 'uploads', storagePath, req.file.mimetype);
      
      updateData.profile_pic = profilePicUrl;
      req.session.user.profile_pic = profilePicUrl;
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateErr) throw updateErr;

    // Sync Session
    req.session.user.name = name;
    req.session.user.email = email.toLowerCase();
    req.session.user.semester = semester || user.semester;

    res.json({ message: 'Profile updated successfully', user: req.session.user });
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ----------------------------------------------------
// TEAM REGISTRATION
// ----------------------------------------------------

app.get('/api/team/my-team', requireAuth, async (req, res) => {
  const userId = req.session.user.id;

  try {
    let team = null;
    let roleInTeam = 'leader';

    const { data: leaderTeam, error: lTeamErr } = await supabase
      .from('teams')
      .select('*')
      .eq('leader_id', userId)
      .maybeSingle();

    if (lTeamErr) throw lTeamErr;

    if (leaderTeam) {
      team = leaderTeam;
    } else {
      const { data: user, error: uErr } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (uErr) throw uErr;

      const { data: memberRecord, error: memErr } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('email', user.email)
        .maybeSingle();

      if (memErr) throw memErr;

      if (memberRecord) {
        const { data: mTeam, error: mtErr } = await supabase
          .from('teams')
          .select('*')
          .eq('id', memberRecord.team_id)
          .maybeSingle();

        if (mtErr) throw mtErr;
        team = mTeam;
        roleInTeam = 'member';
      }
    }

    if (!team) {
      return res.json({ team: null });
    }

    const { data: members, error: memsErr } = await supabase
      .from('team_members')
      .select('name, email, roll_no, phone_no')
      .eq('team_id', team.id);

    if (memsErr) throw memsErr;

    const { data: leader, error: leaderErr } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', team.leader_id)
      .single();

    if (leaderErr) throw leaderErr;

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
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.post('/api/team/register', requireAuth, async (req, res) => {
  const { team_name, problem_type, problem_statement } = req.body;
  const membersRaw = req.body.members;
  const leaderId = req.session.user.id;

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
    const { data: leaderHasTeam, error: ltErr } = await supabase
      .from('teams')
      .select('*')
      .eq('leader_id', leaderId)
      .maybeSingle();

    if (ltErr) throw ltErr;
    if (leaderHasTeam) {
      return res.status(400).json({ error: 'You have already registered a team as a leader.' });
    }

    // 2. Verify if team name is unique
    const { data: teamExists, error: teErr } = await supabase
      .from('teams')
      .select('*')
      .eq('team_name', team_name)
      .maybeSingle();

    if (teErr) throw teErr;
    if (teamExists) {
      return res.status(400).json({ error: 'Team name is already registered.' });
    }

    // 3. Verify if leader or any member is already registered in another team
    const { data: leaderUser, error: luErr } = await supabase
      .from('users')
      .select('email')
      .eq('id', leaderId)
      .single();

    if (luErr) throw luErr;

    const { data: leaderIsMember, error: limErr } = await supabase
      .from('team_members')
      .select('*')
      .eq('email', leaderUser.email)
      .maybeSingle();

    if (limErr) throw limErr;
    if (leaderIsMember) {
      return res.status(400).json({ error: 'You are already registered as a member in another team.' });
    }

    // Check proposed members
    for (const m of parsedMembers) {
      // Check if member is a team leader
      const { data: memberIsLeader, error: milErr } = await supabase
        .from('teams')
        .select('*, leader:users!inner(email)')
        .eq('leader.email', m.email.toLowerCase())
        .maybeSingle();

      if (milErr) throw milErr;
      if (memberIsLeader) {
        return res.status(400).json({ error: `Member ${m.name} (${m.email}) is already a leader of another team.` });
      }

      // Check if member is in another team
      const { data: memberIsMember, error: mimErr } = await supabase
        .from('team_members')
        .select('*')
        .eq('email', m.email.toLowerCase())
        .maybeSingle();

      if (mimErr) throw mimErr;
      if (memberIsMember) {
        return res.status(400).json({ error: `Member ${m.name} (${m.email}) is already registered in another team.` });
      }
    }

    // 4. Save Team
    const { data: newTeam, error: newTeamErr } = await supabase
      .from('teams')
      .insert({
        team_name,
        leader_id: leaderId,
        problem_type,
        problem_statement,
        status: 'pending'
      })
      .select()
      .single();

    if (newTeamErr) throw newTeamErr;

    // Add members
    const membersData = parsedMembers.map(m => ({
      team_id: newTeam.id,
      name: m.name,
      email: m.email.toLowerCase(),
      roll_no: m.roll_no.trim(),
      phone_no: m.phone_no.trim()
    }));

    const { error: memInsertErr } = await supabase
      .from('team_members')
      .insert(membersData);

    if (memInsertErr) throw memInsertErr;

    // Send confirmation email (does not block client response)
    sendRegistrationEmail(leaderUser.email, req.session.user.name, team_name, problem_statement, parsedMembers);

    res.status(201).json({ message: 'Team registered successfully' });
  } catch (error) {
    console.error('Team Registration Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Upload PPT/Document — only allowed after team is approved
app.post('/api/team/upload-files', requireAuth, uploadTeamFiles.fields([
  { name: 'presentation', maxCount: 1 },
  { name: 'document', maxCount: 1 }
]), async (req, res) => {
  const leaderId = req.session.user.id;

  try {
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .select('*')
      .eq('leader_id', leaderId)
      .maybeSingle();

    if (teamErr || !team) {
      return res.status(404).json({ error: 'No team found for this leader.' });
    }

    if (team.status !== 'approved') {
      return res.status(403).json({ error: 'File uploads are only allowed after your team has been approved.' });
    }

    const files = req.files || {};
    let pptPath = team.ppt_path;
    let docPath = team.doc_path;

    if (files.presentation && files.presentation[0]) {
      const file = files.presentation[0];
      const ext = path.extname(file.originalname).toLowerCase();
      const storagePath = `presentations/presentation-${leaderId}-${Date.now()}${ext}`;
      pptPath = await uploadToSupabase(file.buffer, 'uploads', storagePath, file.mimetype);
    }

    if (files.document && files.document[0]) {
      const file = files.document[0];
      const ext = path.extname(file.originalname).toLowerCase();
      const storagePath = `documents/document-${leaderId}-${Date.now()}${ext}`;
      docPath = await uploadToSupabase(file.buffer, 'uploads', storagePath, file.mimetype);
    }

    if (!files.presentation && !files.document) {
      return res.status(400).json({ error: 'Please select at least one file to upload.' });
    }

    const { error: updateErr } = await supabase
      .from('teams')
      .update({ ppt_path: pptPath, doc_path: docPath })
      .eq('id', team.id);

    if (updateErr) throw updateErr;

    res.json({ message: 'Files uploaded successfully.', ppt_path: pptPath, doc_path: docPath });
  } catch (error) {
    console.error('Team File Upload Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ----------------------------------------------------
// STUDENT NOTES / NOTICES
// ----------------------------------------------------
app.get('/api/student/notes', requireAuth, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const { data: notes, error: notesErr } = await supabase
      .from('student_notes')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: false });

    if (notesErr) throw notesErr;

    res.json({ notes });
  } catch (error) {
    console.error('Fetch Notes Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ----------------------------------------------------
// ADMINISTRATOR ENDPOINTS
// ----------------------------------------------------

// List all students
app.get('/api/admin/students', requireAdmin, async (req, res) => {
  try {
    const { data: students, error: studentsErr } = await supabase
      .from('users')
      .select('id, name, email, role, profile_pic, semester, created_at')
      .eq('role', 'student');

    if (studentsErr) throw studentsErr;

    res.json({ students });
  } catch (error) {
    console.error('Admin Students Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
    const { data: user, error: getErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    if (getErr || !user) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const { data: emailConflict, error: conflictErr } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .neq('id', studentId)
      .maybeSingle();

    if (conflictErr) throw conflictErr;
    if (emailConflict) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({
        name,
        email: email.toLowerCase(),
        role: role || user.role,
        semester: semester || user.semester
      })
      .eq('id', studentId);

    if (updateErr) throw updateErr;

    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    console.error('Admin Edit Student Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete student account
app.delete('/api/admin/students/:id', requireAdmin, async (req, res) => {
  const studentId = req.params.id;

  try {
    const { error: deleteErr, count } = await supabase
      .from('users')
      .delete({ count: 'exact' })
      .eq('id', studentId);

    if (deleteErr) throw deleteErr;
    if (count === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Admin Delete Student Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// List all registered teams with members
app.get('/api/admin/teams', requireAdmin, async (req, res) => {
  try {
    const { data: teams, error: teamsErr } = await supabase
      .from('teams')
      .select('*, leader:users!inner(name, email)')
      .order('created_at', { ascending: false });

    if (teamsErr) throw teamsErr;

    const formattedTeams = (teams || []).map(t => ({
      id: t.id,
      team_name: t.team_name,
      problem_type: t.problem_type,
      problem_statement: t.problem_statement,
      leader_id: t.leader_id,
      status: t.status,
      ppt_path: t.ppt_path,
      doc_path: t.doc_path,
      pitch_order: t.pitch_order,
      pitch_completed: t.pitch_completed,
      pitch_time: t.pitch_time,
      created_at: t.created_at,
      leader_name: t.leader.name,
      leader_email: t.leader.email
    }));

    for (const team of formattedTeams) {
      const { data: members, error: memErr } = await supabase
        .from('team_members')
        .select('name, email, roll_no, phone_no')
        .eq('team_id', team.id);

      if (memErr) throw memErr;
      team.members = members || [];
    }

    res.json({ teams: formattedTeams });
  } catch (error) {
    console.error('Admin Fetch Teams Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
    const { error: statusErr, count } = await supabase
      .from('teams')
      .update({ status })
      .eq('id', teamId);

    if (statusErr) throw statusErr;
    res.json({ message: `Team status updated to: ${status}` });
  } catch (error) {
    console.error('Admin Update Team Status Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
    const { data: conflict, error: conflictErr } = await supabase
      .from('teams')
      .select('*')
      .eq('team_name', team_name)
      .neq('id', teamId)
      .maybeSingle();

    if (conflictErr) throw conflictErr;
    if (conflict) {
      return res.status(400).json({ error: 'Team name already in use' });
    }

    const { error: updateErr } = await supabase
      .from('teams')
      .update({ team_name, problem_type, problem_statement })
      .eq('id', teamId);

    if (updateErr) throw updateErr;

    res.json({ message: 'Team details updated successfully' });
  } catch (error) {
    console.error('Admin Edit Team Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete team
app.delete('/api/admin/teams/:id', requireAdmin, async (req, res) => {
  const teamId = req.params.id;

  try {
    const { error: deleteErr } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (deleteErr) throw deleteErr;
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Admin Delete Team Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
    const { data: student, error: studentErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', studentId)
      .eq('role', 'student')
      .maybeSingle();

    if (studentErr || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let imagePath = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const storagePath = `notes/note-${studentId}-${Date.now()}${ext}`;
      imagePath = await uploadToSupabase(req.file.buffer, 'uploads', storagePath, req.file.mimetype);
    }

    const { error: insertErr } = await supabase
      .from('student_notes')
      .insert({
        student_id: studentId,
        note_text,
        image_path: imagePath
      });

    if (insertErr) throw insertErr;

    res.status(201).json({ message: 'Note added to student dashboard successfully' });
  } catch (error) {
    console.error('Admin Add Note Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete dashboard note
app.delete('/api/admin/notes/:id', requireAdmin, async (req, res) => {
  const noteId = req.params.id;

  try {
    const { error: deleteErr } = await supabase
      .from('student_notes')
      .delete()
      .eq('id', noteId);

    if (deleteErr) throw deleteErr;
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Admin Delete Note Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ----------------------------------------------------
// PITCH TIMETABLE ENDPOINTS
// ----------------------------------------------------

// Get all approved teams ordered by pitch order
app.get('/api/timetable', requireAuth, async (req, res) => {
  try {
    const { data: teams, error: teamsErr } = await supabase
      .from('teams')
      .select('id, team_name, problem_type, problem_statement, leader_id, status, pitch_order, pitch_completed, pitch_time')
      .eq('status', 'approved')
      .order('pitch_order', { ascending: true });

    if (teamsErr) throw teamsErr;

    res.json({ teams: teams || [] });
  } catch (error) {
    console.error('Fetch Timetable Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update timetable (Admin only)
app.put('/api/admin/timetable', requireAdmin, async (req, res) => {
  const { schedule } = req.body;
  if (!Array.isArray(schedule)) {
    return res.status(400).json({ error: 'Schedule must be an array' });
  }
  try {
    for (const item of schedule) {
      const { error: updateErr } = await supabase
        .from('teams')
        .update({
          pitch_order: item.pitch_order,
          pitch_time: item.pitch_time,
          pitch_completed: item.pitch_completed
        })
        .eq('id', item.teamId);

      if (updateErr) throw updateErr;
    }
    res.json({ message: 'Timetable updated successfully' });
  } catch (error) {
    console.error('Update Timetable Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get next pitch turn (Next pending team)
app.get('/api/timetable/next-turn', requireAuth, async (req, res) => {
  try {
    const { data: nextTeam, error: nextErr } = await supabase
      .from('teams')
      .select('id, team_name, problem_type, problem_statement, leader_id, status, pitch_order, pitch_completed, pitch_time')
      .eq('status', 'approved')
      .eq('pitch_completed', false)
      .order('pitch_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextErr) throw nextErr;

    res.json({ nextTeam: nextTeam || null });
  } catch (error) {
    console.error('Fetch Next Turn Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ----------------------------------------------------
// COMPETITION CONFIGURATION ENDPOINTS
// ----------------------------------------------------

// Get active configuration (deadline and stages)
app.get('/api/competition/config', async (req, res) => {
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

  try {
    const { data: deadlineRow, error: dlErr } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'countdown_deadline')
      .maybeSingle();

    const { data: stagesRow, error: stErr } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'stages')
      .maybeSingle();

    if (dlErr) throw dlErr;
    if (stErr) throw stErr;

    res.json({
      countdown_deadline: deadlineRow ? deadlineRow.value : defaultDeadline,
      stages: stagesRow ? JSON.parse(stagesRow.value) : defaultStages
    });
  } catch (error) {
    console.warn('Database config settings missing/failed, returning defaults:', error.message);
    res.json({
      countdown_deadline: defaultDeadline,
      stages: defaultStages
    });
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
    
    const { error: dlErr } = await supabase
      .from('settings')
      .upsert({ key: 'countdown_deadline', value: countdown_deadline });

    const { error: stErr } = await supabase
      .from('settings')
      .upsert({ key: 'stages', value: stagesStr });

    if (dlErr) throw dlErr;
    if (stErr) throw stErr;
    
    res.json({ message: 'Competition settings updated successfully' });
  } catch (error) {
    console.error('Update Config Error:', error);
    res.status(500).json({ error: 'Internal server error or invalid stages format', details: formatDbError(error) });
  }
});

// Start Express Server locally
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
