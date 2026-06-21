const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl      = require('../controllers/claimController');
const { authMiddleware } = require('../middleware/authMiddleware');

const radarLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_RADAR || '10', 10),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Demasiadas verificaciones. Espera un momento.' },
});

const compareLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_COMPARE || '15', 10),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Demasiadas comparaciones. Espera un momento.' },
});

router.use(authMiddleware);

router.post('/radar',   radarLimiter,   ctrl.radar);
router.post('/compare', compareLimiter, ctrl.compare);

module.exports = router;
