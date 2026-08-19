const express = require('express');
const { rateLimit } = require('express-rate-limit');
const controller = require('../controllers/reservationController');
const { authenticate, requireCsrf, requireRole } = require('../middleware/auth');

const router = express.Router();
const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification attempts. Please try again later.' }
});

// Public kiosk lookup is intentionally the only unauthenticated reservation route.
router.post('/verify', verifyLimiter, controller.verifyReservation);

router.get('/', authenticate, controller.getReservations);
router.get('/:id', authenticate, controller.getReservationById);
router.post('/', authenticate, requireCsrf, requireRole('owner', 'admin', 'staff'), controller.createReservation);
router.put('/:id', authenticate, requireCsrf, requireRole('owner', 'admin', 'staff'), controller.updateReservation);
router.delete('/:id', authenticate, requireCsrf, requireRole('owner', 'admin'), controller.deleteReservation);
router.patch('/:id/check-in', authenticate, requireCsrf, requireRole('owner', 'admin', 'staff'), controller.completeCheckIn);
router.patch('/:id/check-out', authenticate, requireCsrf, requireRole('owner', 'admin', 'staff'), controller.completeCheckout);
router.patch('/:id/pay', authenticate, requireCsrf, requireRole('owner', 'admin', 'staff'), controller.processPayment);

module.exports = router;
