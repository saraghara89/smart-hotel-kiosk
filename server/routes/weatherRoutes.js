const express = require('express');
const { getHotelWeather } = require('../controllers/weatherController');
const router = express.Router();
router.get('/', getHotelWeather);
module.exports = router;
