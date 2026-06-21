const checkoutForm = document.getElementById('checkoutForm');
const message = document.getElementById('message');

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = checkoutForm.querySelector('button');
  const code = document.getElementById('reservationCode').value.trim().toUpperCase();
  const email = document.getElementById('email').value.trim().toLowerCase();
  if (!code || !email) return showMessage(message, 'Reservation code and email are required.', 'error');
  try {
    setLoading(button, true, 'Checking...');
    const all = await request(`/reservations?q=${encodeURIComponent(code)}`);
    const reservation = all.data.find((item) => item.code === code && item.email.toLowerCase() === email);
    if (!reservation) throw new Error('No matching reservation found.');
    await request(`/reservations/${reservation.id}/check-out`, { method: 'PATCH' });
    window.location.href = 'checkout-complete.html';
  } catch (error) {
    showMessage(message, error.message, 'error');
  } finally {
    setLoading(button, false);
  }
});
