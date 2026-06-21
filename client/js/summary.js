let reservation = getSelectedReservation();
const message = document.getElementById('message');
const completeBtn = document.getElementById('completeBtn');
const payBtn = document.getElementById('payBtn');

function formatDateRange(item) {
  if (!item) return '-';
  return `${item.checkIn} - ${item.checkOut}`;
}

function renderReservation(item) {
  if (!item) {
    showMessage(message, 'No reservation selected. Please search for your reservation first.', 'error');
    completeBtn.disabled = true;
    payBtn.disabled = true;
    return;
  }

  document.getElementById('guestName').textContent = item.guestName;
  document.getElementById('dates').textContent = formatDateRange(item);
  document.getElementById('room').textContent = item.roomType;
  document.getElementById('guests').textContent = `${item.guests} Guest(s)`;
  document.getElementById('view').textContent = item.room?.view || '-';
  document.getElementById('floor').textContent = item.room?.floor || '-';
  document.getElementById('roomNumber').textContent = item.room?.number || '-';
  document.getElementById('payment').textContent = item.paymentStatus;
  document.getElementById('balance').textContent = `Balance: $${item.balance}`;
  document.getElementById('reservationStatus').textContent = item.status;

  const hasBalance = Number(item.balance) > 0 || item.paymentStatus !== 'paid';
  payBtn.hidden = !hasBalance;
  completeBtn.disabled = hasBalance;
  if (hasBalance) {
    showMessage(message, 'Payment must be completed before issuing the room card.', 'info');
  } else {
    showMessage(message, '', 'info');
  }
}

async function loadWeather() {
  const weatherBox = document.getElementById('weatherBox');
  try {
    const result = await request('/weather');
    weatherBox.textContent = `${result.city}: ${result.data.temperature_2m}°C, wind ${result.data.wind_speed_10m} km/h`;
  } catch (error) {
    weatherBox.textContent = 'Weather data is currently unavailable.';
  }
}

payBtn.addEventListener('click', async () => {
  if (!reservation) return;
  try {
    setLoading(payBtn, true, 'Processing...');
    const result = await request(`/reservations/${reservation.id}/pay`, {
      method: 'PATCH',
      body: JSON.stringify({ amount: reservation.balance, method: 'Credit Card' })
    });
    reservation = result.data;
    saveSelectedReservation(result.data);
    showMessage(message, result.message, 'success');
    renderReservation(reservation);
  } catch (error) {
    showMessage(message, error.message, 'error');
  } finally {
    setLoading(payBtn, false);
  }
});

completeBtn.addEventListener('click', async () => {
  if (!reservation) return;
  try {
    setLoading(completeBtn, true, 'Completing...');
    const result = await request(`/reservations/${reservation.id}/check-in`, { method: 'PATCH' });
    saveSelectedReservation(result.data);
    window.location.href = 'thankyou.html';
  } catch (error) {
    showMessage(message, error.message, 'error');
  } finally {
    setLoading(completeBtn, false);
  }
});

renderReservation(reservation);
loadWeather();
