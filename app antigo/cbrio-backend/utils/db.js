// ══════════════════════════════════════
// Conexão PostgreSQL com pool
// ══════════════════════════════════════

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // máximo de conexões no pool
  idleTimeoutMillis: 30000,   // fecha conexão ociosa após 30s
  connectionTimeoutMillis: 5000,
  // SSL obrigatório em produção
  ...(process.env.NODE_ENV === 'production' ? {
    ssl: { rejectUnauthorized: false }
  } : {}),
});

// Log de conexão
pool.on('connect', () => {
  console.log('[DB] Nova conexão ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado:', err.message);
});

// Helper: query com parameterized queries (ANTI SQL INJECTION)
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`[DB] Query lenta (${duration}ms):`, text.slice(0, 80));
  }
  return res;
};

// Helper: transação
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, transaction };
