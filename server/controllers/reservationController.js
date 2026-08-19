const { z } = require('zod');
const { sql } = require('../db/postgres');

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const reservationInput = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/).transform((v) => v.toUpperCase()),
  guestName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  phone: z.string().trim().max(32).optional().default(''),
  roomId: uuid,
  checkIn: z.iso.date(),
  checkOut: z.iso.date(),
  guests: z.coerce.number().int().min(1).max(20),
  paymentStatus: z.enum(['pending', 'partial', 'paid', 'refunded']).default('pending'),
  balance: z.coerce.number().min(0).max(10000000).optional(),
  status: z.enum(['reserved', 'checked-in', 'checked-out', 'cancelled', 'no-show']).default('reserved'),
  smartCheckIn: z.boolean().optional().default(false)
}).refine((v) => v.checkOut > v.checkIn, { message: 'Check-out date must be after check-in date.' });

const updateInput = reservationInput.partial().refine((v) => !v.checkIn || !v.checkOut || v.checkOut > v.checkIn, {
  message: 'Check-out date must be after check-in date.'
});

const verifyInput = z.object({
  code: z.string().trim().min(3).max(40).transform((v) => v.toUpperCase()),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase())
});

const toDbStatus = (value) => String(value || '').replaceAll('-', '_');
const toApiStatus = (value) => String(value || '').replaceAll('_', '-');

function mapReservation(row) {
  return {
    id: row.id,
    code: row.code,
    guestName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone || '',
    checkIn: row.check_in_date,
    checkOut: row.check_out_date,
    roomId: row.room_id,
    roomType: row.room_type,
    guests: row.guest_count,
    paymentStatus: row.payment_status,
    balance: Number(row.balance),
    status: toApiStatus(row.status),
    smartCheckIn: row.smart_check_in,
    cardIssued: row.card_issued,
    createdAt: row.created_at,
    room: row.room_id ? {
      id: row.room_id,
      number: row.room_number,
      type: row.room_type,
      view: row.view_name,
      floor: row.floor,
      capacity: row.capacity,
      pricePerNight: Number(row.price_per_night),
      status: row.room_status
    } : null
  };
}

