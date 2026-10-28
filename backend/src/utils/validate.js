const { z } = require('zod');
const { errors } = require('./http');

/**
 * Valida req.body con un esquema zod. Si falla, responde 422 con los errores por campo
 * para que la app los muestre debajo de cada input (sin alerts).
 */
function parse(schema, body) {
  const result = schema.safeParse(body || {});
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    const err = errors.badRequest('Revisá los datos ingresados', { fields });
    err.status = 422;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return result.data;
}

// Reglas reutilizables con mensajes en español
const msg = {
  req: 'Este campo es obligatorio',
};
const rules = {
  id: z.coerce.number({ invalid_type_error: 'ID inválido' }).int().positive('ID inválido'),
  email: z.string({ required_error: msg.req }).trim().toLowerCase().email('Ingresá un email válido').max(120),
  password: z
    .string({ required_error: msg.req })
    .min(8, 'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres')
    .regex(/[A-Z]/, 'Debe incluir una mayúscula')
    .regex(/[a-z]/, 'Debe incluir una minúscula')
    .regex(/[0-9]/, 'Debe incluir un número'),
  name: z.string({ required_error: msg.req }).trim().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres'),
  text: (max = 255) => z.string().trim().max(max, `Máximo ${max} caracteres`),
  code: z.string({ required_error: msg.req }).trim().regex(/^\d{6}$/, 'El código tiene 6 números'),
  confirm: z.literal(true, { errorMap: () => ({ message: 'Confirmá la acción' }) }),
};

module.exports = { z, parse, rules };
