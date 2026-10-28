const bcrypt = require('bcryptjs');
const { query, one } = require('../config/db');
const { ok, errors } = require('../utils/http');
const { z, parse, rules } = require('../utils/validate');
const { notify, unblockUser } = require('../services/accounts');
const { runAll } = require('../jobs/scheduler');

const ROLES = { Administrador: 1, Entrenador: 2, Alumno: 3 };

// POST /api/admin/roles -> listar roles o cambiar el rol de un usuario
exports.roles = async (req, res) => {
  const data = parse(
    z.object({
      accion: z.enum(['listar', 'cambiar']).default('listar'),
      id_usuario: rules.id.optional(),
      rol: z.enum(['Administrador', 'Entrenador', 'Alumno']).optional(),
      confirmacion: z.boolean().optional(),
    }),
    req.body
  );
  if (data.accion === 'listar') {
    return ok(
      res,
      await query(
        `SELECT r.id_rol, r.nombre_rol, COUNT(u.id_usuario) AS usuarios
           FROM roles r LEFT JOIN users u ON u.id_rol = r.id_rol GROUP BY r.id_rol ORDER BY r.id_rol`
      )
    );
  }
  if (!data.id_usuario || !data.rol) throw errors.badRequest('Indicá el usuario y el nuevo rol');
  if (data.confirmacion !== true) throw errors.confirmationRequired('Confirmá el cambio de rol');
  if (data.id_usuario === req.user.id_usuario) throw errors.badRequest('No podés cambiar tu propio rol');
  const target = await one('SELECT id_usuario, nombre FROM users WHERE id_usuario = ?', [data.id_usuario]);
  if (!target) throw errors.notFound('Usuario no encontrado');
  await query(
    `UPDATE users SET id_rol = ?, id_entrenador = IF(? = 3, id_entrenador, NULL) WHERE id_usuario = ?`,
    [ROLES[data.rol], ROLES[data.rol], data.id_usuario]
  );
  await notify(data.id_usuario, 'sistema', 'Tu rol cambió', `Ahora sos ${data.rol} en MOVA. Volvé a iniciar sesión para ver tus nuevas secciones.`);
  return ok(res, { id_usuario: data.id_usuario, rol: data.rol });
};

