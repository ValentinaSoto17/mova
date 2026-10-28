/**
 * Genera database/seed.sql con datos de prueba realistas.
 * Uso: npm run db:seed:generate
 * Las fechas se escriben relativas a la fecha de carga (CURDATE()), así la demo
 * siempre muestra el historial de las últimas semanas.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Generador pseudoaleatorio con semilla fija => el seed siempre es igual
let seed = 20261026;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const between = (a, b) => Math.round(a + rnd() * (b - a));
const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

const PASS = {
  admin: bcrypt.hashSync('Admin123!', 10),
  entrenador: bcrypt.hashSync('Entrenador123!', 10),
  alumno: bcrypt.hashSync('Alumno123!', 10),
};

const out = [];
const add = (s) => out.push(s);

add(`-- =====================================================================
--  MOVA - Datos de prueba (generado por database/generate-seed.js)
--  Contraseñas: Admin123!  |  Entrenador123!  |  Alumno123!
-- =====================================================================
USE mova_db;
SET NAMES utf8mb4;
`);

add(`INSERT INTO roles (id_rol, nombre_rol) VALUES (1,'Administrador'),(2,'Entrenador'),(3,'Alumno');`);
add(`INSERT INTO auth_providers (id_proveedor_auth, nombre) VALUES (1,'google'),(2,'facebook'),(3,'github'),(4,'apple');`);

add(`INSERT INTO block_reasons (id_motivo, nombre, instrucciones) VALUES
(1,'Cuota vencida','Tu cuota está vencida. Para reactivar tu cuenta aboná en recepción o por transferencia al alias MOVA.GYM y enviá el comprobante a administracion@mova.app. Tu cuenta se reactiva dentro de las 24 h hábiles.'),
(2,'Material no devuelto','Tenés material del gimnasio pendiente de devolución. Acercate a recepción para devolverlo y tu cuenta se reactivará en el momento.'),
(3,'Inactividad prolongada','Tu cuenta se pausó por inactividad prolongada. Escribinos a administracion@mova.app o acercate a recepción para volver a entrenar con nosotros.'),
(4,'Decisión administrativa','Tu cuenta fue suspendida por la administración. Comunicate con administracion@mova.app para más información.');`);

add(`INSERT INTO membership_plans (id_plan, nombre, precio, duracion_dias) VALUES
(1,'Mensual',25000,30),(2,'Trimestral',67500,90),(3,'Anual',240000,365);`);

// ------------------------------------------------------------------ usuarios
const users = [
  // id, nombre, apellido, email, rol, pass, estado, entrenador, tel, nacimiento, altura, peso, objetivo
  [1, 'Martín', 'Ferreyra', 'admin@mova.app', 1, 'admin', 'activo', null, '+54 11 5555-0101', '1985-04-12', 178, 82, 'Dirigir el gimnasio'],
  [2, 'Lucas', 'Benítez', 'entrenador@mova.app', 2, 'entrenador', 'activo', null, '+54 11 5555-0202', '1992-08-03', 181, 79, 'Entrenador de fuerza y calistenia'],
  [3, 'Camila', 'Ríos', 'camila.rios@mova.app', 2, 'entrenador', 'activo', null, '+54 11 5555-0303', '1995-02-21', 165, 58, 'Entrenadora de cardio y rehabilitación'],
  [4, 'Sofía', 'Gómez', 'alumno@mova.app', 3, 'alumno', 'activo', 2, '+54 11 5555-0404', '2001-11-09', 163, 64.5, 'Ganar fuerza y bajar 4 kg'],
  [5, 'Mateo', 'Fernández', 'mateo.fernandez@mova.app', 3, 'alumno', 'activo', 2, '+54 11 5555-0505', '1999-06-17', 176, 74, 'Dominar la calistenia'],
  [6, 'Julieta', 'Paz', 'julieta.paz@mova.app', 3, 'alumno', 'activo', 3, '+54 11 5555-0606', '1997-01-30', 168, 61, 'Mejorar la resistencia'],
  [7, 'Tomás', 'Acosta', 'tomas.acosta@mova.app', 3, 'alumno', 'bloqueado', 2, '+54 11 5555-0707', '2000-03-14', 183, 88, 'Aumentar masa muscular'],
  [8, 'Martina', 'López', 'martina.lopez@mova.app', 3, 'alumno', 'activo', 3, '+54 11 5555-0808', '1994-09-25', 170, 66, 'Recuperar la rodilla'],
  [9, 'Bruno', 'Díaz', 'bruno.diaz@mova.app', 3, 'alumno', 'bloqueado', 2, '+54 11 5555-0909', '1998-12-02', 179, 80, 'Hipertrofia de tren superior'],
];
add(`INSERT INTO users (id_usuario,nombre,apellido,email,password_hash,id_rol,estado,id_entrenador,telefono,fecha_nacimiento,altura_cm,peso_kg,objetivo,email_verificado,created_at) VALUES\n` +
  users.map((u) => `(${u[0]},${q(u[1])},${q(u[2])},${q(u[3])},${q(PASS[u[5]])},${u[4]},${q(u[6])},${u[7] ?? 'NULL'},${q(u[8])},${q(u[9])},${u[10]},${u[11]},${q(u[12])},TRUE,DATE_SUB(NOW(), INTERVAL ${u[0] >= 7 ? 70 - u[0] * 7 : 120 - u[0]} DAY))`).join(',\n') + ';');

add(`INSERT INTO user_blocks (id_usuario,id_motivo,detalle,bloqueado_por,fecha_bloqueo) VALUES
(7,1,'Cuota mensual impaga hace 12 días',NULL,DATE_SUB(NOW(), INTERVAL 5 DAY)),
(9,2,'Mancuernas de 10 kg no devueltas',1,DATE_SUB(NOW(), INTERVAL 2 DAY));`);

add(`INSERT INTO memberships (id_usuario,id_plan,fecha_inicio,fecha_vencimiento,estado_pago) VALUES
(4,1,DATE_SUB(CURDATE(), INTERVAL 10 DAY),DATE_ADD(CURDATE(), INTERVAL 20 DAY),'pagado'),
(5,2,DATE_SUB(CURDATE(), INTERVAL 40 DAY),DATE_ADD(CURDATE(), INTERVAL 50 DAY),'pagado'),
(6,1,DATE_SUB(CURDATE(), INTERVAL 28 DAY),DATE_ADD(CURDATE(), INTERVAL 2 DAY),'pagado'),
(7,1,DATE_SUB(CURDATE(), INTERVAL 42 DAY),DATE_SUB(CURDATE(), INTERVAL 12 DAY),'pendiente'),
(8,3,DATE_SUB(CURDATE(), INTERVAL 100 DAY),DATE_ADD(CURDATE(), INTERVAL 265 DAY),'pagado'),
(9,1,DATE_SUB(CURDATE(), INTERVAL 20 DAY),DATE_ADD(CURDATE(), INTERVAL 10 DAY),'pagado');`);

// ------------------------------------------------------------- catálogo
add(`INSERT INTO categories (id_categoria,nombre_categoria,descripcion) VALUES
(1,'Fuerza','Ejercicios con cargas externas para ganar fuerza y masa muscular.'),
(2,'Cardio','Trabajo aeróbico para mejorar la resistencia y la salud cardiovascular.'),
(3,'Calistenia','Entrenamiento con el propio peso corporal.'),
(4,'Rehabilitación','Ejercicios suaves y controlados para recuperar lesiones.'),
(5,'Movilidad y Flexibilidad','Rango de movimiento, estiramientos y control articular.'),
(6,'Entrenamiento Funcional','Movimientos globales que trasladan la fuerza a la vida diaria.');`);

add(`INSERT INTO muscle_groups (id_grupo,nombre) VALUES
(1,'Pecho'),(2,'Espalda'),(3,'Piernas'),(4,'Glúteos'),(5,'Hombros'),(6,'Brazos'),(7,'Abdomen y Core'),(8,'Cuerpo completo'),(9,'Sistema cardiovascular');`);

const exercises = [
  // id, nombre, cat, grupo, dificultad, descripción, recomendación
  [1, 'Sentadilla con barra', 1, 3, 'Intermedio', 'Flexión de cadera y rodillas con la barra apoyada sobre los trapecios, bajando hasta que los muslos queden paralelos al piso.', 'Mantené la espalda neutra, el pecho arriba y las rodillas en línea con la punta de los pies. Empujá el piso con todo el pie.'],
  [2, 'Press de banca plano', 1, 1, 'Intermedio', 'Empuje horizontal de la barra acostado en un banco plano, bajándola de forma controlada hasta el pecho.', 'Retraé las escápulas, apoyá bien los pies y bajá la barra a la altura de la línea de los pezones. Pedí ayuda a un compañero con cargas altas.'],
  [3, 'Peso muerto rumano', 1, 4, 'Intermedio', 'Bisagra de cadera con barra o mancuernas, bajando el peso cerca de las piernas hasta sentir el estiramiento de los isquiotibiales.', 'Las rodillas quedan levemente flexionadas y la espalda siempre recta. El movimiento sale de la cadera, no de la zona lumbar.'],
  [4, 'Remo con mancuerna', 1, 2, 'Principiante', 'Tirón unilateral apoyando una rodilla y una mano en el banco, llevando la mancuerna hacia la cadera.', 'Pensá en llevar el codo hacia atrás, no en subir la mano. Evitá girar el torso.'],
  [5, 'Press militar con mancuernas', 1, 5, 'Intermedio', 'Empuje vertical de dos mancuernas desde la altura de los hombros hasta extender los brazos sobre la cabeza.', 'Apretá abdomen y glúteos para no arquear la espalda. Bajá las mancuernas hasta la altura de las orejas.'],
  [6, 'Curl de bíceps con barra', 1, 6, 'Principiante', 'Flexión de codos sosteniendo la barra con agarre supino, manteniendo los codos pegados al cuerpo.', 'No balancees el torso; si necesitás impulso, bajá el peso. Controlá la bajada en 2 segundos.'],
  [7, 'Prensa de piernas', 1, 3, 'Principiante', 'Empuje de la plataforma de la máquina con ambos pies, flexionando y extendiendo rodillas y cadera.', 'No bloquees las rodillas al extender y no despegues la zona lumbar del respaldo.'],
  [8, 'Cinta: trote continuo', 2, 9, 'Principiante', 'Trote a ritmo constante en la cinta, manteniendo una intensidad moderada que permita hablar.', 'Trabajá entre el 60 % y el 75 % de tu frecuencia cardíaca máxima. Hidratate cada 10 minutos.'],
  [9, 'Bicicleta fija por intervalos', 2, 9, 'Intermedio', 'Alternancia de 30 segundos de pedaleo intenso con 90 segundos de pedaleo suave.', 'Ajustá la altura del asiento para que la rodilla quede apenas flexionada abajo. En los picos, subí la resistencia.'],
  [10, 'Salto de soga', 2, 9, 'Principiante', 'Saltos continuos y livianos sobre la punta de los pies mientras la soga gira.', 'Saltá bajo, con las muñecas haciendo el giro y los codos cerca del cuerpo.'],
  [11, 'Remo ergómetro', 2, 8, 'Intermedio', 'Remada en máquina coordinando piernas, tronco y brazos en cada palada.', 'El orden es piernas, tronco, brazos al tirar y al revés al volver. La fuerza principal sale de las piernas.'],
  [12, 'Burpees', 6, 8, 'Avanzado', 'Secuencia de sentadilla, plancha, flexión de brazos y salto vertical encadenados.', 'Priorizá la técnica sobre la velocidad. Si te cuesta, quitá la flexión o el salto.'],
  [13, 'Flexiones de brazos', 3, 1, 'Principiante', 'Empuje del propio cuerpo desde el piso en posición de plancha, bajando el pecho cerca del suelo.', 'Cuerpo alineado de la cabeza a los talones. Si es necesario, apoyá las rodillas.'],
  [14, 'Dominadas', 3, 2, 'Avanzado', 'Tirón vertical colgado de una barra hasta pasar el mentón por encima.', 'Iniciá el movimiento bajando las escápulas. Podés usar una banda elástica como asistencia.'],
  [15, 'Fondos en paralelas', 3, 6, 'Intermedio', 'Descenso y empuje del cuerpo sosteniéndose con los brazos en barras paralelas.', 'Bajá hasta que los codos formen 90°. Inclinarte hacia adelante trabaja más el pecho.'],
  [16, 'Plancha abdominal', 3, 7, 'Principiante', 'Sostén isométrico apoyado en antebrazos y puntas de pie con el cuerpo recto.', 'Apretá glúteos y abdomen, no dejes caer la cadera. Respirá de forma constante.'],
  [17, 'Sentadilla búlgara', 3, 3, 'Intermedio', 'Sentadilla a una pierna con el pie trasero apoyado en un banco.', 'El torso levemente inclinado hacia adelante y la rodilla delantera alineada con el pie.'],
  [18, 'Elevación de pierna recta', 4, 3, 'Principiante', 'Acostado boca arriba, elevación lenta de una pierna extendida hasta 45° activando el cuádriceps.', 'Contraé el muslo antes de subir y mantené la otra rodilla flexionada para cuidar la zona lumbar.'],
  [19, 'Puente de glúteos', 4, 4, 'Principiante', 'Elevación de la cadera desde el piso con las rodillas flexionadas y los pies apoyados.', 'Apretá los glúteos arriba durante 2 segundos sin arquear la espalda.'],
  [20, 'Extensión de rodilla con banda', 4, 3, 'Principiante', 'Sentado, extensión de la rodilla contra la resistencia de una banda elástica.', 'Movimiento lento y sin dolor. Detenete si aparece una molestia punzante.'],
  [21, 'Rotaciones externas de hombro', 4, 5, 'Principiante', 'Con banda elástica y el codo pegado al cuerpo, rotación del antebrazo hacia afuera.', 'Usá una banda liviana; el objetivo es el control, no la carga.'],
  [22, 'Estiramiento de cadena posterior', 5, 3, 'Principiante', 'Flexión de tronco hacia adelante con las piernas extendidas para estirar isquiotibiales y espalda.', 'Mantené 30 segundos sin rebotes y respirá profundo.'],
  [23, 'Movilidad de cadera 90/90', 5, 4, 'Intermedio', 'Sentado con ambas piernas a 90°, rotaciones alternas de cadera de un lado al otro.', 'Mantené el torso erguido y hacé el movimiento lento.'],
  [24, 'Kettlebell swing', 6, 4, 'Intermedio', 'Balanceo de la pesa rusa desde entre las piernas hasta la altura del pecho mediante una extensión explosiva de cadera.', 'La fuerza viene de la cadera, los brazos solo guían. Espalda neutra en todo momento.'],
  [25, 'Zancadas caminando', 6, 3, 'Principiante', 'Pasos largos hacia adelante bajando la rodilla trasera cerca del piso de forma alternada.', 'El paso debe ser lo suficientemente largo para que la rodilla delantera no supere la punta del pie.'],
];
add(`INSERT INTO exercises (id_ejercicio,nombre,id_categoria,id_grupo,dificultad,descripcion,recomendacion,creado_por) VALUES\n` +
  exercises.map((e) => `(${e[0]},${q(e[1])},${e[2]},${e[3]},${q(e[4])},${q(e[5])},${q(e[6])},${[8, 9, 10, 18, 19, 20, 21, 22].includes(e[0]) ? 3 : 2})`).join(',\n') + ';');

// -------------------------------------------------------------- rutinas
const routines = [
  [1, 'Fuerza Total – Nivel Inicial', 'Rutina de cuerpo completo para construir una base de fuerza. Tres veces por semana.', 2, 50, [[1, 4, '10', 40, 90], [2, 4, '10', 30, 90], [4, 3, '12', 12, 60], [5, 3, '10', 8, 60], [16, 3, '40 s', null, 45]]],
  [2, 'Cardio Quema Grasa', 'Intervalos y trabajo aeróbico para mejorar la resistencia y el gasto calórico.', 3, 40, [[8, 1, '15 min', null, 60], [9, 6, '30 s', null, 90], [10, 4, '1 min', null, 45], [25, 3, '20', null, 60]]],
  [3, 'Calistenia Intermedia', 'Progresiones con el peso del cuerpo para ganar control y fuerza relativa.', 2, 45, [[13, 4, '15', null, 60], [14, 4, '6-8', null, 120], [15, 3, '10', null, 90], [17, 3, '10', null, 60], [16, 3, '60 s', null, 45]]],
  [4, 'Rehabilitación de Rodilla', 'Fortalecimiento progresivo y sin impacto para la recuperación de la rodilla.', 3, 35, [[18, 3, '12', null, 45], [20, 3, '15', null, 45], [19, 3, '15', null, 45], [22, 2, '30 s', null, 30]]],
  [5, 'Tren Superior Hipertrofia', 'Volumen alto para pecho, espalda, hombros y brazos.', 2, 60, [[2, 5, '8-10', 50, 120], [4, 4, '10', 20, 90], [5, 4, '10', 14, 90], [6, 3, '12', 25, 60], [15, 3, '12', null, 60]]],
];
add(`INSERT INTO routines (id_rutina,nombre_rutina,descripcion,id_entrenador,duracion_estimada_min) VALUES\n` +
  routines.map((r) => `(${r[0]},${q(r[1])},${q(r[2])},${r[3]},${r[4]})`).join(',\n') + ';');
const re = [];
routines.forEach((r) => r[5].forEach((x, i) => re.push(`(${r[0]},${x[0]},${x[1]},${q(x[2])},${x[3] ?? 'NULL'},${x[4]},${i + 1})`)));
add(`INSERT INTO routine_exercises (id_rutina,id_ejercicio,series,repeticiones,peso_sugerido_kg,descanso_segundos,orden) VALUES\n${re.join(',\n')};`);

const assignments = [
  // id, alumno, rutina, entrenador, asignada hace (días), revisión en (días), estado
  [1, 4, 1, 2, 30, 2, 'activa'],
  [2, 4, 2, 3, 30, 25, 'activa'],
  [3, 5, 3, 2, 35, 10, 'activa'],
  [4, 6, 2, 3, 28, 6, 'activa'],
  [5, 7, 1, 2, 40, -5, 'activa'],
  [6, 8, 4, 3, 30, 3, 'activa'],
  [7, 9, 5, 2, 20, 12, 'activa'],
];
add(`INSERT INTO assignments (id_asignacion,id_alumno,id_rutina,id_entrenador,fecha_asignacion,fecha_revision,estado) VALUES\n` +
  assignments.map((a) => `(${a[0]},${a[1]},${a[2]},${a[3]},DATE_SUB(CURDATE(), INTERVAL ${a[4]} DAY),DATE_ADD(CURDATE(), INTERVAL ${a[5]} DAY),${q(a[6])})`).join(',\n') + ';');

// ------------------------------------------------- progreso (historial)
const progress = [];
const details = [];
const attendance = [];
let pid = 0;
const plan = {
  // asignación: días hacia atrás en los que entrenó
  1: [27, 25, 22, 20, 18, 15, 13, 11, 8, 6, 4, 1],
  2: [26, 23, 19, 16, 12, 9, 5, 2],
  3: [24, 21, 17, 14, 10, 7, 3],
  4: [20, 13, 9, 6, 2],
  5: [38, 35, 31],
  6: [21, 16, 12, 7, 3],
  7: [17, 14, 10, 7],
};
const baseWeight = { 4: 66.2, 5: 74, 6: 61.5, 7: 88, 8: 66.5, 9: 80 };
Object.entries(plan).forEach(([asig, days]) => {
  const a = assignments.find((x) => x[0] === Number(asig));
  const r = routines.find((x) => x[0] === a[2]);
  days.forEach((d, idx) => {
    pid += 1;
    const isCardio = r[0] === 2;
    const fcProm = isCardio ? between(132, 152) : between(108, 128);
    const fcMax = fcProm + between(18, 32);
    const sis = between(112, 132);
    const dia = between(70, 84);
    const dur = r[4] + between(-6, 8);
    const peso = (baseWeight[a[1]] - idx * 0.15 + rnd() * 0.3).toFixed(2);
    const esfuerzo = between(5, 9);
    const cal = Math.round(dur * (isCardio ? 9.5 : 6.8) + between(-20, 30));
    const hour = between(8, 20);
    const obs = [null, 'Muy buena sesión', 'Me costó el último bloque', 'Subí el peso en el primer ejercicio', 'Poco descanso la noche anterior', null][between(0, 5)];
    progress.push(`(${pid},${asig},DATE_ADD(DATE_SUB(CURDATE(), INTERVAL ${d} DAY), INTERVAL ${hour} HOUR),${dur},${fcProm},${fcMax},${sis},${dia},${peso},${esfuerzo},${cal},${q(obs)})`);
    attendance.push(`(${a[1]},DATE_ADD(DATE_SUB(CURDATE(), INTERVAL ${d} DAY), INTERVAL ${hour} HOUR))`);
    r[5].forEach((x) => {
      const reps = parseInt(x[2], 10);
      const w = x[3] ? (x[3] + Math.floor(idx / 3) * 2.5).toFixed(2) : 'NULL';
      details.push(`(${pid},${x[0]},${x[1]},${Number.isNaN(reps) ? 'NULL' : reps},${w},${rnd() > 0.08 ? 'TRUE' : 'FALSE'})`);
    });
  });
});
add(`INSERT INTO progress (id_progreso,id_asignacion,fecha,duracion_min,frecuencia_cardiaca_prom,frecuencia_cardiaca_max,presion_sistolica,presion_diastolica,peso_kg,esfuerzo_percibido,calorias,observaciones) VALUES\n${progress.join(',\n')};`);
add(`INSERT INTO progress_details (id_progreso,id_ejercicio,series_realizadas,repeticiones_realizadas,peso_kg,completado) VALUES\n${details.join(',\n')};`);
add(`INSERT INTO attendance (id_usuario,fecha_hora) VALUES\n${attendance.join(',\n')};`);

// ------------------------------------------------------ equipamiento
add(`INSERT INTO equipment (id_equipo,nombre,descripcion,cantidad_total,estado,prestable) VALUES
(1,'Mancuernas 10 kg (par)','Par de mancuernas hexagonales de goma',10,'operativo',TRUE),
(2,'Bandas elásticas','Set de bandas de resistencia liviana, media y fuerte',15,'operativo',TRUE),
(3,'Colchonetas','Colchonetas de 1,5 cm para piso',25,'operativo',TRUE),
(4,'Sogas de saltar','Sogas de velocidad con rulemanes',10,'operativo',TRUE),
(5,'Kettlebells 12 kg','Pesas rusas de hierro fundido',8,'operativo',TRUE),
(6,'Cintas de correr','Cinta motorizada con inclinación',6,'operativo',FALSE),
(7,'Bicicletas fijas','Bicicleta de spinning con resistencia magnética',8,'operativo',FALSE),
(8,'Rack de sentadillas','Rack con barra olímpica y discos',3,'operativo',FALSE),
(9,'Bancos planos','Banco plano reforzado',5,'operativo',FALSE),
(10,'Remo ergómetro','Máquina de remo de aire',2,'mantenimiento',FALSE),
(11,'Prensa de piernas','Prensa inclinada 45°',1,'fuera_de_servicio',FALSE);`);

add(`INSERT INTO equipment_loans (id_equipo,id_alumno,cantidad,fecha_solicitud,fecha_devolucion_prevista,fecha_devolucion,estado,gestionado_por) VALUES
(3,4,1,DATE_SUB(NOW(), INTERVAL 3 DAY),DATE_ADD(CURDATE(), INTERVAL 4 DAY),NULL,'aprobado',1),
(2,8,1,DATE_SUB(NOW(), INTERVAL 5 HOUR),DATE_ADD(CURDATE(), INTERVAL 7 DAY),NULL,'pendiente',NULL),
(4,6,1,DATE_SUB(NOW(), INTERVAL 1 DAY),DATE_ADD(CURDATE(), INTERVAL 6 DAY),NULL,'pendiente',NULL),
(1,9,1,DATE_SUB(NOW(), INTERVAL 20 DAY),DATE_SUB(CURDATE(), INTERVAL 10 DAY),NULL,'aprobado',1),
(5,5,1,DATE_SUB(NOW(), INTERVAL 15 DAY),DATE_SUB(CURDATE(), INTERVAL 8 DAY),DATE_SUB(NOW(), INTERVAL 9 DAY),'devuelto',1);`);

add(`INSERT INTO suppliers (id_proveedor,nombre,rubro,email,telefono) VALUES
(1,'FitEquip Argentina','Equipamiento y máquinas','ventas@fitequip.example','+54 11 4000-1111'),
(2,'SportWear Sur','Indumentaria deportiva','pedidos@sportwearsur.example','+54 11 4000-2222'),
(3,'NutriMax Distribuidora','Suplementos e hidratación','contacto@nutrimax.example','+54 11 4000-3333');`);

add(`INSERT INTO messages (id_emisor,id_receptor,id_proveedor,id_hilo_gimnasio,contenido,leido,fecha_envio) VALUES
(4,NULL,NULL,4,'Hola! ¿El sábado el gimnasio abre en horario normal?',TRUE,DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1,NULL,NULL,4,'Hola Sofía, el sábado abrimos de 9 a 14 h. ¡Te esperamos!',TRUE,DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 40 MINUTE),
(4,2,NULL,NULL,'Profe, en la sentadilla siento la rodilla un poco. ¿Bajo el peso?',TRUE,DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2,4,NULL,NULL,'Sí, bajá a 35 kg esta semana y enfocate en que la rodilla siga la línea del pie. El jueves lo revisamos juntos.',FALSE,DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 2 HOUR),
(2,1,NULL,NULL,'Martín, el remo ergómetro hace ruido en la cadena. Lo pasé a mantenimiento.',TRUE,DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1,2,NULL,NULL,'Perfecto Lucas, ya pedí el repuesto a FitEquip.',FALSE,DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 30 MINUTE),
(1,NULL,1,NULL,'Buenos días, necesitamos una cadena de repuesto para remo ergómetro modelo AirRow 2. ¿Tienen stock?',FALSE,DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 25 MINUTE),
(6,NULL,NULL,6,'¿Puedo cambiar mi plan mensual a trimestral?',FALSE,DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(3,1,NULL,NULL,'Te paso la planilla de asistencia de la clase de cardio de esta semana.',FALSE,DATE_SUB(NOW(), INTERVAL 6 HOUR));`);

add(`INSERT INTO notifications (id_usuario,tipo,titulo,mensaje,leida,clave_unica,fecha) VALUES
(4,'revision_rutina','Revisión de rutina en 2 días','Tu rutina "Fuerza Total – Nivel Inicial" se revisa en 2 días con Lucas Benítez.',FALSE,NULL,DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(4,'mensaje','Nuevo mensaje de tu entrenador','Lucas Benítez respondió tu consulta.',FALSE,NULL,DATE_SUB(NOW(), INTERVAL 1 DAY)),
(6,'vencimiento_cuota','Tu cuota vence en 2 días','Renová tu plan Mensual antes del vencimiento para seguir entrenando sin interrupciones.',FALSE,NULL,DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(1,'prestamo','Nuevas solicitudes de préstamo','Hay 2 solicitudes de material pendientes de aprobación.',FALSE,NULL,DATE_SUB(NOW(), INTERVAL 3 HOUR));`);

fs.writeFileSync(path.join(__dirname, 'seed.sql'), out.join('\n\n') + '\n');
console.log(`seed.sql generado: ${progress.length} entrenamientos, ${details.length} detalles.`);
