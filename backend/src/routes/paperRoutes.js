const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');

const paperController = require('../controllers/paperController');
const upload                      = require('../middleware/uploadMiddleware');
const { verifyPdfMagicBytes,
        uploadImage,
        verifyImageMagicBytes }   = require('../middleware/uploadMiddleware');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');

// Límite generoso para DOI/URL (bajo costo de red)
const extractLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_EXTRACT || '60', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Espera un momento.' },
});

// Límite más estricto para búsquedas por título (dispara 4 APIs externas + LLM)
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_SEARCH || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas búsquedas. Espera un momento.' },
});

// Extraer metadatos (DOI o URL) — flujo original, mantener intacto
router.post('/extract', extractLimiter, optionalAuth, paperController.extractMetadata);

router.post('/search-candidates', searchLimiter, optionalAuth, paperController.searchCandidates);

router.post('/from-candidate', optionalAuth, paperController.fromCandidate);

// Subir y procesar PDF — rate limit estricto (parseo costoso, 20 MB por archivo)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_UPLOAD || '5', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas subidas. Espera un momento.' },
});
router.post('/upload-pdf', uploadLimiter, optionalAuth, upload.single('pdf'), verifyPdfMagicBytes, paperController.uploadPDF);

// Subir imagen (foto/captura de un paper) → OCR → metadatos
router.post('/upload-image', uploadLimiter, optionalAuth, uploadImage.single('image'), verifyImageMagicBytes, paperController.uploadImage);

// Abstract on-demand por DOI (CrossRef no lo incluye)
router.get('/abstract', optionalAuth, paperController.fetchAbstract);

// Imagen de preview (og:image) del paper — proxy con caché
router.get('/preview', extractLimiter, optionalAuth, paperController.fetchPreview);

// URL del PDF de acceso abierto (arXiv directo / Unpaywall) para portada
router.get('/pdf-url', extractLimiter, optionalAuth, paperController.fetchPdfUrl);

// Descubrimiento de autores (OpenAlex) — definir antes de /:id para evitar colisión
router.get('/authors',          searchLimiter, optionalAuth, paperController.searchAuthors);
router.get('/authors/:id/works', searchLimiter, optionalAuth, paperController.authorWorks);

router.get('/', optionalAuth, paperController.getAllPapers);

router.get('/search', optionalAuth, paperController.searchPapers);

// Actualizar / eliminar (solo dueño o rol permitido)
router.put('/:id',    authMiddleware, paperController.updatePaper);
router.delete('/:id', authMiddleware, paperController.deletePaper);

router.get('/:id/full-text', optionalAuth, paperController.getPaperFullText);

router.get('/:id', optionalAuth, paperController.getPaperById);

router.post('/:id/citations/generate-all', optionalAuth, paperController.generateAllCitations);

module.exports = router;
