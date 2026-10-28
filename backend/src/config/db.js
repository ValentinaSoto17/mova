/**
 * Pool de conexiones a MySQL en la nube.
 * Los proveedores gestionados (Aiven, Railway, TiDB Cloud, PlanetScale) exigen TLS,
 * por eso la conexión cifrada está activada por defecto.
 */
const mysql = require('mysql2/promise');
const env = require('./env');

/**
 * Opciones TLS. Aiven y otros proveedores firman con su propia autoridad (CA):
 *  - Si existe backend/ca.pem (descargado desde Aiven) o DB_SSL_CA, se verifica el certificado.
 *  - Si no, la conexión igual viaja cifrada pero sin verificar la CA.
 */
const fs = require('fs');
const path = require('path');
const CA_FILE = path.join(__dirname, '..', '..', 'ca.pem');

function sslOptions() {
  if (!env.db.ssl) return undefined;
  const ca = env.db.sslCa || (fs.existsSync(CA_FILE) ? fs.readFileSync(CA_FILE, 'utf8') : '');
  if (ca) return { ca, rejectUnauthorized: true };
  if (!sslOptions.warned) {
    console.warn('[DB] Conexión cifrada sin verificar la CA (podés poner el ca.pem de Aiven en la carpeta backend).');
    sslOptions.warned = true;
  }
  return { rejectUnauthorized: false };
}

const base = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // fechas como texto 'YYYY-MM-DD HH:mm:ss' (evita corrimientos de zona horaria)
  timezone: 'Z',
  charset: 'utf8mb4',
  decimalNumbers: true,
  multipleStatements: false,
};

const pool = env.db.url
  ? mysql.createPool({ uri: env.db.url, ssl: sslOptions(), ...base })
  : mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      ssl: sslOptions(),
      ...base,
    });

// Zona horaria de Argentina para NOW() / CURDATE() (los servidores en la nube usan UTC)
pool.on('connection', (conn) => {
  conn.query(`SET time_zone = '${env.db.timezone}'`);
});

/** Ejecuta una consulta parametrizada y devuelve las filas. */
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

/** Devuelve la primera fila o null. */
async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/** Ejecuta varias operaciones dentro de una transacción. */
async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn({
      query: async (sql, params = []) => (await conn.query(sql, params))[0],
    });
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, one, transaction, sslOptions };