const { query, one } = require('../config/db');
const { ok, errors } = require('../utils/http');
const { z, parse, rules } = require('../utils/validate');

const EX_SELECT = `
  SELECT e.id_ejercicio, e.nombre, e.descripcion, e.recomendacion, e.fotografia_url, e.dificultad,
         e.id_categoria, c.nombre_categoria AS categoria, e.id_grupo, g.nombre AS grupo_muscular,
         e.creado_por, CONCAT(u.nombre, ' ', u.apellido) AS autor, e.created_at
    FROM exercises e
    JOIN categories c ON c.id_categoria = e.id_categoria
    JOIN muscle_groups g ON g.id_grupo = e.id_grupo
    LEFT JOIN users u ON u.id_usuario = e.creado_por`;

// POST /api/exercises/list -> catálogo + categorías + grupos musculares
exports.list = async (req, res) => {
  const f = parse(
    z.object({
      id_categoria: rules.id.optional(),
      id_grupo: rules.id.optional(),
      dificultad: z.enum(['Principiante', 'Intermedio', 'Avanzado']).optional(),
      buscar: z.string().trim().max(60).optional(),
    }),
    req.body
  );
  const where = ['e.activo = TRUE'];
  const params = [];
  if (f.id_categoria) { where.push('e.id_categoria = ?'); params.push(f.id_categoria); }
  if (f.id_grupo) { where.push('e.id_grupo = ?'); params.push(f.id_grupo); }
  if (f.dificultad) { where.push('e.dificultad = ?'); params.push(f.dificultad); }
  if (f.buscar) { where.push('e.nombre LIKE ?'); params.push(`%${f.buscar}%`); }

  const [ejercicios, categorias, grupos] = await Promise.all([
    query(`${EX_SELECT} WHERE ${where.join(' AND ')} ORDER BY c.id_categoria, e.nombre`, params),
    query(
      `SELECT c.id_categoria, c.nombre_categoria, c.descripcion, COUNT(e.id_ejercicio) AS cantidad
         FROM categories c LEFT JOIN exercises e ON e.id_categoria = c.id_categoria AND e.activo = TRUE
        GROUP BY c.id_categoria ORDER BY c.id_categoria`
    ),
    query('SELECT id_grupo, nombre FROM muscle_groups ORDER BY id_grupo'),
  ]);
  return ok(res, { ejercicios, categorias, grupos });
};

// POST /api/exercises/detail
exports.detail = async (req, res) => {
  const { id_ejercicio } = parse(z.object({ id_ejercicio: rules.id }), req.body);
  const ex = await one(`${EX_SELECT} WHERE e.id_ejercicio = ? AND e.activo = TRUE`, [id_ejercicio]);
  if (!ex) throw errors.notFound('Ejercicio no encontrado');
  return ok(res, ex);
};

const exerciseSchema = {
  nombre: z.string({ required_error: 'Ingresá el nombre' }).trim().min(3, 'Mínimo 3 caracteres').max(100),
  descripcion: z.string({ required_error: 'Ingresá una descripción' }).trim().min(10, 'Describí el ejercicio (mín. 10 caracteres)').max(2000),
  recomendacion: z.string().trim().max(2000).nullable().optional(),
  fotografia_url: z.string().trim().url('Ingresá una URL válida (https://...)').max(500).nullable().optional().or(z.literal('')),
  id_categoria: rules.id,
  id_grupo: rules.id,
  dificultad: z.enum(['Principiante', 'Intermedio', 'Avanzado'], { errorMap: () => ({ message: 'Elegí la dificultad' }) }),
};

/** El entrenador solo puede modificar/eliminar los ejercicios que creó; el administrador, todos. */
async function assertCanEdit(user, id) {
  const ex = await one('SELECT creado_por FROM exercises WHERE id_ejercicio = ? AND activo = TRUE', [id]);
  if (!ex) throw errors.notFound('Ejercicio no encontrado');
  if (user.rol === 'Entrenador' && ex.creado_por !== user.id_usuario) {
    throw errors.forbidden('Solo podés modificar los ejercicios que creaste');
  }
}

// POST /api/exercises/manage -> { accion: crear | editar | eliminar }
exports.manage = async (req, res) => {
  const { accion } = parse(z.object({ accion: z.enum(['crear', 'editar', 'eliminar']) }), req.body);

  if (accion === 'crear') {
    const d = parse(z.object(exerciseSchema), req.body);
    const r = await query(
      `INSERT INTO exercises (nombre, descripcion, recomendacion, fotografia_url, id_categoria, id_grupo, dificultad, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.nombre, d.descripcion, d.recomendacion || null, d.fotografia_url || null, d.id_categoria, d.id_grupo, d.dificultad, req.user.id_usuario]
    );
    return ok(res, await one(`${EX_SELECT} WHERE e.id_ejercicio = ?`, [r.insertId]), 201);
  }

  if (accion === 'editar') {
    const d = parse(z.object({ id_ejercicio: rules.id, ...exerciseSchema }), req.body);
    await assertCanEdit(req.user, d.id_ejercicio);
    await query(
      `UPDATE exercises SET nombre = ?, descripcion = ?, recomendacion = ?, fotografia_url = ?, id_categoria = ?, id_grupo = ?, dificultad = ?
        WHERE id_ejercicio = ?`,
      [d.nombre, d.descripcion, d.recomendacion || null, d.fotografia_url || null, d.id_categoria, d.id_grupo, d.dificultad, d.id_ejercicio]
    );
    return ok(res, await one(`${EX_SELECT} WHERE e.id_ejercicio = ?`, [d.id_ejercicio]));
  }

  // eliminar: exige confirmación explícita
  const { id_ejercicio, confirmacion } = parse(z.object({ id_ejercicio: rules.id, confirmacion: z.boolean().optional() }), req.body);
  if (confirmacion !== true) throw errors.confirmationRequired('Confirmá la eliminación del ejercicio');
  await assertCanEdit(req.user, id_ejercicio);
  const enUso = await one(
    `SELECT COUNT(*) AS n FROM routine_exercises re JOIN routines r ON r.id_rutina = re.id_rutina
      WHERE re.id_ejercicio = ? AND r.activo = TRUE`,
    [id_ejercicio]
  );
  if (enUso.n > 0) {
    throw errors.conflict(`No se puede eliminar: el ejercicio se usa en ${enUso.n} rutina(s) activa(s). Quitalo de esas rutinas primero.`);
  }
  // Baja lógica: se conserva para el historial de progreso
  await query('UPDATE exercises SET activo = FALSE WHERE id_ejercicio = ?', [id_ejercicio]);
  return ok(res, { id_ejercicio, eliminado: true });
};
