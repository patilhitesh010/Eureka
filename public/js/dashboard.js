// Student Dashboard Controller
// Revamped with premium visuals, drag-and-drop zones, and dynamic preselection

let currentUser = null;

// Problem Statement Predefined Options
const PREDEFINED_PROBLEMS = [
  "PS-01. Small Business Owners Can't Use AI Properly",
  "PS-02. AI Needs Too Much Electricity and Space",
  "PS-03. Creating Content for Different Platforms Takes Too Long",
  "PS-04. Finding the Right People for Special Jobs",
  "PS-05. Students Can't Find Affordable Housing",
  "PS-06. Rural Artisans Are Cut Off from Global Markets",
  "PS-07. Women Face Safety Risks in Public Transport",
  "PS-08. Elderly Citizens Lack Reliable Daily Assistance",
  "PS-09. Rural Areas Face Delays in Essential Deliveries",
  "PS-10. Local Hidden Gems Lack Visibility to Tourists",
  "PS-11. Community Recycling is Inconvenient and Unrewarding",
  "PS-12. Low-Cost High-Level Tracking System for Packages",
  "PS-13. Real-Time Public Transport Tracking for Small Cities",
  "PS-14. Automated Student Attendance Monitoring and Analytics System for Colleges",
  "PS-15. Smart Classroom & Timetable Scheduler",
  "PS-16. Smart Inventory & Theft Prevention for Retail Stores",
  "PS-17. Smart Water Tank & Leakage Detection System",
  "PS-18. Universal Smart Medicine Box",
  "PS-19. AI-Based Vehicle Health Device",
  "PS-20. Smart Construction Site Monitoring",
  "PS-21. Cold Chain in a Box",
  "PS-22. Earthquake-Stabilised Dialysis System for Patient Safety During Seismic Events",
  "PS-23. Non-Revenue Loss in Water Supply & Water Conservation Awareness",
  "PS-24. Digital Mental Health and Psychological Support System for Students in Higher Education",
  "PS-25. Smart Traffic Management System for Urban Congestion",
  "PS-26. Automated Compliance Checker for Legal Metrology Declarations on E-Commerce Platforms",
  "PS-27. Crowdsourced Civic Issue Reporting and Resolution System",
  "PS-28. Platform Matching Blood/Organ Donors with Recipients in Real-Time",
  "PS-29. Data Breach Exposure Checker with Actionable Remediation Steps",
  "PS-30. AI-Powered Playlist Generator Based on Mood Detected from Text/Voice",
  "PS-31. Micro-Investment App for Users to Round Up Purchases into Savings",
  "PS-32. Child Safety App for Monitoring App Usage Without Invasive Spying",
  "PS-33. Fair-Trade Certification Verification via Blockchain",
  "PS-34. Carbon Footprint Tracker for Daily Consumer Purchases",
  "PS-35. Automated Student Attendance Monitoring and Analytics System for Colleges",
  "PS-36. Digital India 2.0: AI for Rural Transformation",
  "PS-37. The Future Smart City Challenge",
  "PS-38. Climate Crisis Innovation Challenge",
  "PS-39. Healthcare Beyond Hospitals",
  "PS-40. The Impossible Challenge: Reinvent the Internet"
];

document.addEventListener('DOMContentLoaded', () => {
  verifySessionAndInit();
});

// Authenticate session and load data
function verifySessionAndInit() {
  const apiBase = window.API_BASE || "";
  fetch(apiBase + '/api/auth/me')
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error();
      return data;
    })
    .then((data) => {
      currentUser = data.user;
      if (currentUser.role === 'admin') {
        window.location.href = 'admin.html';
        return;
      }
      
      // Update UI Header
      document.getElementById('user-display-name').innerText = `Leader: ${currentUser.name}`;
      
      // Populate Profile form
      document.getElementById('profile-name-title').innerText = currentUser.name;
      document.getElementById('profile-name').value = currentUser.name;
      document.getElementById('profile-email').value = currentUser.email;
      
      if (currentUser.profile_pic) {
        document.getElementById('profile-avatar-preview').src = apiBase + currentUser.profile_pic;
      }
      
      // Bind Avatar Upload Preview
      const avatarInput = document.getElementById('profile_pic');
      avatarInput.addEventListener('change', () => {
        const file = avatarInput.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            document.getElementById('profile-avatar-preview').src = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      });

      // Load specific dashboard details
      loadTeamStatus();
      loadStudentNotes();
    })
    .catch(() => {
      window.location.href = 'login.html';
    });
}

