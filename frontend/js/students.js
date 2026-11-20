/**
 * Student Management Script
 */
let currentPage = 1;
const pageLimit = 10;
let studentModal = null;
let deleteModal = null;
let excelModal = null;
let studentToDeleteId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await checkAdminAuth();
  if (!admin) return;

  studentModal = new bootstrap.Modal(document.getElementById('studentFormModal'));
  deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
  excelModal = new bootstrap.Modal(document.getElementById('uploadExcelModal'));

  // Check URL params for quick actions
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'add') {
    prepareAddStudent();
    studentModal.show();
  }

  // Load Initial Students
  loadStudents(1);

  // Search input on enter
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadStudents(1);
    }
  });

  // Student Form Submit
  document.getElementById('studentForm').addEventListener('submit', handleSaveStudent);

  // Delete Confirm Button
  document.getElementById('confirmDeleteBtn').addEventListener('click', executeDeleteStudent);

  // Excel Upload Submit
  document.getElementById('excelUploadForm').addEventListener('submit', handleExcelUpload);
});

async function loadStudents(page = 1) {
  currentPage = page;
  const tbody = document.getElementById('studentTableBody');
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading students...</td></tr>`;

  const search = document.getElementById('searchInput').value.trim();
  const dept = document.getElementById('deptFilter').value;
  const year = document.getElementById('yearFilter').value;

  const url = `/api/students?page=${page}&limit=${pageLimit}&search=${encodeURIComponent(search)}&department=${encodeURIComponent(dept)}&year=${encodeURIComponent(year)}`;

  try {
    const res = await apiCall(url);
    const data = res.data || {};
    const students = data.students || [];
    const total = data.total || 0;
    const totalPages = data.total_pages || 1;

    renderStudentRows(students);
    renderPagination(total, totalPages, page);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger"><i class="fas fa-exclamation-circle me-1"></i>${err.message}</td></tr>`;
  }
}

