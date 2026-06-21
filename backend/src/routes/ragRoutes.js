const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl      = require('../controllers/ragController');
const { authMiddleware } = require('../middleware/authMiddleware');

const ragLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_RAG || '20', 10),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Demasiadas preguntas. Espera un momento.' },
});

const researchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_RESEARCH || '8', 10),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Demasiados análisis. Espera un momento.' },
});

router.use(authMiddleware);

router.post('/ask',           ragLimiter,      ctrl.ask);
router.post('/deep-research', researchLimiter, ctrl.deepResearch);

module.exports = router;
