const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');
const scheduler = require('./jobs/scheduler');

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log(`[DB] Conectado a MySQL en ${env.db.url ? 'DATABASE_URL' : `${env.db.host}:${env.db.port}`} (SSL: ${env.db.ssl ? 'sí' : 'no'})`);
  } catch (err) {
    console.error('[DB] No se pudo conectar:', err.message);
    console.error('     Revisá las variables DB_* del archivo .env');
  }
  app.listen(env.port, () => console.log(`[API] MOVA escuchando en http://localhost:${env.port} (solo POST)`));
  scheduler.start();
}

start();
