/**
 * Crea las tablas y carga los datos de prueba en la base MySQL en la nube
 * configurada en .env.  Uso:  npm run db:init
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

(async () => {
  const { sslOptions, pool } = require('../src/config/db');
  const ssl = sslOptions();
  pool.end().catch(() => {});
  const conn = env.db.url
    ? await mysql.createConnection({ uri: env.db.url, ssl, multipleStatements: true })
    : await mysql.createConnection({
        host: env.db.host,
        port: env.db.port,
        user: env.db.user,
        password: env.db.password,
        ssl,
        multipleStatements: true,
      });
  const dbName = env.db.database;
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'database', f), 'utf8').replace(/mova_db/g, dbName);
  await conn.query(`SET time_zone = '${env.db.timezone}'`);
  console.log(`Creando estructura en "${dbName}"...`);
  await conn.query(read('schema.sql'));
  console.log('Cargando datos de prueba...');
  await conn.query(read('seed.sql'));
  const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM ${dbName}.users`);
  console.log(`Listo: ${n} usuarios cargados.`);
  await conn.end();
})().catch((err) => {
  console.error('Error inicializando la base:', err.message);
  process.exit(1);
});