// PROFILE FORM SUBMISSION
const profileForm = document.getElementById('profile-form');
if (profileForm) {
  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAlert('dashboard-alert');
    
    const formData = new FormData(profileForm);
    const apiBase = window.API_BASE || "";
    
    fetch(apiBase + '/api/profile', {
      method: 'PUT',
      body: formData
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      return data;
    })
    .then((data) => {
      showAlert('dashboard-alert', 'Profile updated successfully!', 'success');
      
      // Update UI details
      currentUser = data.user;
      document.getElementById('profile-name-title').innerText = currentUser.name;
      document.getElementById('user-display-name').innerText = `Leader: ${currentUser.name}`;
      if (currentUser.profile_pic) {
        document.getElementById('profile-avatar-preview').src = apiBase + currentUser.profile_pic;
      }
      document.getElementById('profile-password').value = ''; // clear password input
    })
    .catch((err) => {
      showAlert('dashboard-alert', err.message, 'error');
    });
  });
}

// LOAD TEAM REGISTRATION DETAILS
function loadTeamStatus() {
  const teamCard = document.getElementById('team-card');
  const apiBase = window.API_BASE || "";
  
  fetch(apiBase + '/api/team/my-team')
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load team data');
      return data;
    })
    .then((data) => {
      if (data.team) {
        renderTeamDetails(data.team);
      } else {
        renderTeamRegistrationForm();
      }
    })
    .catch((err) => {
      teamCard.innerHTML = `<p style="color: var(--error);">${err.message}</p>`;
    });
}

