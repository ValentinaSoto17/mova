const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { query, one } = require('../config/db');
const { sendCode, mailConfigured } = require('./mailer');
const { HttpError } = require('../utils/http');

/** Genera un código de 6 dígitos, guarda su hash y lo envía por email. */
async function createAndSend(user, tipo) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await query('UPDATE verification_codes SET usado = TRUE WHERE id_usuario = ? AND tipo = ? AND usado = FALSE', [
    user.id_usuario,
    tipo,
  ]);
  await query(
    `INSERT INTO verification_codes (id_usuario, tipo, code_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
    [user.id_usuario, tipo, await bcrypt.hash(code, 8)]
  );
  try {
    await sendCode(user.email, code, tipo);
  } catch (err) {
    console.error('[MAIL] No se pudo enviar el código:', err.message);
    // Si el envío falla y DEV_SHOW_CODES=true, el código se muestra en pantalla para no trabar la demo
    if (env.devShowCodes) return { devCode: code };
    throw new HttpError(503, 'MAIL_FAILED', 'No pudimos enviar el email con el código. Probá de nuevo en unos minutos.');
  }
  // En desarrollo sin email configurado se devuelve el código para poder probar la app
  return env.devShowCodes && !mailConfigured ? { devCode: code } : {};
}

/** Valida el código (máx. 5 intentos, 10 minutos de validez). */
async function verify(userId, tipo, code) {
  const row = await one(
    `SELECT id_codigo, code_hash, intentos, expires_at < NOW() AS vencido
       FROM verification_codes
      WHERE id_usuario = ? AND tipo = ? AND usado = FALSE
      ORDER BY id_codigo DESC LIMIT 1`,
    [userId, tipo]
  );
  if (!row || row.vencido) throw new HttpError(400, 'CODE_EXPIRED', 'El código venció. Pedí uno nuevo.');
  if (row.intentos >= 5) throw new HttpError(429, 'TOO_MANY_ATTEMPTS', 'Demasiados intentos. Pedí un código nuevo.');
  const okCode = await bcrypt.compare(code, row.code_hash);
  if (!okCode) {
    await query('UPDATE verification_codes SET intentos = intentos + 1 WHERE id_codigo = ?', [row.id_codigo]);
    const err = new HttpError(400, 'CODE_INVALID', 'El código no es correcto', { fields: { code: 'Código incorrecto' } });
    throw err;
  }
  await query('UPDATE verification_codes SET usado = TRUE WHERE id_codigo = ?', [row.id_codigo]);
}

module.exports = { createAndSend, verify };