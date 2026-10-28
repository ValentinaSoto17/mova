/**
 * Asistente de configuración: revisa qué falta para que MOVA funcione y lo explica.
 * Uso (desde la carpeta raíz del proyecto):  npm run verificar
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const BACK_ENV = path.join(ROOT, 'backend', '.env');
const MOB_ENV = path.join(ROOT, 'mobile', '.env');
const ok = (m) => console.log(`  ✅ ${m}`);
const bad = (m) => console.log(`  ❌ ${m}`);
const info = (m) => console.log(`     ${m}`);

(async () => {
  console.log('\n🔎 Revisando la configuración de MOVA...\n');
  let problemas = 0;

  // 1) Crear los .env si no existen (con secretos JWT generados automáticamente)
  if (!fs.existsSync(BACK_ENV)) {
    let txt = fs.readFileSync(path.join(ROOT, 'backend', '.env.example'), 'utf8');
    txt = txt
      .replace(/JWT_ACCESS_SECRET=.*/, `JWT_ACCESS_SECRET=${crypto.randomBytes(48).toString('hex')}`)
      .replace(/JWT_REFRESH_SECRET=.*/, `JWT_REFRESH_SECRET=${crypto.randomBytes(48).toString('hex')}`);
    fs.writeFileSync(BACK_ENV, txt);
    ok('Creé backend/.env (con claves JWT generadas)');
  } else ok('backend/.env existe');

  if (!fs.existsSync(MOB_ENV)) {
    fs.copyFileSync(path.join(ROOT, 'mobile', '.env.example'), MOB_ENV);
    ok('Creé mobile/.env');
  } else ok('mobile/.env existe');

  // 2) Datos de la base en la nube
  require('dotenv').config({ path: BACK_ENV, override: true });
  const e = process.env;
  const placeholder = (v) => !v || /cambiar|tuproyecto|12345/.test(v);
  if (!e.DATABASE_URL && (placeholder(e.DB_HOST) || placeholder(e.DB_PASSWORD) || placeholder(e.DB_PORT))) {
    problemas++;
    bad('Faltan los datos de tu base MySQL en la nube en backend/.env');
    info('1. Entrá a https://aiven.io → Create service → MySQL → Free plan.');
    info('2. Cuando esté "Running", copiá Host, Port, User y Password.');
    info('3. Abrí backend/.env y completá DB_HOST, DB_PORT, DB_USER y DB_PASSWORD.');
  } else {
    // 3) Probar la conexión
    const mysql = require('mysql2/promise');
    try {
      const conn = e.DATABASE_URL
        ? await mysql.createConnection({ uri: e.DATABASE_URL, ssl: e.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false }, connectTimeout: 10000 })
        : await mysql.createConnection({ host: e.DB_HOST, port: Number(e.DB_PORT), user: e.DB_USER, password: e.DB_PASSWORD, ssl: e.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false }, connectTimeout: 10000 });
      ok(`Conexión a la base en la nube correcta (${e.DB_HOST || 'DATABASE_URL'})`);
      const [rows] = await conn.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users'", [e.DB_NAME || 'mova_db']);
      if (!rows[0].n) {
        problemas++;
        bad('La base está vacía: todavía no se crearon las tablas.');
        info('Ejecutá:  npm run base');
      } else ok('Las tablas de MOVA existen');
      await conn.end();
    } catch (err) {
      problemas++;
      bad(`No me pude conectar a la base: ${err.code || ''} ${err.message}`);
      if (err.code === 'ER_ACCESS_DENIED_ERROR') info('Usuario o contraseña incorrectos: copiá de nuevo DB_USER y DB_PASSWORD desde Aiven.');
      else if (err.code === 'ENOTFOUND') info('El DB_HOST está mal escrito. Copialo de nuevo desde Aiven (sin "https://").');
      else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') info('Revisá DB_PORT y que el servicio en Aiven esté "Running" (no pausado).');
    }
  }

  // 4) URL del backend en la app
  require('dotenv').config({ path: MOB_ENV, override: true });
  const url = process.env.EXPO_PUBLIC_API_URL || '';
  if (/onrender\.com/.test(url) && url.includes('mova-api.onrender.com')) {
    problemas++;
    bad(`mobile/.env apunta a ${url}, que todavía no existe.`);
    info('Para probar en la PC poné:  EXPO_PUBLIC_API_URL=http://localhost:4000');
  } else ok(`La app buscará el backend en ${url || 'http://localhost:4000'}`);

  console.log(problemas ? `\n⚠️  Hay ${problemas} cosa(s) para resolver (arriba dice cómo).\n` : '\n🎉 Todo listo. Ejecutá:  npm start\n');
  process.exit(problemas ? 1 : 0);
})();
