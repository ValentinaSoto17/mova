/** Error con código HTTP y código interno legible por la app. */
class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const errors = {
  badRequest: (msg = 'Solicitud inválida', extra) => new HttpError(400, 'BAD_REQUEST', msg, extra),
  unauthorized: (msg = 'Tenés que iniciar sesión', code = 'UNAUTHORIZED') => new HttpError(401, code, msg),
  forbidden: (msg = 'No tenés permisos para esta acción', code = 'FORBIDDEN', extra) => new HttpError(403, code, msg, extra),
  notFound: (msg = 'No se encontró el recurso') => new HttpError(404, 'NOT_FOUND', msg),
  conflict: (msg = 'El recurso ya existe') => new HttpError(409, 'CONFLICT', msg),
  confirmationRequired: (msg = 'Esta acción requiere confirmación') =>
    new HttpError(428, 'CONFIRMATION_REQUIRED', msg),
};

/** Envuelve un controlador async para que los errores lleguen al manejador central. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Respuesta exitosa uniforme. */
const ok = (res, data = null, status = 200) => res.status(status).json({ ok: true, data });

module.exports = { HttpError, errors, asyncHandler, ok };
