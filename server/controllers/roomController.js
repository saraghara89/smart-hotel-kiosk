const { z } = require('zod');
const { sql } = require('../db/postgres');

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const updateSchema = z.object({
  number: z.string().trim().min(1).max(20).optional(),
  type: z.string().trim().min(1).max(80).optional(),
  view: z.string().trim().max(80).nullable().optional(),
  floor: z.string().trim().max(30).nullable().optional(),
  capacity: z.coerce.number().int().min(1).max(50).optional(),
  pricePerNight: z.coerce.number().min(0).max(1000000).optional(),
  status: z.enum(['available', 'occupied', 'maintenance', 'out_of_service']).optional()
}).strict();

function mapRoom(room) {
  return {
    id: room.id,
    number: room.room_number,
    type: room.room_type,
    view: room.view_name,
    floor: room.floor,
    capacity: room.capacity,
    pricePerNight: Number(room.price_per_night),
    status: room.status
  };
}

async function getRooms(req, res, next) {
  try {
    const hotelId = req.auth.user.hotelId;
    const status = req.query.status ? String(req.query.status).slice(0, 30) : null;
    const type = req.query.type ? String(req.query.type).slice(0, 80) : null;
    const minCapacity = Math.min(Math.max(Number(req.query.minCapacity) || 0, 0), 50);
    const rooms = await sql`
      SELECT * FROM rooms
      WHERE hotel_id = ${hotelId}
        AND (${status}::text IS NULL OR status = ${status})
        AND (${type}::text IS NULL OR room_type = ${type})
        AND capacity >= ${minCapacity}
      ORDER BY room_number ASC
      LIMIT 500
    `;
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, count: rooms.length, data: rooms.map(mapRoom) });
  } catch (error) { next(error); }
}

async function updateRoom(req, res, next) {
  const id = uuid.safeParse(req.params.id);
  const parsed = updateSchema.safeParse(req.body);
  if (!id.success || !parsed.success) return res.status(400).json({ success: false, message: 'Invalid room update.' });

  try {
    const hotelId = req.auth.user.hotelId;
    const currentRows = await sql`SELECT * FROM rooms WHERE id=${id.data} AND hotel_id=${hotelId} LIMIT 1`;
    const current = currentRows[0];
    if (!current) return res.status(404).json({ success: false, message: 'Room not found.' });
    const data = parsed.data;
    const updated = await sql`
      UPDATE rooms SET
        room_number=${data.number ?? current.room_number}, room_type=${data.type ?? current.room_type},
        view_name=${data.view === undefined ? current.view_name : data.view}, floor=${data.floor === undefined ? current.floor : data.floor},
        capacity=${data.capacity ?? current.capacity}, price_per_night=${data.pricePerNight ?? current.price_per_night},
        status=${data.status ?? current.status}, updated_at=NOW()
      WHERE id=${id.data} AND hotel_id=${hotelId}
      RETURNING *
    `;
    await sql`INSERT INTO audit_logs (hotel_id,user_id,action,entity_type,entity_id,ip_address) VALUES (${hotelId},${req.auth.user.id},'room.update','room',${id.data},${req.ip || null})`;
    res.json({ success: true, message: 'Room updated successfully.', data: mapRoom(updated[0]) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'Room number already exists.' });
    next(error);
  }
}

module.exports = { getRooms, updateRoom };
