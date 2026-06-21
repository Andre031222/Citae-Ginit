const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'citae',
  port: parseInt(process.env.DB_PORT) || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Convert MySQL-style ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Wrapper that mimics mysql2's execute() interface
const db = {
  async execute(sql, params = []) {
    const pgSql = convertPlaceholders(sql);
    const trimmed = pgSql.trim().toUpperCase();

    let finalSql = pgSql;

    // Auto-add RETURNING id to INSERT statements
    if (trimmed.startsWith('INSERT') && !trimmed.includes('RETURNING')) {
      finalSql = pgSql + ' RETURNING id';
    }

    const result = await pool.query(finalSql, params);

    if (trimmed.startsWith('SELECT')) {
      return [result.rows];
    } else if (trimmed.startsWith('INSERT')) {
      const insertId = result.rows[0]?.id || null;
      return [{ insertId, affectedRows: result.rowCount }];
    } else {
      return [{ affectedRows: result.rowCount }];
    }
  },

  async query(sql, params = []) {
    return this.execute(sql, params);
  },

  async getConnection() {
    const client = await pool.connect();
    return {
      release: () => client.release(),
      execute: async (sql, params = []) => {
        const pgSql = convertPlaceholders(sql);
        const result = await client.query(pgSql, params);
        return [result.rows];
      }
    };
  }
};

async function testConnection(retries = 3, delayMs = 1500) {
  const dbName = process.env.DB_NAME || 'citae';
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log(`Conexion exitosa a PostgreSQL - Base de datos: ${dbName}`);
      return;
    } catch (error) {
      const last = attempt === retries;
      console.error(`Error de conexion a PostgreSQL (intento ${attempt}/${retries}):`, error.message);
      if (last) {
        console.error(`Verifica que PostgreSQL este corriendo y que la DB "${dbName}" exista.`);
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

testConnection();

module.exports = db;