// POST /api/admin/users/manage -> crear o editar cuentas
exports.manageUser = async (req, res) => {
  const base = {
    nombre: rules.name,
    apellido: rules.name,
    email: rules.email,
    rol: z.enum(['Administrador', 'Entrenador', 'Alumno']),
    telefono: z.string().trim().max(30).nullable().optional(),
    id_entrenador: rules.id.nullable().optional(),
  };
  const { accion } = parse(z.object({ accion: z.enum(['crear', 'editar']) }), req.body);

  if (accion === 'crear') {
    const d = parse(z.object({ ...base, password: rules.password }), req.body);
    const exists = await one('SELECT 1 FROM users WHERE email = ?', [d.email]);
    if (exists) {
      const err = errors.conflict('Ya existe una cuenta con ese email');
      err.extra = { fields: { email: 'Email ya registrado' } };
      throw err;
    }
    const r = await query(
      `INSERT INTO users (nombre, apellido, email, password_hash, id_rol, telefono, id_entrenador, email_verificado)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [d.nombre, d.apellido, d.email, await bcrypt.hash(d.password, 10), ROLES[d.rol], d.telefono || null, d.rol === 'Alumno' ? d.id_entrenador || null : null]
    );
    return ok(res, { id_usuario: r.insertId }, 201);
  }

  const d = parse(z.object({ id_usuario: rules.id, ...base, confirmacion: rules.confirm }), req.body);
  const dup = await one('SELECT 1 FROM users WHERE email = ? AND id_usuario <> ?', [d.email, d.id_usuario]);
  if (dup) {
    const err = errors.conflict('Ese email pertenece a otra cuenta');
    err.extra = { fields: { email: 'Email ya registrado' } };
    throw err;
  }
  if (d.id_usuario === req.user.id_usuario && d.rol !== 'Administrador') throw errors.badRequest('No podés quitarte el rol de administrador');
  await query(
    `UPDATE users SET nombre = ?, apellido = ?, email = ?, id_rol = ?, telefono = ?, id_entrenador = ? WHERE id_usuario = ?`,
    [d.nombre, d.apellido, d.email, ROLES[d.rol], d.telefono || null, d.rol === 'Alumno' ? d.id_entrenador || null : null, d.id_usuario]
  );
  return ok(res, { id_usuario: d.id_usuario });
};

// POST /api/admin/trainers -> lista de entrenadores (para asignar alumnos)
exports.trainers = async (req, res) =>
  ok(
    res,
    await query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email,
              (SELECT COUNT(*) FROM users a WHERE a.id_entrenador = u.id_usuario) AS alumnos,
              (SELECT COUNT(*) FROM routines r WHERE r.id_entrenador = u.id_usuario AND r.activo) AS rutinas
         FROM users u WHERE u.id_rol = 2 AND u.estado = 'activo' ORDER BY u.nombre`
    )
  );

// POST /api/admin/memberships -> planes, registrar pago/renovación
exports.memberships = async (req, res) => {
  const data = parse(
    z.object({
      accion: z.enum(['planes', 'listar', 'renovar']).default('listar'),
      id_usuario: rules.id.optional(),
      id_plan: rules.id.optional(),
    }),
    req.body
  );
  if (data.accion === 'planes') return ok(res, await query('SELECT * FROM membership_plans ORDER BY duracion_dias'));
  if (data.accion === 'listar') {
    return ok(
      res,
      await query(
        `SELECT u.id_usuario, u.nombre, u.apellido, u.estado, p.nombre AS plan, m.fecha_vencimiento, m.estado_pago,
                DATEDIFF(m.fecha_vencimiento, CURDATE()) AS dias_restantes
           FROM users u
           JOIN memberships m ON m.id_membresia = (SELECT MAX(id_membresia) FROM memberships WHERE id_usuario = u.id_usuario)
           JOIN membership_plans p ON p.id_plan = m.id_plan
          WHERE u.id_rol = 3 ORDER BY dias_restantes`
      )
    );
  }
  if (!data.id_usuario || !data.id_plan) throw errors.badRequest('Indicá el alumno y el plan');
  const plan = await one('SELECT * FROM membership_plans WHERE id_plan = ?', [data.id_plan]);
  if (!plan) throw errors.notFound('Plan no encontrado');
  // La nueva membresía arranca hoy o al terminar la vigente
  const last = await one(
    'SELECT GREATEST(fecha_vencimiento, CURDATE()) AS desde FROM memberships WHERE id_usuario = ? ORDER BY id_membresia DESC LIMIT 1',
    [data.id_usuario]
  );
  const desde = last?.desde || new Date().toISOString().slice(0, 10);
  await query(
    `INSERT INTO memberships (id_usuario, id_plan, fecha_inicio, fecha_vencimiento, estado_pago)
     VALUES (?, ?, ?, DATE_ADD(?, INTERVAL ? DAY), 'pagado')`,
    [data.id_usuario, data.id_plan, desde, desde, plan.duracion_dias]
  );
  // Si estaba bloqueado por cuota vencida, se reactiva automáticamente
  const bloqueoCuota = await one(
    `SELECT 1 FROM user_blocks WHERE id_usuario = ? AND fecha_desbloqueo IS NULL AND id_motivo = 1`,
    [data.id_usuario]
  );
  if (bloqueoCuota) await unblockUser(data.id_usuario);
  await notify(data.id_usuario, 'sistema', 'Pago registrado', `Se registró tu plan ${plan.nombre}. ¡Gracias!`);
  return ok(res, { renovado: true, reactivado: Boolean(bloqueoCuota) });
};

// POST /api/admin/stats -> métricas globales del gimnasio
exports.stats = async (req, res) => {
  const [usuarios, semana, asistencias, rutinasTop, equipos, prestamos, vencimientos, mensajes, entrenadores] = await Promise.all([
    one(
      `SELECT SUM(id_rol = 3) AS alumnos, SUM(id_rol = 2) AS entrenadores, SUM(id_rol = 1) AS administradores,
              SUM(estado = 'activo') AS activos, SUM(estado = 'bloqueado') AS bloqueados,
              SUM(created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS nuevos_mes
         FROM users`
    ),
    one(
      `SELECT SUM(fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) AS esta_semana,
              SUM(fecha >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND fecha < DATE_SUB(CURDATE(), INTERVAL 7 DAY)) AS semana_anterior,
              ROUND(AVG(CASE WHEN fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN duracion_min END)) AS duracion_promedio,
              COUNT(*) AS total
         FROM progress`
    ),
    query(
      `SELECT DATE(fecha_hora) AS dia, COUNT(*) AS cantidad FROM attendance
        WHERE fecha_hora >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
        GROUP BY DATE(fecha_hora) ORDER BY dia`
    ),
    query(
      `SELECT r.nombre_rutina, COUNT(p.id_progreso) AS completadas
         FROM routines r JOIN assignments a ON a.id_rutina = r.id_rutina
         JOIN progress p ON p.id_asignacion = a.id_asignacion
        WHERE p.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY r.id_rutina ORDER BY completadas DESC LIMIT 5`
    ),
    query('SELECT estado, COUNT(*) AS cantidad, SUM(cantidad_total) AS unidades FROM equipment GROUP BY estado'),
    one(`SELECT SUM(estado = 'pendiente') AS pendientes, SUM(estado = 'aprobado') AS activos,
                SUM(estado = 'aprobado' AND fecha_devolucion_prevista < CURDATE()) AS atrasados FROM equipment_loans`),
    query(
      `SELECT u.id_usuario, u.nombre, u.apellido, m.fecha_vencimiento, DATEDIFF(m.fecha_vencimiento, CURDATE()) AS dias
         FROM users u JOIN memberships m ON m.id_membresia = (SELECT MAX(id_membresia) FROM memberships WHERE id_usuario = u.id_usuario)
        WHERE u.estado = 'activo' AND m.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ORDER BY m.fecha_vencimiento`
    ),
    one('SELECT COUNT(*) AS sin_responder FROM messages m WHERE m.id_hilo_gimnasio IS NOT NULL AND m.id_emisor = m.id_hilo_gimnasio AND m.leido = FALSE'),
    query(
      `SELECT CONCAT(e.nombre, ' ', e.apellido) AS entrenador, COUNT(p.id_progreso) AS sesiones
         FROM users e LEFT JOIN assignments a ON a.id_entrenador = e.id_usuario
         LEFT JOIN progress p ON p.id_asignacion = a.id_asignacion AND p.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        WHERE e.id_rol = 2 GROUP BY e.id_usuario ORDER BY sesiones DESC`
    ),
  ]);
  return ok(res, { usuarios, entrenamientos: semana, asistencias, rutinasTop, equipos, prestamos, vencimientos, mensajes, entrenadores });
};

// POST /api/admin/run-jobs -> ejecuta manualmente los avisos y bloqueos automáticos
exports.runJobs = async (req, res) => ok(res, await runAll());
