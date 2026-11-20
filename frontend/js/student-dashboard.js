/**
 * Student Dashboard Controller
 */
let currentStudent = null;
let currentAllocations = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentStudent = await checkStudentAuth();
  if (!currentStudent) return;

  // Populate Profile Header
  document.getElementById('navStudentName').textContent = currentStudent.full_name || 'Candidate';
  document.getElementById('navStudentRoll').textContent = currentStudent.roll_number || '';
  document.getElementById('profileFullName').textContent = currentStudent.full_name || '';
  document.getElementById('profileRoll').textContent = currentStudent.roll_number || '';
  document.getElementById('profileDeptYear').textContent = `${currentStudent.department} - Year ${currentStudent.year}`;
  document.getElementById('profileEmail').textContent = currentStudent.email || `${currentStudent.roll_number.toLowerCase()}@seatwise.edu`;

  loadStudentSeating();
});

async function loadStudentSeating() {
  const loadingEl = document.getElementById('loadingState');
  const emptyEl = document.getElementById('emptyState');
  const gridEl = document.getElementById('seatingGrid');

  loadingEl.classList.remove('d-none');
  emptyEl.classList.add('d-none');
  gridEl.classList.add('d-none');

  try {
    const res = await apiCall('/api/seating/student');
    currentAllocations = res.data || [];

    loadingEl.classList.add('d-none');

    if (!currentAllocations || currentAllocations.length === 0) {
      emptyEl.classList.remove('d-none');
      return;
    }

    gridEl.classList.remove('d-none');
    renderAllocationsGrid(currentAllocations);

  } catch (err) {
    loadingEl.classList.add('d-none');
    emptyEl.classList.remove('d-none');
    showToast('Failed to retrieve seating data: ' + err.message, 'danger');
  }
}

function renderAllocationsGrid(allocations) {
  const gridEl = document.getElementById('seatingGrid');
  gridEl.innerHTML = allocations.map((item, idx) => `
    <div class="col-12 col-lg-6">
      <div class="seatwise-card h-100 d-flex flex-column justify-content-between">
        <div>
          <!-- Card Header -->
          <div class="d-flex align-items-start justify-content-between mb-3 border-bottom pb-2">
            <div>
              <span class="badge bg-primary-subtle text-primary border mb-1">
                <i class="fas fa-calendar-alt me-1"></i>${item.exam_date} &middot; ${item.session} Session
              </span>
              <h3 class="h5 fw-bold text-navy mb-0">${escapeHtml(item.exam_name)}</h3>
              <p class="text-muted small mb-0 mt-1">${escapeHtml(item.subject)}</p>
            </div>
            <span class="badge bg-success-subtle text-success border border-success-subtle">
              <i class="fas fa-check-circle me-1"></i>Seat Confirmed
            </span>
          </div>

          <!-- Highlighted Seat Allocation Box -->
          <div class="seat-highlight-box mb-3">
            <div class="row align-items-center">
              <div class="col-6 border-end">
                <div class="small text-muted text-uppercase fw-bold">Assigned Seat</div>
                <div class="seat-big-num">${escapeHtml(item.seat_number)}</div>
                <div class="small text-muted">Row ${item.row_number}, Col ${item.column_number}</div>
              </div>
              <div class="col-6">
                <div class="small text-muted text-uppercase fw-bold">Examination Room</div>
                <div class="fw-bold text-navy fs-5">${escapeHtml(item.room_number)}</div>
                <div class="small text-muted">${escapeHtml(item.hall_name)}</div>
              </div>
            </div>
          </div>

          <!-- Schedule & Logistics Grid -->
          <div class="row g-2 small mb-3">
            <div class="col-6">
              <div class="p-2 bg-light rounded border">
                <span class="text-muted d-block">Reporting Time:</span>
                <strong class="text-danger tabular-nums"><i class="fas fa-stopwatch me-1"></i>${item.reporting_time}</strong>
              </div>
            </div>
            <div class="col-6">
              <div class="p-2 bg-light rounded border">
                <span class="text-muted d-block">Exam Duration:</span>
                <strong class="text-navy tabular-nums"><i class="fas fa-clock me-1"></i>${item.start_time} - ${item.end_time}</strong>
              </div>
            </div>
            <div class="col-12">
              <div class="p-2 bg-light rounded border">
                <span class="text-muted d-block">Building / Block:</span>
                <strong class="text-navy"><i class="fas fa-building me-1"></i>${escapeHtml(item.building)}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div class="pt-2 border-top">
          <button class="btn btn-outline-seatwise w-100 d-flex align-items-center justify-content-center gap-2" onclick="openSlipModal(${idx})">
            <i class="fas fa-ticket-alt"></i>
            <span>View &amp; Print Seating Slip</span>
          </button>
        </div>

      </div>
    </div>
  `).join('');
}

