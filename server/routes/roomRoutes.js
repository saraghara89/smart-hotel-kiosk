const express = require('express');
const { getRooms, updateRoom } = require('../controllers/roomController');
const router = express.Router();
router.get('/', getRooms);
router.put('/:id', updateRoom);
module.exports = router;
