const { readDatabase, writeDatabase } = require('../db/fileDatabase');

async function getRooms(req, res, next) {
  try {
    const db = await readDatabase();
    const { status, type, minCapacity } = req.query;
    let rooms = [...db.rooms];
    if (status) rooms = rooms.filter((room) => room.status === status);
    if (type) rooms = rooms.filter((room) => room.type === type);
    if (minCapacity) rooms = rooms.filter((room) => Number(room.capacity) >= Number(minCapacity));
    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    next(error);
  }
}

async function updateRoom(req, res, next) {
  try {
    const db = await readDatabase();
    const index = db.rooms.findIndex((room) => Number(room.id) === Number(req.params.id));
    if (index === -1) return res.status(404).json({ success: false, message: 'Room not found.' });
    db.rooms[index] = { ...db.rooms[index], ...req.body, id: db.rooms[index].id };
    await writeDatabase(db);
    res.json({ success: true, message: 'Room updated successfully.', data: db.rooms[index] });
  } catch (error) {
    next(error);
  }
}

module.exports = { getRooms, updateRoom };
