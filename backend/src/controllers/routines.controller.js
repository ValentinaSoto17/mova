const { query, one, transaction } = require('../config/db');
const { ok, errors } = require('../utils/http');
const { z, parse, rules } = require('../utils/validate');
const { notify } = require('../services/accounts');

const ROUTINE_SELECT = `
  SELECT r.id_rutina, r.nombre_rutina, r.descripcion, r.duracion_estimada_min, r.id_entrenador, r.created_at,
         CONCAT(u.nombre, ' ', u.apellido) AS entrenador,
         (SELECT COUNT(*) FROM routine_exercises re WHERE re.id_rutina = r.id_rutina) AS cantidad_ejercicios,
         (SELECT COUNT(*) FROM assignments a WHERE a.id_rutina = r.id_rutina AND a.estado = 'activa') AS asignaciones_activas,
         (SELECT GROUP_CONCAT(DISTINCT c.nombre_categoria ORDER BY c.id_categoria SEPARATOR ', ')
            FROM routine_exercises re JOIN exercises e ON e.id_ejercicio = re.id_ejercicio
            JOIN categories c ON c.id_categoria = e.id_categoria WHERE re.id_rutina = r.id_rutina) AS categorias
    FROM routines r JOIN users u ON u.id_usuario = r.id_entrenador`;

async function routineExercises(idRutina) {
  return query(
    `SELECT re.id_detalle, re.orden, re.series, re.repeticiones, re.peso_sugerido_kg, re.descanso_segundos,
            e.id_ejercicio, e.nombre, e.descripcion, e.recomendacion, e.fotografia_url, e.dificultad,
            c.nombre_categoria AS categoria, g.nombre AS grupo_muscular
       FROM routine_exercises re
       JOIN exercises e ON e.id_ejercicio = re.id_ejercicio
       JOIN categories c ON c.id_categoria = e.id_categoria
       JOIN muscle_groups g ON g.id_grupo = e.id_grupo
      WHERE re.id_rutina = ? ORDER BY re.orden`,
    [idRutina]
  );
}

// POST /api/routines/list
exports.list = async (req, res) => {
  const me = req.user;
  if (me.rol === 'Alumno') {
    // Rutinas asignadas al alumno
    const rows = await query(
      `SELECT a.id_asignacion, a.fecha_asignacion, a.fecha_revision, a.estado,
              DATEDIFF(a.fecha_revision, CURDATE()) AS dias_revision,
              r.id_rutina, r.nombre_rutina, r.descripcion, r.duracion_estimada_min,
              CONCAT(u.nombre, ' ', u.apellido) AS entrenador,
              (SELECT COUNT(*) FROM routine_exercises re WHERE re.id_rutina = r.id_rutina) AS cantidad_ejercicios,
              (SELECT COUNT(*) FROM progress p WHERE p.id_asignacion = a.id_asignacion) AS sesiones,
              (SELECT MAX(p.fecha) FROM progress p WHERE p.id_asignacion = a.id_asignacion) AS ultima_sesion,
              (SELECT GROUP_CONCAT(DISTINCT c.nombre_categoria SEPARATOR ', ')
                 FROM routine_exercises re JOIN exercises e ON e.id_ejercicio = re.id_ejercicio
                 JOIN categories c ON c.id_categoria = e.id_categoria WHERE re.id_rutina = r.id_rutina) AS categorias
         FROM assignments a
         JOIN routines r ON r.id_rutina = a.id_rutina
         JOIN users u ON u.id_usuario = a.id_entrenador
        WHERE a.id_alumno = ? AND a.estado = 'activa'
        ORDER BY a.fecha_asignacion DESC`,
      [me.id_usuario]
    );
    return ok(res, rows);
  }
  const { solo_mias } = parse(z.object({ solo_mias: z.boolean().optional() }), req.body);
  const rows = await query(
    `${ROUTINE_SELECT} WHERE r.activo = TRUE ${solo_mias ? 'AND r.id_entrenador = ?' : ''} ORDER BY r.created_at DESC`,
    solo_mias ? [me.id_usuario] : []
  );
  return ok(res, rows.map((r) => ({ ...r, es_mia: r.id_entrenador === me.id_usuario })));
};

