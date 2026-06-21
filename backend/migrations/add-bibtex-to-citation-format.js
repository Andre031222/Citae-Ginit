// Migración: añadir 'BibTeX' al ENUM citation_format en PostgreSQL
// Ejecutar una sola vez: node backend/migrations/add-bibtex-to-citation-format.js

const db = require('../src/config/database');

async function run() {
  try {
    // PostgreSQL no admite DROP/ADD de valores de enum dentro de transacciones.
    // ALTER TYPE ... ADD VALUE es idempotente desde PG 9.1+; repetirlo no rompe nada.
    await db.query(`ALTER TYPE citation_format ADD VALUE IF NOT EXISTS 'BibTeX'`);
    console.log('✓ Valor BibTeX añadido al enum citation_format (o ya existía).');
    process.exit(0);
  } catch (err) {
    console.error('✗ Error en migración:', err.message);
    process.exit(1);
  }
}

run();
