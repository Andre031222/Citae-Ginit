const isProd = process.env.NODE_ENV === 'production';

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const msg = err.message || '';

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      details: msg
    });
  }

  // 23505: violación de UNIQUE en PostgreSQL
  if (err.code === '23505') {
    return res.status(409).json({ error: 'El registro ya existe' });
  }

  if (msg.includes('Failed to launch')) {
    return res.status(500).json({
      error: 'Error al iniciar el navegador',
      details: 'Por favor, verifica la instalación de Puppeteer'
    });
  }

  if (msg.includes('Failed to scrape') || msg.includes('Failed to fetch')) {
    return res.status(422).json({
      error: 'Error al extraer información',
      details: msg
    });
  }

  // Error genérico — no exponer detalles en producción
  const status = err.status || 500;
  res.status(status).json({
    error: isProd && status === 500 ? 'Error interno del servidor' : msg || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;