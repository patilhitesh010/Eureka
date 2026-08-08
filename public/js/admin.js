// Organizer Dashboard Controller
// Revamped with API base URL fallbacks, modern modals, and search indexing

let studentsList = [];
let teamsList = [];
let activeEditTarget = null; // Stores target edit object ({type: 'student'|'team', id: ...})

document.addEventListener('DOMContentLoaded', () => {
  verifySessionAndInit();
});

// Authenticate session and check admin privileges
function verifySessionAndInit() {
  const apiBase = window.API_BASE || "";
  fetch(apiBase + '/api/auth/me')
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error();
      return data;
    })
    .then((data) => {
      if (data.user.role !== 'admin') {
        window.location.href = 'dashboard.html';
        return;
      }
      
      // Update UI Header
      document.getElementById('user-display-name').innerText = `Admin: ${data.user.name}`;
      
      // Setup tab trigger events
      setupTabListeners();
      
      // Setup search listeners
      setupSearchListeners();
      
      // Bind Notice Dispatch Submit
      document.getElementById('notice-form').addEventListener('submit', handleNoticeSubmit);
      
      // Load initial dashboard data
      loadDashboardData();
      
      // Load competition settings
      loadCompetitionConfig();
    })
    .catch(() => {
      window.location.href = 'login.html';
    });
}

