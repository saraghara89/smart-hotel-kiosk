const { readDatabase } = require('../db/fileDatabase');

async function getStats(req, res, next) {
  try {
    const db = await readDatabase();
    const reservations = db.reservations;
    const revenue = reservations.reduce((total, reservation) => {
      const room = db.rooms.find((item) => Number(item.id) === Number(reservation.roomId));
      if (!room) return total;
      const paid = reservation.paymentStatus === 'paid' ? room.pricePerNight : Math.max(0, room.pricePerNight - Number(reservation.balance || 0));
      return total + paid;
    }, 0);

    const byStatus = reservations.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    const byRoomType = reservations.reduce((acc, item) => {
      acc[item.roomType] = (acc[item.roomType] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalReservations: reservations.length,
        checkedIn: reservations.filter((item) => item.status === 'checked-in').length,
        checkedOut: reservations.filter((item) => item.status === 'checked-out').length,
        pendingPayments: reservations.filter((item) => item.paymentStatus !== 'paid').length,
        availableRooms: db.rooms.filter((item) => item.status === 'available').length,
        estimatedRevenue: revenue,
        byStatus,
        byRoomType
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getStats };
