/**
 * Seating Allocation & Matrix Visualizer Script
 */
let generateModal = null;
let previewModal = null;
let allExams = [];
let allHalls = [];
let currentExamId = null;
let currentExamData = null;
let currentAllocations = [];
let currentGeneratedPlan = null;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await checkAdminAuth();
  if (!admin) return;

  generateModal = new bootstrap.Modal(document.getElementById('generateModal'));
  previewModal = new bootstrap.Modal(document.getElementById('previewModal'));

  await loadAllExamsList();
  await loadAvailableHallsList();

  // Check URL query param for exam_id
  const params = new URLSearchParams(window.location.search);
  const examIdParam = params.get('exam_id');
  if (examIdParam) {
    document.getElementById('selectActiveExam').value = examIdParam;
    onExamSelectChange();
  }

  // Generator form submit
  document.getElementById('generatorForm').addEventListener('submit', handleRunGenerator);
});

async function loadAllExamsList() {
  try {
    const res = await apiCall('/api/exams');
    allExams = res.data || [];
    const select = document.getElementById('selectActiveExam');
    const genSelect = document.getElementById('genExamSelect');

    let html = `<option value="">-- Choose Examination --</option>`;
    let genHtml = `<option value="">-- Choose Examination to Allocate --</option>`;

    allExams.forEach(e => {
      const label = `${e.exam_name} (${e.subject}) [${e.exam_date} - ${e.session}]`;
      html += `<option value="${e.id}">${escapeHtml(label)}</option>`;
      genHtml += `<option value="${e.id}">${escapeHtml(label)}</option>`;
    });

    select.innerHTML = html;
    genSelect.innerHTML = genHtml;
  } catch (err) {
    showToast('Failed to load exams: ' + err.message, 'danger');
  }
}