// Setup Tab switching listeners
function setupTabListeners() {
  const triggers = document.querySelectorAll('.tab-trigger');
  const contents = document.querySelectorAll('.tab-content');
  
  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      triggers.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      trigger.classList.add('active');
      const tabId = trigger.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// Setup Live Table search filters
function setupSearchListeners() {
  const teamSearch = document.getElementById('team-search');
  if (teamSearch) {
    teamSearch.addEventListener('input', (e) => {
      renderTeamsTable(e.target.value.toLowerCase().trim());
    });
  }
  
  const studentSearch = document.getElementById('student-search');
  if (studentSearch) {
    studentSearch.addEventListener('input', (e) => {
      renderStudentsTable(e.target.value.toLowerCase().trim());
    });
  }
}

// Fetch all database records for admin
async function loadDashboardData() {
  const apiBase = window.API_BASE || "";
  clearAlert('admin-alert');
  
  try {
    const [studentsRes, teamsRes] = await Promise.all([
      fetch(apiBase + '/api/admin/students'),
      fetch(apiBase + '/api/admin/teams')
    ]);
    
    if (!studentsRes.ok || !teamsRes.ok) throw new Error('Failed to retrieve database directories.');
    
    const studentsData = await studentsRes.json();
    const teamsData = await teamsRes.json();
    
    studentsList = studentsData.students || [];
    teamsList = teamsData.teams || [];
    
    // Refresh stats counter cards
    calculateStats();
    
    // Populate recipient dropdown in announcements tab
    populateRecipientDropdown();
    
    // Render Tables
    renderTeamsTable();
    renderStudentsTable();
  } catch (err) {
    showAlert('admin-alert', err.message, 'error');
  }
}

// Computes directory statistics
function calculateStats() {
  document.getElementById('stat-total-teams').innerText = teamsList.length;
  document.getElementById('stat-total-students').innerText = studentsList.length;
  
  const approvedCount = teamsList.filter(t => t.status === 'approved').length;
  const pendingCount = teamsList.filter(t => t.status === 'pending').length;
  
  document.getElementById('stat-approved-teams').innerText = approvedCount;
  document.getElementById('stat-pending-teams').innerText = pendingCount;
}

// Render Startup Teams directory
function renderTeamsTable(filter = '') {
  const tbody = document.getElementById('teams-tbody');
  const apiBase = window.API_BASE || "";
  
  const filtered = teamsList.filter(t => {
    return t.team_name.toLowerCase().includes(filter) ||
           t.leader_name.toLowerCase().includes(filter) ||
           t.leader_email.toLowerCase().includes(filter) ||
           t.problem_statement.toLowerCase().includes(filter);
  });
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No startup teams matched search query.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = filtered.map(t => {
    // Member rows
    const membersHtml = t.members && t.members.length > 0
      ? t.members.map(m => `• ${escapeHtml(m.name)} (${escapeHtml(m.email)}, Roll: ${escapeHtml(m.roll_no || '—')}, Mob: ${escapeHtml(m.phone_no || '—')})`).join('<br>')
      : '<span style="color:var(--text-muted); font-style:italic;">No team members registered</span>';
      
    // File downloads links
    const pptLink = t.ppt_path 
      ? `<a href="${apiBase + t.ppt_path}" target="_blank" style="color:var(--primary); font-weight:700; text-decoration:none;">📎 Slide Deck</a>` 
      : '<span style="color:var(--text-muted); font-size:12px; font-style:italic;">No Slide</span>';
    const docLink = t.doc_path 
      ? `<a href="${apiBase + t.doc_path}" target="_blank" style="color:var(--accent); font-weight:700; text-decoration:none;">📎 Report Document</a>` 
      : '<span style="color:var(--text-muted); font-size:12px; font-style:italic;">No Report</span>';

    // Status action controls
    const isApproved = t.status === 'approved';
    const isRejected = t.status === 'rejected';
    const isPending = t.status === 'pending';

    return `
      <tr>
        <td>
          <div style="font-weight:700; color:var(--white);">${escapeHtml(t.team_name)}</div>
          <div style="font-size:11px; margin-top:6px; color:var(--text-muted); line-height:1.5;">
            <strong>Roster Members:</strong><br>${membersHtml}
          </div>
        </td>
        <td>
          <strong>${escapeHtml(t.leader_name)}</strong><br>
          <span style="font-size:12px; color:var(--text-muted);">${escapeHtml(t.leader_email)}</span>
        </td>
        <td>
          <span style="color:var(--primary); font-weight:700; text-transform:uppercase; font-size:11px; font-family:var(--font-mono);">${escapeHtml(t.problem_type)} Track</span>
          <div style="font-size:12px; color:var(--text-muted); max-height:80px; overflow-y:auto; margin-top:4px; border:1px solid rgba(255,255,255,0.03); padding:6px; background:rgba(0,0,0,0.2); border-radius:var(--border-radius-sm); white-space:pre-line;">${escapeHtml(t.problem_statement)}</div>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <select onchange="updateTeamStatus(${t.id}, this.value)" class="form-control" style="font-size:11px; padding:6px 10px; width:auto; height:auto;">
              <option value="pending" ${isPending ? 'selected' : ''}>Pending</option>
              <option value="approved" ${isApproved ? 'selected' : ''}>Approved</option>
              <option value="rejected" ${isRejected ? 'selected' : ''}>Rejected</option>
            </select>
          </div>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${pptLink}
            ${docLink}
          </div>
        </td>
        <td style="text-align:right;">
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button onclick="openEditTeamModal(${t.id})" class="btn btn-secondary btn-sm" style="padding:6px 12px;">Edit</button>
            <button onclick="deleteTeam(${t.id})" class="btn btn-danger btn-sm" style="padding:6px 12px;">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Student Directory table
function renderStudentsTable(filter = '') {
  const tbody = document.getElementById('students-tbody');
  
  const filtered = studentsList.filter(s => {
    return s.name.toLowerCase().includes(filter) ||
           s.email.toLowerCase().includes(filter);
  });
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No student profiles matched search query.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = filtered.map(s => {
    const regDate = new Date(s.created_at).toLocaleDateString();
    return `
      <tr>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${escapeHtml(s.email)}</td>
        <td><span style="font-size:12px; color:var(--text-muted);">${escapeHtml(s.semester || 'N/A')}</span></td>
        <td><span style="text-transform:uppercase; font-size:11px; font-family:var(--font-mono); color:var(--primary);">${escapeHtml(s.role)}</span></td>
        <td>${regDate}</td>
        <td style="text-align:right;">
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button onclick="openEditStudentModal(${s.id})" class="btn btn-secondary btn-sm" style="padding:6px 12px;">Edit</button>
            <button onclick="deleteStudent(${s.id})" class="btn btn-danger btn-sm" style="padding:6px 12px;">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Populate target announcements recipients dropdown
function populateRecipientDropdown() {
  const select = document.getElementById('notice-target');
  if (!select) return;
  
  let options = '<option value="all">📢 All Registered Student Leaders</option>';
  
  studentsList.forEach(s => {
    options += `<option value="${s.id}">👤 ${escapeHtml(s.name)} (${escapeHtml(s.email)})</option>`;
  });
  
  select.innerHTML = options;
}

// UPDATE TEAM EVALUATION STATUS
window.updateTeamStatus = function(teamId, newStatus) {
  const apiBase = window.API_BASE || "";
  clearAlert('admin-alert');
  
  fetch(`${apiBase}/api/admin/teams/${teamId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  })
  .then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update evaluation status');
    return data;
  })
  .then((data) => {
    showAlert('admin-alert', data.message, 'success');
    
    // Update local state and calculation
    const team = teamsList.find(t => t.id === teamId);
    if (team) team.status = newStatus;
    calculateStats();
  })
  .catch((err) => {
    showAlert('admin-alert', err.message, 'error');
    loadDashboardData(); // Refresh tables on failure
  });
};

// PUBLISH ANNOUNCEMENT FORM SUBMIT
function handleNoticeSubmit(e) {
  e.preventDefault();
  clearAlert('admin-alert');
  
  const recipient = document.getElementById('notice-target').value;
  const text = document.getElementById('notice-text').value.trim();
  const fileInput = document.getElementById('notice-image');
  
  if (recipient === 'all') {
    // Send to all students by looping (since API is /api/admin/students/:id/notes)
    // Wrap all fetch calls in Promise.all to run concurrently
    const promises = studentsList.map(s => {
      const fd = new FormData();
      fd.append('note_text', text);
      if (fileInput.files[0]) {
        fd.append('note_image', fileInput.files[0]);
      }
      const apiBase = window.API_BASE || "";
      return fetch(`${apiBase}/api/admin/students/${s.id}/notes`, {
        method: 'POST',
        body: fd
      }).then(res => {
        if (!res.ok) throw new Error(`Notice failed for student ID: ${s.id}`);
      });
    });
    
    Promise.all(promises)
      .then(() => {
        showAlert('admin-alert', 'Notice published successfully to all students!', 'success');
        document.getElementById('notice-form').reset();
      })
      .catch((err) => {
        showAlert('admin-alert', 'Partial dispatch error: ' + err.message, 'error');
      });
  } else {
    // Single recipient dispatch
    const fd = new FormData();
    fd.append('note_text', text);
    if (fileInput.files[0]) {
      fd.append('note_image', fileInput.files[0]);
    }
    
    const apiBase = window.API_BASE || "";
    fetch(`${apiBase}/api/admin/students/${recipient}/notes`, {
      method: 'POST',
      body: fd
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch note.');
      return data;
    })
    .then((data) => {
      showAlert('admin-alert', 'Notice published successfully to recipient!', 'success');
      document.getElementById('notice-form').reset();
    })
    .catch((err) => {
      showAlert('admin-alert', err.message, 'error');
    });
  }
}

// DYNAMIC MODALS EDITING FUNCTIONS
window.openEditStudentModal = function(studentId) {
  const student = studentsList.find(s => s.id === studentId);
  if (!student) return;
  
  activeEditTarget = { type: 'student', id: studentId };
  
  const form = document.getElementById('modal-form');
  document.getElementById('modal-title').innerText = 'Modify Student Account';
  
  form.innerHTML = `
    <div class="form-group" style="margin:0;">
      <label>Full Name</label>
      <input type="text" id="edit-student-name" class="form-control" value="${escapeHtml(student.name)}" required>
    </div>
    <div class="form-group" style="margin:0;">
      <label>Email Address</label>
      <input type="email" id="edit-student-email" class="form-control" value="${escapeHtml(student.email)}" required>
    </div>
    <div class="form-group" style="margin:0;">
      <label>Semester</label>
      <select id="edit-student-semester" class="form-control" required>
        <option value="Semester 1" ${student.semester === 'Semester 1' ? 'selected' : ''}>Semester 1</option>
        <option value="Semester 2" ${student.semester === 'Semester 2' ? 'selected' : ''}>Semester 2</option>
        <option value="Semester 3" ${student.semester === 'Semester 3' ? 'selected' : ''}>Semester 3</option>
        <option value="Semester 4" ${student.semester === 'Semester 4' ? 'selected' : ''}>Semester 4</option>
        <option value="Semester 5" ${student.semester === 'Semester 5' ? 'selected' : ''}>Semester 5</option>
        <option value="Semester 6" ${student.semester === 'Semester 6' ? 'selected' : ''}>Semester 6</option>
        <option value="Semester 7" ${student.semester === 'Semester 7' ? 'selected' : ''}>Semester 7</option>
        <option value="Semester 8" ${student.semester === 'Semester 8' ? 'selected' : ''}>Semester 8</option>
      </select>
    </div>
    <div class="form-group" style="margin:0;">
      <label>System Role Access</label>
      <select id="edit-student-role" class="form-control">
        <option value="student" ${student.role === 'student' ? 'selected' : ''}>Student</option>
        <option value="admin" ${student.role === 'admin' ? 'selected' : ''}>Admin</option>
      </select>
    </div>
    
    <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:10px;">
      <button type="button" class="btn btn-secondary btn-sm" onclick="closeEditModal()">Cancel</button>
      <button type="submit" class="btn btn-primary btn-sm">Save Changes</button>
    </div>
  `;
  
  document.getElementById('edit-modal').style.display = 'flex';
  form.onsubmit = handleStudentEditSubmit;
};

function handleStudentEditSubmit(e) {
  e.preventDefault();
  const apiBase = window.API_BASE || "";
  const studentId = activeEditTarget.id;
  
  const name = document.getElementById('edit-student-name').value.trim();
  const email = document.getElementById('edit-student-email').value.trim();
  const semester = document.getElementById('edit-student-semester').value;
  const role = document.getElementById('edit-student-role').value;
  
  fetch(`${apiBase}/api/admin/students/${studentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, role, semester })
  })
  .then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update student profile.');
    return data;
  })
  .then((data) => {
    closeEditModal();
    showAlert('admin-alert', 'Student updated successfully!', 'success');
    loadDashboardData();
  })
  .catch((err) => {
    alert('Error: ' + err.message);
  });
}

