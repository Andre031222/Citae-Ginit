const express    = require('express');
const router     = express.Router();
const rateLimit  = require('express-rate-limit');
const ctrl       = require('../controllers/highlightController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Límite estricto para /ask: cada llamada consume cuota Groq
const askLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_ASK || '15', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas preguntas al asistente. Espera un momento.' },
});

// Límite general para operaciones CRUD de highlights
const highlightLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_HIGHLIGHTS || '120', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas operaciones. Espera un momento.' },
});

// Rutas específicas ANTES de las parametrizadas
router.get('/',          highlightLimiter, authMiddleware, ctrl.getHighlights);
router.get('/daily',     highlightLimiter, authMiddleware, ctrl.getDailyReview);
router.post('/',         highlightLimiter, authMiddleware, ctrl.addHighlight);
router.post('/ask',      askLimiter,       authMiddleware, ctrl.askAssistant);
router.post('/:id/reviewed', highlightLimiter, authMiddleware, ctrl.markReviewed);
router.delete('/',       highlightLimiter, authMiddleware, ctrl.clearHighlights);
router.put('/:id',       highlightLimiter, authMiddleware, ctrl.updateHighlight);
router.delete('/:id',    highlightLimiter, authMiddleware, ctrl.deleteHighlight);

module.exports = router;
