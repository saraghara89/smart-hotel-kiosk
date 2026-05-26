const reservation = JSON.parse(localStorage.getItem("selectedReservation"));

if (reservation) {
  const guestName = document.getElementById("guestName");
  const dates = document.getElementById("dates");
  const room = document.getElementById("room");
  const guests = document.getElementById("guests");
  const view = document.getElementById("view");
  const payment = document.getElementById("payment");

  if (guestName) guestName.textContent = reservation.guestName;
  if (dates) dates.textContent = reservation.dates;
  if (room) room.textContent = reservation.room;
  if (guests) guests.textContent = reservation.guests;
  if (view) view.textContent = reservation.view;
  if (payment) payment.textContent = reservation.payment;
}