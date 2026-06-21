require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const db = require('./src/config/database');

const citationRoutes   = require('./src/routes/citationRoutes');
const paperRoutes      = require('./src/routes/paperRoutes');
const authRoutes       = require('./src/routes/authRoutes');
const profileRoutes    = require('./src/routes/profileRoutes');
const highlightRoutes  = require('./src/routes/highlightRoutes');
const brandingRoutes   = require('./src/routes/brandingRoutes');
const libraryRoutes    = require('./src/routes/libraryRoutes');
const claimRoutes      = require('./src/routes/claimRoutes');
const ragRoutes        = require('./src/routes/ragRoutes');
const publicRoutes     = require('./src/routes/publicRoutes');
const adminRoutes      = require('./src/routes/adminRoutes');

const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Detrás de Nginx (1 salto): usa el X-Forwarded-For real para rate-limit e IPs.
// Sin esto, express-rate-limit lanza ERR_ERL_UNEXPECTED_X_FORWARDED_FOR en producción.
app.set('trust proxy', 1);

// CSP: permitir imágenes externas (og:image de Springer/Nature/etc.) y data: (covers/PDF en canvas)
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src':     ["'self'", 'data:', 'blob:', 'https:'],
      'connect-src': ["'self'", 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos — CORP: cross-origin permite cargar imágenes desde :3000
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',       authRoutes);
app.use('/api/citations',  citationRoutes);
app.use('/api/papers',     paperRoutes);
app.use('/api/highlights', highlightRoutes);
app.use('/api/branding',   brandingRoutes);
app.use('/api/library',    libraryRoutes);
app.use('/api/claim',      claimRoutes);
app.use('/api/rag',        ragRoutes);
app.use('/api/public',     publicRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api',            profileRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CITAE API is running' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CITAE API en ejecución: http://localhost:${PORT}`);
});