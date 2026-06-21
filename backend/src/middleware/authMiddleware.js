const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }

    // 1. Verificar firma y expiración del JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. Verificar que la sesión sigue activa en la DB
    //    (el logout llama a User.removeSession, así el token queda inválido de inmediato)
    const sessionUser = await User.findByToken(token);
    if (!sessionUser) {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida o expirada. Inicia sesión nuevamente.'
      });
    }

    // Normalizar user: id del JWT, role siempre fresco desde la DB
    const resolvedId = decoded.id || decoded.userId;
    req.userId = resolvedId;
    req.user = { ...decoded, id: resolvedId, role: sessionUser.role || decoded.role || 'user' };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    console.error('Error en autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error en la autenticación'
    });
  }
};

// Middleware opcional - permite acceso sin auth pero adjunta user si existe
const optionalAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // No hay token, pero continuamos sin usuario
      req.userId = null;
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const resolvedId = decoded.id || decoded.userId;
    req.userId = resolvedId;
    req.user = { ...decoded, id: resolvedId };
    next();
  } catch (error) {
    // Token inválido, pero continuamos sin usuario
    req.userId = null;
    req.user = null;
    next();
  }
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Acceso reservado a super administradores' });
  }
  next();
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.optionalAuth = optionalAuth;
module.exports.requireSuperAdmin = requireSuperAdmin;