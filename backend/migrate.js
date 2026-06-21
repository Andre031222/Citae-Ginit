const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

(async () => {
  if (!process.env.DB_PASSWORD) {
    console.error('[FATAL] DB_PASSWORD no definido. Configura tu .env antes de migrar.');
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'citae',
    port: parseInt(process.env.DB_PORT) || 5432,
  });

  try {
    console.log('Ejecutando schema PostgreSQL...');
    const fs = require('fs');
    const schemaPath = path.resolve(__dirname, 'database', 'schema_postgres.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    try {
      await pool.query(schema);
      console.log('Schema base aplicado correctamente.');
    } catch (schemaErr) {
      // Ignorar errores de "ya existe" (tipos, tablas) — schema idempotente
      if (schemaErr.message.includes('ya existe') || schemaErr.message.includes('already exists')) {
        console.log('Schema base ya existe, omitiendo (normal en re-migraciones).');
      } else {
        throw schemaErr;
      }
    }

    // Migraciones incrementales idempotentes
    await pool.query(`ALTER TABLE search_history ADD COLUMN IF NOT EXISTS session_data JSONB`);
    await pool.query(`ALTER TABLE papers ADD COLUMN IF NOT EXISTS full_pdf_text TEXT`);

    // Super Admin — rol de usuario
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'`);

    // Branding dinámico — tabla singleton (fila id=1 siempre presente)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id               SERIAL PRIMARY KEY,
        logo_path        TEXT,
        favicon_path     TEXT,
        hero_image_path  TEXT,
        primary_color    VARCHAR(9)   DEFAULT '#0056D6',
        accent_color     VARCHAR(9)   DEFAULT '#FBE34D',
        site_name        VARCHAR(120) DEFAULT 'Citae',
        updated_by       INT REFERENCES users(id),
        updated_at       TIMESTAMP    DEFAULT NOW()
      )
    `);
    await pool.query(`INSERT INTO site_settings (id) VALUES (1) ON CONFLICT DO NOTHING`);

    // Hero content — texto y tipografía editables desde el admin
    await pool.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_title_1   VARCHAR(120) DEFAULT 'Cita, resalta y'`);
    await pool.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_title_em  VARCHAR(60)  DEFAULT 'comprende'`);
    await pool.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_title_2   VARCHAR(120) DEFAULT 'tus papers'`);
    await pool.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_subtitle  TEXT         DEFAULT 'Busca en 4 fuentes académicas, genera citas en 7 formatos y conversa con la IA sobre cualquier fragmento. Sin extensiones, sin suscripción.'`);
    await pool.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_font      VARCHAR(80)  DEFAULT 'Inter'`);
    await pool.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS features_data  JSONB        DEFAULT '[]'`);

    // Tabla de resaltados y apuntes (idempotente)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS highlights (
        id            SERIAL PRIMARY KEY,
        user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        paper_id      INT REFERENCES papers(id) ON DELETE SET NULL,
        paper_doi     VARCHAR(255),
        paper_title   TEXT,
        paper_authors TEXT,
        paper_year    INT,
        paper_journal VARCHAR(255),
        paper_source  VARCHAR(50),
        paper_url     TEXT,
        quote         TEXT NOT NULL,
        color         VARCHAR(20) NOT NULL DEFAULT 'yellow',
        note          TEXT,
        field         VARCHAR(20) DEFAULT 'abstract',
        start_offset  INT,
        end_offset    INT,
        is_favorite   BOOLEAN DEFAULT FALSE,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_highlights_user ON highlights(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_highlights_doi  ON highlights(paper_doi)`);

    // UNIQUE en papers.doi — previene duplicados en upserts concurrentes
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'uq_papers_doi' AND conrelid = 'papers'::regclass
        ) THEN
          ALTER TABLE papers ADD CONSTRAINT uq_papers_doi UNIQUE (doi);
        END IF;
      END$$
    `);

    // UNIQUE en citations(paper_id, format_type) — previene citas duplicadas por formato
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'uq_citations_paper_format' AND conrelid = 'citations'::regclass
        ) THEN
          ALTER TABLE citations ADD CONSTRAINT uq_citations_paper_format UNIQUE (paper_id, format_type);
        END IF;
      END$$
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id          SERIAL PRIMARY KEY,
        user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name        VARCHAR(120) NOT NULL,
        description TEXT,
        color       VARCHAR(20) DEFAULT 'blue',
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS collection_papers (
        id            SERIAL PRIMARY KEY,
        collection_id INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        paper_id      INT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
        added_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(collection_id, paper_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_collection_papers_paper ON collection_papers(paper_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id         SERIAL PRIMARY KEY,
        user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name       VARCHAR(60) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS paper_tags (
        id       SERIAL PRIMARY KEY,
        tag_id   INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        paper_id INT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
        user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(tag_id, paper_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_paper_tags_paper ON paper_tags(paper_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_paper_tags_user  ON paper_tags(user_id)`);

    await pool.query(`ALTER TABLE paper_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    // Daily Review — repaso espaciado de resaltados
    await pool.query(`ALTER TABLE highlights ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP`);
    await pool.query(`ALTER TABLE highlights ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0`);

    // Social — colecciones y perfiles públicos
    await pool.query(`ALTER TABLE collections ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE collections ADD COLUMN IF NOT EXISTS public_slug VARCHAR(90)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_collections_slug ON collections(public_slug) WHERE public_slug IS NOT NULL`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);

    console.log('Migraciones incrementales aplicadas.');
  } catch (err) {
    console.error('Error en la migracion:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
