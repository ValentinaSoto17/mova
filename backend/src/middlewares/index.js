const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { one } = require('../config/db');
const { HttpError, errors } = require('../utils/http');

/** Requisito del proyecto: la API solo acepta POST (OPTIONS se permite para CORS). */
function postOnly(req, res, next) {
  if (req.method === 'POST' || req.method === 'OPTIONS') return next();
  res.set('Allow', 'POST');
  return res.status(405).json({
    ok: false,
    error: { code: 'METHOD_NOT_ALLOWED', message: 'La API de MOVA solo acepta el método POST.' },
  });
}

/** Verifica el token de acceso y carga el usuario actualizado desde la base. */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw errors.unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, env.jwt.accessSecret);
    } catch (e) {
      throw errors.unauthorized(
        e.name === 'TokenExpiredError' ? 'Tu sesión expiró' : 'Token inválido',
        e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
      );
    }
    if (payload.type !== 'access') throw errors.unauthorized('Token inválido', 'TOKEN_INVALID');

    const user = await one(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.estado, r.nombre_rol AS rol
         FROM users u JOIN roles r ON r.id_rol = u.id_rol WHERE u.id_usuario = ?`,
      [payload.sub]
    );
    if (!user) throw errors.unauthorized('La cuenta ya no existe', 'TOKEN_INVALID');
    if (user.estado === 'bloqueado') {
      throw new HttpError(403, 'ACCOUNT_BLOCKED', 'Tu cuenta está bloqueada');
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Restringe la ruta a uno o más roles: requireRole('Administrador', 'Entrenador') */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.rol)) {
    return next(errors.forbidden(`Esta sección es solo para: ${roles.join(', ')}`));
  }
  next();
};

/** Manejador central de errores: siempre JSON con código HTTP claro. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: { code: 'BAD_JSON', message: 'El cuerpo de la solicitud no es JSON válido' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ ok: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Los datos enviados son demasiado grandes' } });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ ok: false, error: { code: err.code, message: err.message, ...err.extra } });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ ok: false, error: { code: 'CONFLICT', message: 'Ya existe un registro con esos datos' } });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ ok: false, error: { code: 'REFERENCE_ERROR', message: 'El registro está relacionado con otros datos' } });
  }
  if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ENOTFOUND', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE', 'HANDSHAKE_SSL_ERROR'].includes(err.code)) {
    console.error('[DB]', err.code, err.message);
    return res.status(503).json({ ok: false, error: { code: 'DB_UNAVAILABLE', message: 'El servidor no pudo conectarse a la base de datos en la nube. Revisá los datos DB_* de backend/.env (ejecutá npm run verificar).' } });
  }
  console.error('[ERROR]', err);
  return res.status(500).json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Ocurrió un error inesperado en el servidor' } });
}

function notFound(req, res) {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: `No existe el endpoint ${req.path}` } });
}

module.exports = { postOnly, authenticate, requireRole, errorHandler, notFound };