// Render active team details
function renderTeamDetails(team) {
  const teamCard = document.getElementById('team-card');
  const apiBase = window.API_BASE || "";
  
  // Format status badge
  let badgeClass = 'badge-pending';
  if (team.status === 'approved') badgeClass = 'badge-approved';
  if (team.status === 'rejected') badgeClass = 'badge-rejected';
  
  // Format member rows (show roll_no and phone_no)
  const memberRows = team.members.map(m => `
    <tr>
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.email)}</td>
      <td>${escapeHtml(m.roll_no || '—')}</td>
      <td>${escapeHtml(m.phone_no || '—')}</td>
      <td><span style="color: var(--text-muted); font-size:12px;">Participant</span></td>
    </tr>
  `).join('');

  // Build file upload section (only visible when team is approved AND role is leader)
  let fileSection = '';
  if (team.status === 'approved' && team.role_in_team === 'leader') {
    const pptInfo = team.ppt_path
      ? `<a href="${apiBase + team.ppt_path}" target="_blank" style="color:var(--accent); font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">📎 View Uploaded Pitch Deck</a>`
      : '<span style="color:var(--text-muted); font-style:italic;">No slides uploaded yet</span>';
    const docInfo = team.doc_path
      ? `<a href="${apiBase + team.doc_path}" target="_blank" style="color:var(--accent); font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">📎 View Uploaded Document</a>`
      : '<span style="color:var(--text-muted); font-style:italic;">No reports uploaded yet</span>';

    fileSection = `
      <div id="file-upload-section" style="margin-top:35px; border-top:1px solid rgba(255,255,255,0.05); padding-top:25px;">
        <h4 style="color:var(--white); font-family: var(--font-display); font-size:16px; margin-bottom:15px; font-weight:700;">📁 Submit Files & Pitch Deck</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; background: rgba(255,255,255,0.01); padding: 15px; border-radius: var(--border-radius-md); border: 1px solid rgba(255,255,255,0.03);">
          <div>
            <p style="font-size:12px; color: var(--text-muted); margin-bottom:5px;">Executive Presentation (.pptx/.pdf):</p>
            ${pptInfo}
          </div>
          <div>
            <p style="font-size:12px; color: var(--text-muted); margin-bottom:5px;">Supporting PDF/Report (.docx/.pdf):</p>
            ${docInfo}
          </div>
        </div>
        
        <form id="file-upload-form" enctype="multipart/form-data" style="display: flex; flex-direction: column; gap: 20px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div>
              <label style="font-size:11px; font-family: var(--font-display); font-weight:700; color: var(--text-highlight); text-transform:uppercase; letter-spacing:0.5px;">Pitch Presentation File</label>
              <input type="file" id="ppt-file-input" name="presentation" accept=".ppt,.pptx,.pdf" class="form-control" style="margin-top:6px;">
            </div>
            <div>
              <label style="font-size:11px; font-family: var(--font-display); font-weight:700; color: var(--text-highlight); text-transform:uppercase; letter-spacing:0.5px;">Project Report File</label>
              <input type="file" id="doc-file-input" name="document" accept=".doc,.docx,.pdf" class="form-control" style="margin-top:6px;">
            </div>
          </div>
          
          <button type="submit" class="btn btn-primary" style="width:100%;">Upload Submissions</button>
        </form>
        <div id="file-upload-alert" style="margin-top: 15px;"></div>
      </div>
    `;
  } else if (team.status === 'pending') {
    fileSection = `<p style="margin-top:25px; font-size:13px; color:var(--text-muted); text-align:center; padding: 15px; border-radius: var(--border-radius-md); background: rgba(245,158,11,0.03); border: 1px solid rgba(245,158,11,0.15);">📋 Submission upload slots will be unlocked once your team is <strong>approved</strong> by organizers.</p>`;
  } else if (team.status === 'rejected') {
    fileSection = `<p style="margin-top:25px; font-size:13px; color:var(--error); text-align:center; padding: 15px; border-radius: var(--border-radius-md); background: rgba(244,63,94,0.03); border: 1px solid rgba(244,63,94,0.15);">❌ Your team registration was rejected. Submission uploads are locked.</p>`;
  }

  teamCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px; margin-bottom: 20px;">
      <h3 style="font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--white);">🚀 Startup Roster: ${escapeHtml(team.team_name)}</h3>
      <span class="badge ${badgeClass}">${team.status}</span>
    </div>
    
    <div style="margin-bottom: 25px; padding: 20px; background: rgba(168, 85, 247, 0.04); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: var(--border-radius-md); display: flex; flex-direction: column; gap: 12px;">
      <h4 style="color: var(--white); font-family: var(--font-display); font-size: 15px; font-weight: 700;">📚 Guidelines & Slide Template</h4>
      <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Be sure to download the official PPT deck template and integrate E-Cell SIT and NEC partner logos on all slide margins.</p>
      <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 5px;">
        <a href="Eureka2026_PitchDeck_Template.pptx" download class="btn btn-secondary btn-sm" style="text-decoration: none;">📊 Download PPT Template</a>
      </div>
    </div>

    <div style="margin-bottom: 25px;">
      <p style="font-size: 14px; margin-bottom: 8px; color: var(--text-highlight);"><strong>Challenge Category:</strong> <span style="color: var(--primary); font-weight: 700; text-transform: uppercase; font-family: var(--font-mono); font-size:12px;">${team.problem_type} Track</span></p>
      <p style="font-size: 14px; color: var(--text-highlight);"><strong>Locked Problem Statement:</strong></p>
      <div style="background: rgba(11, 8, 19, 0.4); border: 1px solid var(--panel-border); padding: 18px; margin-top: 8px; border-radius: var(--border-radius-md); font-size: 14px; color: var(--text-muted); line-height: 1.6; white-space: pre-line;">${escapeHtml(team.problem_statement)}</div>
    </div>

    <h4 style="color: var(--white); margin-bottom: 12px; font-family: var(--font-display); font-size: 16px; font-weight: 700;">Team Roster Roll</h4>
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Email Address</th>
            <th>Enrollment No</th>
            <th>Mobile Phone</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${escapeHtml(team.leader.name)}</strong> (You)</td>
            <td>${escapeHtml(team.leader.email)}</td>
            <td>—</td>
            <td>—</td>
            <td><span style="color: var(--primary); font-weight: 700; font-family: var(--font-mono); font-size:11px; text-transform:uppercase;">Team Leader</span></td>
          </tr>
          ${memberRows}
        </tbody>
      </table>
    </div>

    ${fileSection}
    
    <p style="font-size: 12px; color: var(--text-muted); margin-top: 30px; text-align: center; font-style: italic;">
      ${team.role_in_team === 'leader' 
        ? 'As the Team Leader, you can update team submissions. For alterations to problem statements or roster records, please contact organizers.' 
        : 'Team settings can only be managed by the registered Team Leader.'}
    </p>
  `;

  // Bind file upload form if present
  const fileUploadForm = document.getElementById('file-upload-form');
  if (fileUploadForm) {
    fileUploadForm.addEventListener('submit', handleFileUpload);
  }
}

// Render dynamic team signup form
let memberCounter = 0;

function renderTeamRegistrationForm() {
  const teamCard = document.getElementById('team-card');
  memberCounter = 0;
  
  teamCard.innerHTML = `
    <h3 style="margin-bottom: 24px; font-family: var(--font-display); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; font-size: 20px; font-weight: 700; color: var(--white);">🚀 Team Registration</h3>
    
    <div style="margin-bottom: 25px; padding: 18px; background: rgba(168, 85, 247, 0.04); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: var(--border-radius-md); display: flex; flex-direction: column; gap: 10px;">
      <h4 style="color: var(--white); font-family: var(--font-display); font-size: 15px; font-weight:700;">📚 Rulebook Manual & Materials</h4>
      <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Familiarize yourself with the 40 predefined problem statements and downlaod slide blueprints before locking your selection.</p>
      <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 5px;">
        <a href="Eureka2026_PitchDeck_Template.pptx" download class="btn btn-secondary btn-sm" style="text-decoration: none;">📊 Pitch Template</a>
      </div>
    </div>

    <form id="team-register-form" style="display: flex; flex-direction: column; gap: 20px;">
      <div class="form-group" style="margin:0;">
        <label for="team_name">Team Name</label>
        <input type="text" id="team_name" class="form-control" placeholder="Enter your startup/project name" required autocomplete="off">
      </div>

      <div class="form-group" style="margin:0;">
        <label for="problem_type">Challenge Track</label>
        <select id="problem_type" class="form-control" required onchange="toggleTrackView()">
          <option value="predefined">Predefined Problem Statement Track</option>
          <option value="custom">Custom Innovation Project Track</option>
        </select>
      </div>

      <!-- Predefined Selection -->
      <div class="form-group" id="predefined-select-group" style="margin:0;">
        <label for="predefined_statement">Problem Statement Selector</label>
        <select id="predefined_statement" class="form-control">
          ${PREDEFINED_PROBLEMS.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>

      <!-- Custom Description -->
      <div class="form-group" id="custom-statement-group" style="display: none; margin:0;">
        <label for="custom_statement">Define Your Custom Problem Statement</label>
        <textarea id="custom_statement" class="form-control" rows="4" placeholder="Describe the problem, target audience, and your proposed startup solution..."></textarea>
      </div>

      <p style="font-size:12px; color:var(--text-muted); padding:12px; border-radius: var(--border-radius-sm); border:1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.01); line-height: 1.5; margin:0;">📋 Note: PPT and project document upload slots will be unlocked on your dashboard immediately <strong>after your team is approved</strong> by organizers.</p>

      <!-- Team Members Section -->
      <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
        <h4 style="color: var(--white); font-family: var(--font-display); font-size: 16px; font-weight: 700;">Roster Members (0 to 4 additional)</h4>
        <button type="button" class="btn btn-secondary btn-sm" onclick="addMemberInput()">+ Add Member</button>
      </div>

      <div id="members-list-container" class="members-list">
        <!-- Dynamic member cards -->
      </div>

      <button type="submit" class="btn btn-primary" style="margin-top: 15px; width: 100%;">Complete Registration</button>
    </form>
  `;

  // Bind submit event
  document.getElementById('team-register-form').addEventListener('submit', handleRegistration);

  // Check if there's a preselected problem from index.html
  const preSelectedCode = sessionStorage.getItem('preselected_problem_code');
  const preSelectedTitle = sessionStorage.getItem('preselected_problem_title');
  if (preSelectedCode && preSelectedTitle) {
    const fullString = `${preSelectedCode}. ${preSelectedTitle}`;
    const selector = document.getElementById('predefined_statement');
    
    // Find matching option in dropdown
    const options = Array.from(selector.options);
    const matchedOpt = options.find(opt => opt.value.startsWith(preSelectedCode));
    if (matchedOpt) {
      selector.value = matchedOpt.value;
    }
    
    // Clean storage
    sessionStorage.removeItem('preselected_problem_code');
    sessionStorage.removeItem('preselected_problem_title');
    
    // Auto-scroll to form selector to highlight selection
    setTimeout(() => {
      selector.scrollIntoView({ behavior: 'smooth', block: 'center' });
      selector.style.borderColor = 'var(--accent)';
      setTimeout(() => selector.style.borderColor = '', 1500);
    }, 400);
  }
}

// Toggle Predefined/Custom tracks
window.toggleTrackView = function() {
  const problemType = document.getElementById('problem_type').value;
  const predefinedGroup = document.getElementById('predefined-select-group');
  const customGroup = document.getElementById('custom-statement-group');
  
  if (problemType === 'predefined') {
    predefinedGroup.style.display = 'block';
    customGroup.style.display = 'none';
    document.getElementById('custom_statement').required = false;
  } else {
    predefinedGroup.style.display = 'none';
    customGroup.style.display = 'block';
    document.getElementById('custom_statement').required = true;
  }
};

// Add member input card
window.addMemberInput = function() {
  const container = document.getElementById('members-list-container');
  if (container.children.length >= 4) {
    showAlert('dashboard-alert', 'Maximum team size is 5 (Leader + 4 members)', 'error');
    return;
  }
  
  memberCounter++;
  const id = `member-${memberCounter}`;
  
  const card = document.createElement('div');
  card.className = 'member-item';
  card.id = id;
  card.innerHTML = `
    <div class="member-header">
      <h4>Roster Member #${container.children.length + 1}</h4>
      <button type="button" class="remove-member" onclick="removeMemberInput('${id}')">Remove</button>
    </div>
    <div class="member-form-grid">
      <div class="form-group" style="margin:0;">
        <input type="text" placeholder="Full Name" class="form-control member-name" required autocomplete="off">
      </div>
      <div class="form-group" style="margin:0;">
        <input type="email" placeholder="Email Address" class="form-control member-email" required autocomplete="off">
      </div>
      <div class="form-group" style="margin:0;">
        <input type="text" placeholder="Enrollment Roll No." class="form-control member-roll" required autocomplete="off">
      </div>
      <div class="form-group" style="margin:0;">
        <input type="tel" placeholder="Mobile Phone No." class="form-control member-phone" required autocomplete="off">
      </div>
    </div>
  `;
  container.appendChild(card);
  
  // Re-index titles of members
  reindexMemberTitles();
};

window.removeMemberInput = function(id) {
  const card = document.getElementById(id);
  if (card) {
    card.remove();
    reindexMemberTitles();
  }
};

function reindexMemberTitles() {
  const container = document.getElementById('members-list-container');
  Array.from(container.children).forEach((card, index) => {
    card.querySelector('h4').innerText = `Roster Member #${index + 1}`;
  });
}

