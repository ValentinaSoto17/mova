const { query, one, transaction } = require('../config/db');
const { ok, errors } = require('../utils/http');
const { z, parse, rules } = require('../utils/validate');
const { notify } = require('../services/accounts');

const optInt = (min, max, label) =>
  z.coerce.number().int(`${label}: número entero`).min(min, `${label}: mínimo ${min}`).max(max, `${label}: máximo ${max}`).nullable().optional();

// POST /api/progress/create -> el alumno registra un entrenamiento realizado
exports.create = async (req, res) => {
  const d = parse(
    z.object({
      id_asignacion: rules.id,
      duracion_min: z.coerce.number({ invalid_type_error: 'Ingresá la duración' }).int().min(1, 'Duración inválida').max(300, 'Máximo 300 minutos'),
      frecuencia_cardiaca_prom: optInt(40, 220, 'Frecuencia promedio'),
      frecuencia_cardiaca_max: optInt(40, 230, 'Frecuencia máxima'),
      presion_sistolica: optInt(70, 250, 'Presión sistólica'),
      presion_diastolica: optInt(40, 150, 'Presión diastólica'),
      peso_kg: z.coerce.number().min(25).max(300).nullable().optional(),
      esfuerzo_percibido: optInt(1, 10, 'Esfuerzo'),
      calorias: optInt(0, 5000, 'Calorías'),
      observaciones: z.string().trim().max(500).nullable().optional(),
      detalles: z
        .array(
          z.object({
            id_ejercicio: rules.id,
            series_realizadas: z.coerce.number().int().min(0).max(30),
            repeticiones_realizadas: z.coerce.number().int().min(0).max(500).nullable().optional(),
            peso_kg: z.coerce.number().min(0).max(500).nullable().optional(),
            completado: z.boolean().default(true),
          })
        )
        .default([]),
    }),
    req.body
  );
  if (d.frecuencia_cardiaca_prom && d.frecuencia_cardiaca_max && d.frecuencia_cardiaca_max < d.frecuencia_cardiaca_prom) {
    const err = errors.badRequest('Revisá los datos', { fields: { frecuencia_cardiaca_max: 'Debe ser mayor o igual a la promedio' } });
    err.status = 422;
    throw err;
  }
  const a = await one(
    `SELECT a.id_asignacion, a.id_entrenador, r.nombre_rutina FROM assignments a JOIN routines r ON r.id_rutina = a.id_rutina
      WHERE a.id_asignacion = ? AND a.id_alumno = ? AND a.estado = 'activa'`,
    [d.id_asignacion, req.user.id_usuario]
  );
  if (!a) throw errors.forbidden('La rutina no está asignada a tu cuenta');

  // Estimación simple de calorías si el alumno no la informa (MET ≈ 6)
  const peso = d.peso_kg || (await one('SELECT peso_kg FROM users WHERE id_usuario = ?', [req.user.id_usuario]))?.peso_kg || 70;
  const calorias = d.calorias ?? Math.round((6 * 3.5 * peso * d.duracion_min) / 200);

  const id = await transaction(async (tx) => {
    const r = await tx.query(
      `INSERT INTO progress (id_asignacion, duracion_min, frecuencia_cardiaca_prom, frecuencia_cardiaca_max, presion_sistolica,
                             presion_diastolica, peso_kg, esfuerzo_percibido, calorias, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.id_asignacion, d.duracion_min, d.frecuencia_cardiaca_prom ?? null, d.frecuencia_cardiaca_max ?? null, d.presion_sistolica ?? null,
        d.presion_diastolica ?? null, d.peso_kg ?? null, d.esfuerzo_percibido ?? null, calorias, d.observaciones || null]
    );
    for (const det of d.detalles) {
      await tx.query(
        `INSERT INTO progress_details (id_progreso, id_ejercicio, series_realizadas, repeticiones_realizadas, peso_kg, completado)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [r.insertId, det.id_ejercicio, det.series_realizadas, det.repeticiones_realizadas ?? null, det.peso_kg ?? null, det.completado]
      );
    }
    await tx.query('INSERT INTO attendance (id_usuario) VALUES (?)', [req.user.id_usuario]);
    if (d.peso_kg) await tx.query('UPDATE users SET peso_kg = ? WHERE id_usuario = ?', [d.peso_kg, req.user.id_usuario]);
    return r.insertId;
  });

  // Alerta al entrenador si la presión es elevada
  if ((d.presion_sistolica && d.presion_sistolica >= 140) || (d.presion_diastolica && d.presion_diastolica >= 90)) {
    await notify(a.id_entrenador, 'sistema', 'Presión elevada registrada',
      `${req.user.nombre} ${req.user.apellido} registró ${d.presion_sistolica}/${d.presion_diastolica} mmHg en "${a.nombre_rutina}".`);
  }
  return ok(res, { id_progreso: id, calorias }, 201);
};

