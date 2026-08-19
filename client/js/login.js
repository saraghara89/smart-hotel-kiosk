const loginForm = document.getElementById('loginForm');
const message = document.getElementById('message');

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('button');
  try {
    setLoading(button, true, 'Signing in...');
    const result = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      })
    });
    sessionStorage.setItem('csrfToken', result.csrfToken);
    sessionStorage.setItem('currentUser', JSON.stringify(result.data));
    window.location.replace('admin.html');
  } catch (error) {
    showMessage(message, error.message, 'error');
  } finally {
    setLoading(button, false);
  }
});
