const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { redirectToGoogle, googleCallback } = require('../controllers/googleAuthController');
const { authMiddleware } = require('../middleware/authMiddleware');

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' },
});

// Login: límite estricto contra fuerza bruta. Solo cuentan los intentos
// fallidos, así un usuario legítimo que acierta no se ve penalizado.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos fallidos de inicio de sesión. Espera unos minutos e inténtalo de nuevo.' },
});

router.post('/register', authLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);

router.get('/google', redirectToGoogle);
router.get('/google/callback', googleCallback);

router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/avatar', authMiddleware, authController.updateAvatar);
router.post('/logout', authMiddleware, authController.logout);
router.post('/change-password', authMiddleware, authController.changePassword);
router.get('/validate', authMiddleware, authController.validateToken);

// Rutas específicas ANTES de las parametrizadas
router.get('/history',           authMiddleware, authController.getSearchHistory);
router.get('/history/stats',     authMiddleware, authController.getHistoryStats);
router.post('/history',          authMiddleware, authController.addToSearchHistory);
router.delete('/history',        authMiddleware, authController.clearSearchHistory);
router.delete('/history/clean',  authMiddleware, authController.cleanOldHistory);
router.delete('/history/:id',    authMiddleware, authController.deleteSearchHistoryItem);

router.get('/favorites', authMiddleware, authController.getFavorites);
router.post('/favorites', authMiddleware, authController.addFavorite);
router.delete('/favorites/:paperId', authMiddleware, authController.removeFavorite);
router.get('/favorites/:paperId/check', authMiddleware, authController.checkFavorite);

module.exports = router;