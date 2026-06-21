const multer = require('multer');
const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/branding');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
  'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon',
]);
const ALLOWED_EXT = /\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/i;

// Memory storage — Sharp optimiza antes de guardar al disco
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Usa JPG, PNG, WebP, AVIF, GIF, SVG o ICO.'));
    }
  },
});

const SLOT_LIMITS = {
  logo:    { width: 256,  height: 256,  quality: 95 },
  favicon: { width: 64,   height: 64,   quality: 95 },
  hero:    { width: 1920, height: 1080, quality: 88 },
  feature: { width: 800,  height: 600,  quality: 88 },
};

const NO_PROCESS = new Set(['image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']);

async function processAndSave(buffer, mimetype, slot, filenameBase) {
  if (NO_PROCESS.has(mimetype)) {
    const ext = mimetype === 'image/svg+xml' ? '.svg' : '.ico';
    const outFilename = `${filenameBase}${ext}`;
    fs.writeFileSync(path.join(uploadDir, outFilename), buffer);
    return outFilename;
  }

  const lim = SLOT_LIMITS[slot] || SLOT_LIMITS.feature;
  const outFilename = `${filenameBase}.webp`;

  await sharp(buffer)
    .resize(lim.width, lim.height, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: lim.quality, effort: 4 })
    .toFile(path.join(uploadDir, outFilename));

  return outFilename;
}

module.exports = { upload, processAndSave, uploadDir };
