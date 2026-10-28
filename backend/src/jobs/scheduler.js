/**
 * Tareas automáticas diarias (08:00 hora Argentina) + una ejecución al iniciar el servidor:
 *  1. Avisos preventivos N días antes del vencimiento de la cuota.
 *  2. Avisos preventivos N días antes de la revisión de rutina (alumno y entrenador).
 *  3. Bloqueo por cuota vencida (pasados los días de gracia).
 *  4. Bloqueo por material no devuelto.
 *  5. Bloqueo por inactividad prolongada.
 */
const cron = require('node-cron');
const env = require('../config/env');
const { query } = require('../config/db');
const { notify, blockUser } = require('../services/accounts');
const { sendMail } = require('../services/mailer');

const R = env.reglas;

async function avisosCuota() {
  const rows = await query(
    `SELECT m.id_membresia, m.fecha_vencimiento, u.id_usuario, u.email, u.nombre, p.nombre AS plan,
            DATEDIFF(m.fecha_vencimiento, CURDATE()) AS dias
       FROM memberships m
       JOIN users u ON u.id_usuario = m.id_usuario
       JOIN membership_plans p ON p.id_plan = m.id_plan
      WHERE u.estado = 'activo'
        AND DATEDIFF(m.fecha_vencimiento, CURDATE()) BETWEEN 0 AND ?
        AND m.id_membresia = (SELECT MAX(m2.id_membresia) FROM memberships m2 WHERE m2.id_usuario = u.id_usuario)`,
    [R.avisoDiasAntes]
  );
  for (const r of rows) {
    const cuando = r.dias === 0 ? 'hoy' : `en ${r.dias} día${r.dias > 1 ? 's' : ''}`;
    await notify(
      r.id_usuario,
      'vencimiento_cuota',
      `Tu cuota vence ${cuando}`,
      `Renová tu plan ${r.plan} para seguir entrenando sin interrupciones.`,
      `cuota-${r.id_membresia}`
    );
    await sendMail({
      to: r.email,
      subject: 'Tu cuota de MOVA está por vencer',
      html: `<p>Hola ${r.nombre}, tu plan ${r.plan} vence ${cuando} (${r.fecha_vencimiento}).</p>`,
    }).catch(() => {});
  }
  return rows.length;
}

async function avisosRevision() {
  const rows = await query(
    `SELECT a.id_asignacion, a.id_alumno, a.id_entrenador, a.fecha_revision, r.nombre_rutina,
            CONCAT(al.nombre, ' ', al.apellido) AS alumno, CONCAT(en.nombre, ' ', en.apellido) AS entrenador,
            DATEDIFF(a.fecha_revision, CURDATE()) AS dias
       FROM assignments a
       JOIN routines r ON r.id_rutina = a.id_rutina
       JOIN users al ON al.id_usuario = a.id_alumno
       JOIN users en ON en.id_usuario = a.id_entrenador
      WHERE a.estado = 'activa' AND al.estado = 'activo'
        AND DATEDIFF(a.fecha_revision, CURDATE()) BETWEEN 0 AND ?`,
    [R.avisoDiasAntes]
  );
  for (const r of rows) {
    const cuando = r.dias === 0 ? 'hoy' : `en ${r.dias} día${r.dias > 1 ? 's' : ''}`;
    await notify(r.id_alumno, 'revision_rutina', `Revisión de rutina ${cuando}`,
      `Tu rutina "${r.nombre_rutina}" se revisa ${cuando} con ${r.entrenador}.`,
      `revision-al-${r.id_asignacion}-${r.fecha_revision}`);
    await notify(r.id_entrenador, 'revision_rutina', `Revisión pendiente ${cuando}`,
      `Revisá la rutina "${r.nombre_rutina}" de ${r.alumno}.`,
      `revision-en-${r.id_asignacion}-${r.fecha_revision}`);
  }
  return rows.length;
}

async function bloqueosCuota() {
  const rows = await query(
    `SELECT u.id_usuario, m.fecha_vencimiento
       FROM users u
       JOIN memberships m ON m.id_usuario = u.id_usuario
      WHERE u.estado = 'activo' AND u.id_rol = 3
        AND m.id_membresia = (SELECT MAX(m2.id_membresia) FROM memberships m2 WHERE m2.id_usuario = u.id_usuario)
        AND DATEDIFF(CURDATE(), m.fecha_vencimiento) > ?`,
    [R.graciaCuotaDias]
  );
  for (const r of rows) await blockUser(r.id_usuario, 1, `Cuota vencida el ${r.fecha_vencimiento}`);
  return rows.length;
}

async function bloqueosPrestamo() {
  const rows = await query(
    `SELECT DISTINCT l.id_alumno, e.nombre
       FROM equipment_loans l JOIN equipment e ON e.id_equipo = l.id_equipo
       JOIN users u ON u.id_usuario = l.id_alumno
      WHERE l.estado = 'aprobado' AND u.estado = 'activo'
        AND DATEDIFF(CURDATE(), l.fecha_devolucion_prevista) > ?`,
    [R.graciaPrestamoDias]
  );
  for (const r of rows) await blockUser(r.id_alumno, 2, `${r.nombre} no devuelto`);
  return rows.length;
}

async function bloqueosInactividad() {
  const rows = await query(
    `SELECT u.id_usuario FROM users u
      WHERE u.estado = 'activo' AND u.id_rol = 3
        AND u.created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.id_usuario = u.id_usuario
                         AND a.fecha_hora > DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [R.inactividadDias, R.inactividadDias]
  );
  for (const r of rows) await blockUser(r.id_usuario, 3, `Sin asistencias en ${R.inactividadDias} días`);
  return rows.length;
}

async function runAll() {
  try {
    const res = {
      avisosCuota: await avisosCuota(),
      avisosRevision: await avisosRevision(),
      bloqueosCuota: await bloqueosCuota(),
      bloqueosPrestamo: await bloqueosPrestamo(),
      bloqueosInactividad: await bloqueosInactividad(),
    };
    console.log('[JOBS]', new Date().toISOString(), res);
    return res;
  } catch (err) {
    console.error('[JOBS] error', err.message);
    return null;
  }
}

function start() {
  cron.schedule('0 8 * * *', runAll, { timezone: 'America/Argentina/Buenos_Aires' });
  setTimeout(runAll, 3000);
}

module.exports = { start, runAll };
