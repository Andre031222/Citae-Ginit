const fs = require('fs').promises;
const path = require('path');
const User = require('../models/User');

const buildImageUrl = (req, user) => {
  if (user.profile_image_path) {
    user.profile_image_url = `${req.protocol}://${req.get('host')}${user.profile_image_path}`;
  } else if (user.avatar_url) {
    user.profile_image_url = user.avatar_url;
  }
  return user;
};

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (!user.first_name && !user.last_name && user.full_name) {
      const parts = user.full_name.trim().split(/\s+/);
      user.first_name = parts[0] || '';
      user.last_name = parts.slice(1).join(' ') || '';
    }
    if (!user.first_name) user.first_name = user.username || '';

    res.json({ success: true, user: buildImageUrl(req, user) });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { firstName, lastName, email, timezone } = req.body;

    if (!firstName || !email) {
      return res.status(400).json({ success: false, message: 'Nombre y email son requeridos' });
    }

    const emailOwner = await User.findByEmail(email);
    if (emailOwner && Number(emailOwner.id) !== Number(userId)) {
      return res.status(400).json({ success: false, message: 'El email ya está en uso' });
    }

    const fields = {
      first_name: firstName,
      last_name: lastName,
      email,
      timezone: timezone || 'UTC',
      full_name: `${firstName} ${lastName || ''}`.trim(),
    };

    if (req.file) {
      const oldPath = await User.getProfileImagePath(userId);
      if (oldPath) {
        try { await fs.unlink(path.join(__dirname, '../..', oldPath)); } catch (_) {}
      }
      fields.profile_image_path = `/uploads/profiles/${req.file.filename}`;
    }

    await User.update(userId, fields);

    const user = await User.findById(userId);
    res.json({ success: true, message: 'Perfil actualizado correctamente', user: buildImageUrl(req, user) });
  } catch (error) {
    next(error);
  }
};

const deleteProfileImage = async (req, res, next) => {
  try {
    const userId = req.userId;
    const oldPath = await User.getProfileImagePath(userId);
    if (oldPath) {
      try { await fs.unlink(path.join(__dirname, '../..', oldPath)); } catch (_) {}
      await User.update(userId, { profile_image_path: null });
    }
    res.json({ success: true, message: 'Foto de perfil eliminada' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, deleteProfileImage };
