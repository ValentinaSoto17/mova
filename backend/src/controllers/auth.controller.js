const bcrypt = require('bcryptjs');
const { query, one } = require('../config/db');
const { ok, errors, HttpError } = require('../utils/http');
const { z, parse, rules } = require('../utils/validate');
const tokens = require('../services/tokens');
const codes = require('../services/codes');
const { verifySocial } = require('../services/oauth');
const { activeBlock } = require('../services/accounts');

const ROL_ALUMNO = 3;

const USER_SELECT = `
  SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.password_hash, u.estado, u.telefono,
         u.fecha_nacimiento, u.altura_cm, u.peso_kg, u.objetivo, u.avatar_url, u.email_verificado,
         u.doble_factor, u.id_entrenador, u.created_at, r.nombre_rol AS rol
    FROM users u JOIN roles r ON r.id_rol = u.id_rol`;

/** Quita datos sensibles antes de enviar el usuario a la app. */
function publicUser(u) {
  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...rest } = u;
  return { ...rest, email_verificado: Boolean(u.email_verificado), doble_factor: Boolean(u.doble_factor), tiene_password: Boolean(password_hash) };
}

async function blockedError(user) {
  const b = await activeBlock(user.id_usuario);
  return new HttpError(403, 'ACCOUNT_BLOCKED', 'Tu cuenta está bloqueada', {
    block: b || { motivo: 'Cuenta bloqueada', instrucciones: 'Comunicate con la administración del gimnasio.' },
  });
}

/** Emite la sesión completa (access + refresh). */
async function session(res, user) {
  await query('UPDATE users SET ultimo_acceso = NOW() WHERE id_usuario = ?', [user.id_usuario]);
  const accessToken = tokens.signAccess(user);
  const refreshToken = await tokens.issueRefresh(user.id_usuario);
  return ok(res, { accessToken, refreshToken, user: publicUser(user) });
}

/** Decide el siguiente paso luego de validar credenciales. */
async function continueLogin(res, user) {
  if (user.estado === 'bloqueado') throw await blockedError(user);
  if (!user.email_verificado) {
    const extra = await codes.createAndSend(user, 'verificacion_email');
    return ok(res, { step: 'verify_email', pendingToken: tokens.signPending(user.id_usuario, 'verify_email'), email: user.email, ...extra });
  }
  if (user.doble_factor) {
    const extra = await codes.createAndSend(user, 'doble_factor');
    return ok(res, { step: 'two_factor', pendingToken: tokens.signPending(user.id_usuario, 'two_factor'), email: user.email, ...extra });
  }
  return session(res, user);
}

// POST /api/auth/register
exports.register = async (req, res) => {
  const data = parse(
    z.object({ nombre: rules.name, apellido: rules.name, email: rules.email, password: rules.password }),
    req.body
  );
  const exists = await one('SELECT id_usuario FROM users WHERE email = ?', [data.email]);
  if (exists) {
    const err = errors.conflict('Ya existe una cuenta con ese email');
    err.extra = { fields: { email: 'Este email ya está registrado' } };
    throw err;
  }
  const hash = await bcrypt.hash(data.password, 10);
  // Toda cuenta nueva se crea como Alumno; el administrador puede cambiar el rol.
  const r = await query(
    'INSERT INTO users (nombre, apellido, email, password_hash, id_rol) VALUES (?, ?, ?, ?, ?)',
    [data.nombre, data.apellido, data.email, hash, ROL_ALUMNO]
  );
  const user = await one(`${USER_SELECT} WHERE u.id_usuario = ?`, [r.insertId]);
  const extra = await codes.createAndSend(user, 'verificacion_email');
  res.status(201);
  return ok(res, { step: 'verify_email', pendingToken: tokens.signPending(user.id_usuario, 'verify_email'), email: user.email, ...extra }, 201);
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const data = parse(
    z.object({ email: rules.email, password: z.string({ required_error: 'Ingresá tu contraseña' }).min(1, 'Ingresá tu contraseña') }),
    req.body
  );
  const user = await one(`${USER_SELECT} WHERE u.email = ?`, [data.email]);
  const valid = user && user.password_hash && (await bcrypt.compare(data.password, user.password_hash));
  if (!valid) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos');
  }
  return continueLogin(res, user);
};

// POST /api/auth/verify-email
exports.verifyEmail = async (req, res) => {
  const data = parse(z.object({ pendingToken: z.string(), code: rules.code }), req.body);
  const userId = tokens.verifyPending(data.pendingToken, 'verify_email');
  await codes.verify(userId, 'verificacion_email', data.code);
  await query('UPDATE users SET email_verificado = TRUE WHERE id_usuario = ?', [userId]);
  const user = await one(`${USER_SELECT} WHERE u.id_usuario = ?`, [userId]);
  if (user.doble_factor) return continueLogin(res, user);
  if (user.estado === 'bloqueado') throw await blockedError(user);
  return session(res, user);
};

// POST /api/auth/verify-2fa
exports.verifyTwoFactor = async (req, res) => {
  const data = parse(z.object({ pendingToken: z.string(), code: rules.code }), req.body);
  const userId = tokens.verifyPending(data.pendingToken, 'two_factor');
  await codes.verify(userId, 'doble_factor', data.code);
  const user = await one(`${USER_SELECT} WHERE u.id_usuario = ?`, [userId]);
  if (user.estado === 'bloqueado') throw await blockedError(user);
  return session(res, user);
};

