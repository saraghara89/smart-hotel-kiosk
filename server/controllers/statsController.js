const { sql } = require('../db/postgres');

async function getStats(req, res, next) {
  try {
    const hotelId = req.auth.user.hotelId;
    const [summary] = await sql`
      SELECT
        COUNT(*)::int AS total_reservations,
        COUNT(*) FILTER (WHERE status='checked_in')::int AS checked_in,
        COUNT(*) FILTER (WHERE status='checked_out')::int AS checked_out,
        COUNT(*) FILTER (WHERE payment_status <> 'paid')::int AS pending_payments,
        COALESCE(SUM(CASE WHEN payment_status='paid' THEN GREATEST(balance,0) * 0 ELSE 0 END),0)::float8 AS placeholder_revenue
      FROM reservations
      WHERE hotel_id=${hotelId} AND status <> 'cancelled'
    `;
    const [roomSummary] = await sql`SELECT COUNT(*) FILTER (WHERE status='available')::int AS available_rooms FROM rooms WHERE hotel_id=${hotelId}`;
    const statusRows = await sql`SELECT status, COUNT(*)::int AS count FROM reservations WHERE hotel_id=${hotelId} GROUP BY status`;
    const typeRows = await sql`
      SELECT rm.room_type, COUNT(r.id)::int AS count
      FROM rooms rm LEFT JOIN reservations r ON r.room_id=rm.id AND r.hotel_id=rm.hotel_id
      WHERE rm.hotel_id=${hotelId}
      GROUP BY rm.room_type
    `;
    const [paymentSummary] = await sql`
      SELECT COALESCE(SUM(amount) FILTER (WHERE status='paid'),0)::float8 AS revenue
      FROM payments WHERE hotel_id=${hotelId}
    `;

    const byStatus = Object.fromEntries(statusRows.map((row) => [String(row.status).replaceAll('_','-'), row.count]));
    const byRoomType = Object.fromEntries(typeRows.map((row) => [row.room_type, row.count]));
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: {
      totalReservations: summary.total_reservations,
      checkedIn: summary.checked_in,
      checkedOut: summary.checked_out,
      pendingPayments: summary.pending_payments,
      availableRooms: roomSummary.available_rooms,
      estimatedRevenue: Number(paymentSummary.revenue || 0),
      byStatus,
      byRoomType
    }});
  } catch (error) { next(error); }
}

module.exports = { getStats };