// POST /api/routines/detail
exports.detail = async (req, res) => {
  const { id_rutina } = parse(z.object({ id_rutina: rules.id }), req.body);
  const rutina = await one(`${ROUTINE_SELECT} WHERE r.id_rutina = ? AND r.activo = TRUE`, [id_rutina]);
  if (!rutina) throw errors.notFound('Rutina no encontrada');
  let asignacion = null;
  if (req.user.rol === 'Alumno') {
    asignacion = await one(
      `SELECT id_asignacion, fecha_asignacion, fecha_revision FROM assignments
        WHERE id_rutina = ? AND id_alumno = ? AND estado = 'activa' ORDER BY id_asignacion DESC LIMIT 1`,
      [id_rutina, req.user.id_usuario]
    );
    if (!asignacion) throw errors.forbidden('Esta rutina no está asignada a tu cuenta');
  }
  return ok(res, { ...rutina, asignacion, ejercicios: await routineExercises(id_rutina) });
};

const itemSchema = z.object({
  id_ejercicio: rules.id,
  series: z.coerce.number().int().min(1, 'Mín. 1 serie').max(20, 'Máx. 20 series'),
  repeticiones: z.string().trim().min(1, 'Indicá repeticiones').max(20),
  peso_sugerido_kg: z.coerce.number().min(0).max(500).nullable().optional(),
  descanso_segundos: z.coerce.number().int().min(0).max(600),
});
const routineSchema = {
  nombre_rutina: z.string({ required_error: 'Ingresá el nombre' }).trim().min(3, 'Mínimo 3 caracteres').max(100),
  descripcion: z.string().trim().max(500).nullable().optional(),
  duracion_estimada_min: z.coerce.number().int().min(5, 'Mínimo 5 minutos').max(240, 'Máximo 240 minutos'),
  ejercicios: z.array(itemSchema).min(1, 'Agregá al menos un ejercicio').max(30),
};

async function assertOwner(user, idRutina) {
  const r = await one('SELECT id_entrenador FROM routines WHERE id_rutina = ? AND activo = TRUE', [idRutina]);
  if (!r) throw errors.notFound('Rutina no encontrada');
  if (user.rol === 'Entrenador' && r.id_entrenador !== user.id_usuario) {
    throw errors.forbidden('Solo podés modificar las rutinas que creaste');
  }
  return r;
}

