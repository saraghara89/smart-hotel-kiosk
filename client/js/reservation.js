const form = document.getElementById('reservationForm');
const codeInput = document.getElementById('reservationCode');
const lastNameInput = document.getElementById('lastName');
const emailInput = document.getElementById('email');
const message = document.getElementById('message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  const code = codeInput.value.trim().toUpperCase();
  const lastName = lastNameInput.value.trim().toUpperCase();
  const email = emailInput.value.trim().toLowerCase();

  if (!code || !lastName || !email) return showMessage(message, 'Please fill in all required fields.', 'error');
  if (code.length < 4) return showMessage(message, 'Reservation code must contain at least 4 characters.', 'error');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showMessage(message, 'Please enter a valid email address.', 'error');

  try {
    setLoading(button, true, 'Checking...');
    const result = await request('/reservations/verify', {
      method: 'POST',
      body: JSON.stringify({ code, lastName, email })
    });
    saveSelectedReservation(result.data);
    showMessage(message, result.message, 'success');
    setTimeout(() => { window.location.href = 'summary.html'; }, 700);
  } catch (error) {
    showMessage(message, error.message, 'error');
  } finally {
    setLoading(button, false);
  }
});
