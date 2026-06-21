const SiteSettings = require('../models/SiteSettings');
const { processAndSave } = require('../middleware/brandingUploadMiddleware');

const getBranding = async (req, res) => {
  try {
    const settings = await SiteSettings.get();
    res.json({ success: true, branding: settings });
  } catch (err) {
    console.error('[branding] GET error:', err.message);
    res.json({ success: true, branding: SiteSettings.defaults() });
  }
};

const updateBranding = async (req, res) => {
  try {
    await SiteSettings.update(req.body, req.user.id);
    const branding = await SiteSettings.get();
    res.json({ success: true, branding });
  } catch (err) {
    console.error('[branding] PUT error:', err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar branding' });
  }
};

const uploadAsset = async (req, res) => {
  try {
    const { slot } = req.params;
    if (!['logo', 'favicon', 'hero'].includes(slot)) {
      return res.status(400).json({ success: false, message: 'Slot inválido' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió archivo' });
    }
    const filename = await processAndSave(req.file.buffer, req.file.mimetype, slot, slot);
    const filePath = `/uploads/branding/${filename}`;
    await SiteSettings.setAsset(slot, filePath, req.user.id);
    const branding = await SiteSettings.get();
    res.json({ success: true, branding });
  } catch (err) {
    console.error('[branding] upload error:', err.message);
    res.status(500).json({ success: false, message: 'Error al subir el archivo' });
  }
};

const uploadFeatureImage = async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || index > 5) {
      return res.status(400).json({ success: false, message: 'Índice inválido (0-5)' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió archivo' });
    }
    const filename = await processAndSave(
      req.file.buffer, req.file.mimetype, 'feature',
      `feature_${index}_${Date.now()}`
    );
    const filePath = `/uploads/branding/${filename}`;
    await SiteSettings.setFeatureImage(index, filePath, req.user.id);
    const branding = await SiteSettings.get();
    res.json({ success: true, branding });
  } catch (err) {
    console.error('[branding] feature upload error:', err.message);
    res.status(500).json({ success: false, message: 'Error al subir imagen de función' });
  }
};

const deleteFeatureImage = async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || index > 5) {
      return res.status(400).json({ success: false, message: 'Índice inválido (0-5)' });
    }
    await SiteSettings.clearFeatureImage(index, req.user.id);
    const branding = await SiteSettings.get();
    res.json({ success: true, branding });
  } catch (err) {
    console.error('[branding] feature delete error:', err.message);
    res.status(500).json({ success: false, message: 'Error al eliminar imagen' });
  }
};

module.exports = { getBranding, updateBranding, uploadAsset, uploadFeatureImage, deleteFeatureImage };
