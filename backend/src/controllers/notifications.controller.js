const { query } = require('../config/db');
const { ok } = require('../utils/http');
const { z, parse, rules } = require('../utils/validate');

// POST /api/notifications/list
exports.list = async (req, res) => {
  const rows = await query(
    `SELECT id_notificacion, tipo, titulo, mensaje, leida, fecha FROM notifications
      WHERE id_usuario = ? ORDER BY fecha DESC LIMIT 100`,
    [req.user.id_usuario]
  );
  return ok(res, rows.map((r) => ({ ...r, leida: Boolean(r.leida) })));
};

// POST /api/notifications/read -> marca una o todas como leídas
exports.read = async (req, res) => {
  const { id_notificacion } = parse(z.object({ id_notificacion: rules.id.optional() }), req.body);
  if (id_notificacion) {
    await query('UPDATE notifications SET leida = TRUE WHERE id_notificacion = ? AND id_usuario = ?', [id_notificacion, req.user.id_usuario]);
  } else {
    await query('UPDATE notifications SET leida = TRUE WHERE id_usuario = ?', [req.user.id_usuario]);
  }
  return ok(res, { leidas: true });
};

// POST /api/notifications/upcoming -> fechas próximas para programar avisos locales en el teléfono
exports.upcoming = async (req, res) => {
  const [cuota, revisiones] = await Promise.all([
    query(
      `SELECT p.nombre AS plan, m.fecha_vencimiento FROM memberships m JOIN membership_plans p ON p.id_plan = m.id_plan
        WHERE m.id_usuario = ? AND m.fecha_vencimiento >= CURDATE() ORDER BY m.id_membresia DESC LIMIT 1`,
      [req.user.id_usuario]
    ),
    query(
      `SELECT a.id_asignacion, a.fecha_revision, r.nombre_rutina FROM assignments a JOIN routines r ON r.id_rutina = a.id_rutina
        WHERE (a.id_alumno = ? OR a.id_entrenador = ?) AND a.estado = 'activa' AND a.fecha_revision >= CURDATE()`,
      [req.user.id_usuario, req.user.id_usuario]
    ),
  ]);
  return ok(res, { cuota: cuota[0] || null, revisiones });
};
