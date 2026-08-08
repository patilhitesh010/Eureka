// Common Authentication & Form Processing Helpers
// Updated to support dynamic API_BASE for Vercel proxy compatibility

// Display alert messages on panels
function showAlert(containerId, message, type = 'error') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="alert alert-${type}">
      <span>${type === 'success' ? '✔' : '⚠'} ${message}</span>
    </div>
  `;
  
  // Auto-scroll to alert
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Clear active alerts
function clearAlert(containerId) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

// Handle login submissions
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAlert('alert-box');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const apiBase = window.API_BASE || "";
    
    fetch(apiBase + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      return data;
    })
    .then((data) => {
      // Redirect based on user role
      const targetUrl = data.user.role === 'admin' ? 'admin.html' : 'dashboard.html';
      if (typeof window.navigateTo === 'function') {
        window.navigateTo(targetUrl);
      } else {
        window.location.href = targetUrl;
      }
    })
    .catch((err) => {
      showAlert('alert-box', err.message);
    });
  });
}

// Handle register submissions
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAlert('alert-box');
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
      showAlert('alert-box', 'Passwords do not match');
      return;
    }
    
    const apiBase = window.API_BASE || "";
    
    fetch(apiBase + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      return data;
    })
    .then(() => {
      if (typeof window.navigateTo === 'function') {
        window.navigateTo('dashboard.html');
      } else {
        window.location.href = 'dashboard.html';
      }
    })
    .catch((err) => {
      showAlert('alert-box', err.message);
    });
  });
}

// Common logout action for dashboard headers
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    const apiBase = window.API_BASE || "";
    
    fetch(apiBase + '/api/auth/logout', { method: 'POST' })
      .then(() => {
        if (typeof window.navigateTo === 'function') {
          window.navigateTo('login.html');
        } else {
          window.location.href = 'login.html';
        }
      });
  });
}
