# MOVA — Entrena. Progresa. Evoluciona.

Aplicación móvil para la gestión integral de un gimnasio, con tres perfiles: **Alumno**, **Entrenador** y **Administrador (dueño)**.

> Proyecto Final de Desarrollo de Aplicaciones Móviles · EEST N°5 · 7.º 4.ª Informática · Soto, Valentina · 2026

| Capa | Tecnología |
|---|---|
| App | React Native + Expo (SDK 58), React Navigation (Stack + Drawer + Tabs), Context API con sesión persistente |
| API | Node.js + Express, **solo método POST**, JWT (acceso + renovación con rotación), bcrypt, zod |
| Base de datos | **MySQL en la nube** (Aiven / Railway / TiDB Cloud), normalizada en 3FN, conexión SSL |
| Extras | Login con Google, Facebook, Apple y GitHub · verificación por email + doble factor · avisos automáticos · manual interactivo + PDF |

---

## 1. Estructura del repositorio

```
mova/
├── backend/
│   ├── database/
│   │   ├── schema.sql          # creación de tablas (3FN)
│   │   ├── seed.sql            # datos de prueba
│   │   └── generate-seed.js    # genera seed.sql (contraseñas con bcrypt)
│   ├── scripts/
│   │   ├── initDb.js           # crea tablas + datos en la base en la nube
│   │   └── smokeTest.js        # prueba automática de 38 casos de la API
│   ├── src/
│   │   ├── config/             # variables de entorno y pool MySQL (SSL)
│   │   ├── middlewares/        # solo-POST, JWT, roles, manejo de errores
│   │   ├── controllers/        # auth, users, admin, exercises, routines, progress, messages, equipment, notifications
│   │   ├── services/           # tokens, email, códigos, OAuth, bloqueos
│   │   ├── jobs/scheduler.js   # avisos preventivos y bloqueos automáticos (diario 08:00)
│   │   ├── routes/index.js     # todos los endpoints
│   │   ├── app.js / server.js
│   └── .env.example
├── mobile/
│   ├── App.js
│   ├── app.json / eas.json     # configuración Expo y build del APK
│   ├── assets/                 # ícono, splash, ícono adaptativo
│   └── src/
│       ├── api/                # cliente HTTP (POST + refresh automático)
│       ├── auth/               # botones de redes sociales
│       ├── components/         # UI, logo, gráficos, encabezado
│       ├── context/            # tema claro/oscuro, sesión, avisos y confirmaciones (sin alerts)
│       ├── navigation/         # Stack + Drawer + Tabs por rol
│       ├── manual/             # contenido del manual (app y PDF)
│       └── screens/            # auth, alumno, entrenador, admin, common
├── design/                     # logo en SVG
└── docs/                       # credenciales, manual PDF
```

---

## 2. Base de datos en la nube (NO local)

Se recomienda **Aiven for MySQL** (plan gratuito, MySQL 8, SSL incluido).

1. Crear cuenta en <https://aiven.io> → **Create service → MySQL → Free plan**.
2. En la página del servicio copiar: *Host*, *Port*, *User* (`avnadmin`), *Password*. Descargar el **CA certificate** (opcional).
3. En `backend/.env` completar `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=mova_db`, `DB_SSL=true`.
4. Ejecutar `npm run db:init` → crea las tablas y carga los datos de prueba en la nube.

Alternativas: **Railway** (copiar la `DATABASE_URL` al `.env`) o **TiDB Cloud Serverless** (compatible con MySQL).

### Diagrama y normalización (3FN)

```
roles 1─N users N─1 users (entrenador asignado)
users 1─N user_social_accounts N─1 auth_providers
users 1─N refresh_tokens | verification_codes | notifications | attendance
users 1─N user_blocks N─1 block_reasons
users 1─N memberships N─1 membership_plans
categories 1─N exercises N─1 muscle_groups
users(entrenador) 1─N routines 1─N routine_exercises N─1 exercises
users(alumno) 1─N assignments N─1 routines
assignments 1─N progress 1─N progress_details N─1 exercises
equipment 1─N equipment_loans N─1 users
messages → users (receptor) | suppliers (distribuidora) | hilo del gimnasio (alumno)
```

