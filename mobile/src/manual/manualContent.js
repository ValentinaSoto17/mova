/**
 * Contenido del Manual de Usuario de MOVA.
 * Se usa en la pantalla interactiva de la app y para generar el PDF descargable
 * (también lo usa scripts/build-manual-pdf.js para el PDF entregable).
 */
const general = [
  {
    icon: 'login',
    title: 'Iniciar sesión',
    steps: [
      'Abrí MOVA e ingresá tu email y contraseña. Tocá "Ingresar".',
      'También podés entrar con tu cuenta de Google, GitHub o Discord.',
      'Si es tu primera vez, te enviamos un código de 6 dígitos al email para verificar la cuenta.',
      'Si activaste la verificación en 2 pasos, en cada ingreso te pediremos un código nuevo.',
      'Según tu rol (Alumno, Entrenador o Administrador) la app te lleva a tu perfil.',
    ],
  },
  {
    icon: 'account-plus',
    title: 'Crear una cuenta',
    steps: [
      'En la pantalla de inicio tocá "Registrate".',
      'Completá nombre, apellido, email y una contraseña segura (8 caracteres, mayúscula, minúscula y número).',
      'Ingresá el código que llega a tu email. Las cuentas nuevas se crean como Alumno; el administrador puede cambiar el rol.',
    ],
  },
  {
    icon: 'lock-reset',
    title: 'Olvidé mi contraseña',
    steps: ['Tocá "¿Olvidaste tu contraseña?".', 'Ingresá tu email y luego el código recibido.', 'Elegí una contraseña nueva y volvé a ingresar.'],
  },
  {
    icon: 'menu',
    title: 'Navegar por la app',
    steps: [
      'Abajo encontrás las pestañas principales de tu perfil.',
      'Con el botón ☰ (arriba a la izquierda) abrís el menú lateral con el logo de MOVA: Avisos, Mi perfil, Manual y Cerrar sesión.',
      'El logo de MOVA siempre está arriba a la derecha.',
      'Deslizá hacia abajo en cualquier lista para actualizarla.',
    ],
  },
  {
    icon: 'theme-light-dark',
    title: 'Modo claro / oscuro',
    steps: ['En el menú lateral, sección Apariencia, elegí Auto, Claro u Oscuro.', '"Auto" sigue la configuración de tu teléfono.'],
  },
  {
    icon: 'bell-ring',
    title: 'Avisos automáticos',
    steps: [
      'Dos días antes de que venza tu cuota o de la revisión de tu rutina recibís un aviso.',
      'Los ves en el menú → Avisos y también como notificación del teléfono.',
    ],
  },
  {
    icon: 'account-lock',
    title: 'Cuenta pausada (bloqueada)',
    steps: [
      'MOVA nunca borra tu cuenta. Si hay una cuota vencida, material sin devolver o mucho tiempo sin venir, la cuenta se pausa.',
      'Al intentar ingresar verás el motivo y los pasos para reactivarla.',
      'Cuando regularizás la situación, la administración la reactiva y conservás todo tu historial.',
    ],
  },
  {
    icon: 'shield-check',
    title: 'Confirmaciones y errores',
    steps: [
      'Antes de eliminar o hacer un cambio importante, MOVA te pide confirmar en una ventana propia.',
      'Si un dato está mal, el error aparece en rojo debajo del campo.',
      'Si no hay conexión, verás un aviso con el botón "Reintentar".',
    ],
  },
];

