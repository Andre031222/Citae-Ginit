'use strict';

module.exports = {
up: async function(db) {
    // Crear tabla de usuarios
    await db.runSql(`
    CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        avatar_url VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
    `);

    // Crear tabla de sesiones
    await db.runSql(`
    CREATE TABLE IF NOT EXISTS user_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_user_sessions (user_id)
    )
    `);

    // Agregar user_id a papers (para historial personal)
    await db.runSql(`
    ALTER TABLE papers 
    ADD COLUMN user_id INT,
    ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD INDEX idx_user_papers (user_id)
    `);

    // Crear tabla de favoritos
    await db.runSql(`
    CREATE TABLE IF NOT EXISTS favorites (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        paper_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_paper (user_id, paper_id),
        INDEX idx_user_favorites (user_id)
    )
    `);

    // Crear tabla de historial de búsquedas por usuario
    await db.runSql(`
    ALTER TABLE search_history 
    ADD COLUMN user_id INT,
    ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD INDEX idx_user_search (user_id)
    `);
},

down: async function(db) {
    // Revertir cambios
    await db.runSql('ALTER TABLE search_history DROP FOREIGN KEY search_history_ibfk_1');
    await db.runSql('ALTER TABLE search_history DROP COLUMN user_id');
    await db.runSql('DROP TABLE IF EXISTS favorites');
    await db.runSql('ALTER TABLE papers DROP FOREIGN KEY papers_ibfk_1');
    await db.runSql('ALTER TABLE papers DROP COLUMN user_id');
    await db.runSql('DROP TABLE IF EXISTS user_sessions');
    await db.runSql('DROP TABLE IF EXISTS users');
}



};