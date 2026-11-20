/**
 * Admin Dashboard Logic
 */
let deptChartInstance = null;
let hallChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await checkAdminAuth();
  if (!admin) return;

  loadDashboardData();
});

async function loadDashboardData() {
  try {
    const res = await apiCall('/api/reports/dashboard-stats');
    const data = res.data || {};

    // 1. KPI Counters
    document.getElementById('statTotalStudents').textContent = data.total_students || 0;
    document.getElementById('statTotalExams').textContent = data.total_exams || 0;
    document.getElementById('statTotalHalls').textContent = data.total_halls || 0;
    document.getElementById('statTotalAllocations').textContent = data.total_allocations || 0;
    document.getElementById('statCapacityLabel').textContent = `${data.total_capacity || 0} Total Seat Capacity`;

    // 2. Department Chart (Pie/Doughnut)
    renderDeptChart(data.dept_stats || []);

    // 3. Hall Chart (Bar)
    renderHallChart(data.hall_stats || []);

    // 4. Recent Exams Table
    renderRecentExams(data.recent_exams || []);

    // 5. Recent Students Table
    renderRecentStudents(data.recent_students || []);

  } catch (err) {
    showToast('Failed to load dashboard statistics: ' + err.message, 'danger');
  }
}

function renderDeptChart(deptStats) {
  const ctx = document.getElementById('deptChart');
  if (!ctx) return;

  const labels = deptStats.map(d => d.department);
  const counts = deptStats.map(d => d.count);

  if (deptChartInstance) {
    deptChartInstance.destroy();
  }

  const palette = ['#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

  deptChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [{
        data: counts.length ? counts : [0],
        backgroundColor: palette.slice(0, labels.length || 1),
        borderWidth: 2,
        borderColor: '#FFFFFF'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
            boxWidth: 14,
            padding: 15
          }
        }
      },
      cutout: '65%'
    }
  });
}

function renderHallChart(hallStats) {
  const ctx = document.getElementById('hallChart');
  if (!ctx) return;

  const labels = hallStats.map(h => h.hall_name);
  const capacities = hallStats.map(h => h.capacity);
  const allocated = hallStats.map(h => h.allocated || 0);

  if (hallChartInstance) {
    hallChartInstance.destroy();
  }

  hallChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['No Halls'],
      datasets: [
        {
          label: 'Total Capacity',
          data: capacities.length ? capacities : [0],
          backgroundColor: '#DBEAFE',
          borderColor: '#93C5FD',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: 'Occupied Seats',
          data: allocated.length ? allocated : [0],
          backgroundColor: '#3B82F6',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#F1F5F9' },
          ticks: { font: { family: 'JetBrains Mono', size: 11 } }
        }
      }
    }
  });
}

function renderRecentExams(exams) {
  const tbody = document.getElementById('recentExamsTableBody');
  if (!tbody) return;

  if (!exams || exams.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No examinations scheduled yet. <a href="exams.html">Schedule an exam</a>.</td></tr>`;
    return;
  }

  tbody.innerHTML = exams.map(e => `
    <tr>
      <td>
        <div class="fw-bold text-navy">${escapeHtml(e.exam_name)}</div>
        <div class="small text-muted">${escapeHtml(e.subject)}</div>
      </td>
      <td>
        <div class="small fw-semibold">${e.exam_date}</div>
        <span class="badge bg-light text-navy border">${e.session} Session</span>
      </td>
      <td>
        <span class="fw-bold text-navy tabular-nums">${e.alloc_count || 0}</span>
        ${e.published ? '<span class="badge bg-success-subtle text-success ms-1">Published</span>' : (e.alloc_count ? '<span class="badge bg-warning-subtle text-warning ms-1">Draft</span>' : '<span class="badge bg-secondary-subtle text-secondary ms-1">Unassigned</span>')}
      </td>
      <td>
        <span class="badge ${e.status === 'Completed' ? 'badge-status-completed' : 'badge-status-scheduled'}">${e.status}</span>
      </td>
      <td>
        <a href="seating.html?exam_id=${e.id}" class="btn btn-sm btn-outline-seatwise py-1 px-2" title="Manage Seating">
          <i class="fas fa-chair me-1"></i>Seats
        </a>
      </td>
    </tr>
  `).join('');
}

function renderRecentStudents(students) {
  const tbody = document.getElementById('recentStudentsTableBody');
  if (!tbody) return;

  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">No students registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td class="fw-bold text-navy tabular-nums">${escapeHtml(s.roll_number)}</td>
      <td>
        <div class="fw-medium">${escapeHtml(s.full_name)}</div>
      </td>
      <td>
        <span class="badge-dept">${escapeHtml(s.department)}</span>
        <span class="small text-muted ms-1">Yr ${s.year}</span>
      </td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
