const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/brandingUploadMiddleware');
const {
  getBranding, updateBranding, uploadAsset,
  uploadFeatureImage, deleteFeatureImage,
} = require('../controllers/brandingController');

router.get('/', getBranding);

// Protegidos — solo super_admin
router.put('/', authMiddleware, requireSuperAdmin, updateBranding);

// Imagen de feature card (debe ir ANTES de /:slot para evitar conflicto)
router.post('/feature/:index/image',   authMiddleware, requireSuperAdmin, upload.single('file'), uploadFeatureImage);
router.delete('/feature/:index/image', authMiddleware, requireSuperAdmin, deleteFeatureImage);

// Assets generales (logo | favicon | hero)
router.post('/:slot', authMiddleware, requireSuperAdmin, upload.single('file'), uploadAsset);

module.exports = router;
