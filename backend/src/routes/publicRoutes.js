const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl      = require('../controllers/publicController');

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_PUBLIC || '60', 10),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Demasiadas solicitudes. Espera un momento.' },
});

router.use(publicLimiter);

router.get('/collections/:slug', ctrl.getCollection);
router.get('/profile/:username', ctrl.getProfile);

module.exports = router;
