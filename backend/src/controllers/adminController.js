const User = require('../models/User');

const VALID_ROLES = new Set(['user', 'super_admin']);

// GET /api/admin/users — lista de usuarios registrados (con búsqueda y paginación)
async function listUsers(req, res, next) {
  try {
    const { search = '' } = req.query;
    const limit  = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const offset = parseInt(req.query.offset, 10) || 0;
    const [users, total] = await Promise.all([
      User.listAll({ limit, offset, search }),
      User.countAll(search),
    ]);
    res.json({ users, total });
  } catch (err) { next(err); }
}

// PATCH /api/admin/users/:id/role — cambia el rol (user | super_admin)
async function updateUserRole(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { role } = req.body;
    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ success: false, message: 'Rol inválido' });
    }
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'No puedes cambiar tu propio rol' });
    }
    const ok = await User.setRole(id, role);
    if (!ok) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json({ success: true });
  } catch (err) { next(err); }
}

// PATCH /api/admin/users/:id/active — activa o desactiva la cuenta
async function updateUserActive(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'is_active debe ser booleano' });
    }
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'No puedes desactivar tu propia cuenta' });
    }
    const ok = await User.setActive(id, is_active);
    if (!ok) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { listUsers, updateUserRole, updateUserActive };