// POST /api/auth/resend-code
exports.resendCode = async (req, res) => {
  const data = parse(z.object({ pendingToken: z.string(), purpose: z.enum(['verify_email', 'two_factor']) }), req.body);
  const userId = tokens.verifyPending(data.pendingToken, data.purpose);
  const user = await one('SELECT id_usuario, email FROM users WHERE id_usuario = ?', [userId]);
  const extra = await codes.createAndSend(user, data.purpose === 'verify_email' ? 'verificacion_email' : 'doble_factor');
  return ok(res, { sent: true, ...extra });
};

// POST /api/auth/social
exports.social = async (req, res) => {
  const data = parse(
    z.object({
      provider: z.enum(['google', 'facebook', 'github', 'apple', 'discord']),
      idToken: z.string().optional(),
      accessToken: z.string().optional(),
      code: z.string().optional(),
      codeVerifier: z.string().optional(),
      redirectUri: z.string().optional(),
      identityToken: z.string().optional(),
      demo: z.boolean().optional(),
      demoAccount: z.enum(['nuevo', 'existente']).optional(),
      fullName: z.object({ givenName: z.string().nullable().optional(), familyName: z.string().nullable().optional() }).optional(),
    }),
    req.body
  );
  const profile = await verifySocial(data.provider, data);
  // Crea el proveedor si la base se cargó antes de agregarlo (ej. Discord)
  await query('INSERT IGNORE INTO auth_providers (nombre) VALUES (?)', [data.provider]);
  const prov = await one('SELECT id_proveedor_auth FROM auth_providers WHERE nombre = ?', [data.provider]);

  let user = await one(
    `${USER_SELECT} JOIN user_social_accounts s ON s.id_usuario = u.id_usuario
      WHERE s.id_proveedor_auth = ? AND s.provider_user_id = ?`,
    [prov.id_proveedor_auth, profile.providerId]
  );
  if (!user) {
    user = await one(`${USER_SELECT} WHERE u.email = ?`, [profile.email]);
    if (!user) {
      const r = await query(
        `INSERT INTO users (nombre, apellido, email, id_rol, avatar_url, email_verificado) VALUES (?, ?, ?, ?, ?, TRUE)`,
        [profile.nombre, profile.apellido, profile.email, ROL_ALUMNO, profile.avatar || null]
      );
      user = await one(`${USER_SELECT} WHERE u.id_usuario = ?`, [r.insertId]);
    } else if (!user.email_verificado) {
      // El proveedor ya verificó el email
      await query('UPDATE users SET email_verificado = TRUE WHERE id_usuario = ?', [user.id_usuario]);
      user.email_verificado = 1;
    }
    await query(
      'INSERT IGNORE INTO user_social_accounts (id_usuario, id_proveedor_auth, provider_user_id) VALUES (?, ?, ?)',
      [user.id_usuario, prov.id_proveedor_auth, profile.providerId]
    );
  }
  return continueLogin(res, user);
};

// POST /api/auth/refresh
exports.refresh = async (req, res) => {
  const data = parse(z.object({ refreshToken: z.string().min(10) }), req.body);
  const userId = await tokens.rotateRefresh(data.refreshToken);
  const user = await one(`${USER_SELECT} WHERE u.id_usuario = ?`, [userId]);
  if (!user) throw errors.unauthorized('Sesión inválida', 'REFRESH_INVALID');
  if (user.estado === 'bloqueado') throw await blockedError(user);
  return ok(res, {
    accessToken: tokens.signAccess(user),
    refreshToken: await tokens.issueRefresh(user.id_usuario),
    user: publicUser(user),
  });
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await tokens.revokeRefresh(refreshToken);
  return ok(res, { loggedOut: true });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  const { email } = parse(z.object({ email: rules.email }), req.body);
  const user = await one('SELECT id_usuario, email FROM users WHERE email = ?', [email]);
  let extra = {};
  let pendingToken = null;
  if (user) {
    extra = await codes.createAndSend(user, 'recuperacion');
    pendingToken = tokens.signPending(user.id_usuario, 'reset');
  }
  // Misma respuesta exista o no la cuenta (no revela qué emails están registrados)
  return ok(res, { sent: true, pendingToken: pendingToken || tokens.signPending(0, 'reset'), ...extra });
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  const data = parse(z.object({ pendingToken: z.string(), code: rules.code, password: rules.password }), req.body);
  const userId = tokens.verifyPending(data.pendingToken, 'reset');
  if (!userId) throw new HttpError(400, 'CODE_INVALID', 'El código no es correcto', { fields: { code: 'Código incorrecto' } });
  await codes.verify(userId, 'recuperacion', data.code);
  await query('UPDATE users SET password_hash = ? WHERE id_usuario = ?', [await bcrypt.hash(data.password, 10), userId]);
  await query('UPDATE refresh_tokens SET revocado = TRUE WHERE id_usuario = ?', [userId]);
  return ok(res, { reset: true });
};

// POST /api/auth/me
exports.me = async (req, res) => {
  const user = await one(`${USER_SELECT} WHERE u.id_usuario = ?`, [req.user.id_usuario]);
  return ok(res, publicUser(user));
};

exports.USER_SELECT = USER_SELECT;
exports.publicUser = publicUser;