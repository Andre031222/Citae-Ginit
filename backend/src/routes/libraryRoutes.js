const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl      = require('../controllers/libraryController');
const { authMiddleware } = require('../middleware/authMiddleware');

const libraryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_LIBRARY || '120', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas operaciones. Espera un momento.' },
});

const autoTagLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTOTAG || '15', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas sugerencias de etiquetas. Espera un momento.' },
});

router.use(libraryLimiter, authMiddleware);

router.get('/papers',                          ctrl.getPapers);
router.post('/papers/:id/tags',                ctrl.addPaperTags);
router.delete('/papers/:id/tags/:tagId',       ctrl.removePaperTag);
router.post('/papers/:id/auto-tags',           autoTagLimiter, ctrl.autoTagPaper);

router.get('/collections',                     ctrl.getCollections);
router.post('/collections',                    ctrl.createCollection);
router.get('/collections/:id/export',          ctrl.exportCollection);
router.post('/collections/:id/papers',         ctrl.addPaperToCollection);
router.delete('/collections/:id/papers/:paperId', ctrl.removePaperFromCollection);
router.put('/collections/:id',                 ctrl.updateCollection);
router.put('/collections/:id/visibility',      ctrl.setCollectionVisibility);
router.delete('/collections/:id',              ctrl.deleteCollection);

router.get('/tags',                            ctrl.getTags);
router.delete('/tags/:id',                     ctrl.deleteTag);

router.get('/export',                          ctrl.exportLibrary);
router.get('/activity',                        ctrl.getActivity);

module.exports = router;