function openSlipModal(index) {
  const item = currentAllocations[index];
  if (!item) return;

  const ticketArea = document.getElementById('printableTicketArea');
  ticketArea.innerHTML = `
    <div class="border p-4 rounded bg-white shadow-sm">
      <div class="text-center pb-3 border-bottom mb-3">
        <h4 class="fw-bold text-navy mb-1">UNIVERSITY EXAMINATION AUTHORITY</h4>
        <h5 class="text-primary fw-semibold mb-0">Official Examination Seating Slip</h5>
        <p class="text-muted small mb-0">Academic Session 2026</p>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-6">
          <table class="table table-sm table-borderless mb-0">
            <tr>
              <td class="text-muted small py-1">Candidate Name:</td>
              <td class="fw-bold py-1">${escapeHtml(currentStudent.full_name)}</td>
            </tr>
            <tr>
              <td class="text-muted small py-1">Roll Number:</td>
              <td class="fw-bold text-navy tabular-nums py-1">${escapeHtml(currentStudent.roll_number)}</td>
            </tr>
            <tr>
              <td class="text-muted small py-1">Department:</td>
              <td class="fw-bold py-1">${escapeHtml(currentStudent.department)} (Year ${currentStudent.year})</td>
            </tr>
          </table>
        </div>
        <div class="col-6 text-end">
          <div class="border rounded p-2 bg-light d-inline-block text-center" style="min-width: 140px;">
            <div class="small text-muted text-uppercase">Allocated Seat</div>
            <div class="fs-3 fw-bold text-navy tabular-nums">${escapeHtml(item.seat_number)}</div>
            <div class="badge bg-primary">Confirmed</div>
          </div>
        </div>
      </div>

      <div class="table-responsive mb-3">
        <table class="table table-bordered mb-0">
          <thead class="table-light">
            <tr>
              <th>Examination</th>
              <th>Subject</th>
              <th>Date &amp; Session</th>
              <th>Reporting</th>
              <th>Hall &amp; Room</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="fw-semibold">${escapeHtml(item.exam_name)}</td>
              <td>${escapeHtml(item.subject)}</td>
              <td>${item.exam_date} (${item.session})</td>
              <td class="text-danger fw-bold tabular-nums">${item.reporting_time}</td>
              <td class="fw-bold text-navy">${escapeHtml(item.hall_name)} - ${escapeHtml(item.room_number)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="p-3 bg-light rounded border small text-muted">
        <strong>Important Examination Instructions:</strong>
        <ol class="mb-0 ps-3 mt-1">
          <li>Candidate must occupy only the allocated seat (<strong>${item.seat_number}</strong>) in <strong>${item.room_number}</strong>.</li>
          <li>Candidates must report at least 30 minutes before commencement of the examination.</li>
          <li>Bring this printed seating slip along with your official College Identity Card.</li>
          <li>Electronic devices, smartphones, and unauthorized study materials are strictly prohibited.</li>
        </ol>
      </div>

      <div class="row mt-4 pt-3 border-top text-center text-muted small">
        <div class="col-6">
          <div class="pt-4 border-top border-dark d-inline-block px-4">Signature of Candidate</div>
        </div>
        <div class="col-6">
          <div class="pt-4 border-top border-dark d-inline-block px-4">Controller of Examinations</div>
        </div>
      </div>

    </div>
  `;

  const modal = new bootstrap.Modal(document.getElementById('hallTicketModal'));
  modal.show();
}

function printAllHallTickets() {
  if (!currentAllocations || currentAllocations.length === 0) {
    showToast('No published seating arrangements available to print.', 'info');
    return;
  }
  openSlipModal(0);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
