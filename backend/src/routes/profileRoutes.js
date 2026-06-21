const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/profileUploadMiddleware');

router.get('/profile', authMiddleware, profileController.getProfile);
router.put('/profile', authMiddleware, upload.single('profileImage'), profileController.updateProfile);
router.delete('/profile/image', authMiddleware, profileController.deleteProfileImage);

module.exports = router;