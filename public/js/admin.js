// Admin Dashboard Controller

let studentsData = [];
let teamsData = [];

document.addEventListener('DOMContentLoaded', () => {
  verifyAdminSessionAndInit();
});

// Authenticate session and load admin directories
function verifyAdminSessionAndInit() {
  fetch('/api/auth/me')
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
      
      // Load tables and statistics
      refreshAdminData();
    })
    .catch(() => {
      window.location.href = 'login.html';
    });
}

// Fetch lists from database and render
function refreshAdminData() {
  clearAlert('admin-alert');
  
  Promise.all([
    fetch('/api/admin/students').then(res => res.json()),
    fetch('/api/admin/teams').then(res => res.json())
  ])
  .then(([studentsRes, teamsRes]) => {
    studentsData = studentsRes.students || [];
    teamsData = teamsRes.teams || [];
    
    calculateStats();
    renderTeamsTable();
    renderStudentsTable();
  })
  .catch((err) => {
    showAdminAlert('Failed to synchronize dashboard directories: ' + err.message, 'error');
  });
}

// Calculate and render stats cards
function calculateStats() {
  const totalStudents = studentsData.length;
  const totalTeams = teamsData.length;
  const pendingTeams = teamsData.filter(t => t.status === 'pending').length;
  const approvedTeams = teamsData.filter(t => t.status === 'approved').length;

  document.getElementById('stat-students').innerText = totalStudents;
  document.getElementById('stat-teams').innerText = totalTeams;
  document.getElementById('stat-pending').innerText = pendingTeams;
  document.getElementById('stat-approved').innerText = approvedTeams;
}

// ----------------------------------------------------
// TEAMS TABLE RENDERING & ACTIONS
// ----------------------------------------------------
function renderTeamsTable() {
  const tbody = document.getElementById('teams-table-body');
  if (teamsData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No teams registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = teamsData.map(team => {
    let badgeClass = 'badge-pending';
    if (team.status === 'approved') badgeClass = 'badge-approved';
    if (team.status === 'rejected') badgeClass = 'badge-rejected';

    const membersHtml = team.members.map(m => `
      <div style="font-size:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:5px 8px; margin-bottom:4px;">
        <div style="font-weight:600;">${escapeHtml(m.name)}</div>
        <div style="color:var(--text-muted); font-size:11px;">${escapeHtml(m.email)}</div>
        <div style="font-size:11px; margin-top:2px;">
          ${m.roll_no ? `<span style="color:var(--primary);">Roll: ${escapeHtml(m.roll_no)}</span>` : '<span style="color:var(--text-muted);">No Roll No</span>'}
          &nbsp;|&nbsp;
          ${m.phone_no ? `<span style="color:var(--primary);">📞 ${escapeHtml(m.phone_no)}</span>` : '<span style="color:var(--text-muted);">No Phone</span>'}
        </div>
      </div>
    `).join('');

    const filesHtmlParts = [];
    if (team.ppt_path) filesHtmlParts.push(`<a href="${team.ppt_path}" target="_blank" style="font-size:12px; margin-right:6px;">📊 PPT</a>`);
    if (team.doc_path) filesHtmlParts.push(`<a href="${team.doc_path}" target="_blank" style="font-size:12px;">📎 Doc</a>`);
    const filesHtml = filesHtmlParts.join(' ');

    return `
      <tr>
        <td><strong>#${team.id}</strong></td>
        <td>${escapeHtml(team.team_name)}</td>
        <td>
          <div style="font-size:12px; font-weight:600; color:var(--primary); text-transform:capitalize; margin-bottom:4px;">${team.problem_type} Track</div>
          <div style="max-width:250px; font-size:12px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(team.problem_statement)}">
            ${escapeHtml(team.problem_statement)}
          </div>
        </td>
        <td>
          <div style="font-weight:600;">${escapeHtml(team.leader_name)}</div>
          <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(team.leader_email)}</div>
        </td>
        <td>
          <div style="max-width:220px;">
            ${membersHtml || '<span style="color:var(--text-muted); font-size:11px;">None</span>'}
          </div>
        </td>
        <td style="white-space:nowrap;">${filesHtml || '<span style="color:var(--text-muted); font-size:11px;">None</span>'}</td>
        <td><span class="badge ${badgeClass}">${team.status}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            ${team.status !== 'approved' ? `<button class="btn btn-success btn-sm" onclick="updateTeamStatus(${team.id}, 'approved')">Approve</button>` : ''}
            ${team.status !== 'rejected' ? `<button class="btn btn-danger btn-sm" onclick="updateTeamStatus(${team.id}, 'rejected')">Reject</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="openEditTeamModal(${team.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteTeam(${team.id})" style="padding: 6px 10px;">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Update team status (Approve / Reject)
window.updateTeamStatus = function(teamId, status) {
  fetch(`/api/admin/teams/${teamId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  .then(async res => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showAdminAlert(`Team status updated to ${status} successfully.`, 'success');
    refreshAdminData();
  })
  .catch(err => showAdminAlert('Status update failed: ' + err.message, 'error'));
};

// Open Edit Team Modal
window.openEditTeamModal = function(teamId) {
  const team = teamsData.find(t => t.id === teamId);
  if (!team) return;

  document.getElementById('edit-team-id').value = team.id;
  document.getElementById('edit-team-name').value = team.team_name;
  document.getElementById('edit-team-type').value = team.problem_type;
  document.getElementById('edit-team-statement').value = team.problem_statement;

  openModal('edit-team-modal');
};

// Edit Team Form Handler
const editTeamForm = document.getElementById('edit-team-form');
if (editTeamForm) {
  editTeamForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const teamId = document.getElementById('edit-team-id').value;
    const team_name = document.getElementById('edit-team-name').value.trim();
    const problem_type = document.getElementById('edit-team-type').value;
    const problem_statement = document.getElementById('edit-team-statement').value.trim();

    fetch(`/api/admin/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_name, problem_type, problem_statement })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeModal('edit-team-modal');
      showAdminAlert('Team registration modified successfully.', 'success');
      refreshAdminData();
    })
    .catch(err => {
      alert('Error updating team: ' + err.message);
    });
  });
}