async function loadAvailableHallsList() {
  try {
    const res = await apiCall('/api/halls');
    allHalls = res.data || [];
    const box = document.getElementById('hallCheckboxList');

    if (!allHalls || allHalls.length === 0) {
      box.innerHTML = `<span class="text-danger small">No halls found. <a href="halls.html">Create halls first</a>.</span>`;
      return;
    }

    box.innerHTML = allHalls.map(h => `
      <div class="form-check d-flex align-items-center justify-content-between mb-1">
        <div>
          <input class="form-check-input hall-chk" type="checkbox" id="hall_${h.id}" value="${h.id}" checked>
          <label class="form-check-label ms-1 fw-medium" for="hall_${h.id}">
            ${escapeHtml(h.hall_name)} <small class="text-muted">(${escapeHtml(h.building)} - ${escapeHtml(h.room_number)})</small>
          </label>
        </div>
        <span class="badge bg-white text-navy border tabular-nums">${h.capacity} seats</span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load halls', err);
  }
}

function selectAllHalls(checked = true) {
  document.querySelectorAll('.hall-chk').forEach(c => c.checked = checked);
}

function toggleAllDepts(masterCheckbox) {
  document.querySelectorAll('.dept-chk').forEach(c => c.checked = masterCheckbox.checked);
}

async function onExamSelectChange() {
  const select = document.getElementById('selectActiveExam');
  currentExamId = select.value;
  const publishBtn = document.getElementById('publishBtn');
  const clearBtn = document.getElementById('clearAllocBtn');
  const metaBadge = document.getElementById('examMetaBadge');
  const publishBadge = document.getElementById('publishStatusBadge');

  if (!currentExamId) {
    metaBadge.innerHTML = `<span class="badge bg-light text-muted border">No exam selected</span>`;
    publishBadge.innerHTML = '';
    publishBtn.disabled = true;
    clearBtn.disabled = true;
    renderEmptyMatrix('Please select an examination to view seating arrangements.');
    return;
  }

  const exam = allExams.find(e => String(e.id) === String(currentExamId));
  currentExamData = exam;

  if (exam) {
    metaBadge.innerHTML = `
      <span class="badge bg-primary-subtle text-primary border">
        ${exam.department} &middot; ${exam.exam_date} (${exam.session})
      </span>
    `;
  }

  // Fetch allocation data
  try {
    const res = await apiCall(`/api/seating/exam/${currentExamId}`);
    const data = res.data || {};
    currentAllocations = data.allocations || [];
    const isPublished = data.is_published || 0;

    publishBtn.disabled = currentAllocations.length === 0;
    clearBtn.disabled = currentAllocations.length === 0;

    if (currentAllocations.length > 0) {
      if (isPublished) {
        publishBadge.innerHTML = `<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Published to Students</span>`;
        publishBtn.innerHTML = `<i class="fas fa-eye-slash me-1"></i>Unpublish`;
        publishBtn.className = 'btn btn-outline-warning btn-sm';
        publishBtn.onclick = () => togglePublish(0);
      } else {
        publishBadge.innerHTML = `<span class="badge bg-warning text-dark"><i class="fas fa-edit me-1"></i>Draft (Not Published)</span>`;
        publishBtn.innerHTML = `<i class="fas fa-bullhorn me-1"></i>Publish for Students`;
        publishBtn.className = 'btn btn-success btn-sm';
        publishBtn.onclick = () => togglePublish(1);
      }

      renderHallMatrices(data.halls || []);
      renderStudentAllocTable(currentAllocations);
    } else {
      publishBadge.innerHTML = `<span class="badge bg-secondary">No Allocation</span>`;
      renderEmptyMatrix('No seating arrangement generated yet for this examination. Click "Configure & Generate Seating" to run the algorithm.');
    }

  } catch (err) {
    showToast('Failed to load seating: ' + err.message, 'danger');
  }
}

function renderHallMatrices(halls) {
  const container = document.getElementById('hallGridContainer');
  if (!halls || halls.length === 0) {
    renderEmptyMatrix('No halls assigned.');
    return;
  }

  container.innerHTML = halls.map(h => {
    // Build seat map from allocations
    const seatMap = {};
    (h.seats || []).forEach(s => {
      seatMap[s.seat_number] = s;
    });

    const rows = h.total_rows;
    const cols = h.total_columns;

    let gridHtml = '';
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const sNum = `S-R${r}C${c}`;
        const student = seatMap[sNum];

        if (student) {
          gridHtml += `
            <div class="seat-card allocated visual-seat" data-roll="${escapeHtml(student.roll_number)}" data-name="${escapeHtml(student.student_name)}" title="Seat: ${sNum} | ${student.roll_number} - ${student.student_name}">
              <div class="seat-tag">${sNum}</div>
              <div class="seat-student-roll">${escapeHtml(student.roll_number)}</div>
              <div class="seat-student-name">${escapeHtml(student.student_name)}</div>
              <div><span class="seat-student-dept">${escapeHtml(student.department)}</span></div>
            </div>
          `;
        } else {
          gridHtml += `
            <div class="seat-card available visual-seat" data-roll="" data-name="" title="Empty Seat: ${sNum}">
              <div class="seat-tag">${sNum}</div>
              <div class="small text-muted py-2">Available</div>
            </div>
          `;
        }
      }
    }

    return `
      <div class="seatwise-card mb-4 bg-white">
        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 border-bottom pb-2">
          <div>
            <h4 class="h5 fw-bold text-navy mb-0">
              <i class="fas fa-door-open me-2 text-primary"></i>${escapeHtml(h.hall_name)}
            </h4>
            <span class="text-muted small">${escapeHtml(h.building)} &middot; Room: <strong>${escapeHtml(h.room_number)}</strong></span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-light text-navy border">
              <i class="fas fa-chair me-1"></i>${(h.seats || []).length} / ${rows * cols} Seats Occupied
            </span>
            <span class="badge bg-primary-subtle text-primary border">${rows} Rows &times; ${cols} Columns</span>
          </div>
        </div>

        <!-- Blackboard / Podium -->
        <div class="podium-board">
          <i class="fas fa-chalkboard me-2"></i>BLACKBOARD / CHIEF INVIGILATOR DESK (FRONT)
        </div>

        <!-- Seating Grid -->
        <div class="hall-grid" style="grid-template-columns: repeat(${cols}, minmax(130px, 1fr));">
          ${gridHtml}
        </div>
      </div>
    `;
  }).join('');
}

function renderStudentAllocTable(allocations) {
  const tbody = document.getElementById('studentAllocTableBody');
  if (!allocations || allocations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No student allocations found.</td></tr>`;
    return;
  }

  tbody.innerHTML = allocations.map(a => `
    <tr>
      <td class="fw-bold text-navy tabular-nums">${escapeHtml(a.roll_number)}</td>
      <td class="fw-semibold">${escapeHtml(a.student_name)}</td>
      <td><span class="badge-dept">${escapeHtml(a.department)}</span></td>
      <td class="fw-medium">${escapeHtml(a.hall_name)}</td>
      <td><span class="badge bg-light text-navy border">${escapeHtml(a.room_number)}</span></td>
      <td><strong class="text-primary tabular-nums fs-6">${escapeHtml(a.seat_number)}</strong></td>
      <td class="text-muted small">Row ${a.row_number}, Col ${a.column_number}</td>
    </tr>
  `).join('');
}

function renderEmptyMatrix(msg) {
  const container = document.getElementById('hallGridContainer');
  container.innerHTML = `
    <div class="seatwise-card text-center py-5 text-muted">
      <i class="fas fa-chair fa-3x text-primary opacity-50 mb-3"></i>
      <h4 class="h5 fw-bold text-navy">No Seating Matrix Available</h4>
      <p class="small text-muted mb-3">${escapeHtml(msg)}</p>
      <button class="btn btn-primary-seatwise btn-sm" data-bs-toggle="modal" data-bs-target="#generateModal" onclick="prepareGenerateModal()">
        <i class="fas fa-magic me-1"></i>Configure &amp; Generate Seating
      </button>
    </div>
  `;
}

function filterVisualSeats() {
  const term = document.getElementById('localSeatSearch').value.toLowerCase().trim();
  const seats = document.querySelectorAll('.visual-seat');

  seats.forEach(seat => {
    const roll = (seat.getAttribute('data-roll') || '').toLowerCase();
    const name = (seat.getAttribute('data-name') || '').toLowerCase();

    if (!term || roll.includes(term) || name.includes(term)) {
      seat.style.opacity = '1';
      if (term && (roll.includes(term) || name.includes(term))) {
        seat.style.transform = 'scale(1.04)';
        seat.style.borderColor = '#1E3A8A';
      } else {
        seat.style.transform = '';
        seat.style.borderColor = '';
      }
    } else {
      seat.style.opacity = '0.35';
      seat.style.transform = '';
      seat.style.borderColor = '';
    }
  });
}

function prepareGenerateModal() {
  const genSelect = document.getElementById('genExamSelect');
  if (currentExamId) {
    genSelect.value = currentExamId;
  }
  document.getElementById('genErrorAlert').classList.add('d-none');
}

async function handleRunGenerator(e) {
  e.preventDefault();
  const exam_id = document.getElementById('genExamSelect').value;
  const stratRadio = document.querySelector('input[name="strategy"]:checked');
  const strategy = stratRadio ? stratRadio.value : 'sequential';

  // Selected Halls
  const hall_ids = Array.from(document.querySelectorAll('.hall-chk:checked')).map(c => parseInt(c.value));

  // Selected Depts
  const deptAll = document.getElementById('deptAll').checked;
  const departments = deptAll ? ['ALL'] : Array.from(document.querySelectorAll('.dept-chk:checked')).map(c => c.value);

  const errorAlert = document.getElementById('genErrorAlert');
  const errorMsg = document.getElementById('genErrorMsg');
  errorAlert.classList.add('d-none');

  if (!exam_id) {
    errorMsg.textContent = 'Please choose a target examination.';
    errorAlert.classList.remove('d-none');
    return;
  }

  if (hall_ids.length === 0) {
    errorMsg.textContent = 'Please select at least one examination hall.';
    errorAlert.classList.remove('d-none');
    return;
  }

  const runBtn = document.getElementById('runAlgorithmBtn');
  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Allocating Seats...';

  try {
    const res = await apiCall('/api/seating/generate', {
      method: 'POST',
      body: JSON.stringify({ exam_id: parseInt(exam_id), hall_ids, departments, strategy })
    });

    currentGeneratedPlan = res.data;
    generateModal.hide();
    showPreviewModal(currentGeneratedPlan);

  } catch (err) {
    errorMsg.textContent = err.message || 'Seating allocation failed.';
    errorAlert.classList.remove('d-none');
  } finally {
    runBtn.disabled = false;
    runBtn.innerHTML = '<i class="fas fa-play me-1"></i>Generate Seating Preview';
  }
}

function showPreviewModal(plan) {
  if (!plan) return;

  document.getElementById('prevTotalStudents').textContent = plan.total_students || 0;
  document.getElementById('prevTotalCapacity').textContent = plan.total_capacity || 0;
  document.getElementById('prevTotalAllocated').textContent = plan.total_allocated || 0;
  document.getElementById('prevStrategy').textContent = plan.strategy === 'alternate' ? 'Alternate Department' : 'Sequential Roll Number';

  const previewBox = document.getElementById('previewHallMatrices');
  previewBox.innerHTML = (plan.hall_previews || []).map(h => {
    let grid = '';
    (h.seats_grid || []).forEach(row => {
      row.forEach(seat => {
        if (seat.is_occupied && seat.student) {
          grid += `
            <div class="seat-card allocated p-2" title="${seat.seat_number} - ${seat.student.roll_number} (${seat.student.full_name})">
              <div class="seat-tag">${seat.seat_number}</div>
              <div class="seat-student-roll">${escapeHtml(seat.student.roll_number)}</div>
              <div class="seat-student-name">${escapeHtml(seat.student.full_name)}</div>
              <div><span class="seat-student-dept">${escapeHtml(seat.student.department)}</span></div>
            </div>
          `;
        } else {
          grid += `
            <div class="seat-card available p-2">
              <div class="seat-tag">${seat.seat_number}</div>
              <div class="small text-muted py-1">Available</div>
            </div>
          `;
        }
      });
    });

    return `
      <div class="border rounded p-3 mb-3 bg-white">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <strong class="text-navy fs-6">${escapeHtml(h.hall_name)} (${escapeHtml(h.room_number)})</strong>
          <span class="badge bg-light text-navy border">${h.allocated_count} / ${h.capacity} Allocated</span>
        </div>
        <div class="hall-grid" style="grid-template-columns: repeat(${h.total_columns}, minmax(110px, 1fr));">
          ${grid}
        </div>
      </div>
    `;
  }).join('');

  previewModal.show();
}

async function confirmSaveAllocation(publish = false) {
  if (!currentGeneratedPlan || !currentGeneratedPlan.allocations) return;

  try {
    const res = await apiCall('/api/seating/save', {
      method: 'POST',
      body: JSON.stringify({
        exam_id: currentGeneratedPlan.exam.id,
        allocations: currentGeneratedPlan.allocations,
        publish: publish
      })
    });

    showToast(`Saved ${res.data.saved_count} allocations successfully! ${publish ? 'Arrangement is now LIVE for students.' : 'Saved as draft.'}`, 'success');
    previewModal.hide();

    // Set selectActiveExam and refresh
    document.getElementById('selectActiveExam').value = currentGeneratedPlan.exam.id;
    await onExamSelectChange();
  } catch (err) {
    showToast('Failed to save allocations: ' + err.message, 'danger');
  }
}

async function togglePublish(publishState) {
  if (!currentExamId) return;

  try {
    await apiCall('/api/seating/publish', {
      method: 'POST',
      body: JSON.stringify({ exam_id: parseInt(currentExamId), published: publishState })
    });

    showToast(publishState ? 'Seating arrangement published! Students can now see their seats.' : 'Seating arrangement unpublished.', 'success');
    await onExamSelectChange();
  } catch (err) {
    showToast('Failed to update publish state: ' + err.message, 'danger');
  }
}

async function confirmClearSeating() {
  if (!currentExamId) return;
  if (!confirm('Are you sure you want to clear all seating allocations for this examination? This action cannot be undone.')) return;

  try {
    await apiCall(`/api/seating/exam/${currentExamId}`, { method: 'DELETE' });
    showToast('Seating allocations cleared successfully.', 'success');
    await onExamSelectChange();
  } catch (err) {
    showToast('Failed to clear seating: ' + err.message, 'danger');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
