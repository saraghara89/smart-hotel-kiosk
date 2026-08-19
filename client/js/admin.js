const rows = document.getElementById('reservationRows');
const statusFilter = document.getElementById('statusFilter');
const searchInput = document.getElementById('searchInput');
const message = document.getElementById('message');
const form = document.getElementById('reservationAdminForm');
const saveReservationBtn = document.getElementById('saveReservationBtn');
const resetFormBtn = document.getElementById('resetFormBtn');
const roomSelect = document.getElementById('roomId');
let chart;
let reservationsCache = [];
let roomsCache = [];

async function requireStaffLogin() {
  try {
    const result = await request('/auth/me');
    if (!['owner', 'admin', 'staff'].includes(result.data.role)) throw new Error('Unauthorized');
    sessionStorage.setItem('currentUser', JSON.stringify(result.data));
    return result.data;
  } catch (_) {
    sessionStorage.removeItem('csrfToken');
    sessionStorage.removeItem('currentUser');
    window.location.replace('login.html');
    return null;
  }
}

function getFormPayload() {
  const room = roomsCache.find((item) => String(item.id) === String(roomSelect.value));
  return {
    code: document.getElementById('code').value.trim().toUpperCase(),
    guestName: document.getElementById('guestName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    email: document.getElementById('email').value.trim().toLowerCase(),
    checkIn: document.getElementById('checkIn').value,
    checkOut: document.getElementById('checkOut').value,
    roomId: roomSelect.value,
    guests: Number(document.getElementById('guests').value),
    paymentStatus: document.getElementById('paymentStatus').value,
    balance: document.getElementById('paymentStatus').value === 'paid' ? 0 : Number(room?.pricePerNight || 0),
    status: document.getElementById('status').value,
    smartCheckIn: document.getElementById('status').value === 'checked-in'
  };
}

function validatePayload(payload) {
  const required = ['code', 'guestName', 'lastName', 'email', 'checkIn', 'checkOut', 'roomId', 'guests'];
  const missing = required.filter((key) => !payload[key]);
  if (missing.length) return `Missing fields: ${missing.join(', ')}`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return 'Please enter a valid email address.';
  if (new Date(payload.checkOut) <= new Date(payload.checkIn)) return 'Check-out date must be after check-in date.';
  if (!Number.isInteger(payload.guests) || payload.guests < 1 || payload.guests > 20) return 'Invalid guest count.';
  return '';
}

function clearForm() {
  form.reset();
  document.getElementById('reservationId').value = '';
  document.getElementById('guests').value = 1;
  saveReservationBtn.textContent = 'Create Reservation';
}

function fillForm(item) {
  document.getElementById('reservationId').value = item.id;
  document.getElementById('code').value = item.code;
  document.getElementById('guestName').value = item.guestName;
  document.getElementById('lastName').value = item.lastName;
  document.getElementById('email').value = item.email;
  document.getElementById('checkIn').value = item.checkIn;
  document.getElementById('checkOut').value = item.checkOut;
  document.getElementById('roomId').value = item.roomId;
  document.getElementById('guests').value = item.guests;
  document.getElementById('paymentStatus').value = item.paymentStatus;
  document.getElementById('status').value = item.status;
  saveReservationBtn.textContent = 'Update Reservation';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function appendTextCell(row, value) {
  const cell = document.createElement('td');
  cell.textContent = value == null ? '' : String(value);
  row.appendChild(cell);
}

function actionButton(label, action, id, danger = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = danger ? 'small-btn danger-btn' : 'small-btn';
  button.dataset.action = action;
  button.dataset.id = String(id);
  button.textContent = label;
  return button;
}

async function loadRooms() {
  const result = await request('/rooms');
  roomsCache = result.data;
  roomSelect.replaceChildren();
  for (const room of roomsCache) {
    const option = document.createElement('option');
    option.value = room.id;
    option.textContent = `${room.number} - ${room.type} (${room.status})`;
    roomSelect.appendChild(option);
  }
}

async function loadStats() {
  const result = await request('/stats');
  const stats = result.data;
  const cards = document.getElementById('statsCards');
  cards.replaceChildren();
  const values = [
    ['Total Reservations', stats.totalReservations],
    ['Checked In', stats.checkedIn],
    ['Available Rooms', stats.availableRooms],
    ['Estimated Revenue', `$${Number(stats.estimatedRevenue || 0).toFixed(2)}`]
  ];
  for (const [label, value] of values) {
    const card = document.createElement('div');
    card.className = 'dash-card';
    const span = document.createElement('span');
    const strong = document.createElement('strong');
    span.textContent = label;
    strong.textContent = String(value);
    card.append(span, strong);
    cards.appendChild(card);
  }

  const labels = Object.keys(stats.byStatus || {});
  const chartValues = Object.values(stats.byStatus || {}).map(Number);
  if (chart) chart.destroy();
  chart = new Chart(document.getElementById('statusChart'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Reservations', data: chartValues }] }
  });
}

async function loadReservations() {
  try {
    rows.replaceChildren();
    const loadingRow = document.createElement('tr');
    const loadingCell = document.createElement('td');
    loadingCell.colSpan = 6;
    loadingCell.textContent = 'Loading...';
    loadingRow.appendChild(loadingCell);
    rows.appendChild(loadingRow);

    const params = new URLSearchParams();
    if (statusFilter.value) params.set('status', statusFilter.value);
    if (searchInput.value.trim()) params.set('q', searchInput.value.trim().slice(0, 100));
    const result = await request(`/reservations${params.size ? `?${params}` : ''}`);
    reservationsCache = result.data;
    rows.replaceChildren();

    if (!result.data.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = 'No reservations to display.';
      row.appendChild(cell);
      rows.appendChild(row);
      return;
    }

    for (const item of result.data) {
      const row = document.createElement('tr');
      appendTextCell(row, item.code);
      appendTextCell(row, item.guestName);
      appendTextCell(row, `${item.room?.number || '-'} / ${item.roomType || '-'}`);
      appendTextCell(row, item.paymentStatus);
      appendTextCell(row, item.status);
      const actions = document.createElement('td');
      actions.className = 'row-actions';
      actions.append(
        actionButton('Check In', 'checkin', item.id),
        actionButton('Edit', 'edit', item.id),
        actionButton('Delete', 'delete', item.id, true)
      );
      row.appendChild(actions);
      rows.appendChild(row);
    }
  } catch (error) {
    showMessage(message, error.message, 'error');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = document.getElementById('reservationId').value;
  const payload = getFormPayload();
  const validationError = validatePayload(payload);
  if (validationError) return showMessage(message, validationError, 'error');

  try {
    setLoading(saveReservationBtn, true, id ? 'Updating...' : 'Creating...');
    const result = await request(id ? `/reservations/${encodeURIComponent(id)}` : '/reservations', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    showMessage(message, result.message, 'success');
    clearForm();
    await Promise.all([loadReservations(), loadStats()]);
  } catch (error) {
    showMessage(message, error.message, 'error');
  } finally {
    setLoading(saveReservationBtn, false);
  }
});

rows.addEventListener('click', async (event) => {
  const id = event.target.dataset.id;
  const action = event.target.dataset.action;
  if (!id || !action) return;

  if (action === 'edit') {
    const item = reservationsCache.find((reservation) => String(reservation.id) === String(id));
    if (item) fillForm(item);
    return;
  }

  try {
    if (action === 'checkin') {
      await request(`/reservations/${encodeURIComponent(id)}/check-in`, { method: 'PATCH' });
      showMessage(message, 'Reservation checked in successfully.', 'success');
    } else if (action === 'delete') {
      await request(`/reservations/${encodeURIComponent(id)}`, { method: 'DELETE' });
      showMessage(message, 'Reservation deleted successfully.', 'success');
    }
    await Promise.all([loadReservations(), loadStats()]);
  } catch (error) {
    showMessage(message, error.message, 'error');
  }
});

statusFilter.addEventListener('change', loadReservations);
searchInput.addEventListener('input', () => {
  window.clearTimeout(searchInput.searchTimer);
  searchInput.searchTimer = window.setTimeout(loadReservations, 350);
});
resetFormBtn.addEventListener('click', clearForm);
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try { await request('/auth/logout', { method: 'POST' }); } catch (_) {}
  sessionStorage.clear();
  window.location.replace('login.html');
});

requireStaffLogin().then((user) => {
  if (!user) return;
  loadRooms().then(() => Promise.all([loadStats(), loadReservations()])).catch((error) => showMessage(message, error.message, 'error'));
});