// Delete Team
window.deleteTeam = function(teamId) {
  if (!confirm('Are you sure you want to delete this team registration? This operation is permanent.')) return;

  fetch(`/api/admin/teams/${teamId}`, { method: 'DELETE' })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showAdminAlert('Team registration record deleted.', 'success');
      refreshAdminData();
    })
    .catch(err => showAdminAlert('Failed to delete team: ' + err.message, 'error'));
};

// ----------------------------------------------------
// STUDENTS TABLE RENDERING & ACTIONS
// ----------------------------------------------------
function renderStudentsTable() {
  const tbody = document.getElementById('students-table-body');
  if (studentsData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No student directories available.</td></tr>`;
    return;
  }

  tbody.innerHTML = studentsData.map(student => {
    const avatarUrl = student.profile_pic || 'uploads/profiles/default.png';
    const dateFormatted = new Date(student.created_at).toLocaleDateString();

    return `
      <tr>
        <td><strong>#${student.id}</strong></td>
        <td>
          <img src="${avatarUrl}" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--primary);" onerror="this.src='https://via.placeholder.com/32/1a082e/a855f7?text=U'">
        </td>
        <td>${escapeHtml(student.name)}</td>
        <td>${escapeHtml(student.email)}</td>
        <td>${dateFormatted}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="openAddNoticeModal(${student.id})">✉ Notice</button>
            <button class="btn btn-secondary btn-sm" onclick="openEditStudentModal(${student.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStudent(${student.id})">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Open Edit Student Modal
window.openEditStudentModal = function(studentId) {
  const student = studentsData.find(s => s.id === studentId);
  if (!student) return;

  document.getElementById('edit-student-id').value = student.id;
  document.getElementById('edit-student-name').value = student.name;
  document.getElementById('edit-student-email').value = student.email;

  openModal('edit-student-modal');
};

// Edit Student Form Handler
const editStudentForm = document.getElementById('edit-student-form');
if (editStudentForm) {
  editStudentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const studentId = document.getElementById('edit-student-id').value;
    const name = document.getElementById('edit-student-name').value.trim();
    const email = document.getElementById('edit-student-email').value.trim();

    fetch(`/api/admin/students/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeModal('edit-student-modal');
      showAdminAlert('Student profile modified successfully.', 'success');
      refreshAdminData();
    })
    .catch(err => {
      alert('Error updating student: ' + err.message);
    });
  });
}

// Delete Student Account
window.deleteStudent = function(studentId) {
  if (!confirm('Are you sure you want to delete this student account? This will also remove any registered team, members and notes associated with them.')) return;

  fetch(`/api/admin/students/${studentId}`, { method: 'DELETE' })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showAdminAlert('Student account and dependent records deleted successfully.', 'success');
      refreshAdminData();
    })
    .catch(err => showAdminAlert('Failed to delete student: ' + err.message, 'error'));
};

// ----------------------------------------------------
// ADD DASHBOARD NOTICE / NOTE
// ----------------------------------------------------
window.openAddNoticeModal = function(studentId) {
  const student = studentsData.find(s => s.id === studentId);
  if (!student) return;

  document.getElementById('notice-student-id').value = student.id;
  document.getElementById('notice-student-name').value = student.name;
  document.getElementById('notice-text').value = '';
  document.getElementById('notice-image').value = '';

  openModal('add-notice-modal');
};

// Add Notice Form Handler
const addNoticeForm = document.getElementById('add-notice-form');
if (addNoticeForm) {
  addNoticeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const studentId = document.getElementById('notice-student-id').value;
    const formData = new FormData(addNoticeForm);

    fetch(`/api/admin/students/${studentId}/notes`, {
      method: 'POST',
      body: formData // Send as multipart form data
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeModal('add-notice-modal');
      showAdminAlert('Notice added to student dashboard.', 'success');
    })
    .catch(err => {
      alert('Failed to post notice: ' + err.message);
    });
  });
}

// ----------------------------------------------------
// COMMON MODAL MANAGEMENT UTILITIES
// ----------------------------------------------------
window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
};

// Close modal if user clicks outside content card
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// Admin Custom Alert
function showAdminAlert(message, type = 'error') {
  showAlert('admin-alert', message, type);
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
