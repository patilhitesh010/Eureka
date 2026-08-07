// Student Dashboard Controller

let currentUser = null;

// Problem Statement Predefined Options
const PREDEFINED_PROBLEMS = [
  "1. Small Business Owners Can't Use AI Properly",
  "2. AI Needs Too Much Electricity and Space",
  "3. Creating Content for Different Platforms Takes Too Long",
  "4. Finding the Right People for Special Jobs",
  "5. Students Can't Find Affordable Housing",
  "6. Rural Artisans Are Cut Off from Global Markets",
  "7. Women Face Safety Risks in Public Transport",
  "8. Elderly Citizens Lack Reliable Daily Assistance",
  "9. Rural Areas Face Delays in Essential Deliveries",
  "10. Local Hidden Gems Lack Visibility to Tourists",
  "11. Community Recycling is Inconvenient and Unrewarding",
  "12. Low-Cost High-Level Tracking System for Packages",
  "13. Real-Time Public Transport Tracking for Small Cities",
  "14. Automated Student Attendance Monitoring and Analytics System for Colleges",
  "15. Smart Classroom & Timetable Scheduler",
  "16. Smart Inventory & Theft Prevention for Retail Stores",
  "17. Smart Water Tank & Leakage Detection System",
  "18. Universal Smart Medicine Box",
  "19. AI-Based Vehicle Health Device",
  "20. Smart Construction Site Monitoring",
  "21. Cold Chain in a Box",
  "22. Earthquake-Stabilised Dialysis System for Patient Safety During Seismic Events",
  "23. Non-Revenue Loss in Water Supply & Water Conservation Awareness",
  "24. Digital Mental Health and Psychological Support System for Students in Higher Education",
  "25. Smart Traffic Management System for Urban Congestion",
  "26. Automated Compliance Checker for Legal Metrology Declarations on E-Commerce Platforms",
  "27. Crowdsourced Civic Issue Reporting and Resolution System",
  "28. Platform Matching Blood/Organ Donors with Recipients in Real-Time",
  "29. Data Breach Exposure Checker with Actionable Remediation Steps",
  "30. AI-Powered Playlist Generator Based on Mood Detected from Text/Voice",
  "31. Micro-Investment App for Users to Round Up Purchases into Savings",
  "32. Child Safety App for Monitoring App Usage Without Invasive Spying",
  "33. Fair-Trade Certification Verification via Blockchain",
  "34. Carbon Footprint Tracker for Daily Consumer Purchases",
  "35. Automated Student Attendance Monitoring and Analytics System for Colleges",
  "36. Digital India 2.0: AI for Rural Transformation",
  "37. The Future Smart City Challenge",
  "38. Climate Crisis Innovation Challenge",
  "39. Healthcare Beyond Hospitals",
  "40. The Impossible Challenge: Reinvent the Internet"
];

document.addEventListener('DOMContentLoaded', () => {
  verifySessionAndInit();
});

// Authenticate session and load data
function verifySessionAndInit() {
  fetch('/api/auth/me')
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
        document.getElementById('profile-avatar-preview').src = currentUser.profile_pic;
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

// ----------------------------------------------------
// PROFILE FORM SUBMISSION
// ----------------------------------------------------
const profileForm = document.getElementById('profile-form');
if (profileForm) {
  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAlert('dashboard-alert');
    
    const formData = new FormData(profileForm);
    
    fetch('/api/profile', {
      method: 'PUT',
      body: formData // Send as multipart form data
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
        document.getElementById('profile-avatar-preview').src = currentUser.profile_pic;
      }
      document.getElementById('profile-password').value = ''; // clear password input
    })
    .catch((err) => {
      showAlert('dashboard-alert', err.message, 'error');
    });
  });
}

