const { readDatabase, writeDatabase, getNextId } = require('../db/fileDatabase');

function enrichReservation(reservation, rooms) {
  const room = rooms.find((item) => Number(item.id) === Number(reservation.roomId));
  return { ...reservation, room: room || null };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateDateRange(checkIn, checkOut) {
  return Boolean(checkIn && checkOut && new Date(checkOut) > new Date(checkIn));
}

async function getReservations(req, res, next) {
  try {
    const db = await readDatabase();
    const { q, status, roomType, paymentStatus, sortBy = 'createdAt', order = 'desc' } = req.query;
    let reservations = db.reservations.map((item) => enrichReservation(item, db.rooms));

    if (q) {
      const search = q.toLowerCase();
      reservations = reservations.filter((item) =>
        item.code.toLowerCase().includes(search) ||
        item.guestName.toLowerCase().includes(search) ||
        item.email.toLowerCase().includes(search)
      );
    }
    if (status) reservations = reservations.filter((item) => item.status === status);
    if (roomType) reservations = reservations.filter((item) => item.roomType === roomType);
    if (paymentStatus) reservations = reservations.filter((item) => item.paymentStatus === paymentStatus);

    reservations.sort((a, b) => {
      const first = a[sortBy] || '';
      const second = b[sortBy] || '';
      if (first < second) return order === 'asc' ? -1 : 1;
      if (first > second) return order === 'asc' ? 1 : -1;
      return 0;
    });

    res.json({ success: true, count: reservations.length, data: reservations });
  } catch (error) {
    next(error);
  }
}

async function getReservationById(req, res, next) {
  try {
    const db = await readDatabase();
    const reservation = db.reservations.find((item) => Number(item.id) === Number(req.params.id));
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found.' });
    res.json({ success: true, data: enrichReservation(reservation, db.rooms) });
  } catch (error) {
    next(error);
  }
}

async function verifyReservation(req, res, next) {
  try {
    const { code, lastName, email } = req.body;
    if (!code || !lastName || !email) return res.status(400).json({ success: false, message: 'Reservation code, last name and email are required.' });
    const db = await readDatabase();
    const reservation = db.reservations.find((item) =>
      item.code.toUpperCase() === code.toUpperCase() &&
      item.lastName.toUpperCase() === lastName.toUpperCase() &&
      item.email.toLowerCase() === email.toLowerCase()
    );
    if (!reservation) return res.status(404).json({ success: false, message: 'No reservation found. Please check your details.' });
    res.json({ success: true, message: 'Reservation verified successfully.', data: enrichReservation(reservation, db.rooms) });
  } catch (error) {
    next(error);
  }
}

async function createReservation(req, res, next) {
  try {
    const required = ['code', 'guestName', 'lastName', 'email', 'checkIn', 'checkOut', 'roomId', 'guests'];
    const missing = required.filter((key) => !req.body[key]);
    if (missing.length) return res.status(400).json({ success: false, message: `Missing fields: ${missing.join(', ')}` });
    if (!isValidEmail(req.body.email)) return res.status(400).json({ success: false, message: 'Invalid email address.' });
    if (!validateDateRange(req.body.checkIn, req.body.checkOut)) return res.status(400).json({ success: false, message: 'Check-out date must be after check-in date.' });

    const db = await readDatabase();
    const exists = db.reservations.some((item) => item.code.toUpperCase() === req.body.code.toUpperCase());
    if (exists) return res.status(409).json({ success: false, message: 'Reservation code already exists.' });

    const room = db.rooms.find((item) => Number(item.id) === Number(req.body.roomId));
    if (!room) return res.status(404).json({ success: false, message: 'Selected room was not found.' });
    if (room.status === 'maintenance') return res.status(400).json({ success: false, message: 'Selected room is currently under maintenance.' });
    if (Number(req.body.guests) > Number(room.capacity)) return res.status(400).json({ success: false, message: 'Room capacity is too small for the number of guests.' });

    const reservation = {
      id: getNextId(db.reservations),
      code: req.body.code.toUpperCase(),
      guestName: req.body.guestName,
      lastName: req.body.lastName.toUpperCase(),
      email: req.body.email.toLowerCase(),
      phone: req.body.phone || '',
      idNumber: req.body.idNumber || '',
      checkIn: req.body.checkIn,
      checkOut: req.body.checkOut,
      roomId: Number(req.body.roomId),
      roomType: room.type,
      guests: Number(req.body.guests),
      paymentStatus: req.body.paymentStatus || 'pending',
      balance: Number(req.body.balance || room.pricePerNight),
      status: req.body.status || 'reserved',
      smartCheckIn: Boolean(req.body.smartCheckIn),
      cardIssued: false,
      createdAt: new Date().toISOString()
    };

    db.reservations.push(reservation);
    await writeDatabase(db);
    res.status(201).json({ success: true, message: 'Reservation created successfully.', data: enrichReservation(reservation, db.rooms) });
  } catch (error) {
    next(error);
  }
}

async function updateReservation(req, res, next) {
  try {
    const db = await readDatabase();
    const index = db.reservations.findIndex((item) => Number(item.id) === Number(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: 'Reservation not found.' });

    const updated = { ...db.reservations[index], ...req.body, id: db.reservations[index].id };
    if (updated.email && !isValidEmail(updated.email)) return res.status(400).json({ success: false, message: 'Invalid email address.' });
    if (!validateDateRange(updated.checkIn, updated.checkOut)) return res.status(400).json({ success: false, message: 'Check-out date must be after check-in date.' });
    if (updated.lastName) updated.lastName = updated.lastName.toUpperCase();
    if (updated.email) updated.email = updated.email.toLowerCase();
    if (updated.roomId) {
      const room = db.rooms.find((item) => Number(item.id) === Number(updated.roomId));
      if (!room) return res.status(404).json({ success: false, message: 'Selected room was not found.' });
      if (room.status === 'maintenance') return res.status(400).json({ success: false, message: 'Selected room is currently under maintenance.' });
      if (Number(updated.guests) > Number(room.capacity)) return res.status(400).json({ success: false, message: 'Room capacity is too small for the number of guests.' });
      updated.roomType = room.type;
    }

    db.reservations[index] = updated;
    await writeDatabase(db);
    res.json({ success: true, message: 'Reservation updated successfully.', data: enrichReservation(updated, db.rooms) });
  } catch (error) {
    next(error);
  }
}

async function deleteReservation(req, res, next) {
  try {
    const db = await readDatabase();
    const exists = db.reservations.some((item) => Number(item.id) === Number(req.params.id));
    if (!exists) return res.status(404).json({ success: false, message: 'Reservation not found.' });
    db.reservations = db.reservations.filter((item) => Number(item.id) !== Number(req.params.id));
    await writeDatabase(db);
    res.json({ success: true, message: 'Reservation deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

async function completeCheckIn(req, res, next) {
  try {
    const db = await readDatabase();
    const index = db.reservations.findIndex((item) => Number(item.id) === Number(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: 'Reservation not found.' });

    if (db.reservations[index].paymentStatus !== 'paid' || Number(db.reservations[index].balance) > 0) {
      return res.status(400).json({ success: false, message: 'Payment must be completed before check-in.' });
    }

    db.reservations[index].status = 'checked-in';
    db.reservations[index].smartCheckIn = true;
    db.reservations[index].cardIssued = true;
    const room = db.rooms.find((item) => Number(item.id) === Number(db.reservations[index].roomId));
    if (room) room.status = 'occupied';
    await writeDatabase(db);
    res.json({ success: true, message: 'Check-in completed and room card issued.', data: enrichReservation(db.reservations[index], db.rooms) });
  } catch (error) {
    next(error);
  }
}

async function completeCheckout(req, res, next) {
  try {
    const db = await readDatabase();
    const index = db.reservations.findIndex((item) => Number(item.id) === Number(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: 'Reservation not found.' });

    db.reservations[index].status = 'checked-out';
    db.reservations[index].cardIssued = false;
    const room = db.rooms.find((item) => Number(item.id) === Number(db.reservations[index].roomId));
    if (room) room.status = 'available';
    await writeDatabase(db);
    res.json({ success: true, message: 'Checkout completed and room card returned.', data: enrichReservation(db.reservations[index], db.rooms) });
  } catch (error) {
    next(error);
  }
}


async function processPayment(req, res, next) {
  try {
    const db = await readDatabase();
    const index = db.reservations.findIndex((item) => Number(item.id) === Number(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: 'Reservation not found.' });

    const reservation = db.reservations[index];
    const amount = Number(req.body.amount ?? reservation.balance ?? 0);
    if (amount < 0) return res.status(400).json({ success: false, message: 'Payment amount cannot be negative.' });

    reservation.paymentStatus = 'paid';
    reservation.balance = 0;

    if (!Array.isArray(db.payments)) db.payments = [];
    db.payments.push({
      id: getNextId(db.payments),
      reservationId: reservation.id,
      amount,
      method: req.body.method || 'Credit Card',
      status: 'paid',
      paidAt: new Date().toISOString()
    });

    await writeDatabase(db);
    res.json({ success: true, message: 'Payment processed successfully.', data: enrichReservation(reservation, db.rooms) });
  } catch (error) {
    next(error);
  }
}

module.exports = { getReservations, getReservationById, verifyReservation, createReservation, updateReservation, deleteReservation, completeCheckIn, completeCheckout, processPayment };
