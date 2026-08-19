const express = require('express');
const { login, me, logout } = require('../controllers/authController');
const { authenticate, requireCsrf } = require('../middleware/auth');

const router = express.Router();
router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, requireCsrf, logout);

module.exports = router;
