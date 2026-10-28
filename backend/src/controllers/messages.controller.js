/**
 * Mensajería interna:
 *  - Alumno ↔ Gimnasio: hilo por alumno que pueden responder el dueño y los entrenadores.
 *  - Directos: Alumno ↔ su entrenador / administración, Entrenador ↔ Dueño.
 *  - Dueño → Distribuidora: se guarda y se envía por email al proveedor.
 */
const { query, one } = require('../config/db');
const { ok, errors } = require('../utils/http');
const { z, parse, rules } = require('../utils/validate');
const { notify } = require('../services/accounts');
const { sendMail } = require('../services/mailer');

const STAFF = ['Administrador', 'Entrenador'];

/** ¿Puede `me` escribirle directamente a `other`? */
async function canTalk(me, otherId) {
  const other = await one(
    'SELECT u.id_usuario, u.nombre, u.id_entrenador, r.nombre_rol AS rol FROM users u JOIN roles r ON r.id_rol = u.id_rol WHERE u.id_usuario = ?',
    [otherId]
  );
  if (!other || other.id_usuario === me.id_usuario) return null;
  if (me.rol === 'Administrador') return other;
  if (other.rol === 'Administrador') return other;
  if (me.rol === 'Entrenador' && other.rol === 'Alumno' && other.id_entrenador === me.id_usuario) return other;
  if (me.rol === 'Alumno' && other.rol === 'Entrenador') {
    const mine = await one('SELECT id_entrenador FROM users WHERE id_usuario = ?', [me.id_usuario]);
    if (mine.id_entrenador === other.id_usuario) return other;
  }
  return null;
}

// POST /api/messages/conversations
exports.conversations = async (req, res) => {
  const me = req.user;
  const directos = await query(
    `SELECT t.otro AS id, CONCAT(u.nombre, ' ', u.apellido) AS nombre, r.nombre_rol AS rol, u.avatar_url,
            m.contenido AS ultimo_mensaje, m.fecha_envio AS fecha, m.id_emisor = ? AS enviado_por_mi,
            (SELECT COUNT(*) FROM messages x WHERE x.id_emisor = t.otro AND x.id_receptor = ? AND x.leido = FALSE) AS sin_leer
       FROM (SELECT IF(id_emisor = ?, id_receptor, id_emisor) AS otro, MAX(id_mensaje) AS ultimo
               FROM messages WHERE id_receptor IS NOT NULL AND (id_emisor = ? OR id_receptor = ?)
              GROUP BY otro) t
       JOIN messages m ON m.id_mensaje = t.ultimo
       JOIN users u ON u.id_usuario = t.otro JOIN roles r ON r.id_rol = u.id_rol
      ORDER BY m.fecha_envio DESC`,
    [me.id_usuario, me.id_usuario, me.id_usuario, me.id_usuario, me.id_usuario]
  );
  const result = directos.map((d) => ({ tipo: 'usuario', ...d, enviado_por_mi: Boolean(d.enviado_por_mi) }));

  if (me.rol === 'Alumno') {
    const g = await one(
      `SELECT m.contenido AS ultimo_mensaje, m.fecha_envio AS fecha, m.id_emisor = ? AS enviado_por_mi,
              (SELECT COUNT(*) FROM messages x WHERE x.id_hilo_gimnasio = ? AND x.id_emisor <> ? AND x.leido = FALSE) AS sin_leer
         FROM messages m WHERE m.id_hilo_gimnasio = ? ORDER BY m.id_mensaje DESC LIMIT 1`,
      [me.id_usuario, me.id_usuario, me.id_usuario, me.id_usuario]
    );
    result.unshift({ tipo: 'gimnasio', id: me.id_usuario, nombre: 'Gimnasio MOVA', rol: 'Consultas', ultimo_mensaje: g?.ultimo_mensaje || 'Escribí tu consulta: la responde el dueño o un entrenador', fecha: g?.fecha || null, enviado_por_mi: Boolean(g?.enviado_por_mi), sin_leer: g?.sin_leer || 0 });
  } else {
    const hilos = await query(
      `SELECT t.id_hilo_gimnasio AS id, CONCAT(u.nombre, ' ', u.apellido) AS nombre, u.avatar_url,
              m.contenido AS ultimo_mensaje, m.fecha_envio AS fecha, m.id_emisor = ? AS enviado_por_mi,
              (SELECT COUNT(*) FROM messages x WHERE x.id_hilo_gimnasio = t.id_hilo_gimnasio AND x.id_emisor = t.id_hilo_gimnasio AND x.leido = FALSE) AS sin_leer
         FROM (SELECT id_hilo_gimnasio, MAX(id_mensaje) AS ultimo FROM messages WHERE id_hilo_gimnasio IS NOT NULL GROUP BY id_hilo_gimnasio) t
         JOIN messages m ON m.id_mensaje = t.ultimo JOIN users u ON u.id_usuario = t.id_hilo_gimnasio
        ORDER BY m.fecha_envio DESC`,
      [me.id_usuario]
    );
    hilos.forEach((h) => result.push({ tipo: 'gimnasio', rol: 'Consulta al gimnasio', ...h, enviado_por_mi: Boolean(h.enviado_por_mi) }));
  }

  if (me.rol === 'Administrador') {
    const prov = await query(
      `SELECT s.id_proveedor AS id, s.nombre, s.rubro AS rol, m.contenido AS ultimo_mensaje, m.fecha_envio AS fecha
         FROM suppliers s JOIN messages m ON m.id_mensaje = (SELECT MAX(id_mensaje) FROM messages WHERE id_proveedor = s.id_proveedor)
        ORDER BY m.fecha_envio DESC`
    );
    prov.forEach((p) => result.push({ tipo: 'proveedor', ...p, enviado_por_mi: true, sin_leer: 0 }));
  }
  result.sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  return ok(res, result);
};