// ----------------------------------------------------
// LOAD TEAM REGISTRATION DETAILS
// ----------------------------------------------------
function loadTeamStatus() {
  const teamCard = document.getElementById('team-card');
  
  fetch('/api/team/my-team')
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
      <td>Member</td>
    </tr>
  `).join('');

  // Build file upload section (only visible when team is approved AND role is leader)
  let fileSection = '';
  if (team.status === 'approved' && team.role_in_team === 'leader') {
    const pptInfo = team.ppt_path
      ? `<a href="${team.ppt_path}" target="_blank" style="color:var(--primary);">📎 View Uploaded PPT</a>`
      : '<span style="color:var(--text-muted);">Not uploaded yet</span>';
    const docInfo = team.doc_path
      ? `<a href="${team.doc_path}" target="_blank" style="color:var(--primary);">📎 View Uploaded Document</a>`
      : '<span style="color:var(--text-muted);">Not uploaded yet</span>';

    fileSection = `
      <div id="file-upload-section" style="margin-top:30px; border-top:1px solid var(--panel-border); padding-top:25px;">
        <h4 style="color:var(--text-highlight); font-size:16px; margin-bottom:15px;">📁 Submit Files</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:12px;">
          <div>
            <p style="font-size:13px; margin-bottom:5px;">Presentation (PPT/PPTX/PDF):</p>
            ${pptInfo}
          </div>
          <div>
            <p style="font-size:13px; margin-bottom:5px;">Supporting Document (DOC/DOCX/PDF):</p>
            ${docInfo}
          </div>
        </div>
        <form id="file-upload-form" enctype="multipart/form-data">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
            <div>
              <label style="font-size:13px; font-weight:600;">Upload / Replace PPT</label>
              <input type="file" name="presentation" accept=".ppt,.pptx,.pdf" class="form-control" style="margin-top:6px;">
            </div>
            <div>
              <label style="font-size:13px; font-weight:600;">Upload / Replace Document</label>
              <input type="file" name="document" accept=".doc,.docx,.pdf" class="form-control" style="margin-top:6px;">
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;">Upload Files</button>
        </form>
        <div id="file-upload-alert"></div>
      </div>
    `;
  } else if (team.status === 'pending') {
    fileSection = `<p style="margin-top:25px; font-size:13px; color:var(--text-muted); text-align:center;">📋 File uploads (PPT &amp; documents) will be enabled once your team is <strong>approved</strong> by an administrator.</p>`;
  } else if (team.status === 'rejected') {
    fileSection = `<p style="margin-top:25px; font-size:13px; color:var(--error); text-align:center;">❌ Your team registration was rejected. File uploads are not available.</p>`;
  }

  teamCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--panel-border); padding-bottom: 15px; margin-bottom: 20px;">
      <h3 style="font-weight: 700;">🚀 Team: ${escapeHtml(team.team_name)}</h3>
      <span class="badge ${badgeClass}">${team.status}</span>
    </div>
    
    <div style="margin-bottom: 25px; padding: 15px; background: rgba(168, 85, 247, 0.05); border: 1px solid var(--primary); border-radius: 8px;">
      <h4 style="color: var(--primary); margin-bottom: 10px; font-size: 16px;">📚 Resource Materials</h4>
      <p style="font-size: 13px; margin-bottom: 10px;">Download the problem statements and sample PPT to help prepare your submission.</p>
      <div style="display: flex; gap: 15px;">
        <a href="Eureka_Problem_Statements.pdf" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration: none;">📄 Problem Statements PDF</a>
        <a href="Sample_PPT.pdf" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration: none;">📊 Sample PPT</a>
      </div>
    </div>

    <div style="margin-bottom: 25px;">
      <p style="font-size: 14px; margin-bottom: 10px;"><strong>Competition Track:</strong> <span style="text-transform: capitalize; color: var(--primary);">${team.problem_type} Track</span></p>
      <p style="font-size: 14px;"><strong>Problem Statement:</strong></p>
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); padding: 15px; margin-top: 5px; font-size: 14px; white-space: pre-line;">${escapeHtml(team.problem_statement)}</div>
    </div>

    <h4 style="color: var(--text-highlight); margin-bottom: 10px; font-size: 16px;">Team Members</h4>
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Roll No</th>
            <th>Phone No</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${escapeHtml(team.leader.name)}</strong> (You)</td>
            <td>${escapeHtml(team.leader.email)}</td>
            <td>—</td>
            <td>—</td>
            <td><span style="color: var(--primary); font-weight: bold;">Team Leader</span></td>
          </tr>
          ${memberRows}
        </tbody>
      </table>
    </div>

    ${fileSection}
    
    <p style="font-size: 12px; color: var(--text-muted); margin-top: 25px; text-align: center;">
      ${team.role_in_team === 'leader' 
        ? 'As the Team Leader, you can update team profiles. For changes to problem statements or membership, contact an administrator.' 
        : 'Team details can only be modified by the registered Team Leader or an Organizer.'}
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
    <h3 style="margin-bottom: 20px; font-weight: 700; border-bottom: 1px solid var(--panel-border); padding-bottom: 10px;">🚀 Team Registration</h3>
    
    <div style="margin-bottom: 25px; padding: 15px; background: rgba(168, 85, 247, 0.05); border: 1px solid var(--primary); border-radius: 8px;">
      <h4 style="color: var(--primary); margin-bottom: 10px; font-size: 16px;">📚 Resource Materials</h4>
      <p style="font-size: 13px; margin-bottom: 10px;">Download the problem statements and sample PPT to help prepare your submission.</p>
      <div style="display: flex; gap: 15px;">
        <a href="Eureka_Problem_Statements.pdf" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration: none;">📄 Problem Statements PDF</a>
        <a href="Sample_PPT.pdf" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration: none;">📊 Sample PPT</a>
      </div>
    </div>

    <form id="team-register-form">
      <div class="form-group">
        <label for="team_name">Team Name</label>
        <input type="text" id="team_name" class="form-control" placeholder="Enter your startup name" required>
      </div>

      <div class="form-group">
        <label for="problem_type">Challenge Track</label>
        <select id="problem_type" class="form-control" required onchange="toggleTrackView()">
          <option value="predefined">Predefined Problem Statement</option>
          <option value="custom">Custom Innovation Project</option>
        </select>
      </div>

      <!-- Predefined Selection -->
      <div class="form-group" id="predefined-select-group">
        <label for="predefined_statement">Problem Statement Selector</label>
        <select id="predefined_statement" class="form-control">
          ${PREDEFINED_PROBLEMS.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>

      <!-- Custom Description -->
      <div class="form-group" id="custom-statement-group" style="display: none;">
        <label for="custom_statement">Define Your Problem Statement</label>
        <textarea id="custom_statement" class="form-control" rows="4" placeholder="Describe the problem, target audience, and your proposed solution..."></textarea>
      </div>

      <p style="font-size:13px; color:var(--text-muted); margin-top:10px; padding:10px; border:1px solid var(--panel-border);">📋 PPT and document uploads will be available on your dashboard <strong>after your team is approved</strong> by an administrator.</p>

      <!-- Team Members Section -->
      <div style="margin: 30px 0 20px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--panel-border); padding-top: 20px;">
        <h4 style="color: var(--text-highlight); font-size: 16px;">Team Members (1 to 5)</h4>
        <button type="button" class="btn btn-secondary btn-sm" onclick="addMemberInput()">+ Add Member</button>
      </div>

      <div id="members-list-container" class="members-list">
        <!-- Dynamic member cards are appended here -->
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 30px;">Submit Registration</button>
    </form>
  `;
  
  // Add first member input automatically (minimum is 1 member)
  addMemberInput();
  
  // Bind form submission
  const registerForm = document.getElementById('team-register-form');
  registerForm.addEventListener('submit', handleTeamSubmit);
}

