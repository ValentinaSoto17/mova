const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query, one } = require('../config/db');
const { errors } = require('../utils/http');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function signAccess(user) {
  return jwt.sign({ sub: user.id_usuario, rol: user.rol, type: 'access' }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
  });
}

/** Token temporal (10 min) para completar verificación de email o doble factor. */
function signPending(userId, purpose) {
  return jwt.sign({ sub: userId, type: 'pending', purpose }, env.jwt.accessSecret, { expiresIn: '10m' });
}

function verifyPending(token, purpose) {
  try {
    const p = jwt.verify(token, env.jwt.accessSecret);
    if (p.type !== 'pending' || p.purpose !== purpose) throw new Error('purpose');
    return p.sub;
  } catch {
    throw errors.unauthorized('El tiempo para verificar expiró. Iniciá sesión de nuevo.', 'PENDING_EXPIRED');
  }
}

/** Crea un refresh token opaco y guarda su hash (nunca el token en texto plano). */
async function issueRefresh(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  await query(
    `INSERT INTO refresh_tokens (id_usuario, token_hash, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
    [userId, sha256(token), env.jwt.refreshDays]
  );
  return token;
}

/** Rotación: invalida el refresh usado y entrega uno nuevo. */
async function rotateRefresh(token) {
  const row = await one(
    `SELECT id_token, id_usuario, revocado, expires_at < NOW() AS vencido
       FROM refresh_tokens WHERE token_hash = ?`,
    [sha256(token)]
  );
  if (!row) throw errors.unauthorized('Sesión inválida', 'REFRESH_INVALID');
  if (row.revocado) {
    // Reutilización de un token ya rotado: posible robo => se cierran todas las sesiones
    await query('UPDATE refresh_tokens SET revocado = TRUE WHERE id_usuario = ?', [row.id_usuario]);
    throw errors.unauthorized('Sesión inválida', 'REFRESH_INVALID');
  }
  if (row.vencido) throw errors.unauthorized('Tu sesión expiró', 'REFRESH_EXPIRED');
  await query('UPDATE refresh_tokens SET revocado = TRUE WHERE id_token = ?', [row.id_token]);
  return row.id_usuario;
}

async function revokeRefresh(token) {
  await query('UPDATE refresh_tokens SET revocado = TRUE WHERE token_hash = ?', [sha256(token)]);
}

module.exports = { signAccess, signPending, verifyPending, issueRefresh, rotateRefresh, revokeRefresh };