- **1FN**: atributos atómicos, sin listas en columnas.
- **2FN**: claves primarias simples → no hay dependencias parciales.
- **3FN**: sin dependencias transitivas. Por ejemplo, el nombre del rol está en `roles`, el grupo muscular en `muscle_groups`; en `progress` **no** se repite el alumno porque se obtiene por `assignments`; el stock disponible del equipamiento **no** se guarda, se calcula a partir de los préstamos.
- Política: los usuarios **nunca se eliminan** (`estado = bloqueado` + historial en `user_blocks`). Ejercicios y rutinas usan baja lógica (`activo = FALSE`) para conservar el historial.

---

## 3. Instalación y ejecución

Requisitos: Node.js 18+ (recomendado 20/22), Git, cuenta en Aiven (o similar) y la app **Expo Go** o un build de desarrollo.

### Backend
```bash
cd backend
npm install
cp .env.example .env      # completar datos de la base en la nube y secretos JWT
npm run db:init           # crea tablas y datos de prueba
npm run dev               # http://localhost:4000
npm test                  # (con el servidor corriendo) 38 pruebas de la API
```

**Deploy gratuito en Render**: New → Web Service → conectar el repo → *Root directory* `backend`, *Build* `npm install`, *Start* `npm start`, cargar las mismas variables del `.env` (con `NODE_ENV=production`). La URL queda tipo `https://mova-api.onrender.com`.

### App móvil
```bash
cd mobile
npm install
cp .env.example .env      # EXPO_PUBLIC_API_URL = URL de Render (o la IP de tu PC: http://192.168.x.x:4000)
npx expo start            # escanear el QR con Expo Go  ·  tecla "w" para abrir en el navegador
```

### Generar el APK (Android)
```bash
npm install -g eas-cli
eas login                              # cuenta gratuita de Expo
cd mobile
# en eas.json → build.preview.env.EXPO_PUBLIC_API_URL poner la URL de Render
eas build -p android --profile preview
```
Al terminar, EAS da un link para descargar el `.apk` listo para instalar.

### Variables de entorno principales (backend)
| Variable | Descripción |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Base MySQL en la nube |
| `DB_SSL=true`, `DB_SSL_CA` | Conexión cifrada (CA opcional) |
| `DATABASE_URL` | Alternativa en una sola URL (Railway) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Secretos largos y aleatorios |
| `SMTP_*`, `MAIL_FROM` | Email para códigos de verificación (Gmail + contraseña de aplicación) |
| `DEV_SHOW_CODES` | En desarrollo sin SMTP muestra el código en la app |
| `GOOGLE_CLIENT_IDS`, `FACEBOOK_APP_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `APPLE_BUNDLE_ID` | Login social |
| `AVISO_DIAS_ANTES`, `GRACIA_CUOTA_DIAS`, `GRACIA_PRESTAMO_DIAS`, `INACTIVIDAD_DIAS` | Reglas de avisos y bloqueos |

### Configurar el inicio con redes sociales
| Proveedor | Dónde se crea | Qué cargar |
|---|---|---|
| **Google** (obligatorio) | Google Cloud Console → Credenciales → ID de cliente OAuth (Web, Android con el SHA-1 de EAS, iOS) | App: `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` · API: `GOOGLE_CLIENT_IDS` |
| **Facebook** | developers.facebook.com → Crear app → Inicio de sesión con Facebook | App: `EXPO_PUBLIC_FACEBOOK_APP_ID` · API: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| **GitHub** | Settings → Developer settings → OAuth Apps (callback `mova://oauth`) | App: `EXPO_PUBLIC_GITHUB_CLIENT_ID` · API: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| **Apple** | Apple Developer (solo iPhone) | `APPLE_BUNDLE_ID=com.eest5.mova` |

La app obtiene el token del proveedor y el **backend lo valida** con Google/Facebook/GitHub/Apple antes de crear la sesión. Los logins sociales funcionan en el APK/build de desarrollo (Expo Go tiene limitaciones con OAuth).

---

## 4. Requisitos del proyecto → cómo se cumplen

