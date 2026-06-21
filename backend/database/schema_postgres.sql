-- ============================================================
-- Citae - PostgreSQL Schema
-- ============================================================

-- Crear tipos enumerados
CREATE TYPE citation_format AS ENUM ('APA', 'MLA', 'Chicago', 'Harvard', 'IEEE', 'Vancouver', 'BibTeX');
CREATE TYPE search_type_enum AS ENUM ('DOI', 'URL', 'TITLE', 'citation');

-- ============================================================
-- Tabla: papers
-- ============================================================
CREATE TABLE IF NOT EXISTS papers (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(500) NOT NULL,
    authors       TEXT,
    publication_year INT,
    journal       VARCHAR(255),
    volume        VARCHAR(50),
    issue         VARCHAR(50),
    pages         VARCHAR(50),
    doi           VARCHAR(255),
    url           TEXT,
    abstract      TEXT,
    publisher     VARCHAR(255),
    user_id       INT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_papers_doi   ON papers(doi);
CREATE INDEX IF NOT EXISTS idx_papers_title ON papers(title);
CREATE INDEX IF NOT EXISTS idx_user_papers  ON papers(user_id);

-- ============================================================
-- Tabla: citations
-- ============================================================
CREATE TABLE IF NOT EXISTS citations (
    id            SERIAL PRIMARY KEY,
    paper_id      INT REFERENCES papers(id) ON DELETE CASCADE,
    format_type   citation_format NOT NULL,
    citation_text TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_citations_paper_id ON citations(paper_id);
CREATE INDEX IF NOT EXISTS idx_citations_format   ON citations(format_type);

-- ============================================================
-- Tabla: search_history
-- ============================================================
CREATE TABLE IF NOT EXISTS search_history (
    id            SERIAL PRIMARY KEY,
    search_url    TEXT,
    search_query  TEXT,
    search_type   VARCHAR(20) DEFAULT 'URL',
    success       BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    user_id       INT,
    paper_title   TEXT,
    paper_authors TEXT,
    paper_year    INT,
    paper_id      INT REFERENCES papers(id) ON DELETE SET NULL,
    session_data  JSONB,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_search ON search_history(user_id);

-- ============================================================
-- Tabla: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id                  SERIAL PRIMARY KEY,
    username            VARCHAR(50) UNIQUE NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    password            VARCHAR(255) NOT NULL,
    full_name           VARCHAR(100),
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    timezone            VARCHAR(100) DEFAULT 'UTC',
    avatar_url          VARCHAR(500),
    profile_image_path  VARCHAR(500),
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Tabla: user_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(500) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token          ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions  ON user_sessions(user_id);

-- ============================================================
-- Tabla: favorites
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_id    INT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, paper_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites ON favorites(user_id);

-- ============================================================
-- Foreign key: papers.user_id -> users.id
-- ============================================================
ALTER TABLE papers
    ADD CONSTRAINT fk_papers_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE search_history
    ADD CONSTRAINT fk_search_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- Tabla: highlights (resaltados y apuntes de papers)
-- ============================================================
CREATE TABLE IF NOT EXISTS highlights (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Instantánea del paper (resiliente, no requiere paper persistido)
    paper_id      INT REFERENCES papers(id) ON DELETE SET NULL,
    paper_doi     VARCHAR(255),
    paper_title   TEXT,
    paper_authors TEXT,
    paper_year    INT,
    paper_journal VARCHAR(255),
    paper_source  VARCHAR(50),
    paper_url     TEXT,
    -- Contenido del resaltado
    quote         TEXT NOT NULL,
    color         VARCHAR(20) NOT NULL DEFAULT 'yellow',
    note          TEXT,
    field         VARCHAR(20) DEFAULT 'abstract',
    start_offset  INT,
    end_offset    INT,
    is_favorite   BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_highlights_user ON highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_doi  ON highlights(paper_doi);
