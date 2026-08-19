const API_BASE = '/api';

async function request(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = sessionStorage.getItem('csrfToken');
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    ...options,
    method,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    if (response.status === 401) {
      sessionStorage.removeItem('csrfToken');
      sessionStorage.removeItem('currentUser');
    }
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
  const raw = sessionStorage.getItem('selectedReservation');
  return raw ? JSON.parse(raw) : null;
}

function saveSelectedReservation(reservation) {
  sessionStorage.setItem('selectedReservation', JSON.stringify(reservation));
}