| Requisito | Implementación |
|---|---|
| Mobile-first y responsive | Diseño pensado para celular; el contenido se centra con ancho máximo en tablet/web; grillas que pasan de 2 a 3 columnas |
| Login + 3 redes + verificaciones | Email/contraseña (bcrypt), Google, Facebook, Apple, GitHub; verificación de email por código; doble factor opcional; recuperación de contraseña |
| 3 roles | Alumno, Entrenador, Administrador con pestañas, pantallas y permisos propios (validados también en la API) |
| Sin alerts | `FeedbackContext`: toasts y diálogos de confirmación propios; errores debajo de cada campo y banners |
| Solo POST | Todas las rutas son `router.post`; middleware `postOnly` responde **405** a cualquier otro método |
| 3FN | Ver sección 2 |
| Bloqueo en lugar de eliminar | `POST /api/users/status` + bloqueos automáticos (cuota, material, inactividad) + pantalla instructiva |
| Confirmación previa | Diálogo en la app **y** la API exige `confirmacion: true` (si falta responde **428**) |
| Modo claro/oscuro | Automático, claro u oscuro (menú lateral y perfil), con persistencia |
| Manejo de errores | Mensajes por campo (422), códigos HTTP claros, sin conexión / timeout con "Reintentar" |
| Manual | Pantalla interactiva con buscador + botón "Descargar PDF" · `docs/Manual_de_Usuario_MOVA.pdf` |
| Avisos preventivos | Proceso diario del servidor (2 días antes de cuota/revisión) + notificaciones locales en el teléfono |
| Credenciales de prueba | `docs/CREDENCIALES.md` |

---

## 5. Documentación de la API

Base: `https://<tu-servidor>/api` · **Todas las peticiones son `POST`** con `Content-Type: application/json`.
Rutas protegidas: header `Authorization: Bearer <accessToken>`.

**Respuesta exitosa**: `{ "ok": true, "data": ... }`
**Error**: `{ "ok": false, "error": { "code": "...", "message": "...", "fields": { "campo": "mensaje" } } }`

### Códigos de estado
| Código | Significado | `error.code` |
|---|---|---|
| 200 / 201 | OK / creado | — |
| 400 | Solicitud inválida | `BAD_REQUEST`, `CODE_INVALID`, `CODE_EXPIRED` |
| 401 | Sin sesión o credenciales incorrectas | `UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS`, `REFRESH_INVALID` |
| 403 | Sin permisos / cuenta bloqueada | `FORBIDDEN`, `ACCOUNT_BLOCKED` (incluye `block.motivo` e `instrucciones`) |
| 404 | No encontrado | `NOT_FOUND` |
| 405 | Método distinto de POST | `METHOD_NOT_ALLOWED` |
| 409 | Duplicado / en uso | `CONFLICT` |
| 422 | Validación de campos | `VALIDATION_ERROR` + `fields` |
| 428 | Falta confirmar la acción | `CONFIRMATION_REQUIRED` |
| 429 | Demasiados intentos | `TOO_MANY_REQUESTS` |
| 500 / 503 | Error del servidor / base no disponible | `SERVER_ERROR`, `DB_UNAVAILABLE` |

### Autenticación (públicas)
| Endpoint | Body | Respuesta |
|---|---|---|
| `/auth/register` | `nombre, apellido, email, password` | `step: "verify_email", pendingToken` |
| `/auth/login` | `email, password` | `accessToken, refreshToken, user` **o** `step: "verify_email" \| "two_factor", pendingToken` |
| `/auth/verify-email` | `pendingToken, code` | sesión |
| `/auth/verify-2fa` | `pendingToken, code` | sesión |
| `/auth/resend-code` | `pendingToken, purpose` | `sent` |
| `/auth/social` | `provider` (`google\|facebook\|github\|apple`) + `idToken` / `accessToken` / `code, codeVerifier, redirectUri` / `identityToken` | sesión o paso de verificación |
| `/auth/refresh` | `refreshToken` | nuevos `accessToken` y `refreshToken` (rotación) |
| `/auth/logout` | `refreshToken` | `loggedOut` |
| `/auth/forgot-password` | `email` | `pendingToken` |
| `/auth/reset-password` | `pendingToken, code, password` | `reset` |
| `/health` | — | estado de la base |

### Usuarios y administración
| Endpoint | Rol | Body |
|---|---|---|
| `/auth/me`, `/users/profile` | todos | — |
| `/users/update-profile` | todos | `nombre, apellido, telefono, fecha_nacimiento, altura_cm, peso_kg, objetivo` |
| `/users/change-password` | todos | `actual, nueva` |
| `/users/two-factor` | todos | `activo: boolean` |
| `/users/contacts` | todos | — (con quién puede chatear) |
| `/users/list` | Admin (todos) / Entrenador (sus alumnos) | `rol?, estado?, buscar?` |
| `/users/detail` | Admin / Entrenador | `id_usuario` |
| `/users/status` | Admin | `id_usuario, estado: "activo"\|"bloqueado", id_motivo, detalle?, confirmacion: true` |
| `/users/block-reasons` | Admin | — |
| `/admin/roles` | Admin | `accion: "listar"` · `accion: "cambiar", id_usuario, rol, confirmacion: true` |
| `/admin/users/manage` | Admin | `accion: "crear"\|"editar", nombre, apellido, email, rol, password (crear), id_entrenador?` |
| `/admin/trainers` | Admin | — |
| `/admin/memberships` | Admin | `accion: "planes"\|"listar"\|"renovar", id_usuario, id_plan` |
| `/admin/stats` | Admin | — (métricas globales) |
| `/admin/run-jobs` | Admin | — (ejecuta avisos/bloqueos automáticos) |