const threadSchema = z.object({ tipo: z.enum(['usuario', 'gimnasio', 'proveedor']), id: rules.id.optional() });

// POST /api/messages/thread -> mensajes de una conversación (y los marca como leídos)
exports.thread = async (req, res) => {
  const me = req.user;
  const t = parse(threadSchema, req.body);
  let rows;
  let titulo;
  if (t.tipo === 'usuario') {
    const other = await canTalk(me, t.id);
    if (!other) throw errors.forbidden('No podés ver esta conversación');
    titulo = await one(`SELECT CONCAT(u.nombre, ' ', u.apellido) AS nombre, r.nombre_rol AS rol FROM users u JOIN roles r ON r.id_rol = u.id_rol WHERE u.id_usuario = ?`, [t.id]);
    rows = await query(
      `SELECT m.id_mensaje, m.id_emisor, m.contenido, m.fecha_envio, m.leido, CONCAT(u.nombre, ' ', u.apellido) AS emisor
         FROM messages m JOIN users u ON u.id_usuario = m.id_emisor
        WHERE (m.id_emisor = ? AND m.id_receptor = ?) OR (m.id_emisor = ? AND m.id_receptor = ?)
        ORDER BY m.id_mensaje LIMIT 300`,
      [me.id_usuario, t.id, t.id, me.id_usuario]
    );
    await query('UPDATE messages SET leido = TRUE WHERE id_emisor = ? AND id_receptor = ? AND leido = FALSE', [t.id, me.id_usuario]);
  } else if (t.tipo === 'gimnasio') {
    const hilo = me.rol === 'Alumno' ? me.id_usuario : t.id;
    if (!hilo) throw errors.badRequest('Indicá el alumno');
    if (me.rol !== 'Alumno' && !STAFF.includes(me.rol)) throw errors.forbidden();
    const al = await one(`SELECT CONCAT(nombre, ' ', apellido) AS nombre FROM users WHERE id_usuario = ?`, [hilo]);
    titulo = me.rol === 'Alumno' ? { nombre: 'Gimnasio MOVA', rol: 'Responde el dueño o un entrenador' } : { nombre: al?.nombre, rol: 'Consulta al gimnasio' };
    rows = await query(
      `SELECT m.id_mensaje, m.id_emisor, m.contenido, m.fecha_envio, m.leido,
              CONCAT(u.nombre, ' ', u.apellido) AS emisor, r.nombre_rol AS rol_emisor
         FROM messages m JOIN users u ON u.id_usuario = m.id_emisor JOIN roles r ON r.id_rol = u.id_rol
        WHERE m.id_hilo_gimnasio = ? ORDER BY m.id_mensaje LIMIT 300`,
      [hilo]
    );
    if (me.rol === 'Alumno') {
      await query('UPDATE messages SET leido = TRUE WHERE id_hilo_gimnasio = ? AND id_emisor <> ? AND leido = FALSE', [hilo, hilo]);
    } else {
      await query('UPDATE messages SET leido = TRUE WHERE id_hilo_gimnasio = ? AND id_emisor = ? AND leido = FALSE', [hilo, hilo]);
    }
  } else {
    if (me.rol !== 'Administrador') throw errors.forbidden('Solo el administrador escribe a las distribuidoras');
    titulo = await one('SELECT nombre, rubro AS rol, email FROM suppliers WHERE id_proveedor = ?', [t.id]);
    if (!titulo) throw errors.notFound('Distribuidora no encontrada');
    rows = await query(
      `SELECT m.id_mensaje, m.id_emisor, m.contenido, m.fecha_envio, TRUE AS leido, CONCAT(u.nombre, ' ', u.apellido) AS emisor
         FROM messages m JOIN users u ON u.id_usuario = m.id_emisor WHERE m.id_proveedor = ? ORDER BY m.id_mensaje`,
      [t.id]
    );
  }
  return ok(res, { titulo, mensajes: rows.map((m) => ({ ...m, mio: m.id_emisor === me.id_usuario, leido: Boolean(m.leido) })) });
};

