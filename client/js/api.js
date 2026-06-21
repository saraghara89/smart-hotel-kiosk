const API_BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

function showMessage(element, text, type = 'info') {
  if (!element) return;
  element.textContent = text;
  element.className = `site-message ${type}`;
}

function setLoading(button, isLoading, loadingText = 'Loading...') {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function getSelectedReservation() {
  const raw = localStorage.getItem('selectedReservation');
  return raw ? JSON.parse(raw) : null;
}

function saveSelectedReservation(reservation) {
  localStorage.setItem('selectedReservation', JSON.stringify(reservation));
}
