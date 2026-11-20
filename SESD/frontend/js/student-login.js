/**
 * Student Login Script
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('studentLoginForm');
  const rollInput = document.getElementById('rollNumber');
  const passwordInput = document.getElementById('studentPassword');
  const toggleBtn = document.getElementById('toggleStudentPasswordBtn');
  const toggleIcon = document.getElementById('toggleStudentPasswordIcon');
  const alertEl = document.getElementById('studentAlert');
  const alertMsg = document.getElementById('studentAlertMsg');
  const loginBtn = document.getElementById('studentLoginBtn');
  const btnText = document.getElementById('studentBtnText');
  const spinner = document.getElementById('studentSpinner');

  // Toggle password visibility
  toggleBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      toggleIcon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      toggleIcon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  });

  // Handle submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertEl.classList.add('d-none');

    const roll_number = rollInput.value.trim().toUpperCase();
    const password = passwordInput.value.trim();

    let isValid = true;
    if (!roll_number) {
      rollInput.classList.add('is-invalid');
      isValid = false;
    } else {
      rollInput.classList.remove('is-invalid');
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
    btnText.textContent = 'Verifying Student ID...';
    spinner.classList.remove('d-none');

    try {
      const res = await apiCall('/api/auth/student/login', {
        method: 'POST',
        body: JSON.stringify({ roll_number, password })
      });

      if (res.success) {
        if (res.data && res.data.token) {
          localStorage.setItem('seatwise_token', res.data.token);
          localStorage.setItem('seatwise_user', JSON.stringify(res.data));
        }
        showToast('Login successful! Welcome to your seating dashboard.', 'success');
        setTimeout(() => {
          window.location.href = '/student-dashboard.html';
        }, 300);
      }
    } catch (err) {
      alertMsg.textContent = err.message || 'Invalid Roll Number or password.';
      alertEl.classList.remove('d-none');
    } finally {
      loginBtn.disabled = false;
      btnText.textContent = 'View My Seating Details';
      spinner.classList.add('d-none');
    }
  });

  // 1-Click Auto Fill Demo Student Credentials
  const demoPill = document.getElementById('demoStudentPill');
  if (demoPill) {
    demoPill.style.cursor = 'pointer';
    demoPill.title = 'Click to auto-fill student credentials';
    demoPill.addEventListener('click', () => {
      rollInput.value = '21CS001';
      passwordInput.value = 'student123';
      showToast('Student credentials filled!', 'info');
    });
  }
});