async function saveItems(tx, idRutina, items) {
  await tx.query('DELETE FROM routine_exercises WHERE id_rutina = ?', [idRutina]);
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    await tx.query(
      `INSERT INTO routine_exercises (id_rutina, id_ejercicio, series, repeticiones, peso_sugerido_kg, descanso_segundos, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idRutina, it.id_ejercicio, it.series, it.repeticiones, it.peso_sugerido_kg ?? null, it.descanso_segundos, i + 1]
    );
  }
}

// POST /api/routines/manage -> { accion: crear | editar | eliminar | asignar | desasignar }
exports.manage = async (req, res) => {
  const { accion } = parse(z.object({ accion: z.enum(['crear', 'editar', 'eliminar', 'asignar', 'desasignar']) }), req.body);
  const me = req.user;

  if (accion === 'crear') {
    const d = parse(z.object(routineSchema), req.body);
    const id = await transaction(async (tx) => {
      const r = await tx.query(
        'INSERT INTO routines (nombre_rutina, descripcion, duracion_estimada_min, id_entrenador) VALUES (?, ?, ?, ?)',
        [d.nombre_rutina, d.descripcion || null, d.duracion_estimada_min, me.id_usuario]
      );
      await saveItems(tx, r.insertId, d.ejercicios);
      return r.insertId;
    });
    return ok(res, { id_rutina: id }, 201);
  }

  if (accion === 'editar') {
    const d = parse(z.object({ id_rutina: rules.id, ...routineSchema }), req.body);
    await assertOwner(me, d.id_rutina);
    await transaction(async (tx) => {
      await tx.query('UPDATE routines SET nombre_rutina = ?, descripcion = ?, duracion_estimada_min = ? WHERE id_rutina = ?', [
        d.nombre_rutina, d.descripcion || null, d.duracion_estimada_min, d.id_rutina,
      ]);
      await saveItems(tx, d.id_rutina, d.ejercicios);
    });
    return ok(res, { id_rutina: d.id_rutina });
  }

  if (accion === 'eliminar') {
    const d = parse(z.object({ id_rutina: rules.id, confirmacion: z.boolean().optional() }), req.body);
    if (d.confirmacion !== true) throw errors.confirmationRequired('Confirmá la eliminación de la rutina');
    await assertOwner(me, d.id_rutina);
    // Baja lógica + cancelación de asignaciones activas (el historial se conserva)
    const activas = await query(`SELECT id_alumno FROM assignments WHERE id_rutina = ? AND estado = 'activa'`, [d.id_rutina]);
    await query(`UPDATE assignments SET estado = 'cancelada' WHERE id_rutina = ? AND estado = 'activa'`, [d.id_rutina]);
    await query('UPDATE routines SET activo = FALSE WHERE id_rutina = ?', [d.id_rutina]);
    for (const a of activas) await notify(a.id_alumno, 'sistema', 'Rutina dada de baja', 'Una de tus rutinas fue dada de baja. Tu entrenador te asignará una nueva.');
    return ok(res, { id_rutina: d.id_rutina, eliminado: true, asignaciones_canceladas: activas.length });
  }

  if (accion === 'asignar') {
    const d = parse(
      z.object({
        id_rutina: rules.id,
        id_alumno: rules.id,
        fecha_revision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí una fecha de revisión'),
      }),
      req.body
    );
    const alumno = await one(`SELECT id_usuario, id_entrenador, estado FROM users WHERE id_usuario = ? AND id_rol = 3`, [d.id_alumno]);
    if (!alumno) throw errors.notFound('Alumno no encontrado');
    if (me.rol === 'Entrenador' && alumno.id_entrenador !== me.id_usuario) throw errors.forbidden('Solo podés asignar rutinas a tus alumnos');
    const rutina = await one('SELECT nombre_rutina FROM routines WHERE id_rutina = ? AND activo = TRUE', [d.id_rutina]);
    if (!rutina) throw errors.notFound('Rutina no encontrada');
    const dup = await one(`SELECT 1 FROM assignments WHERE id_rutina = ? AND id_alumno = ? AND estado = 'activa'`, [d.id_rutina, d.id_alumno]);
    if (dup) throw errors.conflict('El alumno ya tiene esta rutina asignada');
    const r = await query(
      `INSERT INTO assignments (id_alumno, id_rutina, id_entrenador, fecha_asignacion, fecha_revision) VALUES (?, ?, ?, CURDATE(), ?)`,
      [d.id_alumno, d.id_rutina, me.id_usuario, d.fecha_revision]
    );
    await notify(d.id_alumno, 'sistema', 'Nueva rutina asignada', `${me.nombre} te asignó "${rutina.nombre_rutina}".`);
    return ok(res, { id_asignacion: r.insertId }, 201);
  }

  // desasignar / finalizar una asignación
  const d = parse(
    z.object({ id_asignacion: rules.id, estado: z.enum(['finalizada', 'cancelada']).default('finalizada'), confirmacion: z.boolean().optional() }),
    req.body
  );
  if (d.confirmacion !== true) throw errors.confirmationRequired('Confirmá que querés quitar la rutina al alumno');
  const a = await one(
    'SELECT a.id_asignacion, u.id_entrenador FROM assignments a JOIN users u ON u.id_usuario = a.id_alumno WHERE a.id_asignacion = ?',
    [d.id_asignacion]
  );
  if (!a) throw errors.notFound('Asignación no encontrada');
  if (me.rol === 'Entrenador' && a.id_entrenador !== me.id_usuario) throw errors.forbidden('Solo podés gestionar a tus alumnos');
  await query('UPDATE assignments SET estado = ? WHERE id_asignacion = ?', [d.estado, d.id_asignacion]);
  return ok(res, { id_asignacion: d.id_asignacion, estado: d.estado });
};

// POST /api/routines/assignments -> supervisión de asignaciones (entrenador: sus alumnos; admin: todas)
exports.assignments = async (req, res) => {
  const me = req.user;
  const rows = await query(
    `SELECT a.id_asignacion, a.estado, a.fecha_asignacion, a.fecha_revision, DATEDIFF(a.fecha_revision, CURDATE()) AS dias_revision,
            al.id_usuario AS id_alumno, CONCAT(al.nombre, ' ', al.apellido) AS alumno, al.estado AS estado_alumno,
            r.id_rutina, r.nombre_rutina, CONCAT(en.nombre, ' ', en.apellido) AS entrenador,
            (SELECT COUNT(*) FROM progress p WHERE p.id_asignacion = a.id_asignacion) AS sesiones,
            (SELECT MAX(p.fecha) FROM progress p WHERE p.id_asignacion = a.id_asignacion) AS ultima_sesion
       FROM assignments a
       JOIN users al ON al.id_usuario = a.id_alumno
       JOIN routines r ON r.id_rutina = a.id_rutina
       JOIN users en ON en.id_usuario = a.id_entrenador
      WHERE a.estado = 'activa' ${me.rol === 'Entrenador' ? 'AND al.id_entrenador = ?' : ''}
      ORDER BY a.fecha_revision`,
    me.rol === 'Entrenador' ? [me.id_usuario] : []
  );
  return ok(res, rows);
};