window.openEditTeamModal = function(teamId) {
  const team = teamsList.find(t => t.id === teamId);
  if (!team) return;
  
  activeEditTarget = { type: 'team', id: teamId };
  
  const form = document.getElementById('modal-form');
  document.getElementById('modal-title').innerText = 'Modify Team Details';
  
  form.innerHTML = `
    <div class="form-group" style="margin:0;">
      <label>Team/Startup Name</label>
      <input type="text" id="edit-team-name" class="form-control" value="${escapeHtml(team.team_name)}" required>
    </div>
    <div class="form-group" style="margin:0;">
      <label>Track Domain</label>
      <input type="text" id="edit-team-track" class="form-control" value="${escapeHtml(team.problem_type)}" required>
    </div>
    <div class="form-group" style="margin:0;">
      <label>Locked Problem Statement</label>
      <textarea id="edit-team-statement" class="form-control" rows="4" required>${escapeHtml(team.problem_statement)}</textarea>
    </div>
    
    <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:10px;">
      <button type="button" class="btn btn-secondary btn-sm" onclick="closeEditModal()">Cancel</button>
      <button type="submit" class="btn btn-primary btn-sm">Save Changes</button>
    </div>
  `;
  
  document.getElementById('edit-modal').style.display = 'flex';
  form.onsubmit = handleTeamEditSubmit;
};