function renderStudentRows(students) {
  const tbody = document.getElementById('studentTableBody');
  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No student records found matching the criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td class="fw-bold text-navy tabular-nums">${escapeHtml(s.roll_number)}</td>
      <td class="fw-semibold">${escapeHtml(s.full_name)}</td>
      <td><span class="badge-dept">${escapeHtml(s.department)}</span></td>
      <td><span class="badge bg-light text-navy border">Year ${s.year}</span></td>
      <td class="text-muted small">${escapeHtml(s.email)}</td>
      <td class="text-muted small">${escapeHtml(s.phone || '--')}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary py-1 px-2 me-1" onclick="prepareEditStudent(${JSON.stringify(s).replace(/"/g, '&quot;')})" title="Edit Student">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="confirmDeleteStudent(${s.id}, '${escapeHtml(s.full_name)}')" title="Delete Student">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function renderPagination(total, totalPages, current) {
  const infoEl = document.getElementById('paginationInfo');
  const start = total === 0 ? 0 : (current - 1) * pageLimit + 1;
  const end = Math.min(current * pageLimit, total);
  infoEl.textContent = `Showing ${start}–${end} of ${total} students`;

  const ul = document.getElementById('paginationUl');
  ul.innerHTML = '';

  if (totalPages <= 1) return;

  // Previous
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${current === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<button class="page-link" onclick="loadStudents(${current - 1})">&laquo;</button>`;
  ul.appendChild(prevLi);

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === current ? 'active' : ''}`;
    li.innerHTML = `<button class="page-link" onclick="loadStudents(${i})">${i}</button>`;
    ul.appendChild(li);
  }

  // Next
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${current === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<button class="page-link" onclick="loadStudents(${current + 1})">&raquo;</button>`;
  ul.appendChild(nextLi);
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('deptFilter').value = '';
  document.getElementById('yearFilter').value = '';
  loadStudents(1);
}

function prepareAddStudent() {
  document.getElementById('modalTitle').textContent = 'Add New Student';
  document.getElementById('studentId').value = '';
  document.getElementById('formRoll').value = '';
  document.getElementById('formRoll').disabled = false;
  document.getElementById('formName').value = '';
  document.getElementById('formDept').value = '';
  document.getElementById('formYear').value = '3';
  document.getElementById('formEmail').value = '';
  document.getElementById('formPhone').value = '';
  document.getElementById('formPassword').value = '';
  document.getElementById('formPassword').placeholder = 'Default password: student123';
}

function prepareEditStudent(student) {
  document.getElementById('modalTitle').textContent = 'Edit Student Details';
  document.getElementById('studentId').value = student.id;
  document.getElementById('formRoll').value = student.roll_number;
  document.getElementById('formRoll').disabled = true; // roll number immutable
  document.getElementById('formName').value = student.full_name;
  document.getElementById('formDept').value = student.department;
  document.getElementById('formYear').value = student.year;
  document.getElementById('formEmail').value = student.email;
  document.getElementById('formPhone').value = student.phone || '';
  document.getElementById('formPassword').value = '';
  document.getElementById('formPassword').placeholder = 'Leave blank to preserve existing password';
  studentModal.show();
}

async function handleSaveStudent(e) {
  e.preventDefault();
  const id = document.getElementById('studentId').value;
  const roll_number = document.getElementById('formRoll').value.trim().toUpperCase();
  const full_name = document.getElementById('formName').value.trim();
  const department = document.getElementById('formDept').value;
  const year = document.getElementById('formYear').value;
  const email = document.getElementById('formEmail').value.trim();
  const phone = document.getElementById('formPhone').value.trim();
  const password = document.getElementById('formPassword').value.trim();

  if (!roll_number || !full_name || !department || !year || !email) {
    showToast('Please fill in all required fields.', 'danger');
    return;
  }

  const payload = { roll_number, full_name, department, year, email, phone };
  if (password) payload.password = password;

  const saveBtn = document.getElementById('saveStudentBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    if (id) {
      await apiCall(`/api/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Student profile updated successfully!', 'success');
    } else {
      await apiCall('/api/students', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('New student added successfully!', 'success');
    }

    studentModal.hide();
    loadStudents(currentPage);
  } catch (err) {
    showToast(err.message || 'Operation failed', 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Student Record';
  }
}

function confirmDeleteStudent(id, name) {
  studentToDeleteId = id;
  document.getElementById('deleteStudentName').textContent = name;
  deleteModal.show();
}

async function executeDeleteStudent() {
  if (!studentToDeleteId) return;

  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  try {
    await apiCall(`/api/students/${studentToDeleteId}`, { method: 'DELETE' });
    showToast('Student record deleted successfully.', 'success');
    deleteModal.hide();
    loadStudents(currentPage);
  } catch (err) {
    showToast('Failed to delete student: ' + err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
    studentToDeleteId = null;
  }
}

async function handleExcelUpload(e) {
  e.preventDefault();
  const fileInput = document.getElementById('excelFile');
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Please select an Excel file to upload.', 'danger');
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);

  const uploadBtn = document.getElementById('uploadBtn');
  const summaryBox = document.getElementById('uploadSummaryBox');
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Processing...';
  summaryBox.classList.add('d-none');

  try {
    const res = await apiCall('/api/students/upload', {
      method: 'POST',
      body: formData
    });

    const data = res.data || {};
    summaryBox.className = 'alert alert-info border mt-3';
    let summaryHtml = `
      <div class="fw-bold mb-1"><i class="fas fa-check-circle text-success me-1"></i>Import Completed</div>
      <div class="small">Successfully imported: <strong>${data.imported_count || 0}</strong> students.</div>
    `;

    if (data.rejected_count > 0) {
      summaryHtml += `
        <div class="small text-danger mt-1">Rejected records: <strong>${data.rejected_count}</strong> (duplicates or invalid format).</div>
      `;
    }
    summaryBox.innerHTML = summaryHtml;
    summaryBox.classList.remove('d-none');

    showToast(`Successfully imported ${data.imported_count} students!`, 'success');
    loadStudents(1);
  } catch (err) {
    summaryBox.className = 'alert alert-danger border mt-3';
    summaryBox.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>${err.message}`;
    summaryBox.classList.remove('d-none');
    showToast('Excel upload error: ' + err.message, 'danger');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<i class="fas fa-upload me-1"></i>Upload &amp; Process';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
