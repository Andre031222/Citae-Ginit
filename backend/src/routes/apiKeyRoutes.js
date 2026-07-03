const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/apiKeyController');

// Validar una clave hace una llamada externa: limitamos para evitar abuso.
const keyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas operaciones con claves. Espera un minuto.' },
});

router.use(authMiddleware);

router.get('/', ctrl.list);
router.post('/', keyLimiter, ctrl.add);
router.post('/:id/test', keyLimiter, ctrl.test);
router.delete('/:id', ctrl.remove);

module.exports = router;
