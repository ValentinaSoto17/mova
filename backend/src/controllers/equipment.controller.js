const { query, one } = require('../config/db');
const { ok, errors } = require('../utils/http');
const { z, parse, rules } = require('../utils/validate');
const { notify } = require('../services/accounts');

// El stock disponible NO se guarda (3FN): se calcula restando los préstamos aprobados sin devolver.
const EQ_SELECT = `
  SELECT e.*, e.cantidad_total - COALESCE((SELECT SUM(l.cantidad) FROM equipment_loans l
           WHERE l.id_equipo = e.id_equipo AND l.estado = 'aprobado'), 0) AS disponibles
    FROM equipment e`;

// POST /api/equipment/list
exports.list = async (req, res) => {
  const onlyLendable = req.user.rol === 'Alumno';
  const rows = await query(`${EQ_SELECT} ${onlyLendable ? "WHERE e.prestable = TRUE AND e.estado = 'operativo'" : ''} ORDER BY e.prestable DESC, e.nombre`);
  return ok(res, rows.map((r) => ({ ...r, prestable: Boolean(r.prestable) })));
};

const eqSchema = {
  nombre: z.string({ required_error: 'Ingresá el nombre' }).trim().min(2, 'Mínimo 2 caracteres').max(100),
  descripcion: z.string().trim().max(255).nullable().optional(),
  cantidad_total: z.coerce.number({ invalid_type_error: 'Ingresá la cantidad' }).int().min(0, 'No puede ser negativo').max(10000),
  estado: z.enum(['operativo', 'mantenimiento', 'fuera_de_servicio']),
  prestable: z.boolean(),
};

// POST /api/equipment/manage -> { accion: crear | editar | eliminar } (Administrador)
exports.manage = async (req, res) => {
  const { accion } = parse(z.object({ accion: z.enum(['crear', 'editar', 'eliminar']) }), req.body);
  if (accion === 'crear') {
    const d = parse(z.object(eqSchema), req.body);
    const r = await query('INSERT INTO equipment (nombre, descripcion, cantidad_total, estado, prestable) VALUES (?, ?, ?, ?, ?)', [
      d.nombre, d.descripcion || null, d.cantidad_total, d.estado, d.prestable,
    ]);
    return ok(res, { id_equipo: r.insertId }, 201);
  }
  if (accion === 'editar') {
    const d = parse(z.object({ id_equipo: rules.id, ...eqSchema }), req.body);
    const prestados = await one(`SELECT COALESCE(SUM(cantidad), 0) AS n FROM equipment_loans WHERE id_equipo = ? AND estado = 'aprobado'`, [d.id_equipo]);
    if (d.cantidad_total < prestados.n) {
      const err = errors.badRequest('Revisá la cantidad', { fields: { cantidad_total: `Hay ${prestados.n} unidades prestadas` } });
      err.status = 422;
      throw err;
    }
    await query('UPDATE equipment SET nombre = ?, descripcion = ?, cantidad_total = ?, estado = ?, prestable = ? WHERE id_equipo = ?', [
      d.nombre, d.descripcion || null, d.cantidad_total, d.estado, d.prestable, d.id_equipo,
    ]);
    return ok(res, { id_equipo: d.id_equipo });
  }
  const d = parse(z.object({ id_equipo: rules.id, confirmacion: z.boolean().optional() }), req.body);
  if (d.confirmacion !== true) throw errors.confirmationRequired('Confirmá la eliminación del equipo');
  const usado = await one('SELECT COUNT(*) AS n FROM equipment_loans WHERE id_equipo = ?', [d.id_equipo]);
  if (usado.n > 0) {
    throw errors.conflict('El equipo tiene préstamos registrados. Marcalo como "fuera de servicio" en lugar de eliminarlo.');
  }
  await query('DELETE FROM equipment WHERE id_equipo = ?', [d.id_equipo]);
  return ok(res, { id_equipo: d.id_equipo, eliminado: true });
};