const roles = {
  Alumno: [
    {
      icon: 'home-variant',
      title: 'Inicio',
      steps: [
        'Ves tu semana: sesiones, minutos, calorías y frecuencia cardíaca promedio.',
        'Tu rutina asignada con el botón "Empezar entrenamiento".',
        'Cómo respondió tu cuerpo en la última sesión: frecuencia cardíaca, presión y peso.',
        'Accesos rápidos: registrar asistencia, pedir material y escribir al gimnasio.',
      ],
    },
    {
      icon: 'play-circle',
      title: 'Registrar un entrenamiento',
      steps: [
        'Desde "Rutinas" elegí una y tocá "Empezar".',
        'El cronómetro mide el tiempo total. Marcá cada serie con "Completar serie"; se inicia el descanso.',
        'Anotá el peso que usaste en cada ejercicio.',
        'Al terminar, tocá "Finalizar" e ingresá frecuencia cardíaca, presión arterial, peso y esfuerzo (1 a 10).',
        'Guardá: el entrenamiento queda en tu historial y tu entrenador lo puede ver.',
      ],
    },
    {
      icon: 'dumbbell',
      title: 'Catálogo de ejercicios',
      steps: ['Las tarjetas de colores son las categorías (Fuerza, Cardio, Calistenia, Rehabilitación…).', 'Tocá una para filtrar; usá el buscador o el nivel de dificultad.', 'Cada ejercicio muestra foto, descripción, grupo muscular, dificultad y recomendación de ejecución.'],
    },
    {
      icon: 'chart-line',
      title: 'Progreso e historial',
      steps: ['En "Progreso" ves tus totales y gráficos semana a semana: minutos, corazón, presión y peso.', 'Más abajo, el historial de cada sesión con sus datos.'],
    },
    {
      icon: 'basket',
      title: 'Préstamo de material',
      steps: ['Menú → Préstamo de material.', 'Elegí el elemento, la cantidad y cuándo lo devolvés.', 'La administración aprueba la solicitud y te avisa.'],
    },
    {
      icon: 'message-text',
      title: 'Mensajes',
      steps: ['"Gimnasio MOVA": tu consulta la responde el dueño o un entrenador.', 'También podés escribirle directamente a tu entrenador o a la administración.'],
    },
    {
      icon: 'account-circle',
      title: 'Mi perfil',
      steps: ['Consultá tus datos y tu plan.', 'Tocá "Editar" para modificar teléfono, altura, peso u objetivo.', 'Activá la verificación en 2 pasos o cambiá tu contraseña.'],
    },
  ],
  Entrenador: [
    {
      icon: 'home-variant',
      title: 'Inicio',
      steps: ['Resumen de tus alumnos, sesiones de la semana y rutinas.', 'Revisiones de rutina de los próximos 7 días.', 'Actividad reciente de tus alumnos con frecuencia cardíaca y presión.'],
    },
    {
      icon: 'account-group',
      title: 'Alumnos',
      steps: ['Lista de tus alumnos con su actividad semanal.', 'Tocá uno para ver su ficha, rutinas asignadas y "Ver progreso".', 'Desde la ficha podés asignarle una rutina o quitarle una (con confirmación).'],
    },
    {
      icon: 'clipboard-list',
      title: 'Crear y editar rutinas',
      steps: [
        'En "Rutinas" tocá + para crear una.',
        'Poné nombre, descripción y duración; agregá ejercicios del catálogo.',
        'Para cada ejercicio definí series, repeticiones, peso sugerido y descanso. Ordenalos con las flechas.',
        'Solo podés editar o eliminar las rutinas que creaste. Eliminar pide confirmación.',
      ],
    },
    {
      icon: 'account-arrow-right',
      title: 'Asignar rutinas',
      steps: ['Abrí una rutina y tocá "Asignar".', 'Elegí el alumno y la fecha de revisión.', 'El alumno recibe un aviso y dos días antes de la revisión ambos reciben un recordatorio.'],
    },
    {
      icon: 'dumbbell',
      title: 'Stock de ejercicios',
      steps: ['En "Ejercicios" tocá + para crear uno: nombre, categoría, grupo muscular, dificultad, descripción, recomendación y foto (URL).', 'Podés modificar y eliminar los ejercicios que creaste (con confirmación). Si está en uso en una rutina activa, primero quitalo de la rutina.'],
    },
    {
      icon: 'message-text',
      title: 'Mensajes',
      steps: ['Conversá con el dueño y con tus alumnos.', 'En "Consultas" respondés las preguntas que los alumnos le hacen al gimnasio.'],
    },
  ],
  Administrador: [
    {
      icon: 'view-dashboard',
      title: 'Estadísticas',
      steps: ['Métricas globales: alumnos activos, bloqueados, entrenamientos de la semana, asistencias de los últimos 14 días.', 'Rutinas más completadas, sesiones por entrenador, préstamos y cuotas por vencer.'],
    },
    {
      icon: 'account-cog',
      title: 'Panel de usuarios y entrenadores',
      steps: [
        'Buscá y filtrá por rol o estado.',
        'Creá cuentas nuevas o editá las existentes.',
        'Cambiá el rol (por ejemplo, promover un alumno a entrenador) — se pide confirmación.',
        'Bloqueá o desbloqueá cuentas eligiendo el motivo; nunca se eliminan usuarios.',
      ],
    },
    {
      icon: 'card-account-details',
      title: 'Cuotas y membresías',
      steps: ['Menú → Cuotas: ves los vencimientos ordenados.', 'Registrá un pago eligiendo el plan. Si el alumno estaba bloqueado por cuota, se reactiva automáticamente.'],
    },
    {
      icon: 'package-variant',
      title: 'Stock de equipamiento y préstamos',
      steps: ['Controlá máquinas y elementos: cantidad, estado (operativo, mantenimiento, fuera de servicio) y si se presta.', 'En "Préstamos" aprobá, rechazá o marcá devoluciones.'],
    },
    {
      icon: 'clipboard-pulse',
      title: 'Rutinas y planes realizados',
      steps: ['Supervisá todas las rutinas y las asignaciones activas con su cantidad de sesiones.', 'También podés gestionar ejercicios y rutinas.'],
    },
    {
      icon: 'truck-delivery',
      title: 'Mensajes a distribuidoras',
      steps: ['En Mensajes → Nuevo mensaje → Distribuidoras elegí el proveedor.', 'El pedido se guarda en MOVA y se envía también al email del proveedor.', 'Podés agregar nuevas distribuidoras desde la misma pantalla.'],
    },
  ],
};

