const form = document.getElementById("reservationForm");
const codeInput = document.getElementById("reservationCode");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const message = document.getElementById("message");

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const code = codeInput.value.trim().toUpperCase();
  const lastName = lastNameInput.value.trim().toUpperCase();
  const email = emailInput.value.trim().toLowerCase();

  if (!code || !lastName || !email) {
    showMessage("Please fill in all required fields.", "error-message");
    return;
  }

  if (code.length < 4) {
    showMessage("Reservation code must contain at least 4 characters.", "error-message");
    return;
  }

  if (!isValidEmail(email)) {
    showMessage("Please enter a valid email address.", "error-message");
    return;
  }

  try {
    const response = await fetch("reservations.json");
    const reservations = await response.json();

    const reservation = reservations.find(item =>
      item.code === code &&
      item.lastName === lastName &&
      item.email.toLowerCase() === email
    );

    if (!reservation) {
      showMessage("No reservation found. Please check your details.", "error-message");
      return;
    }

    localStorage.setItem("selectedReservation", JSON.stringify(reservation));

    showMessage("Reservation verified successfully.", "success-message");

    setTimeout(() => {
      window.location.href = "summary.html";
    }, 1000);

  } catch (error) {
    showMessage("Unable to load reservation data.", "error-message");
  }
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showMessage(text, className) {
  message.textContent = text;
  message.className = className;
}