// POST /api/equipment/loans -> { accion: listar | solicitar | aprobar | rechazar | devolver }
exports.loans = async (req, res) => {
  const me = req.user;
  const { accion } = parse(z.object({ accion: z.enum(['listar', 'solicitar', 'aprobar', 'rechazar', 'devolver', 'cancelar']).default('listar') }), req.body);

  if (accion === 'listar') {
    const rows = await query(
      `SELECT l.id_prestamo, l.cantidad, l.fecha_solicitud, l.fecha_devolucion_prevista, l.fecha_devolucion, l.estado,
              l.estado = 'aprobado' AND l.fecha_devolucion_prevista < CURDATE() AS atrasado,
              e.id_equipo, e.nombre AS equipo, u.id_usuario AS id_alumno, CONCAT(u.nombre, ' ', u.apellido) AS alumno
         FROM equipment_loans l JOIN equipment e ON e.id_equipo = l.id_equipo JOIN users u ON u.id_usuario = l.id_alumno
        ${me.rol === 'Alumno' ? 'WHERE l.id_alumno = ?' : ''}
        ORDER BY FIELD(l.estado, 'pendiente', 'aprobado', 'devuelto', 'rechazado'), l.fecha_solicitud DESC LIMIT 200`,
      me.rol === 'Alumno' ? [me.id_usuario] : []
    );
    return ok(res, rows.map((r) => ({ ...r, atrasado: Boolean(r.atrasado) })));
  }

  if (accion === 'solicitar') {
    if (me.rol !== 'Alumno') throw errors.forbidden('Solo los alumnos solicitan material');
    const d = parse(
      z.object({
        id_equipo: rules.id,
        cantidad: z.coerce.number().int().min(1, 'Mínimo 1').max(5, 'Máximo 5 unidades'),
        fecha_devolucion_prevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí la fecha de devolución'),
      }),
      req.body
    );
    const eq = await one(`${EQ_SELECT} WHERE e.id_equipo = ?`, [d.id_equipo]);
    if (!eq || !eq.prestable || eq.estado !== 'operativo') throw errors.badRequest('Este elemento no está disponible para préstamo');
    if (eq.disponibles < d.cantidad) {
      const err = errors.badRequest('No hay stock suficiente', { fields: { cantidad: `Solo quedan ${eq.disponibles}` } });
      err.status = 422;
      throw err;
    }
    const pend = await one(`SELECT COUNT(*) AS n FROM equipment_loans WHERE id_alumno = ? AND estado IN ('pendiente','aprobado')`, [me.id_usuario]);
    if (pend.n >= 3) throw errors.badRequest('Tenés 3 préstamos activos. Devolvé alguno para pedir otro.');
    const r = await query(
      `INSERT INTO equipment_loans (id_equipo, id_alumno, cantidad, fecha_devolucion_prevista)
       SELECT ?, ?, ?, ? FROM DUAL WHERE ? BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`,
      [d.id_equipo, me.id_usuario, d.cantidad, d.fecha_devolucion_prevista, d.fecha_devolucion_prevista]
    );
    if (!r.affectedRows) {
      const err = errors.badRequest('Fecha inválida', { fields: { fecha_devolucion_prevista: 'Entre hoy y 30 días' } });
      err.status = 422;
      throw err;
    }
    const admins = await query("SELECT id_usuario FROM users WHERE id_rol = 1 AND estado = 'activo'");
    for (const a of admins) await notify(a.id_usuario, 'prestamo', 'Nueva solicitud de préstamo', `${me.nombre} ${me.apellido} pidió ${d.cantidad} × ${eq.nombre}.`);
    return ok(res, { id_prestamo: r.insertId }, 201);
  }

  const d = parse(z.object({ id_prestamo: rules.id }), req.body);
  const loan = await one(
    'SELECT l.*, e.nombre AS equipo FROM equipment_loans l JOIN equipment e ON e.id_equipo = l.id_equipo WHERE l.id_prestamo = ?',
    [d.id_prestamo]
  );
  if (!loan) throw errors.notFound('Préstamo no encontrado');

  if (accion === 'cancelar') {
    if (me.rol !== 'Alumno' || loan.id_alumno !== me.id_usuario || loan.estado !== 'pendiente') throw errors.badRequest('Solo podés cancelar tus solicitudes pendientes');
    await query(`UPDATE equipment_loans SET estado = 'rechazado' WHERE id_prestamo = ?`, [d.id_prestamo]);
    return ok(res, { id_prestamo: d.id_prestamo, estado: 'rechazado' });
  }
  if (me.rol !== 'Administrador') throw errors.forbidden('Solo el administrador gestiona los préstamos');

  const transitions = { aprobar: ['pendiente', 'aprobado'], rechazar: ['pendiente', 'rechazado'], devolver: ['aprobado', 'devuelto'] };
  const [from, to] = transitions[accion];
  if (loan.estado !== from) throw errors.badRequest(`El préstamo está "${loan.estado}"`);
  if (accion === 'aprobar') {
    const eq = await one(`${EQ_SELECT} WHERE e.id_equipo = ?`, [loan.id_equipo]);
    if (eq.disponibles < loan.cantidad) throw errors.badRequest('No hay stock disponible para aprobar');
  }
  await query(
    `UPDATE equipment_loans SET estado = ?, gestionado_por = ?, fecha_devolucion = IF(? = 'devuelto', NOW(), fecha_devolucion) WHERE id_prestamo = ?`,
    [to, me.id_usuario, to, d.id_prestamo]
  );
  const textos = { aprobado: 'fue aprobado. Retiralo en recepción.', rechazado: 'fue rechazado.', devuelto: 'se registró como devuelto. ¡Gracias!' };
  await notify(loan.id_alumno, 'prestamo', 'Actualización de préstamo', `Tu préstamo de ${loan.equipo} ${textos[to]}`);
  return ok(res, { id_prestamo: d.id_prestamo, estado: to });
};
