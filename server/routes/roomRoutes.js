const express = require('express');
const { getRooms, updateRoom } = require('../controllers/roomController');
const { authenticate, requireCsrf, requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/', authenticate, getRooms);
router.put('/:id', authenticate, requireCsrf, requireRole('owner', 'admin', 'staff'), updateRoom);
module.exports = router;