async function resolveStudent(req, idAlumno) {
  const me = req.user;
  if (me.rol === 'Alumno') return me.id_usuario;
  if (!idAlumno) throw errors.badRequest('Indicá el alumno');
  if (me.rol === 'Entrenador') {
    const a = await one('SELECT id_entrenador FROM users WHERE id_usuario = ?', [idAlumno]);
    if (!a || a.id_entrenador !== me.id_usuario) throw errors.forbidden('Solo podés ver el progreso de tus alumnos');
  }
  return idAlumno;
}

// POST /api/progress/history -> historial y evolución semanal
exports.history = async (req, res) => {
  const { id_alumno, semanas } = parse(z.object({ id_alumno: rules.id.optional(), semanas: z.coerce.number().int().min(1).max(52).default(8) }), req.body);
  const alumnoId = await resolveStudent(req, id_alumno);

  const [sesiones, semanal, totales, ejercicios] = await Promise.all([
    query(
      `SELECT p.id_progreso, p.fecha, p.duracion_min, p.frecuencia_cardiaca_prom, p.frecuencia_cardiaca_max,
              p.presion_sistolica, p.presion_diastolica, p.peso_kg, p.esfuerzo_percibido, p.calorias, p.observaciones,
              r.nombre_rutina,
              (SELECT COUNT(*) FROM progress_details d WHERE d.id_progreso = p.id_progreso AND d.completado) AS ejercicios_completados,
              (SELECT COUNT(*) FROM progress_details d WHERE d.id_progreso = p.id_progreso) AS ejercicios_totales
         FROM progress p JOIN assignments a ON a.id_asignacion = p.id_asignacion
         JOIN routines r ON r.id_rutina = a.id_rutina
        WHERE a.id_alumno = ? ORDER BY p.fecha DESC LIMIT 60`,
      [alumnoId]
    ),
    query(
      `SELECT DATE_SUB(DATE(p.fecha), INTERVAL WEEKDAY(p.fecha) DAY) AS semana,
              COUNT(*) AS sesiones, SUM(p.duracion_min) AS minutos, SUM(p.calorias) AS calorias,
              ROUND(AVG(p.frecuencia_cardiaca_prom)) AS fc_promedio, MAX(p.frecuencia_cardiaca_max) AS fc_maxima,
              ROUND(AVG(p.presion_sistolica)) AS sistolica, ROUND(AVG(p.presion_diastolica)) AS diastolica,
              ROUND(AVG(p.peso_kg), 1) AS peso, ROUND(AVG(p.esfuerzo_percibido), 1) AS esfuerzo
         FROM progress p JOIN assignments a ON a.id_asignacion = p.id_asignacion
        WHERE a.id_alumno = ? AND p.fecha >= DATE_SUB(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL ? WEEK)
        GROUP BY semana ORDER BY semana`,
      [alumnoId, semanas - 1]
    ),
    one(
      `SELECT COUNT(*) AS sesiones, COALESCE(SUM(p.duracion_min), 0) AS minutos, COALESCE(SUM(p.calorias), 0) AS calorias,
              ROUND(AVG(p.frecuencia_cardiaca_prom)) AS fc_promedio
         FROM progress p JOIN assignments a ON a.id_asignacion = p.id_asignacion WHERE a.id_alumno = ?`,
      [alumnoId]
    ),
    // Evolución de carga en los ejercicios con peso
    query(
      `SELECT e.id_ejercicio, e.nombre, DATE(p.fecha) AS fecha, MAX(d.peso_kg) AS peso_kg
         FROM progress_details d JOIN progress p ON p.id_progreso = d.id_progreso
         JOIN assignments a ON a.id_asignacion = p.id_asignacion JOIN exercises e ON e.id_ejercicio = d.id_ejercicio
        WHERE a.id_alumno = ? AND d.peso_kg IS NOT NULL
        GROUP BY e.id_ejercicio, DATE(p.fecha) ORDER BY e.id_ejercicio, fecha`,
      [alumnoId]
    ),
  ]);
  const cargas = {};
  ejercicios.forEach((r) => {
    if (!cargas[r.id_ejercicio]) cargas[r.id_ejercicio] = { id_ejercicio: r.id_ejercicio, nombre: r.nombre, puntos: [] };
    cargas[r.id_ejercicio].puntos.push({ fecha: r.fecha, peso_kg: r.peso_kg });
  });
  return ok(res, { sesiones, semanal, totales, cargas: Object.values(cargas) });
};