### Ejercicios y rutinas
| Endpoint | Rol | Body |
|---|---|---|
| `/exercises/list` | todos | `id_categoria?, id_grupo?, dificultad?, buscar?` |
| `/exercises/detail` | todos | `id_ejercicio` |
| `/exercises/manage` | Entrenador (los suyos) / Admin | `accion: "crear"\|"editar"\|"eliminar"`, `nombre, descripcion, recomendacion, fotografia_url, id_categoria, id_grupo, dificultad` · eliminar: `id_ejercicio, confirmacion: true` |
| `/routines/list` | Alumno: asignadas · Staff: todas (`solo_mias?`) | — |
| `/routines/detail` | todos | `id_rutina` |
| `/routines/manage` | Entrenador / Admin | `accion: "crear"\|"editar"` (`nombre_rutina, descripcion, duracion_estimada_min, ejercicios: [{id_ejercicio, series, repeticiones, peso_sugerido_kg, descanso_segundos}]`) · `"eliminar"` (`id_rutina, confirmacion`) · `"asignar"` (`id_rutina, id_alumno, fecha_revision`) · `"desasignar"` (`id_asignacion, confirmacion`) |
| `/routines/assignments` | Entrenador / Admin | — |

### Progreso
| Endpoint | Rol | Body |
|---|---|---|
| `/progress/create` | Alumno | `id_asignacion, duracion_min, frecuencia_cardiaca_prom, frecuencia_cardiaca_max, presion_sistolica, presion_diastolica, peso_kg, esfuerzo_percibido, observaciones, detalles: [...]` |
| `/progress/history` | Alumno (propio) / Entrenador / Admin | `id_alumno?, semanas?` |
| `/progress/detail` | según permisos | `id_progreso` |
| `/progress/summary` | todos | — (panel de inicio según rol) |
| `/progress/checkin` | Alumno | — (asistencia) |

### Mensajes, equipamiento y avisos
| Endpoint | Rol | Body |
|---|---|---|
| `/messages/conversations` | todos | — |
| `/messages/thread` | todos | `tipo: "usuario"\|"gimnasio"\|"proveedor", id` |
| `/messages/send` | todos (proveedor solo Admin) | `tipo, id, contenido` |
| `/messages/suppliers` | Admin | `accion: "listar"\|"crear"\|"editar"` |
| `/equipment/list` | todos | — |
| `/equipment/manage` | Admin | `accion, nombre, descripcion, cantidad_total, estado, prestable` |
| `/equipment/loans` | Alumno: `solicitar`, `cancelar`, `listar` · Admin: `aprobar`, `rechazar`, `devolver` | `id_equipo, cantidad, fecha_devolucion_prevista` / `id_prestamo` |
| `/notifications/list` · `/notifications/read` · `/notifications/upcoming` | todos | `id_notificacion?` |

Ejemplo:
```bash
curl -X POST https://mova-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alumno@mova.app","password":"Alumno123!"}'
```

---

## 6. Seguridad
- Contraseñas con **bcrypt**; códigos de verificación también hasheados (máx. 5 intentos, 10 minutos).
- **JWT** de acceso (15 min) + refresh token opaco (7 días) guardado como hash SHA-256, con **rotación** y detección de reutilización.
- Tokens en el teléfono con **expo-secure-store** (cifrado).
- Consultas parametrizadas (sin inyección SQL), `helmet`, CORS, límite de intentos en login.
- Permisos por rol validados en el servidor (no solo ocultando botones).

## 7. Control de versiones
```bash
git init && git add . && git commit -m "feat: proyecto MOVA inicial"
git remote add origin https://github.com/<usuario>/mova.git && git push -u origin main
```
Sugerencia de commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`.