const credentials = [
  { rol: 'Administrador', email: 'admin@mova.app', password: 'Admin123!' },
  { rol: 'Entrenador', email: 'entrenador@mova.app', password: 'Entrenador123!' },
  { rol: 'Alumno', email: 'alumno@mova.app', password: 'Alumno123!' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function section(s) {
  return `<div class="sec"><h3>${esc(s.title)}</h3><ol>${s.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>`;
}

/** HTML imprimible del manual (todas las secciones o solo un rol). */
function buildManualHtml(role) {
  const rolesToShow = role ? [role] : Object.keys(roles);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Manual de usuario - MOVA</title>
<style>
  @page { margin: 22mm 18mm; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #17152B; line-height: 1.5; font-size: 12.5px; }
  .cover { text-align: center; padding: 60px 0 40px; border-bottom: 3px solid #5B4BFF; margin-bottom: 24px; }
  .cover h1 { font-size: 40px; letter-spacing: 8px; margin: 0; color: #5B4BFF; }
  .cover p { color: #6E6B85; margin: 6px 0; }
  h2 { color: #5B4BFF; border-bottom: 1px solid #E6E3F1; padding-bottom: 6px; margin-top: 28px; page-break-after: avoid; }
  h3 { margin: 0 0 6px; font-size: 14px; }
  .sec { background: #F6F5FB; border-radius: 10px; padding: 12px 16px; margin: 10px 0; page-break-inside: avoid; }
  ol { margin: 0; padding-left: 20px; } li { margin: 3px 0; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; } td, th { border: 1px solid #E6E3F1; padding: 6px 10px; text-align: left; }
  th { background: #ECE9FF; }
  .foot { margin-top: 30px; color: #9A97B0; font-size: 11px; text-align: center; }
</style></head><body>
<div class="cover"><h1>MOVA</h1><p><b>Entrena. Progresa. Evoluciona.</b></p><p>Manual de usuario${role ? ` — Perfil ${esc(role)}` : ''}</p>
<p>EEST N°5 · 7.º 4.ª Informática · 2026</p></div>
<h2>Uso general</h2>${general.map(section).join('')}
${rolesToShow.map((r) => `<h2>Perfil ${esc(r)}</h2>${roles[r].map(section).join('')}`).join('')}
<h2>Cuentas de prueba</h2><table><tr><th>Rol</th><th>Email</th><th>Contraseña</th></tr>
${credentials.map((c) => `<tr><td>${c.rol}</td><td>${c.email}</td><td>${c.password}</td></tr>`).join('')}</table>
<p class="foot">MOVA · Proyecto final de Desarrollo de Aplicaciones Móviles · Soto, Valentina</p>
</body></html>`;
}

module.exports = { general, roles, credentials, buildManualHtml };