// POST /api/progress/detail -> un entrenamiento con sus ejercicios
exports.detail = async (req, res) => {
  const { id_progreso } = parse(z.object({ id_progreso: rules.id }), req.body);
  const p = await one(
    `SELECT p.*, r.nombre_rutina, a.id_alumno FROM progress p JOIN assignments a ON a.id_asignacion = p.id_asignacion
       JOIN routines r ON r.id_rutina = a.id_rutina WHERE p.id_progreso = ?`,
    [id_progreso]
  );
  if (!p) throw errors.notFound('Registro no encontrado');
  await resolveStudent(req, p.id_alumno);
  if (req.user.rol === 'Alumno' && p.id_alumno !== req.user.id_usuario) throw errors.forbidden();
  const detalles = await query(
    `SELECT d.*, e.nombre FROM progress_details d JOIN exercises e ON e.id_ejercicio = d.id_ejercicio WHERE d.id_progreso = ?`,
    [id_progreso]
  );
  return ok(res, { ...p, detalles });
};

// POST /api/progress/summary -> panel de inicio según el rol
exports.summary = async (req, res) => {
  const me = req.user;
  const notif = await one('SELECT COUNT(*) AS n FROM notifications WHERE id_usuario = ? AND leida = FALSE', [me.id_usuario]);
  const msgs = await one('SELECT COUNT(*) AS n FROM messages WHERE id_receptor = ? AND leido = FALSE', [me.id_usuario]);
  const base = { notificaciones_sin_leer: notif.n, mensajes_sin_leer: msgs.n };

  if (me.rol === 'Alumno') {
    const [semana, ultima, racha, rutinas, membresia, dias] = await Promise.all([
      one(
        `SELECT COUNT(*) AS sesiones, COALESCE(SUM(p.duracion_min), 0) AS minutos, COALESCE(SUM(p.calorias), 0) AS calorias,
                ROUND(AVG(p.frecuencia_cardiaca_prom)) AS fc_promedio
           FROM progress p JOIN assignments a ON a.id_asignacion = p.id_asignacion
          WHERE a.id_alumno = ? AND p.fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`,
        [me.id_usuario]
      ),
      one(
        `SELECT p.fecha, p.duracion_min, p.frecuencia_cardiaca_prom, p.frecuencia_cardiaca_max, p.presion_sistolica,
                p.presion_diastolica, p.peso_kg, r.nombre_rutina
           FROM progress p JOIN assignments a ON a.id_asignacion = p.id_asignacion JOIN routines r ON r.id_rutina = a.id_rutina
          WHERE a.id_alumno = ? ORDER BY p.fecha DESC LIMIT 1`,
        [me.id_usuario]
      ),
      query(
        `SELECT DISTINCT DATE(fecha_hora) AS d FROM attendance WHERE id_usuario = ? AND fecha_hora >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) ORDER BY d DESC`,
        [me.id_usuario]
      ),
      one(`SELECT COUNT(*) AS n, MIN(CASE WHEN fecha_revision >= CURDATE() THEN fecha_revision END) AS proxima_revision
             FROM assignments WHERE id_alumno = ? AND estado = 'activa'`, [me.id_usuario]),
      one(
        `SELECT p.nombre AS plan, m.fecha_vencimiento, DATEDIFF(m.fecha_vencimiento, CURDATE()) AS dias_restantes
           FROM memberships m JOIN membership_plans p ON p.id_plan = m.id_plan WHERE m.id_usuario = ? ORDER BY m.id_membresia DESC LIMIT 1`,
        [me.id_usuario]
      ),
      query(
        `SELECT DATE(p.fecha) AS dia, SUM(p.duracion_min) AS minutos
           FROM progress p JOIN assignments a ON a.id_asignacion = p.id_asignacion
          WHERE a.id_alumno = ? AND p.fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(p.fecha)`,
        [me.id_usuario]
      ),
    ]);
    // Semanas consecutivas con al menos un entrenamiento
    const weeks = new Set(
      racha.map((r) => {
        const dt = new Date(`${r.d}T00:00:00Z`);
        const day = (dt.getUTCDay() + 6) % 7;
        dt.setUTCDate(dt.getUTCDate() - day);
        return dt.toISOString().slice(0, 10);
      })
    );
    let streak = 0;
    const cur = new Date();
    cur.setUTCHours(0, 0, 0, 0);
    cur.setUTCDate(cur.getUTCDate() - ((cur.getUTCDay() + 6) % 7));
    if (!weeks.has(cur.toISOString().slice(0, 10))) cur.setUTCDate(cur.getUTCDate() - 7);
    while (weeks.has(cur.toISOString().slice(0, 10))) {
      streak += 1;
      cur.setUTCDate(cur.getUTCDate() - 7);
    }
    return ok(res, { ...base, semana, ultima, racha_semanas: streak, rutinas_activas: rutinas.n, proxima_revision: rutinas.proxima_revision, membresia, ultimos_7_dias: dias });
  }

  if (me.rol === 'Entrenador') {
    const [alumnos, sesiones, rutinas, revisiones, actividad] = await Promise.all([
      one(`SELECT COUNT(*) AS total, SUM(estado = 'activo') AS activos FROM users WHERE id_entrenador = ?`, [me.id_usuario]),
      one(
        `SELECT COUNT(*) AS n FROM progress p JOIN assignments a ON a.id_asignacion = p.id_asignacion
           JOIN users u ON u.id_usuario = a.id_alumno WHERE u.id_entrenador = ? AND p.fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
        [me.id_usuario]
      ),
      one('SELECT COUNT(*) AS n FROM routines WHERE id_entrenador = ? AND activo = TRUE', [me.id_usuario]),
      query(
        `SELECT a.id_asignacion, a.fecha_revision, DATEDIFF(a.fecha_revision, CURDATE()) AS dias, r.nombre_rutina,
                u.id_usuario AS id_alumno, CONCAT(u.nombre, ' ', u.apellido) AS alumno
           FROM assignments a JOIN users u ON u.id_usuario = a.id_alumno JOIN routines r ON r.id_rutina = a.id_rutina
          WHERE u.id_entrenador = ? AND a.estado = 'activa' AND a.fecha_revision BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
          ORDER BY a.fecha_revision`,
        [me.id_usuario]
      ),
      query(
        `SELECT p.id_progreso, p.fecha, p.duracion_min, p.frecuencia_cardiaca_prom, p.presion_sistolica, p.presion_diastolica,
                r.nombre_rutina, u.id_usuario AS id_alumno, CONCAT(u.nombre, ' ', u.apellido) AS alumno
           FROM progress p JOIN assignments a ON a.id_asignacion = p.id_asignacion
           JOIN users u ON u.id_usuario = a.id_alumno JOIN routines r ON r.id_rutina = a.id_rutina
          WHERE u.id_entrenador = ? ORDER BY p.fecha DESC LIMIT 6`,
        [me.id_usuario]
      ),
    ]);
    return ok(res, { ...base, alumnos, sesiones_semana: sesiones.n, rutinas: rutinas.n, revisiones, actividad });
  }

  // Administrador: resumen corto (las métricas completas están en /api/admin/stats)
  const r = await one(
    `SELECT (SELECT COUNT(*) FROM users WHERE id_rol = 3 AND estado = 'activo') AS alumnos_activos,
            (SELECT COUNT(*) FROM users WHERE estado = 'bloqueado') AS bloqueados,
            (SELECT COUNT(*) FROM attendance WHERE DATE(fecha_hora) = CURDATE()) AS asistencias_hoy,
            (SELECT COUNT(*) FROM equipment_loans WHERE estado = 'pendiente') AS prestamos_pendientes,
            (SELECT COUNT(*) FROM messages WHERE id_hilo_gimnasio IS NOT NULL AND id_emisor = id_hilo_gimnasio AND leido = FALSE) AS consultas_sin_leer`
  );
  return ok(res, { ...base, ...r });
};

// POST /api/progress/checkin -> registrar asistencia al gimnasio
exports.checkin = async (req, res) => {
  const ya = await one('SELECT 1 FROM attendance WHERE id_usuario = ? AND DATE(fecha_hora) = CURDATE()', [req.user.id_usuario]);
  if (ya) return ok(res, { registrada: false, mensaje: 'Ya registraste tu asistencia hoy' });
  await query('INSERT INTO attendance (id_usuario) VALUES (?)', [req.user.id_usuario]);
  return ok(res, { registrada: true, mensaje: '¡Asistencia registrada!' });
};
