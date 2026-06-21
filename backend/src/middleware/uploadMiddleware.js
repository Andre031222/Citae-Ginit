// Usa memoryStorage para que paperController.uploadPDF reciba req.file.buffer
// y pueda pasarlo directamente a pdfService.extractFromPDF(buffer).

const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    // Primera línea de defensa: mimetype declarado por el cliente
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF'));
    }
    cb(null, true);
  },
});

/**
 * Middleware de segunda línea: verifica magic bytes %PDF- en el buffer.
 * Úsalo DESPUÉS de upload.single('pdf') en la ruta.
 * El mimetype es declarado por el cliente y falsificable; el magic byte no.
 */
function verifyPdfMagicBytes(req, res, next) {
  if (!req.file) return next();
  // Los primeros 4 bytes de todo PDF válido son "%PDF"
  const magic = req.file.buffer.slice(0, 4).toString('ascii');
  if (magic !== '%PDF') {
    return res.status(400).json({
      success: false,
      message: 'El archivo no es un PDF válido.'
    });
  }
  next();
}

const IMAGE_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!IMAGE_MIMETYPES.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'));
    }
    cb(null, true);
  },
});

/**
 * Segunda línea de defensa para imágenes: verifica magic bytes reales.
 * JPEG: FF D8 FF · PNG: 89 50 4E 47 · WebP: "RIFF"...."WEBP"
 */
function verifyImageMagicBytes(req, res, next) {
  if (!req.file) return next();
  const b = req.file.buffer;
  const isJpeg = b.length > 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
  const isPng  = b.length > 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
  const isWebp = b.length > 12 &&
    b.slice(0, 4).toString('ascii') === 'RIFF' &&
    b.slice(8, 12).toString('ascii') === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) {
    return res.status(400).json({
      success: false,
      message: 'El archivo no es una imagen válida (JPG, PNG o WebP).'
    });
  }
  next();
}

module.exports = upload;
module.exports.verifyPdfMagicBytes = verifyPdfMagicBytes;
module.exports.uploadImage = uploadImage;
module.exports.verifyImageMagicBytes = verifyImageMagicBytes;
