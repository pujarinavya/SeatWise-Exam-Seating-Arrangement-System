/**
 * Hall Management Script
 */
let hallModal = null;
let deleteHallModal = null;
let hallToDeleteId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await checkAdminAuth();
  if (!admin) return;

  hallModal = new bootstrap.Modal(document.getElementById('hallFormModal'));
  deleteHallModal = new bootstrap.Modal(document.getElementById('deleteHallModal'));

  loadHalls();

  document.getElementById('hallSearchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadHalls();
  });

  document.getElementById('hallForm').addEventListener('submit', handleSaveHall);
  document.getElementById('confirmDeleteHallBtn').addEventListener('click', executeDeleteHall);
});

function calcCapacity() {
  const rows = parseInt(document.getElementById('formRows').value) || 0;
  const cols = parseInt(document.getElementById('formCols').value) || 0;
  document.getElementById('formCapacity').value = rows * cols;
}

async function loadHalls() {
  const tbody = document.getElementById('hallTableBody');
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading halls...</td></tr>`;

  const search = document.getElementById('hallSearchInput').value.trim();
  const status = document.getElementById('hallStatusFilter').value;

  const url = `/api/halls?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`;

  try {
    const res = await apiCall(url);
    const halls = res.data || [];
    renderHallRows(halls);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger"><i class="fas fa-exclamation-circle me-1"></i>${err.message}</td></tr>`;
  }
}

function renderHallRows(halls) {
  const tbody = document.getElementById('hallTableBody');
  if (!halls || halls.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">No examination halls found.</td></tr>`;
    return;
  }

  tbody.innerHTML = halls.map(h => `
    <tr>
      <td class="fw-bold text-navy">
        <i class="fas fa-door-open me-2 text-primary"></i>${escapeHtml(h.hall_name)}
      </td>
      <td>${escapeHtml(h.building)}</td>
      <td><span class="badge bg-light text-navy border font-monospace">${escapeHtml(h.room_number)}</span></td>
      <td><span class="small tabular-nums">${h.total_rows} Rows &times; ${h.total_columns} Cols</span></td>
      <td><strong class="text-navy tabular-nums fs-6">${h.capacity}</strong> <span class="small text-muted">Seats</span></td>
      <td>
        <span class="badge ${h.status === 'Available' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning border border-warning-subtle'}">
          ${h.status}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary py-1 px-2 me-1" onclick="prepareEditHall(${JSON.stringify(h).replace(/"/g, '&quot;')})" title="Edit Hall">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger py-1 px-2" onclick="confirmDeleteHall(${h.id}, '${escapeHtml(h.hall_name)}')" title="Delete Hall">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function resetHallFilters() {
  document.getElementById('hallSearchInput').value = '';
  document.getElementById('hallStatusFilter').value = '';
  loadHalls();
}

function prepareAddHall() {
  document.getElementById('hallModalTitle').textContent = 'Add Examination Hall';
  document.getElementById('hallId').value = '';
  document.getElementById('formHallName').value = '';
  document.getElementById('formBuilding').value = '';
  document.getElementById('formRoom').value = '';
  document.getElementById('formRows').value = '5';
  document.getElementById('formCols').value = '4';
  calcCapacity();
  document.getElementById('formHallStatus').value = 'Available';
}

function prepareEditHall(hall) {
  document.getElementById('hallModalTitle').textContent = 'Edit Examination Hall';
  document.getElementById('hallId').value = hall.id;
  document.getElementById('formHallName').value = hall.hall_name;
  document.getElementById('formBuilding').value = hall.building;
  document.getElementById('formRoom').value = hall.room_number;
  document.getElementById('formRows').value = hall.total_rows;
  document.getElementById('formCols').value = hall.total_columns;
  calcCapacity();
  document.getElementById('formHallStatus').value = hall.status;
  hallModal.show();
}

async function handleSaveHall(e) {
  e.preventDefault();
  const id = document.getElementById('hallId').value;
  const hall_name = document.getElementById('formHallName').value.trim();
  const building = document.getElementById('formBuilding').value.trim();
  const room_number = document.getElementById('formRoom').value.trim();
  const total_rows = document.getElementById('formRows').value;
  const total_columns = document.getElementById('formCols').value;
  const status = document.getElementById('formHallStatus').value;

  if (!hall_name || !building || !room_number || !total_rows || !total_columns) {
    showToast('Please fill in all required fields.', 'danger');
    return;
  }

  const payload = { hall_name, building, room_number, total_rows, total_columns, status };
  const btn = document.getElementById('saveHallBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    if (id) {
      await apiCall(`/api/halls/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Hall details updated successfully.', 'success');
    } else {
      await apiCall('/api/halls', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Examination hall created successfully.', 'success');
    }
    hallModal.hide();
    loadHalls();
  } catch (err) {
    showToast(err.message || 'Failed to save hall.', 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Hall Details';
  }
}

function confirmDeleteHall(id, name) {
  hallToDeleteId = id;
  document.getElementById('deleteHallName').textContent = name;
  deleteHallModal.show();
}

async function executeDeleteHall() {
  if (!hallToDeleteId) return;

  const btn = document.getElementById('confirmDeleteHallBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  try {
    await apiCall(`/api/halls/${hallToDeleteId}`, { method: 'DELETE' });
    showToast('Hall removed successfully.', 'success');
    deleteHallModal.hide();
    loadHalls();
  } catch (err) {
    showToast('Failed to delete hall: ' + err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
    hallToDeleteId = null;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
