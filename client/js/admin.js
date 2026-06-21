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

function requireStaffLogin() {
  const raw = localStorage.getItem('currentUser');
  if (!raw) {
    window.location.href = 'login.html';
    return null;
  }
  const user = JSON.parse(raw);
  if (!['admin', 'staff'].includes(user.role)) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

function getFormPayload() {
  const room = roomsCache.find((item) => Number(item.id) === Number(roomSelect.value));
  return {
    code: document.getElementById('code').value.trim().toUpperCase(),
    guestName: document.getElementById('guestName').value.trim(),
    lastName: document.getElementById('lastName').value.trim().toUpperCase(),
    email: document.getElementById('email').value.trim().toLowerCase(),
    checkIn: document.getElementById('checkIn').value,
    checkOut: document.getElementById('checkOut').value,
    roomId: Number(roomSelect.value),
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

async function loadRooms() {
  const result = await request('/rooms');
  roomsCache = result.data;
  roomSelect.innerHTML = roomsCache.map((room) => `<option value="${room.id}">${room.number} - ${room.type} (${room.status})</option>`).join('');
}

async function loadStats() {
  const result = await request('/stats');
  const stats = result.data;
  document.getElementById('statsCards').innerHTML = `
    <div class="dash-card"><span>Total Reservations</span><strong>${stats.totalReservations}</strong></div>
    <div class="dash-card"><span>Checked In</span><strong>${stats.checkedIn}</strong></div>
    <div class="dash-card"><span>Available Rooms</span><strong>${stats.availableRooms}</strong></div>
    <div class="dash-card"><span>Estimated Revenue</span><strong>$${stats.estimatedRevenue}</strong></div>`;
  const labels = Object.keys(stats.byStatus);
  const values = Object.values(stats.byStatus);
  if (chart) chart.destroy();
  chart = new Chart(document.getElementById('statusChart'), { type: 'bar', data: { labels, datasets: [{ label: 'Reservations', data: values }] } });
}

async function loadReservations() {
  try {
    rows.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    const params = new URLSearchParams();
    if (statusFilter.value) params.set('status', statusFilter.value);
    if (searchInput.value.trim()) params.set('q', searchInput.value.trim());
    const query = params.toString() ? `?${params.toString()}` : '';
    const result = await request(`/reservations${query}`);
    reservationsCache = result.data;
    if (!result.data.length) {
      rows.innerHTML = '<tr><td colspan="6">No reservations to display.</td></tr>';
      return;
    }
    rows.innerHTML = result.data.map((item) => `
      <tr>
        <td>${item.code}</td>
        <td>${item.guestName}</td>
        <td>${item.room?.number || '-'} / ${item.roomType}</td>
        <td>${item.paymentStatus}</td>
        <td>${item.status}</td>
        <td class="row-actions"><button class="small-btn" data-action="checkin" data-id="${item.id}">Check In</button><button class="small-btn" data-action="edit" data-id="${item.id}">Edit</button><button class="small-btn danger-btn" data-action="delete" data-id="${item.id}">Delete</button></td>
      </tr>`).join('');
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
    const result = await request(id ? `/reservations/${id}` : '/reservations', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    showMessage(message, result.message, 'success');
    clearForm();
    await loadReservations();
    await loadStats();
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
    const item = reservationsCache.find((reservation) => Number(reservation.id) === Number(id));
    if (item) fillForm(item);
    return;
  }

  try {
    if (action === 'checkin') {
      await request(`/reservations/${id}/check-in`, { method: 'PATCH' });
      showMessage(message, 'Reservation checked in successfully.', 'success');
    }
    if (action === 'delete') {
      await request(`/reservations/${id}`, { method: 'DELETE' });
      showMessage(message, 'Reservation deleted successfully.', 'success');
    }
    await loadReservations();
    await loadStats();
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
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
});

if (requireStaffLogin()) {
  loadRooms().then(() => Promise.all([loadStats(), loadReservations()])).catch((error) => showMessage(message, error.message, 'error'));
}