async function selectReservation(id, hotelId, executor = sql) {
  const rows = await executor`
    SELECT r.*, g.first_name, g.last_name, g.email, g.phone,
           rm.room_number, rm.room_type, rm.view_name, rm.floor, rm.capacity, rm.price_per_night, rm.status AS room_status
    FROM reservations r
    JOIN guests g ON g.id = r.guest_id AND g.hotel_id = r.hotel_id
    LEFT JOIN rooms rm ON rm.id = r.room_id AND rm.hotel_id = r.hotel_id
    WHERE r.id = ${id} AND r.hotel_id = ${hotelId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function getReservations(req, res, next) {
  try {
    const hotelId = req.auth.user.hotelId;
    const q = String(req.query.q || '').trim().slice(0, 100);
    const status = req.query.status ? toDbStatus(req.query.status) : null;
    const paymentStatus = req.query.paymentStatus ? String(req.query.paymentStatus) : null;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

    const rows = await sql`
      SELECT r.*, g.first_name, g.last_name, g.email, g.phone,
             rm.room_number, rm.room_type, rm.view_name, rm.floor, rm.capacity, rm.price_per_night, rm.status AS room_status
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id AND g.hotel_id = r.hotel_id
      LEFT JOIN rooms rm ON rm.id = r.room_id AND rm.hotel_id = r.hotel_id
      WHERE r.hotel_id = ${hotelId}
        AND (${q} = '' OR r.code ILIKE ${'%' + q + '%'} OR g.first_name ILIKE ${'%' + q + '%'} OR g.last_name ILIKE ${'%' + q + '%'} OR g.email ILIKE ${'%' + q + '%'})
        AND (${status}::text IS NULL OR r.status = ${status})
        AND (${paymentStatus}::text IS NULL OR r.payment_status = ${paymentStatus})
      ORDER BY r.created_at DESC
      LIMIT ${limit}
    `;

    res.set('Cache-Control', 'no-store');
    res.json({ success: true, count: rows.length, data: rows.map(mapReservation) });
  } catch (error) { next(error); }
}

async function getReservationById(req, res, next) {
  try {
    const parsedId = uuid.safeParse(req.params.id);
    if (!parsedId.success) return res.status(400).json({ success: false, message: 'Invalid reservation id.' });
    const row = await selectReservation(parsedId.data, req.auth.user.hotelId);
    if (!row) return res.status(404).json({ success: false, message: 'Reservation not found.' });
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: mapReservation(row) });
  } catch (error) { next(error); }
}

async function verifyReservation(req, res, next) {
  try {
    const parsed = verifyInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid reservation details.' });
    const hotelSlug = process.env.HOTEL_SLUG;
    const { code, lastName, email } = parsed.data;
    const rows = await sql`
      SELECT r.*, g.first_name, g.last_name, g.email, g.phone,
             rm.room_number, rm.room_type, rm.view_name, rm.floor, rm.capacity, rm.price_per_night, rm.status AS room_status
      FROM reservations r
      JOIN hotels h ON h.id = r.hotel_id AND h.slug = ${hotelSlug} AND h.is_active = TRUE
      JOIN guests g ON g.id = r.guest_id AND g.hotel_id = r.hotel_id
      LEFT JOIN rooms rm ON rm.id = r.room_id AND rm.hotel_id = r.hotel_id
      WHERE r.code = ${code}
        AND lower(g.last_name) = ${lastName.toLowerCase()}
        AND lower(g.email) = ${email}
        AND r.status IN ('reserved', 'checked_in')
      LIMIT 1
    `;
    if (!rows[0]) return res.status(404).json({ success: false, message: 'No reservation found. Please check your details.' });
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, message: 'Reservation verified successfully.', data: mapReservation(rows[0]) });
  } catch (error) { next(error); }
}

async function createReservation(req, res, next) {
  const parsed = reservationInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid reservation data.' });

  try {
    const hotelId = req.auth.user.hotelId;
    const data = parsed.data;
    let reservationId;

    await sql.begin(async (tx) => {
      const rooms = await tx`SELECT * FROM rooms WHERE id = ${data.roomId} AND hotel_id = ${hotelId} FOR UPDATE`;
      const room = rooms[0];
      if (!room || ['maintenance', 'out_of_service'].includes(room.status)) {
        const error = new Error('Room unavailable'); error.statusCode = 400; error.publicMessage = 'Selected room is unavailable.'; throw error;
      }
      if (data.guests > room.capacity) {
        const error = new Error('Capacity exceeded'); error.statusCode = 400; error.publicMessage = 'Room capacity is too small for the number of guests.'; throw error;
      }

      const guests = await tx`
        INSERT INTO guests (hotel_id, first_name, last_name, email, phone)
        VALUES (${hotelId}, ${data.guestName}, ${data.lastName}, ${data.email}, ${data.phone || null})
        RETURNING id
      `;
      const balance = data.balance ?? (data.paymentStatus === 'paid' ? 0 : Number(room.price_per_night));
      const inserted = await tx`
        INSERT INTO reservations (hotel_id, guest_id, room_id, code, check_in_date, check_out_date, guest_count, status, payment_status, balance, smart_check_in)
        VALUES (${hotelId}, ${guests[0].id}, ${data.roomId}, ${data.code}, ${data.checkIn}, ${data.checkOut}, ${data.guests}, ${toDbStatus(data.status)}, ${data.paymentStatus}, ${balance}, ${data.smartCheckIn})
        RETURNING id
      `;
      reservationId = inserted[0].id;
      await tx`
        INSERT INTO audit_logs (hotel_id, user_id, action, entity_type, entity_id, ip_address)
        VALUES (${hotelId}, ${req.auth.user.id}, 'reservation.create', 'reservation', ${reservationId}, ${req.ip || null})
      `;
    });

    const row = await selectReservation(reservationId, hotelId);
    res.status(201).json({ success: true, message: 'Reservation created successfully.', data: mapReservation(row) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'Reservation code already exists.' });
    if (error.code === '23P01') return res.status(409).json({ success: false, message: 'The room is already booked for these dates.' });
    next(error);
  }
}

async function updateReservation(req, res, next) {
  const id = uuid.safeParse(req.params.id);
  const parsed = updateInput.safeParse(req.body);
  if (!id.success || !parsed.success) return res.status(400).json({ success: false, message: 'Invalid reservation update.' });

  try {
    const hotelId = req.auth.user.hotelId;
    const current = await selectReservation(id.data, hotelId);
    if (!current) return res.status(404).json({ success: false, message: 'Reservation not found.' });
    const data = parsed.data;
    const merged = {
      code: data.code ?? current.code,
      guestName: data.guestName ?? current.first_name,
      lastName: data.lastName ?? current.last_name,
      email: data.email ?? current.email,
      phone: data.phone ?? current.phone,
      roomId: data.roomId ?? current.room_id,
      checkIn: data.checkIn ?? current.check_in_date,
      checkOut: data.checkOut ?? current.check_out_date,
      guests: data.guests ?? current.guest_count,
      paymentStatus: data.paymentStatus ?? current.payment_status,
      balance: data.balance ?? Number(current.balance),
      status: data.status ? toDbStatus(data.status) : current.status,
      smartCheckIn: data.smartCheckIn ?? current.smart_check_in
    };
    if (String(merged.checkOut) <= String(merged.checkIn)) return res.status(400).json({ success: false, message: 'Check-out date must be after check-in date.' });

    await sql.begin(async (tx) => {
      const rooms = await tx`SELECT * FROM rooms WHERE id = ${merged.roomId} AND hotel_id = ${hotelId} FOR UPDATE`;
      const room = rooms[0];
      if (!room || ['maintenance', 'out_of_service'].includes(room.status) || merged.guests > room.capacity) {
        const error = new Error('Room unavailable'); error.statusCode = 400; error.publicMessage = 'Selected room is unavailable or too small.'; throw error;
      }
      await tx`
        UPDATE guests SET first_name=${merged.guestName}, last_name=${merged.lastName}, email=${merged.email}, phone=${merged.phone || null}, updated_at=NOW()
        WHERE id=${current.guest_id} AND hotel_id=${hotelId}
      `;
      await tx`
        UPDATE reservations SET code=${merged.code}, room_id=${merged.roomId}, check_in_date=${merged.checkIn}, check_out_date=${merged.checkOut},
          guest_count=${merged.guests}, payment_status=${merged.paymentStatus}, balance=${merged.balance}, status=${merged.status},
          smart_check_in=${merged.smartCheckIn}, updated_at=NOW()
        WHERE id=${id.data} AND hotel_id=${hotelId}
      `;
      await tx`INSERT INTO audit_logs (hotel_id,user_id,action,entity_type,entity_id,ip_address) VALUES (${hotelId},${req.auth.user.id},'reservation.update','reservation',${id.data},${req.ip || null})`;
    });
    const row = await selectReservation(id.data, hotelId);
    res.json({ success: true, message: 'Reservation updated successfully.', data: mapReservation(row) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'Reservation code already exists.' });
    if (error.code === '23P01') return res.status(409).json({ success: false, message: 'The room is already booked for these dates.' });
    next(error);
  }
}

async function deleteReservation(req, res, next) {
  const id = uuid.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ success: false, message: 'Invalid reservation id.' });
  try {
    const hotelId = req.auth.user.hotelId;
    const updated = await sql`UPDATE reservations SET status='cancelled', updated_at=NOW() WHERE id=${id.data} AND hotel_id=${hotelId} RETURNING id`;
    if (!updated[0]) return res.status(404).json({ success: false, message: 'Reservation not found.' });
    await sql`INSERT INTO audit_logs (hotel_id,user_id,action,entity_type,entity_id,ip_address) VALUES (${hotelId},${req.auth.user.id},'reservation.cancel','reservation',${id.data},${req.ip || null})`;
    res.json({ success: true, message: 'Reservation cancelled successfully.' });
  } catch (error) { next(error); }
}

async function completeCheckIn(req, res, next) {
  const id = uuid.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ success: false, message: 'Invalid reservation id.' });
  try {
    const hotelId = req.auth.user.hotelId;
    await sql.begin(async (tx) => {
      const rows = await tx`SELECT * FROM reservations WHERE id=${id.data} AND hotel_id=${hotelId} FOR UPDATE`;
      const reservation = rows[0];
      if (!reservation) { const e=new Error('Not found'); e.statusCode=404; e.publicMessage='Reservation not found.'; throw e; }
      if (reservation.status !== 'reserved') { const e=new Error('Invalid status'); e.statusCode=409; e.publicMessage='Reservation is not ready for check-in.'; throw e; }
      if (reservation.payment_status !== 'paid' || Number(reservation.balance) > 0) { const e=new Error('Payment required'); e.statusCode=400; e.publicMessage='Payment must be completed before check-in.'; throw e; }
      await tx`UPDATE reservations SET status='checked_in', smart_check_in=TRUE, card_issued=TRUE, updated_at=NOW() WHERE id=${id.data}`;
      if (reservation.room_id) await tx`UPDATE rooms SET status='occupied', updated_at=NOW() WHERE id=${reservation.room_id} AND hotel_id=${hotelId}`;
      await tx`INSERT INTO audit_logs (hotel_id,user_id,action,entity_type,entity_id,ip_address) VALUES (${hotelId},${req.auth.user.id},'reservation.check_in','reservation',${id.data},${req.ip || null})`;
    });
    const row = await selectReservation(id.data, hotelId);
    res.json({ success: true, message: 'Check-in completed.', data: mapReservation(row) });
  } catch (error) { next(error); }
}

async function completeCheckout(req, res, next) {
  const id = uuid.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ success: false, message: 'Invalid reservation id.' });
  try {
    const hotelId = req.auth.user.hotelId;
    await sql.begin(async (tx) => {
      const rows = await tx`SELECT * FROM reservations WHERE id=${id.data} AND hotel_id=${hotelId} FOR UPDATE`;
      const reservation = rows[0];
      if (!reservation) { const e=new Error('Not found'); e.statusCode=404; e.publicMessage='Reservation not found.'; throw e; }
      if (reservation.status !== 'checked_in') { const e=new Error('Invalid status'); e.statusCode=409; e.publicMessage='Reservation is not checked in.'; throw e; }
      await tx`UPDATE reservations SET status='checked_out', card_issued=FALSE, updated_at=NOW() WHERE id=${id.data}`;
      if (reservation.room_id) await tx`UPDATE rooms SET status='available', updated_at=NOW() WHERE id=${reservation.room_id} AND hotel_id=${hotelId}`;
      await tx`INSERT INTO audit_logs (hotel_id,user_id,action,entity_type,entity_id,ip_address) VALUES (${hotelId},${req.auth.user.id},'reservation.check_out','reservation',${id.data},${req.ip || null})`;
    });
    const row = await selectReservation(id.data, hotelId);
    res.json({ success: true, message: 'Checkout completed.', data: mapReservation(row) });
  } catch (error) { next(error); }
}

async function processPayment(req, res) {
  res.status(501).json({ success: false, message: 'Live payments are disabled until a PCI-compliant payment provider is connected.' });
}

module.exports = { getReservations, getReservationById, verifyReservation, createReservation, updateReservation, deleteReservation, completeCheckIn, completeCheckout, processPayment };