// POST /api/messages/send
exports.send = async (req, res) => {
  const me = req.user;
  const d = parse(
    threadSchema.extend({
      contenido: z.string({ required_error: 'Escribí un mensaje' }).trim().min(1, 'Escribí un mensaje').max(1000, 'Máximo 1000 caracteres'),
    }),
    req.body
  );
  let r;
  if (d.tipo === 'usuario') {
    const other = await canTalk(me, d.id);
    if (!other) throw errors.forbidden('No podés enviarle mensajes a este usuario');
    r = await query('INSERT INTO messages (id_emisor, id_receptor, contenido) VALUES (?, ?, ?)', [me.id_usuario, d.id, d.contenido]);
    await notify(d.id, 'mensaje', `Nuevo mensaje de ${me.nombre}`, d.contenido.slice(0, 120));
  } else if (d.tipo === 'gimnasio') {
    const hilo = me.rol === 'Alumno' ? me.id_usuario : d.id;
    if (!hilo) throw errors.badRequest('Indicá el alumno');
    const al = await one('SELECT id_rol FROM users WHERE id_usuario = ?', [hilo]);
    if (!al || al.id_rol !== 3) throw errors.badRequest('El hilo de consultas pertenece a un alumno');
    r = await query('INSERT INTO messages (id_emisor, id_hilo_gimnasio, contenido) VALUES (?, ?, ?)', [me.id_usuario, hilo, d.contenido]);
    if (me.rol !== 'Alumno') await notify(hilo, 'mensaje', 'El gimnasio respondió tu consulta', d.contenido.slice(0, 120));
  } else {
    if (me.rol !== 'Administrador') throw errors.forbidden('Solo el administrador escribe a las distribuidoras');
    const prov = await one('SELECT * FROM suppliers WHERE id_proveedor = ?', [d.id]);
    if (!prov) throw errors.notFound('Distribuidora no encontrada');
    r = await query('INSERT INTO messages (id_emisor, id_proveedor, contenido) VALUES (?, ?, ?)', [me.id_usuario, d.id, d.contenido]);
    await sendMail({
      to: prov.email,
      subject: `Pedido de MOVA Gym - ${me.nombre} ${me.apellido}`,
      html: `<p>${d.contenido.replace(/</g, '&lt;')}</p><p>Responder a: ${me.email}</p>`,
    }).catch((e) => console.error('[MAIL]', e.message));
  }
  const msg = await one('SELECT id_mensaje, id_emisor, contenido, fecha_envio FROM messages WHERE id_mensaje = ?', [r.insertId]);
  return ok(res, { ...msg, mio: true, emisor: `${me.nombre} ${me.apellido}` }, 201);
};

// POST /api/messages/suppliers -> listar / crear / editar distribuidoras (admin)
exports.suppliers = async (req, res) => {
  const { accion } = parse(z.object({ accion: z.enum(['listar', 'crear', 'editar']).default('listar') }), req.body);
  if (accion === 'listar') return ok(res, await query('SELECT * FROM suppliers ORDER BY nombre'));
  const schema = {
    nombre: z.string().trim().min(2, 'Ingresá el nombre').max(100),
    rubro: z.string().trim().min(2, 'Ingresá el rubro').max(100),
    email: rules.email,
    telefono: z.string().trim().max(30).nullable().optional(),
  };
  if (accion === 'crear') {
    const d = parse(z.object(schema), req.body);
    const r = await query('INSERT INTO suppliers (nombre, rubro, email, telefono) VALUES (?, ?, ?, ?)', [d.nombre, d.rubro, d.email, d.telefono || null]);
    return ok(res, { id_proveedor: r.insertId }, 201);
  }
  const d = parse(z.object({ id_proveedor: rules.id, ...schema }), req.body);
  await query('UPDATE suppliers SET nombre = ?, rubro = ?, email = ?, telefono = ? WHERE id_proveedor = ?', [d.nombre, d.rubro, d.email, d.telefono || null, d.id_proveedor]);
  return ok(res, { id_proveedor: d.id_proveedor });
};
