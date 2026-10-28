/**
 * Prueba rápida de la API (con el servidor corriendo):  npm test
 * Variable opcional API_URL (por defecto http://localhost:4000)
 */
const API = process.env.API_URL || 'http://localhost:4000';
let pass = 0;
let fail = 0;

async function call(path, body = {}, token, method = 'POST') {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function check(name, cond, info = '') {
  if (cond) { pass += 1; console.log(`  ✔ ${name}`); } else { fail += 1; console.log(`  ✘ ${name} ${info}`); }
}

async function login(email, password) {
  const r = await call('/api/auth/login', { email, password });
  return r.json.data?.accessToken;
}

(async () => {
  console.log(`Probando ${API}\n`);
  const h = await call('/api/health');
  check('health conecta con la base', h.status === 200, JSON.stringify(h.json));

  const g = await call('/api/exercises/list', {}, null, 'GET');
  check('GET rechazado con 405', g.status === 405);

  const bad = await call('/api/auth/login', { email: 'admin@mova.app', password: 'mal' });
  check('login con clave incorrecta => 401', bad.status === 401 && bad.json.error.code === 'INVALID_CREDENTIALS');

  const val = await call('/api/auth/login', { email: 'no-es-email', password: '' });
  check('validación de campos => 422 con errores por campo', val.status === 422 && val.json.error.fields?.email);

  const blocked = await call('/api/auth/login', { email: 'tomas.acosta@mova.app', password: 'Alumno123!' });
  check('usuario bloqueado => 403 con instrucciones', blocked.status === 403 && blocked.json.error.block?.instrucciones);

  const admin = await login('admin@mova.app', 'Admin123!');
  const trainer = await login('entrenador@mova.app', 'Entrenador123!');
  const student = await login('alumno@mova.app', 'Alumno123!');
  check('login de los 3 roles', admin && trainer && student);

  const noAuth = await call('/api/routines/list');
  check('sin token => 401', noAuth.status === 401);

  const forb = await call('/api/admin/stats', {}, student);
  check('alumno no entra al panel admin => 403', forb.status === 403);

  const ex = await call('/api/exercises/list', {}, student);
  check('catálogo de ejercicios', ex.json.data?.ejercicios?.length > 10 && ex.json.data.categorias.length === 6);

  const rl = await call('/api/routines/list', {}, student);
  check('rutinas asignadas del alumno', rl.json.data?.length === 2);

  const det = await call('/api/routines/detail', { id_rutina: rl.json.data[0].id_rutina }, student);
  check('detalle de rutina con ejercicios', det.json.data?.ejercicios?.length > 0);

  const pr = await call('/api/progress/create', {
    id_asignacion: rl.json.data[0].id_asignacion, duracion_min: 48, frecuencia_cardiaca_prom: 125, frecuencia_cardiaca_max: 150,
    presion_sistolica: 120, presion_diastolica: 78, esfuerzo_percibido: 7,
    detalles: det.json.data.ejercicios.map((e) => ({ id_ejercicio: e.id_ejercicio, series_realizadas: e.series, repeticiones_realizadas: 10 })),
  }, student);
  check('registrar entrenamiento', pr.status === 201, JSON.stringify(pr.json));

  const hist = await call('/api/progress/history', {}, student);
  check('historial semanal', hist.json.data?.semanal?.length > 0 && hist.json.data.sesiones.length > 0);

  const sum = await call('/api/progress/summary', {}, student);
  check('resumen del alumno', sum.status === 200 && sum.json.data.semana);

  const st = await call('/api/admin/stats', {}, admin);
  check('estadísticas del admin', st.status === 200 && st.json.data.usuarios.alumnos >= 6);

  const tsum = await call('/api/progress/summary', {}, trainer);
  check('resumen del entrenador', tsum.status === 200 && tsum.json.data.alumnos.total >= 1);

  const cr = await call('/api/exercises/manage', { accion: 'crear', nombre: 'Prueba', descripcion: 'Ejercicio de prueba automática', id_categoria: 1, id_grupo: 1, dificultad: 'Principiante' }, trainer);
  check('entrenador crea ejercicio', cr.status === 201);
  const delNo = await call('/api/exercises/manage', { accion: 'eliminar', id_ejercicio: cr.json.data.id_ejercicio }, trainer);
  check('eliminar sin confirmación => 428', delNo.status === 428);
  const delOk = await call('/api/exercises/manage', { accion: 'eliminar', id_ejercicio: cr.json.data.id_ejercicio, confirmacion: true }, trainer);
  check('eliminar con confirmación', delOk.status === 200);

  const rc = await call('/api/routines/manage', { accion: 'crear', nombre_rutina: 'Rutina test', duracion_estimada_min: 30, ejercicios: [{ id_ejercicio: 13, series: 3, repeticiones: '12', descanso_segundos: 60 }] }, trainer);
  check('crear rutina', rc.status === 201);
  const as = await call('/api/routines/manage', { accion: 'asignar', id_rutina: rc.json.data.id_rutina, id_alumno: 5, fecha_revision: new Date(Date.now() + 864e6).toISOString().slice(0, 10) }, trainer);
  check('asignar rutina a alumno propio', as.status === 201, JSON.stringify(as.json));
  const asNo = await call('/api/routines/manage', { accion: 'asignar', id_rutina: rc.json.data.id_rutina, id_alumno: 6, fecha_revision: '2030-01-01' }, trainer);
  check('no puede asignar a alumno ajeno => 403', asNo.status === 403);

  const conv = await call('/api/messages/conversations', {}, student);
  check('conversaciones del alumno (incluye Gimnasio)', conv.json.data?.[0]?.tipo === 'gimnasio' || conv.json.data?.some((c) => c.tipo === 'gimnasio'));
  const send = await call('/api/messages/send', { tipo: 'gimnasio', contenido: 'Consulta de prueba' }, student);
  check('alumno escribe al gimnasio', send.status === 201);
  const reply = await call('/api/messages/send', { tipo: 'gimnasio', id: 4, contenido: 'Respuesta del entrenador' }, trainer);
  check('entrenador responde en el hilo del gimnasio', reply.status === 201);
  const sup = await call('/api/messages/send', { tipo: 'proveedor', id: 2, contenido: 'Pedido de remeras' }, admin);
  check('dueño escribe a distribuidora', sup.status === 201);
  const supNo = await call('/api/messages/send', { tipo: 'proveedor', id: 2, contenido: 'x' }, trainer);
  check('entrenador no escribe a distribuidora => 403', supNo.status === 403);

  const loan = await call('/api/equipment/loans', { accion: 'solicitar', id_equipo: 4, cantidad: 1, fecha_devolucion_prevista: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10) }, student);
  check('alumno solicita préstamo', loan.status === 201, JSON.stringify(loan.json));
  const appr = await call('/api/equipment/loans', { accion: 'aprobar', id_prestamo: loan.json.data?.id_prestamo }, admin);
  check('admin aprueba préstamo', appr.status === 200);

  const blk = await call('/api/users/status', { id_usuario: 5, estado: 'bloqueado', id_motivo: 3 }, admin);
  check('bloquear sin confirmación => 422', blk.status === 422);
  const blk2 = await call('/api/users/status', { id_usuario: 5, estado: 'bloqueado', id_motivo: 3, confirmacion: true }, admin);
  check('bloquear con confirmación', blk2.status === 200);
  const unb = await call('/api/users/status', { id_usuario: 5, estado: 'activo', confirmacion: true }, admin);
  check('desbloquear', unb.status === 200);

  const role = await call('/api/admin/roles', { accion: 'cambiar', id_usuario: 8, rol: 'Entrenador', confirmacion: true }, admin);
  check('admin cambia rol', role.status === 200);
  await call('/api/admin/roles', { accion: 'cambiar', id_usuario: 8, rol: 'Alumno', confirmacion: true }, admin);

  const ren = await call('/api/admin/memberships', { accion: 'renovar', id_usuario: 7, id_plan: 1 }, admin);
  check('registrar pago reactiva al alumno bloqueado por cuota', ren.json.data?.reactivado === true);

  const reg = await call('/api/auth/register', { nombre: 'Nuevo', apellido: 'Alumno', email: `nuevo${Date.now()}@test.com`, password: 'Clave1234' });
  check('registro pide verificar email', reg.status === 201 && reg.json.data.step === 'verify_email');
  if (reg.json.data?.devCode) {
    const v = await call('/api/auth/verify-email', { pendingToken: reg.json.data.pendingToken, code: reg.json.data.devCode });
    check('verificación de email inicia sesión', v.status === 200 && v.json.data.accessToken);
    const refresh = await call('/api/auth/refresh', { refreshToken: v.json.data.refreshToken });
    check('refresh token rota la sesión', refresh.status === 200 && refresh.json.data.refreshToken);
    const reuse = await call('/api/auth/refresh', { refreshToken: v.json.data.refreshToken });
    check('reutilizar refresh viejo => 401', reuse.status === 401);
  }

  console.log(`\n${pass} OK, ${fail} con errores`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