function handleTeamEditSubmit(e) {
  e.preventDefault();
  const apiBase = window.API_BASE || "";
  const teamId = activeEditTarget.id;
  
  const name = document.getElementById('edit-team-name').value.trim();
  const track = document.getElementById('edit-team-track').value.trim();
  const statement = document.getElementById('edit-team-statement').value.trim();
  
  fetch(`${apiBase}/api/admin/teams/${teamId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_name: name, problem_type: track, problem_statement: statement })
  })
  .then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update team details.');
    return data;
  })
  .then((data) => {
    closeEditModal();
    showAlert('admin-alert', 'Team details updated successfully!', 'success');
    loadDashboardData();
  })
  .catch((err) => {
    alert('Error: ' + err.message);
  });
}

window.closeEditModal = function() {
  document.getElementById('edit-modal').style.display = 'none';
  activeEditTarget = null;
};

// DELETE STUDENT ACCOUNT
window.deleteStudent = function(studentId) {
  if (!confirm('Are you absolutely sure you want to permanently delete this student account? All corresponding sessions and team rosters will be deleted.')) return;
  
  const apiBase = window.API_BASE || "";
  clearAlert('admin-alert');
  
  fetch(`${apiBase}/api/admin/students/${studentId}`, {
    method: 'DELETE'
  })
  .then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete student.');
    return data;
  })
  .then((data) => {
    showAlert('admin-alert', 'Student account deleted successfully.', 'success');
    loadDashboardData();
  })
  .catch((err) => {
    showAlert('admin-alert', err.message, 'error');
  });
};

// DELETE TEAM
window.deleteTeam = function(teamId) {
  if (!confirm('Are you absolutely sure you want to permanently delete this team? All submissions, uploaded PPTs, and rosters will be cleared.')) return;
  
  const apiBase = window.API_BASE || "";
  clearAlert('admin-alert');
  
  fetch(`${apiBase}/api/admin/teams/${teamId}`, {
    method: 'DELETE'
  })
  .then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete team.');
    return data;
  })
  .then((data) => {
    showAlert('admin-alert', 'Team deleted successfully.', 'success');
    loadDashboardData();
  })
  .catch((err) => {
    showAlert('admin-alert', err.message, 'error');
  });
};

// COMPETITION CONFIGURATION LOADER & SUBMITTER
let competitionConfig = null;

async function loadCompetitionConfig() {
  const apiBase = window.API_BASE || "";
  try {
    const res = await fetch(`${apiBase}/api/competition/config`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    competitionConfig = data;
    
    // Convert UTC deadline to local YYYY-MM-DDTHH:MM format for date input
    const dateObj = new Date(data.countdown_deadline);
    const offset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dateObj - offset)).toISOString().slice(0, 16);
    document.getElementById('config-deadline-input').value = localISOTime;
    
    // Render editor fields
    renderStagesEditor(data.stages);
  } catch (err) {
    showAlert('admin-alert', 'Failed to retrieve competition configuration.', 'error');
  }
}

function renderStagesEditor(stages) {
  const container = document.getElementById('config-stages-container');
  if (!container || !stages) return;
  
  container.innerHTML = stages.map((s, idx) => `
    <div class="stage-editor-card" data-index="${idx}" style="border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: var(--border-radius-md); background: rgba(255,255,255,0.01);">
      <h5 style="color: var(--primary); font-family: var(--font-display); font-size: 14px; font-weight: 700; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 6px;">Stage #${s.id} Configuration</h5>
      <input type="hidden" class="stage-id" value="${s.id}">
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <div class="form-group" style="margin:0;">
          <label>Stage Title</label>
          <input type="text" class="form-control stage-title" value="${escapeHtml(s.title)}" required>
        </div>
        <div class="form-group" style="margin:0;">
          <label>Stage Date Range Description</label>
          <input type="text" class="form-control stage-date" value="${escapeHtml(s.date)}" required>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <div class="form-group" style="margin:0;">
          <label>Active Status Badge</label>
          <select class="form-control stage-status">
            <option value="Active" ${s.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Upcoming" ${s.status === 'Upcoming' ? 'selected' : ''}>Upcoming</option>
            <option value="Final" ${s.status === 'Final' ? 'selected' : ''}>Final / Closed</option>
          </select>
        </div>
        <div class="form-group" style="margin:0;">
          <label>Icon Element</label>
          <select class="form-control stage-icon">
            <option value="dollar" ${s.icon === 'dollar' ? 'selected' : ''}>Dollar Sign (Stage 1 / Roster)</option>
            <option value="clock" ${s.icon === 'clock' ? 'selected' : ''}>Clock (Stage 2 / Target)</option>
            <option value="shield" ${s.icon === 'shield' ? 'selected' : ''}>Shield (Stage 3 / Pitch)</option>
            <option value="users" ${s.icon === 'users' ? 'selected' : ''}>Users (Stage 4 / Mentorship)</option>
            <option value="star" ${s.icon === 'star' ? 'selected' : ''}>Star (Stage 5 / Grand Finale)</option>
          </select>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 12px;">
        <label>Stage Deliverable</label>
        <input type="text" class="form-control stage-deliverable" value="${escapeHtml(s.deliverable || '')}" placeholder="e.g. Online Team Roster Registration">
      </div>

      <div class="form-group" style="margin:0;">
        <label>Detailed Milestone Description</label>
        <textarea class="form-control stage-description" rows="3" required>${escapeHtml(s.description)}</textarea>
      </div>
    </div>
  `).join('');
}

// Bind Submit Handler for configuration settings panel
const configForm = document.getElementById('config-settings-form');
if (configForm) {
  configForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAlert('admin-alert');
    
    const apiBase = window.API_BASE || "";
    
    // Read countdown deadline
    const deadlineVal = document.getElementById('config-deadline-input').value;
    const deadlineISO = new Date(deadlineVal).toISOString();
    
    // Read stages arrays
    const stageCards = document.querySelectorAll('.stage-editor-card');
    const stages = [];
    
    stageCards.forEach(card => {
      stages.push({
        id: parseInt(card.querySelector('.stage-id').value),
        title: card.querySelector('.stage-title').value.trim(),
        date: card.querySelector('.stage-date').value.trim(),
        status: card.querySelector('.stage-status').value,
        icon: card.querySelector('.stage-icon').value,
        deliverable: card.querySelector('.stage-deliverable').value.trim(),
        description: card.querySelector('.stage-description').value.trim()
      });
    });
    
    fetch(`${apiBase}/api/admin/competition/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countdown_deadline: deadlineISO, stages })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update competition configurations.');
      return data;
    })
    .then((data) => {
      showAlert('admin-alert', 'Competition settings updated successfully!', 'success');
      loadCompetitionConfig(); // Reload from server
    })
    .catch((err) => {
      showAlert('admin-alert', err.message, 'error');
    });
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
