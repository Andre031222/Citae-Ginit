const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/authMiddleware');
const { listUsers, updateUserRole, updateUserActive } = require('../controllers/adminController');

// Todo /api/admin/* requiere sesión válida y rol super_admin
router.use(authMiddleware, requireSuperAdmin);

router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/active', updateUserActive);

module.exports = router;