// HANDLE FILE UPLOAD SUBMISSIONS
function handleFileUpload(e) {
  e.preventDefault();
  clearAlert('file-upload-alert');
  
  const form = document.getElementById('file-upload-form');
  const formData = new FormData(form);
  const apiBase = window.API_BASE || "";
  
  // Verify that at least one file is chosen
  const pptInput = document.getElementById('ppt-file-input');
  const docInput = document.getElementById('doc-file-input');
  
  if (!pptInput.files[0] && !docInput.files[0]) {
    showAlert('file-upload-alert', 'Please select at least one file to upload.', 'error');
    return;
  }
  
  fetch(apiBase + '/api/team/upload-files', {
    method: 'POST',
    body: formData
  })
  .then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload submissions');
    return data;
  })
  .then((data) => {
    showAlert('file-upload-alert', 'Files uploaded successfully!', 'success');
    // Reload team card to show new file links
    setTimeout(loadTeamStatus, 1500);
  })
  .catch((err) => {
    showAlert('file-upload-alert', err.message, 'error');
  });
}

// TEAM REGISTRATION SUBMISSION
function handleRegistration(e) {
  e.preventDefault();
  clearAlert('dashboard-alert');
  
  const teamName = document.getElementById('team_name').value.trim();
  const problemType = document.getElementById('problem_type').value;
  
  let problemStatement = "";
  if (problemType === 'predefined') {
    problemStatement = document.getElementById('predefined_statement').value;
  } else {
    problemStatement = document.getElementById('custom_statement').value.trim();
  }
  
  // Aggregate member rosters
  const memberCards = document.querySelectorAll('.member-item');
  const members = [];
  
  for (const card of memberCards) {
    const name = card.querySelector('.member-name').value.trim();
    const email = card.querySelector('.member-email').value.trim();
    const roll_no = card.querySelector('.member-roll').value.trim();
    const phone_no = card.querySelector('.member-phone').value.trim();
    
    if (!name || !email || !roll_no || !phone_no) {
      showAlert('dashboard-alert', 'All member fields are mandatory.', 'error');
      return;
    }
    members.push({ name, email, roll_no, phone_no });
  }
  
  const payload = {
    team_name: teamName,
    problem_type: problemType,
    problem_statement: problemStatement,
    members: members
  };
  
  const apiBase = window.API_BASE || "";
  
  fetch(apiBase + '/api/team/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete registration');
    return data;
  })
  .then((data) => {
    showAlert('dashboard-alert', 'Team registered successfully!', 'success');
    setTimeout(loadTeamStatus, 1500);
  })
  .catch((err) => {
    showAlert('dashboard-alert', err.message, 'error');
  });
}

