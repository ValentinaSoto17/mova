const bcrypt = require('bcryptjs');
const { query, one } = require('../config/db');
const { ok, errors, HttpError } = require('../utils/http');
const { z, parse, rules } = require('../utils/validate');
const { blockUser, unblockUser, activeBlock } = require('../services/accounts');
const { USER_SELECT, publicUser } = require('./auth.controller');

// POST /api/users/profile  -> ver perfil propio
exports.profile = async (req, res) => {
  const user = await one(`${USER_SELECT} WHERE u.id_usuario = ?`, [req.user.id_usuario]);
  const extra = {};
  if (user.rol === 'Alumno') {
    extra.membresia = await one(
      `SELECT p.nombre AS plan, m.fecha_inicio, m.fecha_vencimiento, m.estado_pago,
              DATEDIFF(m.fecha_vencimiento, CURDATE()) AS dias_restantes
         FROM memberships m JOIN membership_plans p ON p.id_plan = m.id_plan
        WHERE m.id_usuario = ? ORDER BY m.id_membresia DESC LIMIT 1`,
      [user.id_usuario]
    );
    extra.entrenador = user.id_entrenador
      ? await one('SELECT id_usuario, nombre, apellido, email FROM users WHERE id_usuario = ?', [user.id_entrenador])
      : null;
  }
  return ok(res, { ...publicUser(user), ...extra });
};

// POST /api/users/update-profile -> el usuario modifica SUS datos permitidos
exports.updateProfile = async (req, res) => {
  const data = parse(
    z.object({
      nombre: rules.name.optional(),
      apellido: rules.name.optional(),
      telefono: z.string().trim().max(30, 'Máximo 30 caracteres').nullable().optional(),
      fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato AAAA-MM-DD').nullable().optional(),
      altura_cm: z.coerce.number().int().min(100, 'Altura inválida').max(250, 'Altura inválida').nullable().optional(),
      peso_kg: z.coerce.number().min(25, 'Peso inválido').max(300, 'Peso inválido').nullable().optional(),
      objetivo: z.string().trim().max(150, 'Máximo 150 caracteres').nullable().optional(),
      avatar_url: z.string().trim().url('URL inválida').max(500).nullable().optional().or(z.literal('')),
    }),
    req.body
  );
  const fields = Object.keys(data);
  if (!fields.length) throw errors.badRequest('No hay cambios para guardar');
  const values = fields.map((k) => (data[k] === '' ? null : data[k]));
  await query(`UPDATE users SET ${fields.map((k) => `${k} = ?`).join(', ')} WHERE id_usuario = ?`, [...values, req.user.id_usuario]);
  const user = await one(`${USER_SELECT} WHERE u.id_usuario = ?`, [req.user.id_usuario]);
  return ok(res, publicUser(user));
};

// POST /api/users/change-password
exports.changePassword = async (req, res) => {
  const data = parse(z.object({ actual: z.string().optional(), nueva: rules.password }), req.body);
  const u = await one('SELECT password_hash FROM users WHERE id_usuario = ?', [req.user.id_usuario]);
  if (u.password_hash) {
    const valid = data.actual && (await bcrypt.compare(data.actual, u.password_hash));
    if (!valid) throw new HttpError(400, 'INVALID_PASSWORD', 'La contraseña actual no es correcta', { fields: { actual: 'Contraseña incorrecta' } });
  }
  await query('UPDATE users SET password_hash = ? WHERE id_usuario = ?', [await bcrypt.hash(data.nueva, 10), req.user.id_usuario]);
  return ok(res, { changed: true });
};

// POST /api/users/two-factor -> activa o desactiva la verificación en 2 pasos por email
exports.twoFactor = async (req, res) => {
  const { activo } = parse(z.object({ activo: z.boolean() }), req.body);
  await query('UPDATE users SET doble_factor = ? WHERE id_usuario = ?', [activo, req.user.id_usuario]);
  return ok(res, { doble_factor: activo });
};