// Toggle display of predefined dropdown vs custom text area
window.toggleTrackView = function() {
  const typeSelect = document.getElementById('problem_type');
  const predefinedGroup = document.getElementById('predefined-select-group');
  const customGroup = document.getElementById('custom-statement-group');
  
  if (typeSelect.value === 'predefined') {
    predefinedGroup.style.display = 'block';
    customGroup.style.display = 'none';
  } else {
    predefinedGroup.style.display = 'none';
    customGroup.style.display = 'block';
  }
};

// Dynamic adding of team member inputs (includes roll number)
window.addMemberInput = function() {
  const container = document.getElementById('members-list-container');
  const count = container.children.length;
  
  if (count >= 5) {
    showAlert('dashboard-alert', 'A team can have a maximum of 5 members.', 'error');
    return;
  }
  
  memberCounter++;
  const memberId = memberCounter;
  
  const memberDiv = document.createElement('div');
  memberDiv.className = 'member-item';
  memberDiv.id = `member-card-${memberId}`;
  memberDiv.innerHTML = `
    <div class="member-header">
      <h4>Team Member #${count + 1}</h4>
      ${count > 0 ? `<button type="button" class="remove-member" onclick="removeMemberInput(${memberId})">Remove</button>` : ''}
    </div>
    <div class="form-row member-form-grid">
      <div>
        <input type="text" placeholder="Full Name" class="form-control member-name" required>
      </div>
      <div>
        <input type="email" placeholder="Email Address" class="form-control member-email" required>
      </div>
      <div>
        <input type="text" placeholder="Roll No" class="form-control member-roll" required>
      </div>
      <div>
        <input type="tel" placeholder="Phone No" class="form-control member-phone" required>
      </div>
    </div>
  `;
  container.appendChild(memberDiv);
  updateMemberHeaders();
};

window.removeMemberInput = function(memberId) {
  const elem = document.getElementById(`member-card-${memberId}`);
  if (elem) {
    elem.remove();
    updateMemberHeaders();
  }
};

