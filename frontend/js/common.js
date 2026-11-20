/**
 * SeatWise – Common JavaScript Utilities
 * Handles API calls, authentication verification, and toast notifications.
 */

// Global API Fetch wrapper
async function apiCall(endpoint, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Add token from localStorage for seamless cross-origin/iframe authentication
  const storedToken = localStorage.getItem('seatwise_token');
  if (storedToken) {
    defaultHeaders['Authorization'] = `Bearer ${storedToken}`;
    defaultHeaders['x-auth-token'] = storedToken;
  }

  // If body is FormData (e.g. file upload), remove Content-Type header so browser sets multipart boundary
  if (options.body instanceof FormData) {
    delete defaultHeaders['Content-Type'];
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    },
    credentials: 'include'
  };

  try {
    const res = await fetch(endpoint, config);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = (data && (data.error || data.message)) || `Request failed with status ${res.status}`;
      if (res.status === 401) {
        // Clear stored token on 401
        localStorage.removeItem('seatwise_token');
        localStorage.removeItem('seatwise_user');
        const path = window.location.pathname;
        if (!path.includes('login.html') && path !== '/' && !path.includes('student-login.html')) {
          window.location.href = '/login.html';
        }
      }
      throw new Error(errorMsg);
    }
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

// Toast Notification System
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const toastEl = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-success text-white' : (type === 'danger' ? 'bg-danger text-white' : 'bg-primary text-white');
  const icon = type === 'success' ? 'fa-check-circle' : (type === 'danger' ? 'fa-exclamation-triangle' : 'fa-info-circle');

  toastEl.className = `toast align-items-center ${bgClass} border-0 show shadow-lg mb-2`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');
  toastEl.innerHTML = `
    <div class="d-flex p-2">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="fas ${icon}"></i>
        <span>${message}</span>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close" onclick="this.parentElement.parentElement.remove()"></button>
    </div>
  `;

  container.appendChild(toastEl);
  setTimeout(() => {
    if (toastEl.parentElement) {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.remove(), 250);
    }
  }, 4000);
}

// Check session authentication for admin pages
async function checkAdminAuth() {
  try {
    const res = await apiCall('/api/auth/me');
    if (!res.data || !res.data.authenticated || res.data.role !== 'admin') {
      localStorage.removeItem('seatwise_token');
      localStorage.removeItem('seatwise_user');
      window.location.href = '/login.html';
      return null;
    }
    // Update admin user display
    const adminNameEl = document.getElementById('navAdminName');
    if (adminNameEl && res.data.full_name) {
      adminNameEl.textContent = res.data.full_name;
    }
    return res.data;
  } catch (err) {
    localStorage.removeItem('seatwise_token');
    localStorage.removeItem('seatwise_user');
    window.location.href = '/login.html';
    return null;
  }
}

// Check session authentication for student pages
async function checkStudentAuth() {
  try {
    const res = await apiCall('/api/auth/me');
    if (!res.data || !res.data.authenticated || res.data.role !== 'student') {
      localStorage.removeItem('seatwise_token');
      localStorage.removeItem('seatwise_user');
      window.location.href = '/student-login.html';
      return null;
    }
    return res.data;
  } catch (err) {
    localStorage.removeItem('seatwise_token');
    localStorage.removeItem('seatwise_user');
    window.location.href = '/student-login.html';
    return null;
  }
}

// Universal Logout
async function handleLogout() {
  try {
    await apiCall('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // continue redirect
  }
  localStorage.removeItem('seatwise_token');
  localStorage.removeItem('seatwise_user');
  window.location.href = '/login.html';
}

function handleStudentLogout() {
  apiCall('/api/auth/logout', { method: 'POST' })
    .finally(() => {
      localStorage.removeItem('seatwise_token');
      localStorage.removeItem('seatwise_user');
      window.location.href = '/student-login.html';
    });
}
