/**
 * Exam Management Script
 */
let examModal = null;
let deleteExamModal = null;
let examToDeleteId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await checkAdminAuth();
  if (!admin) return;

  examModal = new bootstrap.Modal(document.getElementById('examFormModal'));
  deleteExamModal = new bootstrap.Modal(document.getElementById('deleteExamModal'));

  // Quick Action from URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'new') {
    prepareAddExam();
    examModal.show();
  }

  loadExams();

  // Search input on enter
  document.getElementById('examSearchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadExams();
  });

  // Save form
  document.getElementById('examForm').addEventListener('submit', handleSaveExam);

  // Confirm delete
  document.getElementById('confirmDeleteExamBtn').addEventListener('click', executeDeleteExam);
});

async function loadExams() {
  const tbody = document.getElementById('examTableBody');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading scheduled exams...</td></tr>`;

  const search = document.getElementById('examSearchInput').value.trim();
  const dept = document.getElementById('examDeptFilter').value;
  const session = document.getElementById('examSessionFilter').value;

  const url = `/api/exams?search=${encodeURIComponent(search)}&department=${encodeURIComponent(dept)}&session=${encodeURIComponent(session)}`;

  try {
    const res = await apiCall(url);
    const exams = res.data || [];
    renderExamRows(exams);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger"><i class="fas fa-exclamation-circle me-1"></i>${err.message}</td></tr>`;
  }
}

function renderExamRows(exams) {
  const tbody = document.getElementById('examTableBody');
  if (!exams || exams.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-muted">No examinations scheduled yet. Click "Schedule New Exam" above.</td></tr>`;
    return;
  }

  tbody.innerHTML = exams.map(e => `
    <tr>
      <td>
        <div class="fw-bold text-navy">${escapeHtml(e.exam_name)}</div>
        <div class="small text-muted">${escapeHtml(e.subject)}</div>
      </td>
      <td>
        <span class="badge-dept">${escapeHtml(e.department)}</span>
        <span class="badge bg-light text-navy border ms-1">Yr ${e.year}</span>
      </td>
      <td>
        <div class="fw-semibold small">${e.exam_date}</div>
        <span class="badge bg-light text-navy border">${e.session} Session</span>
      </td>
      <td>
        <span class="small tabular-nums">${e.start_time} - ${e.end_time}</span>
      </td>
      <td>
        <span class="small text-danger fw-bold tabular-nums">${e.reporting_time}</span>
      </td>
      <td>
        <span class="fw-bold text-navy tabular-nums">${e.allocated_students || 0}</span>
        ${e.is_published ? '<span class="badge bg-success-subtle text-success ms-1">Published</span>' : (e.allocated_students ? '<span class="badge bg-warning-subtle text-warning ms-1">Draft</span>' : '<span class="badge bg-secondary-subtle text-secondary ms-1">Unassigned</span>')}
      </td>
      <td>
        <span class="badge ${e.status === 'Completed' ? 'badge-status-completed' : 'badge-status-scheduled'}">${e.status}</span>
      </td>
      <td class="text-end">
        <a href="seating.html?exam_id=${e.id}" class="btn btn-sm btn-outline-seatwise py-1 px-2 me-1" title="Seating Arrangement">
          <i class="fas fa-chair me-1"></i>Seats
        </a>
        <button class="btn btn-sm btn-outline-primary py-1 px-2 me-1" onclick="prepareEditExam(${JSON.stringify(e).replace(/"/g, '&quot;')})" title="Edit Exam">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="confirmDeleteExam(${e.id}, '${escapeHtml(e.exam_name)}')" title="Delete Exam">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function resetExamFilters() {
  document.getElementById('examSearchInput').value = '';
  document.getElementById('examDeptFilter').value = '';
  document.getElementById('examSessionFilter').value = '';
  loadExams();
}

function prepareAddExam() {
  document.getElementById('examModalTitle').textContent = 'Schedule New Examination';
  document.getElementById('examId').value = '';
  document.getElementById('formExamName').value = '';
  document.getElementById('formSubject').value = '';
  document.getElementById('formExamDept').value = 'CSE';
  document.getElementById('formExamYear').value = '3';
  document.getElementById('formExamDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('formSession').value = 'FN';
  document.getElementById('formStartTime').value = '09:30';
  document.getElementById('formEndTime').value = '12:30';
  document.getElementById('formReportingTime').value = '09:00';
  document.getElementById('formStatus').value = 'Scheduled';
}

function prepareEditExam(exam) {
  document.getElementById('examModalTitle').textContent = 'Edit Examination Schedule';
  document.getElementById('examId').value = exam.id;
  document.getElementById('formExamName').value = exam.exam_name;
  document.getElementById('formSubject').value = exam.subject;
  document.getElementById('formExamDept').value = exam.department;
  document.getElementById('formExamYear').value = exam.year;
  document.getElementById('formExamDate').value = exam.exam_date;
  document.getElementById('formSession').value = exam.session;
  document.getElementById('formStartTime').value = exam.start_time;
  document.getElementById('formEndTime').value = exam.end_time;
  document.getElementById('formReportingTime').value = exam.reporting_time;
  document.getElementById('formStatus').value = exam.status;
  examModal.show();
}

async function handleSaveExam(e) {
  e.preventDefault();
  const id = document.getElementById('examId').value;
  const exam_name = document.getElementById('formExamName').value.trim();
  const subject = document.getElementById('formSubject').value.trim();
  const department = document.getElementById('formExamDept').value;
  const year = document.getElementById('formExamYear').value;
  const exam_date = document.getElementById('formExamDate').value;
  const session = document.getElementById('formSession').value;
  const start_time = document.getElementById('formStartTime').value;
  const end_time = document.getElementById('formEndTime').value;
  const reporting_time = document.getElementById('formReportingTime').value;
  const status = document.getElementById('formStatus').value;

  if (!exam_name || !subject || !exam_date || !start_time || !end_time || !reporting_time) {
    showToast('Please fill in all required fields.', 'danger');
    return;
  }

  const payload = {
    exam_name, subject, department, year, exam_date, session,
    start_time, end_time, reporting_time, status
  };

  const btn = document.getElementById('saveExamBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    if (id) {
      await apiCall(`/api/exams/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Examination schedule updated successfully.', 'success');
    } else {
      await apiCall('/api/exams', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('New examination scheduled successfully.', 'success');
    }
    examModal.hide();
    loadExams();
  } catch (err) {
    showToast(err.message || 'Failed to save exam.', 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Examination';
  }
}

function confirmDeleteExam(id, name) {
  examToDeleteId = id;
  document.getElementById('deleteExamName').textContent = name;
  deleteExamModal.show();
}

async function executeDeleteExam() {
  if (!examToDeleteId) return;

  const btn = document.getElementById('confirmDeleteExamBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  try {
    await apiCall(`/api/exams/${examToDeleteId}`, { method: 'DELETE' });
    showToast('Examination removed successfully.', 'success');
    deleteExamModal.hide();
    loadExams();
  } catch (err) {
    showToast('Failed to delete exam: ' + err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
    examToDeleteId = null;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
