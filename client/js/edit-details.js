const selected = getSelectedReservation();
const form = document.getElementById('editDetailsForm');
const message = document.getElementById('message');

function fillForm(item) {
  if (!item) {
    showMessage(message, 'No reservation selected. Please search for your reservation first.', 'error');
    form.querySelector('button').disabled = true;
    return;
  }
  document.getElementById('guestName').value = item.guestName || '';
  document.getElementById('lastName').value = item.lastName || '';
  document.getElementById('email').value = item.email || '';
  document.getElementById('phone').value = item.phone || '';
  document.getElementById('idNumber').value = item.idNumber || '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selected) return;
  const button = form.querySelector('button');
  const payload = {
    guestName: document.getElementById('guestName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    email: document.getElementById('email').value.trim().toLowerCase(),
    phone: document.getElementById('phone').value.trim(),
    idNumber: document.getElementById('idNumber').value.trim()
  };

  if (!payload.guestName || !payload.lastName || !payload.email) {
    return showMessage(message, 'Full name, last name and email are required.', 'error');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return showMessage(message, 'Please enter a valid email address.', 'error');
  }

  try {
    setLoading(button, true, 'Saving...');
    const result = await request(`/reservations/${selected.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    saveSelectedReservation(result.data);
    showMessage(message, 'Guest details updated successfully.', 'success');
    setTimeout(() => { window.location.href = 'summary.html'; }, 700);
  } catch (error) {
    showMessage(message, error.message, 'error');
  } finally {
    setLoading(button, false);
  }
});

fillForm(selected);
