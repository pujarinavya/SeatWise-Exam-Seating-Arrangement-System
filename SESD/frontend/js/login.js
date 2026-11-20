/**
 * Admin Login Script
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('adminLoginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.getElementById('togglePasswordBtn');
  const toggleIcon = document.getElementById('togglePasswordIcon');
  const loginAlert = document.getElementById('loginAlert');
  const loginAlertMsg = document.getElementById('loginAlertMsg');
  const loginBtn = document.getElementById('loginBtn');
  const loginBtnText = document.getElementById('loginBtnText');
  const loginSpinner = document.getElementById('loginSpinner');

  // Show/Hide password toggle
  toggleBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      toggleIcon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      toggleIcon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  });

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginAlert.classList.add('d-none');

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // Validation
    let isValid = true;
    if (!username) {
      usernameInput.classList.add('is-invalid');
      isValid = false;
    } else {
      usernameInput.classList.remove('is-invalid');
    }

    if (!password) {
      passwordInput.classList.add('is-invalid');
      isValid = false;
    } else {
      passwordInput.classList.remove('is-invalid');
    }

    if (!isValid) return;

    // Loading State
    loginBtn.disabled = true;
    loginBtnText.textContent = 'Verifying...';
    loginSpinner.classList.remove('d-none');

    try {
      const res = await apiCall('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (res.success) {
        if (res.data && res.data.token) {
          localStorage.setItem('seatwise_token', res.data.token);
          localStorage.setItem('seatwise_user', JSON.stringify(res.data));
        }
        showToast('Login successful! Redirecting to Dashboard...', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 300);
      }
    } catch (err) {
      loginAlertMsg.textContent = err.message || 'Invalid username or password.';
      loginAlert.classList.remove('d-none');
    } finally {
      loginBtn.disabled = false;
      loginBtnText.textContent = 'Sign In as Admin';
      loginSpinner.classList.add('d-none');
    }
  });

  // 1-Click Auto Fill Demo Credentials
  const demoPill = document.getElementById('demoAdminPill');
  if (demoPill) {
    demoPill.style.cursor = 'pointer';
    demoPill.title = 'Click to auto-fill admin credentials';
    demoPill.addEventListener('click', () => {
      usernameInput.value = 'admin';
      passwordInput.value = 'admin123';
      showToast('Admin credentials filled!', 'info');
    });
  }
});