function updateMemberHeaders() {
  const container = document.getElementById('members-list-container');
  Array.from(container.children).forEach((card, idx) => {
    card.querySelector('.member-header h4').innerText = `Team Member #${idx + 1}`;
  });
}

// Handle team submission (multipart form to include files and roll numbers)
function handleTeamSubmit(e) {
  e.preventDefault();
  clearAlert('dashboard-alert');
  
  const team_name = document.getElementById('team_name').value.trim();
  const problem_type = document.getElementById('problem_type').value;
  
  let problem_statement = '';
  if (problem_type === 'predefined') {
    problem_statement = document.getElementById('predefined_statement').value;
  } else {
    problem_statement = document.getElementById('custom_statement').value.trim();
    if (!problem_statement) {
      showAlert('dashboard-alert', 'Please define your custom problem statement.', 'error');
      return;
    }
  }

  // Compile members (roll_no and phone_no are required)
  const memberCards = document.querySelectorAll('.member-item');
  const members = [];
  let validationError = null;
  
  memberCards.forEach(card => {
    const name = card.querySelector('.member-name').value.trim();
    const email = card.querySelector('.member-email').value.trim();
    const roll_no = card.querySelector('.member-roll') ? card.querySelector('.member-roll').value.trim() : '';
    const phone_no = card.querySelector('.member-phone') ? card.querySelector('.member-phone').value.trim() : '';
    if (!name || !email) return;
    if (!roll_no) { validationError = `Roll number is required for member: ${name}`; return; }
    if (!phone_no) { validationError = `Phone number is required for member: ${name}`; return; }
    members.push({ name, email, roll_no, phone_no });
  });

  if (validationError) {
    showAlert('dashboard-alert', validationError, 'error');
    return;
  }

  if (members.length < 1 || members.length > 5) {
    showAlert('dashboard-alert', 'Team must contain between 1 and 5 members.', 'error');
    return;
  }

  // Send as JSON (no files at registration)
  fetch('/api/team/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_name, problem_type, problem_statement, members })
  })
  .then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit registration');
    return data;
  })
  .then(() => {
    showAlert('dashboard-alert', 'Team registered successfully! Confirmation email has been sent.', 'success');
    setTimeout(loadTeamStatus, 2000);
  })
  .catch((err) => {
    showAlert('dashboard-alert', err.message, 'error');
  });
}

// Handle file upload after team approval
function handleFileUpload(e) {
  e.preventDefault();
  const alertEl = document.getElementById('file-upload-alert');
  if (alertEl) alertEl.innerHTML = '';

  const form = document.getElementById('file-upload-form');
  const formData = new FormData(form);

  // Check at least one file selected
  const pptFile = form.querySelector('input[name="presentation"]').files[0];
  const docFile = form.querySelector('input[name="document"]').files[0];
  if (!pptFile && !docFile) {
    if (alertEl) alertEl.innerHTML = '<p style="color:var(--error); margin-top:8px;">Please select at least one file to upload.</p>';
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  fetch('/api/team/upload-files', {
    method: 'POST',
    body: formData
  })
  .then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  })
  .then(() => {
    if (alertEl) alertEl.innerHTML = '<p style="color:var(--success, #22c55e); margin-top:8px;">✅ Files uploaded successfully!</p>';
    setTimeout(loadTeamStatus, 1500);
  })
  .catch((err) => {
    if (alertEl) alertEl.innerHTML = `<p style="color:var(--error); margin-top:8px;">${err.message}</p>`;
    if (submitBtn) submitBtn.disabled = false;
  });
}

// ----------------------------------------------------
// LOAD NOTICES AND ADMIN NOTES
// ----------------------------------------------------
function loadStudentNotes() {
  const container = document.getElementById('notes-container');
  
  fetch('/api/student/notes')
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load notices');
      return data;
    })
    .then((data) => {
      if (data.notes && data.notes.length > 0) {
        container.innerHTML = data.notes.map(note => `
          <div class="note-card">
            <p style="font-size: 14px; white-space: pre-line;">${escapeHtml(note.note_text)}</p>
            ${note.image_path ? `<img src="${note.image_path}" alt="Notice Attachment" onerror="this.style.display='none'">` : ''}
            <div class="note-meta">
              <span>Organizer Office</span>
              <span>${new Date(note.created_at).toLocaleString()}</span>
            </div>
          </div>
        `).join('');
      } else {
        container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">No notices or notes assigned to your dashboard.</p>`;
      }
    })
    .catch((err) => {
      container.innerHTML = `<p style="color: var(--error);">${err.message}</p>`;
    });
}

// Escape HTML utility helper
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