// POST /api/users/list -> Administrador: todos | Entrenador: sus alumnos
exports.list = async (req, res) => {
  const f = parse(
    z.object({
      rol: z.enum(['Administrador', 'Entrenador', 'Alumno']).optional(),
      estado: z.enum(['activo', 'bloqueado']).optional(),
      buscar: z.string().trim().max(60).optional(),
    }),
    req.body
  );
  const where = [];
  const params = [];
  if (req.user.rol === 'Entrenador') {
    where.push("r.nombre_rol = 'Alumno' AND u.id_entrenador = ?");
    params.push(req.user.id_usuario);
  }
  if (f.rol) { where.push('r.nombre_rol = ?'); params.push(f.rol); }
  if (f.estado) { where.push('u.estado = ?'); params.push(f.estado); }
  if (f.buscar) {
    where.push("(CONCAT(u.nombre, ' ', u.apellido) LIKE ? OR u.email LIKE ?)");
    params.push(`%${f.buscar}%`, `%${f.buscar}%`);
  }
  const rows = await query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.estado, u.avatar_url, u.ultimo_acceso, u.created_at,
            r.nombre_rol AS rol, u.id_entrenador,
            CONCAT(e.nombre, ' ', e.apellido) AS entrenador,
            (SELECT COUNT(*) FROM progress p JOIN assignments a ON a.id_asignacion = p.id_asignacion
              WHERE a.id_alumno = u.id_usuario AND p.fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS entrenos_semana,
            (SELECT MAX(p.fecha) FROM progress p JOIN assignments a ON a.id_asignacion = p.id_asignacion
              WHERE a.id_alumno = u.id_usuario) AS ultimo_entreno
       FROM users u JOIN roles r ON r.id_rol = u.id_rol
       LEFT JOIN users e ON e.id_usuario = u.id_entrenador
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY u.estado DESC, r.id_rol, u.apellido, u.nombre`,
    params
  );
  return ok(res, rows);
};

// POST /api/users/detail -> ficha de un usuario (admin) o alumno propio (entrenador)
exports.detail = async (req, res) => {
  const { id_usuario } = parse(z.object({ id_usuario: rules.id }), req.body);
  const user = await one(`${USER_SELECT} WHERE u.id_usuario = ?`, [id_usuario]);
  if (!user) throw errors.notFound('Usuario no encontrado');
  if (req.user.rol === 'Entrenador' && user.id_entrenador !== req.user.id_usuario) {
    throw errors.forbidden('Solo podés ver a tus alumnos');
  }
  const [bloqueo, membresia, asignaciones, prestamos] = await Promise.all([
    user.estado === 'bloqueado' ? activeBlock(id_usuario) : null,
    one(
      `SELECT m.id_membresia, p.nombre AS plan, m.fecha_inicio, m.fecha_vencimiento, m.estado_pago,
              DATEDIFF(m.fecha_vencimiento, CURDATE()) AS dias_restantes
         FROM memberships m JOIN membership_plans p ON p.id_plan = m.id_plan
        WHERE m.id_usuario = ? ORDER BY m.id_membresia DESC LIMIT 1`,
      [id_usuario]
    ),
    query(
      `SELECT a.id_asignacion, a.estado, a.fecha_asignacion, a.fecha_revision, r.id_rutina, r.nombre_rutina,
              CONCAT(e.nombre, ' ', e.apellido) AS entrenador,
              (SELECT COUNT(*) FROM progress p WHERE p.id_asignacion = a.id_asignacion) AS sesiones
         FROM assignments a JOIN routines r ON r.id_rutina = a.id_rutina
         JOIN users e ON e.id_usuario = a.id_entrenador
        WHERE a.id_alumno = ? ORDER BY a.estado = 'activa' DESC, a.fecha_asignacion DESC`,
      [id_usuario]
    ),
    query(
      `SELECT l.id_prestamo, e.nombre AS equipo, l.cantidad, l.estado, l.fecha_devolucion_prevista
         FROM equipment_loans l JOIN equipment e ON e.id_equipo = l.id_equipo
        WHERE l.id_alumno = ? ORDER BY l.fecha_solicitud DESC LIMIT 10`,
      [id_usuario]
    ),
  ]);
  return ok(res, { ...publicUser(user), bloqueo, membresia, asignaciones, prestamos });
};

// POST /api/users/status -> bloquear / desbloquear (nunca se elimina un usuario)
exports.status = async (req, res) => {
  const data = parse(
    z.object({
      id_usuario: rules.id,
      estado: z.enum(['activo', 'bloqueado']),
      id_motivo: rules.id.optional(),
      detalle: rules.text(255).optional(),
      confirmacion: rules.confirm,
    }),
    req.body
  );
  if (data.id_usuario === req.user.id_usuario) throw errors.badRequest('No podés cambiar el estado de tu propia cuenta');
  const target = await one('SELECT id_usuario, estado FROM users WHERE id_usuario = ?', [data.id_usuario]);
  if (!target) throw errors.notFound('Usuario no encontrado');

  if (data.estado === 'bloqueado') {
    if (!data.id_motivo) {
      const err = errors.badRequest('Elegí el motivo del bloqueo', { fields: { id_motivo: 'Elegí un motivo' } });
      err.status = 422;
      throw err;
    }
    await blockUser(data.id_usuario, data.id_motivo, data.detalle || null, req.user.id_usuario);
  } else {
    await unblockUser(data.id_usuario);
  }
  return ok(res, { id_usuario: data.id_usuario, estado: data.estado });
};

// POST /api/users/block-reasons
exports.blockReasons = async (req, res) => ok(res, await query('SELECT * FROM block_reasons ORDER BY id_motivo'));

// POST /api/users/contacts -> con quién puede chatear el usuario según su rol
exports.contacts = async (req, res) => {
  const me = req.user;
  let rows;
  if (me.rol === 'Alumno') {
    rows = await query(
      `SELECT u.id_usuario, u.nombre, u.apellido, r.nombre_rol AS rol, u.avatar_url
         FROM users u JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.estado = 'activo' AND (u.id_rol = 1 OR u.id_usuario = (SELECT id_entrenador FROM users WHERE id_usuario = ?))`,
      [me.id_usuario]
    );
  } else if (me.rol === 'Entrenador') {
    rows = await query(
      `SELECT u.id_usuario, u.nombre, u.apellido, r.nombre_rol AS rol, u.avatar_url
         FROM users u JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.estado = 'activo' AND u.id_usuario <> ? AND (u.id_rol = 1 OR u.id_entrenador = ?)`,
      [me.id_usuario, me.id_usuario]
    );
  } else {
    rows = await query(
      `SELECT u.id_usuario, u.nombre, u.apellido, r.nombre_rol AS rol, u.avatar_url
         FROM users u JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.id_usuario <> ? ORDER BY r.id_rol, u.nombre`,
      [me.id_usuario]
    );
  }
  return ok(res, rows);
};
