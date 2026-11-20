/**
 * Reports and Export Controller
 */
document.addEventListener('DOMContentLoaded', async () => {
  const admin = await checkAdminAuth();
  if (!admin) return;

  document.getElementById('reportGenDate').textContent = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  await loadReportFilters();
  loadReportData();
});

async function loadReportFilters() {
  try {
    const [examsRes, hallsRes] = await Promise.all([
      apiCall('/api/exams'),
      apiCall('/api/halls')
    ]);

    const examSelect = document.getElementById('reportExamFilter');
    const hallSelect = document.getElementById('reportHallFilter');

    (examsRes.data || []).forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.exam_name} (${e.subject}) [${e.exam_date}]`;
      examSelect.appendChild(opt);
    });

    (hallsRes.data || []).forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = `${h.hall_name} (${h.room_number})`;
      hallSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load report filters', err);
  }
}

async function loadReportData() {
  const tbody = document.getElementById('reportTableBody');
  tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading report data...</td></tr>`;

  const exam_id = document.getElementById('reportExamFilter').value;
  const hall_id = document.getElementById('reportHallFilter').value;
  const dept = document.getElementById('reportDeptFilter').value;
  const search = document.getElementById('reportSearchInput').value.trim();

  const url = `/api/reports/seating/data?exam_id=${encodeURIComponent(exam_id)}&hall_id=${encodeURIComponent(hall_id)}&department=${encodeURIComponent(dept)}&search=${encodeURIComponent(search)}`;

  try {
    const res = await apiCall(url);
    const data = res.data || [];

    document.getElementById('reportTotalCount').textContent = data.length;

    let desc = [];
    if (exam_id) desc.push('Filtered by Exam');
    if (hall_id) desc.push('Filtered by Hall');
    if (dept) desc.push(`Dept: ${dept}`);
    if (search) desc.push(`Search: "${search}"`);
    document.getElementById('reportFilterDesc').textContent = desc.length ? desc.join(', ') : 'Showing all examination allocations';

    renderReportRows(data);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-danger"><i class="fas fa-exclamation-triangle me-1"></i>${err.message}</td></tr>`;
  }
}

function renderReportRows(data) {
  const tbody = document.getElementById('reportTableBody');
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-muted">No seating records found matching the selected filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((row, idx) => `
    <tr>
      <td class="text-center small text-muted tabular-nums">${idx + 1}</td>
      <td class="fw-bold text-navy tabular-nums">${escapeHtml(row.roll_number)}</td>
      <td class="fw-semibold">${escapeHtml(row.student_name)}</td>
      <td><span class="badge-dept">${escapeHtml(row.department)}</span></td>
      <td>
        <div class="fw-medium">${escapeHtml(row.exam_name)}</div>
        <div class="small text-muted">${escapeHtml(row.subject)}</div>
      </td>
      <td>
        <div class="small fw-semibold">${row.exam_date}</div>
        <span class="badge bg-light text-navy border">${row.session}</span>
      </td>
      <td>${escapeHtml(row.hall_name)}</td>
      <td><span class="badge bg-light text-navy border">${escapeHtml(row.room_number)}</span></td>
      <td><strong class="text-navy tabular-nums fs-6">${escapeHtml(row.seat_number)}</strong></td>
      <td class="print-only text-muted" style="min-width: 120px;">&nbsp;</td>
    </tr>
  `).join('');
}

function downloadExcelReport() {
  const exam_id = document.getElementById('reportExamFilter').value;
  const hall_id = document.getElementById('reportHallFilter').value;
  const url = `/api/reports/seating/excel?exam_id=${encodeURIComponent(exam_id)}&hall_id=${encodeURIComponent(hall_id)}`;
  window.location.href = url;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
