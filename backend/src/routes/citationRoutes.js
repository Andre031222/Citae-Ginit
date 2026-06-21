const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const citationController = require('../controllers/citationController');

const citationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_CITATION || '60', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas solicitudes. Espera un momento.' },
});

router.use(citationLimiter);

router.post('/generate', citationController.generateCitation);
router.post('/quick', citationController.quickCitation);
router.get('/recent', citationController.getRecentCitations);
router.get('/paper/:paperId', citationController.getCitationsByPaper);
router.post('/export', citationController.exportCitations);

module.exports = router;