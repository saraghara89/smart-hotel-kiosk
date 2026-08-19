const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { login, me, logout } = require('../controllers/authController');
const { authenticate, requireCsrf } = require('../middleware/auth');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});

router.post('/login', loginLimiter, login);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, requireCsrf, logout);

module.exports = router;