// LOAD ORGANIZER ANNOUNCEMENTS
function loadStudentNotes() {
  const container = document.getElementById('notes-container');
  const apiBase = window.API_BASE || "";
  
  fetch(apiBase + '/api/student/notes')
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error();
      return data;
    })
    .then((data) => {
      if (!data.notes || data.notes.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px 0; font-size:13px;">No announcements from organizers yet.</p>`;
        return;
      }
      
      container.innerHTML = data.notes.map(note => {
        const timeStr = new Date(note.created_at).toLocaleString();
        let imgHtml = '';
        if (note.image_path) {
          imgHtml = `<img src="${apiBase + note.image_path}" alt="Notice image" onerror="this.style.display='none'">`;
        }
        
        return `
          <div class="note-item">
            <div class="note-header">
              <span>Organizer Announcement</span>
              <span class="note-time">${timeStr}</span>
            </div>
            <div class="note-text">${escapeHtml(note.note_text)}</div>
            ${imgHtml}
          </div>
        `;
      }).join('');
    })
    .catch(() => {
      container.innerHTML = `<p style="color: var(--error); font-size:13px; text-align:center;">Failed to sync announcements.</p>`;
    });
}

// UTILITY HELPERS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showAlert(containerId, message, type = 'error') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="alert alert-${type}">
      <span>${type === 'success' ? '✔' : '⚠'} ${message}</span>
    </div>
  `;
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearAlert(containerId) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}
