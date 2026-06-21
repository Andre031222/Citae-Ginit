const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthService {
  constructor() {
    if (!process.env.JWT_SECRET) {
      console.error('[FATAL] JWT_SECRET no está definido en las variables de entorno. Define JWT_SECRET en tu archivo .env antes de arrancar el servidor.');
      process.exit(1);
    }
    this.JWT_SECRET = process.env.JWT_SECRET;
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  }

  generateToken(userId, role = 'user') {
    return jwt.sign(
      { userId, role, timestamp: Date.now() },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  async register(userData) {
    const { username, email, password, full_name } = userData;
    
    // Validaciones
    if (!username || !email || !password) {
      throw new Error('Username, email y password son requeridos');
    }
    
    if (password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }
    
    // Verificar si el usuario ya existe
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      throw new Error('El email ya está registrado');
    }
    
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      throw new Error('El nombre de usuario ya está en uso');
    }
    
    // Crear usuario
    const user = await User.create({
      username,
      email,
      password,
      full_name
    });
    
    // Generar token
    const token = this.generateToken(user.id, user.role || 'user');

    // Guardar sesión
    await User.saveSession(user.id, token);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'user',
      },
      token
    };
  }

  async login(credentials) {
    const { username, password } = credentials;
    
    if (!username || !password) {
      throw new Error('Username/email y password son requeridos');
    }
    
    // Buscar usuario por email o username
    let user = await User.findByEmail(username);
    if (!user) {
      user = await User.findByUsername(username);
    }
    
    if (!user) {
      throw new Error('Credenciales inválidas');
    }
    
    if (!user.is_active) {
      throw new Error('Cuenta desactivada');
    }
    
    // Verificar contraseña
    const isValidPassword = await User.validatePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }
    
    // Generar token
    const token = this.generateToken(user.id, user.role || 'user');

    // Guardar sesión
    await User.saveSession(user.id, token);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role || 'user',
      },
      token
    };
  }

  async logout(token) {
    return await User.removeSession(token);
  }

  async validateSession(token) {
    if (!token) {
      return null;
    }
    
    // Verificar token JWT
    const decoded = this.verifyToken(token);
    if (!decoded) {
      return null;
    }
    
    // Buscar usuario por token en la base de datos
    const user = await User.findByToken(token);
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role || 'user',
    };
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Obtener usuario con contraseña
    const userWithPassword = await User.findByEmail(user.email);
    
    // Verificar contraseña actual
    const isValidPassword = await User.validatePassword(oldPassword, userWithPassword.password);
    if (!isValidPassword) {
      throw new Error('Contraseña actual incorrecta');
    }
    
    if (newPassword.length < 8) {
      throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
    }
    
    // Actualizar contraseña
    return await User.update(userId, { password: newPassword });
  }
}

module.exports = new AuthService();