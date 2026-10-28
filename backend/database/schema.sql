-- =====================================================================
--  MOVA - Base de datos relacional normalizada en Tercera Forma Normal (3FN)
--  Motor: MySQL 8 (en la nube: Aiven / Railway / TiDB Cloud / PlanetScale)
--  EEST N°5 - 7.º 4.ª Informática - Soto, Valentina - 2026
-- =====================================================================
--  Criterios de normalización aplicados:
--   1FN: todos los atributos son atómicos (no hay listas en una columna).
--   2FN: todas las tablas tienen clave primaria simple (id autoincremental),
--        por lo que no existen dependencias parciales.
--   3FN: ningún atributo no clave depende de otro atributo no clave.
--        Ej.: el nombre del rol vive en `roles`, no en `users`; el grupo
--        muscular vive en `muscle_groups`; el alumno de un registro de
--        progreso se obtiene a través de `assignments` (no se repite).
--        Los valores calculables (stock disponible, % de asistencia) no se
--        guardan, se calculan con consultas.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS mova_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mova_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS attendance, notifications, messages, suppliers,
  equipment_loans, equipment, progress_details, progress, assignments,
  routine_exercises, routines, exercises, muscle_groups, categories,
  memberships, membership_plans, user_blocks, block_reasons,
  verification_codes, refresh_tokens, user_social_accounts, auth_providers,
  users, roles;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Usuarios, roles y autenticación
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  id_rol      TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_rol  VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE users (
  id_usuario        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre            VARCHAR(60)  NOT NULL,
  apellido          VARCHAR(60)  NOT NULL,
  email             VARCHAR(120) NOT NULL UNIQUE,
  password_hash     VARCHAR(100) NULL,             -- NULL si solo usa red social
  id_rol            TINYINT UNSIGNED NOT NULL,
  estado            ENUM('activo','bloqueado') NOT NULL DEFAULT 'activo',
  telefono          VARCHAR(30)  NULL,
  fecha_nacimiento  DATE         NULL,
  altura_cm         SMALLINT UNSIGNED NULL,
  peso_kg           DECIMAL(5,2) NULL,
  objetivo          VARCHAR(150) NULL,
  avatar_url        VARCHAR(500) NULL,
  id_entrenador     INT UNSIGNED NULL,             -- entrenador asignado (solo alumnos)
  email_verificado  BOOLEAN NOT NULL DEFAULT FALSE,
  doble_factor      BOOLEAN NOT NULL DEFAULT FALSE,
  ultimo_acceso     DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol),
  CONSTRAINT fk_users_entrenador FOREIGN KEY (id_entrenador) REFERENCES users(id_usuario) ON DELETE SET NULL,
  INDEX idx_users_rol (id_rol),
  INDEX idx_users_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE auth_providers (
  id_proveedor_auth  TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre             VARCHAR(30) NOT NULL UNIQUE      -- google, facebook, github, apple
) ENGINE=InnoDB;

CREATE TABLE user_social_accounts (
  id_cuenta_social   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT UNSIGNED NOT NULL,
  id_proveedor_auth  TINYINT UNSIGNED NOT NULL,
  provider_user_id   VARCHAR(191) NOT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_social (id_proveedor_auth, provider_user_id),
  CONSTRAINT fk_social_user FOREIGN KEY (id_usuario) REFERENCES users(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_social_prov FOREIGN KEY (id_proveedor_auth) REFERENCES auth_providers(id_proveedor_auth)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  id_token    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario  INT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,              -- SHA-256 del refresh token
  expires_at  DATETIME NOT NULL,
  revocado    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rt_user FOREIGN KEY (id_usuario) REFERENCES users(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE verification_codes (
  id_codigo   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario  INT UNSIGNED NOT NULL,
  tipo        ENUM('verificacion_email','doble_factor','recuperacion') NOT NULL,
  code_hash   VARCHAR(100) NOT NULL,                 -- bcrypt del código de 6 dígitos
  intentos    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  usado       BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vc_user FOREIGN KEY (id_usuario) REFERENCES users(id_usuario) ON DELETE CASCADE,
  INDEX idx_vc_user_tipo (id_usuario, tipo)
) ENGINE=InnoDB;

-- Motivos de bloqueo con las instrucciones que se muestran en pantalla
CREATE TABLE block_reasons (
  id_motivo     TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(60)  NOT NULL UNIQUE,
  instrucciones VARCHAR(500) NOT NULL
) ENGINE=InnoDB;

-- Historial de bloqueos (nunca se eliminan usuarios)
CREATE TABLE user_blocks (
  id_bloqueo        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario        INT UNSIGNED NOT NULL,
  id_motivo         TINYINT UNSIGNED NOT NULL,
  detalle           VARCHAR(255) NULL,
  bloqueado_por     INT UNSIGNED NULL,               -- NULL = bloqueo automático del sistema
  fecha_bloqueo     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_desbloqueo  DATETIME NULL,
  CONSTRAINT fk_ub_user FOREIGN KEY (id_usuario) REFERENCES users(id_usuario),
  CONSTRAINT fk_ub_motivo FOREIGN KEY (id_motivo) REFERENCES block_reasons(id_motivo),
  CONSTRAINT fk_ub_admin FOREIGN KEY (bloqueado_por) REFERENCES users(id_usuario) ON DELETE SET NULL,
  INDEX idx_ub_activo (id_usuario, fecha_desbloqueo)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Membresías / cuotas
-- ---------------------------------------------------------------------
CREATE TABLE membership_plans (
  id_plan        TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(60) NOT NULL UNIQUE,
  precio         DECIMAL(10,2) NOT NULL,
  duracion_dias  SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB;

CREATE TABLE memberships (
  id_membresia       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT UNSIGNED NOT NULL,
  id_plan            TINYINT UNSIGNED NOT NULL,
  fecha_inicio       DATE NOT NULL,
  fecha_vencimiento  DATE NOT NULL,
  estado_pago        ENUM('pagado','pendiente') NOT NULL DEFAULT 'pagado',
  CONSTRAINT fk_mem_user FOREIGN KEY (id_usuario) REFERENCES users(id_usuario),
  CONSTRAINT fk_mem_plan FOREIGN KEY (id_plan) REFERENCES membership_plans(id_plan),
  INDEX idx_mem_venc (fecha_vencimiento)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Ejercicios y rutinas
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id_categoria      TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_categoria  VARCHAR(60)  NOT NULL UNIQUE,
  descripcion       VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE muscle_groups (
  id_grupo  TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE exercises (
  id_ejercicio    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  descripcion     TEXT NOT NULL,
  recomendacion   TEXT NULL,                          -- recomendación técnica de ejecución
  fotografia_url  VARCHAR(500) NULL,
  id_categoria    TINYINT UNSIGNED NOT NULL,
  id_grupo        TINYINT UNSIGNED NOT NULL,
  dificultad      ENUM('Principiante','Intermedio','Avanzado') NOT NULL DEFAULT 'Principiante',
  creado_por      INT UNSIGNED NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ex_cat FOREIGN KEY (id_categoria) REFERENCES categories(id_categoria),
  CONSTRAINT fk_ex_grupo FOREIGN KEY (id_grupo) REFERENCES muscle_groups(id_grupo),
  CONSTRAINT fk_ex_user FOREIGN KEY (creado_por) REFERENCES users(id_usuario) ON DELETE SET NULL,
  INDEX idx_ex_cat (id_categoria)
) ENGINE=InnoDB;

CREATE TABLE routines (
  id_rutina              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_rutina          VARCHAR(100) NOT NULL,
  descripcion            VARCHAR(500) NULL,
  id_entrenador          INT UNSIGNED NOT NULL,       -- autor de la rutina
  duracion_estimada_min  SMALLINT UNSIGNED NOT NULL DEFAULT 45,
  activo                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rut_entrenador FOREIGN KEY (id_entrenador) REFERENCES users(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE routine_exercises (
  id_detalle         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_rutina          INT UNSIGNED NOT NULL,
  id_ejercicio       INT UNSIGNED NOT NULL,
  series             TINYINT UNSIGNED NOT NULL DEFAULT 3,
  repeticiones       VARCHAR(20) NOT NULL DEFAULT '12',   -- admite "10-12" o "30 s"
  peso_sugerido_kg   DECIMAL(5,2) NULL,
  descanso_segundos  SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  orden              TINYINT UNSIGNED NOT NULL DEFAULT 1,
  CONSTRAINT fk_re_rut FOREIGN KEY (id_rutina) REFERENCES routines(id_rutina) ON DELETE CASCADE,
  CONSTRAINT fk_re_ex FOREIGN KEY (id_ejercicio) REFERENCES exercises(id_ejercicio),
  UNIQUE KEY uq_rutina_orden (id_rutina, orden)
) ENGINE=InnoDB;

CREATE TABLE assignments (
  id_asignacion     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_alumno         INT UNSIGNED NOT NULL,
  id_rutina         INT UNSIGNED NOT NULL,
  id_entrenador     INT UNSIGNED NOT NULL,            -- quien asignó (puede no ser el autor)
  fecha_asignacion  DATE NOT NULL,
  fecha_revision    DATE NULL,                        -- dispara avisos preventivos
  estado            ENUM('activa','finalizada','cancelada') NOT NULL DEFAULT 'activa',
  CONSTRAINT fk_as_alumno FOREIGN KEY (id_alumno) REFERENCES users(id_usuario),
  CONSTRAINT fk_as_rut FOREIGN KEY (id_rutina) REFERENCES routines(id_rutina),
  CONSTRAINT fk_as_ent FOREIGN KEY (id_entrenador) REFERENCES users(id_usuario),
  INDEX idx_as_alumno (id_alumno, estado)
) ENGINE=InnoDB;

-- Registro de un entrenamiento realizado (el alumno se obtiene por la asignación)
CREATE TABLE progress (
  id_progreso                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_asignacion              INT UNSIGNED NOT NULL,
  fecha                      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duracion_min               SMALLINT UNSIGNED NOT NULL,
  frecuencia_cardiaca_prom   SMALLINT UNSIGNED NULL,   -- ppm
  frecuencia_cardiaca_max    SMALLINT UNSIGNED NULL,   -- ppm
  presion_sistolica          SMALLINT UNSIGNED NULL,   -- mmHg
  presion_diastolica         SMALLINT UNSIGNED NULL,   -- mmHg
  peso_kg                    DECIMAL(5,2) NULL,
  esfuerzo_percibido         TINYINT UNSIGNED NULL,    -- escala 1 a 10
  calorias                   SMALLINT UNSIGNED NULL,
  observaciones              VARCHAR(500) NULL,
  CONSTRAINT fk_pr_as FOREIGN KEY (id_asignacion) REFERENCES assignments(id_asignacion),
  CONSTRAINT chk_esfuerzo CHECK (esfuerzo_percibido IS NULL OR esfuerzo_percibido BETWEEN 1 AND 10),
  INDEX idx_pr_fecha (fecha)
) ENGINE=InnoDB;

-- Detalle por ejercicio de cada entrenamiento
CREATE TABLE progress_details (
  id_detalle_progreso      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_progreso              INT UNSIGNED NOT NULL,
  id_ejercicio             INT UNSIGNED NOT NULL,
  series_realizadas        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  repeticiones_realizadas  SMALLINT UNSIGNED NULL,
  peso_kg                  DECIMAL(5,2) NULL,
  completado               BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_pd_pr FOREIGN KEY (id_progreso) REFERENCES progress(id_progreso) ON DELETE CASCADE,
  CONSTRAINT fk_pd_ex FOREIGN KEY (id_ejercicio) REFERENCES exercises(id_ejercicio)
) ENGINE=InnoDB;

CREATE TABLE attendance (
  id_asistencia  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario     INT UNSIGNED NOT NULL,
  fecha_hora     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_at_user FOREIGN KEY (id_usuario) REFERENCES users(id_usuario),
  INDEX idx_at_fecha (fecha_hora)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Equipamiento y préstamos
-- ---------------------------------------------------------------------
CREATE TABLE equipment (
  id_equipo       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  descripcion     VARCHAR(255) NULL,
  cantidad_total  SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  estado          ENUM('operativo','mantenimiento','fuera_de_servicio') NOT NULL DEFAULT 'operativo',
  prestable       BOOLEAN NOT NULL DEFAULT FALSE,     -- si el alumno puede pedirlo prestado
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE equipment_loans (
  id_prestamo                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_equipo                  INT UNSIGNED NOT NULL,
  id_alumno                  INT UNSIGNED NOT NULL,
  cantidad                   SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  fecha_solicitud            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_devolucion_prevista  DATE NOT NULL,
  fecha_devolucion           DATETIME NULL,
  estado                     ENUM('pendiente','aprobado','rechazado','devuelto') NOT NULL DEFAULT 'pendiente',
  gestionado_por             INT UNSIGNED NULL,
  CONSTRAINT fk_ln_eq FOREIGN KEY (id_equipo) REFERENCES equipment(id_equipo),
  CONSTRAINT fk_ln_al FOREIGN KEY (id_alumno) REFERENCES users(id_usuario),
  CONSTRAINT fk_ln_adm FOREIGN KEY (gestionado_por) REFERENCES users(id_usuario) ON DELETE SET NULL,
  INDEX idx_ln_estado (estado)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Comunicación
-- ---------------------------------------------------------------------
CREATE TABLE suppliers (
  id_proveedor  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  rubro         VARCHAR(100) NOT NULL,                -- equipamiento, indumentaria, suplementos...
  email         VARCHAR(120) NOT NULL,
  telefono      VARCHAR(30)  NULL
) ENGINE=InnoDB;

-- Un mensaje tiene exactamente UN destino:
--   * id_receptor       -> mensaje directo a un usuario
--   * id_proveedor      -> mensaje del dueño a una distribuidora
--   * id_hilo_gimnasio  -> hilo "Alumno ↔ Gimnasio" del alumno indicado; lo
--                          pueden leer y responder el dueño y los entrenadores.
CREATE TABLE messages (
  id_mensaje        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_emisor         INT UNSIGNED NOT NULL,
  id_receptor       INT UNSIGNED NULL,
  id_proveedor      INT UNSIGNED NULL,
  id_hilo_gimnasio  INT UNSIGNED NULL,
  contenido         VARCHAR(1000) NOT NULL,
  leido             BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_envio       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_em FOREIGN KEY (id_emisor) REFERENCES users(id_usuario),
  CONSTRAINT fk_msg_re FOREIGN KEY (id_receptor) REFERENCES users(id_usuario),
  CONSTRAINT fk_msg_pr FOREIGN KEY (id_proveedor) REFERENCES suppliers(id_proveedor),
  CONSTRAINT fk_msg_hilo FOREIGN KEY (id_hilo_gimnasio) REFERENCES users(id_usuario),
  CONSTRAINT chk_msg_destino CHECK (
    (id_receptor IS NOT NULL) + (id_proveedor IS NOT NULL) + (id_hilo_gimnasio IS NOT NULL) = 1
  ),
  INDEX idx_msg_receptor (id_receptor, leido),
  INDEX idx_msg_emisor (id_emisor),
  INDEX idx_msg_hilo (id_hilo_gimnasio)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id_notificacion  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario       INT UNSIGNED NOT NULL,
  tipo             ENUM('vencimiento_cuota','revision_rutina','bloqueo','mensaje','prestamo','sistema') NOT NULL,
  titulo           VARCHAR(120) NOT NULL,
  mensaje          VARCHAR(500) NOT NULL,
  leida            BOOLEAN NOT NULL DEFAULT FALSE,
  clave_unica      VARCHAR(120) NULL UNIQUE,          -- evita avisos duplicados del proceso automático
  fecha            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_nt_user FOREIGN KEY (id_usuario) REFERENCES users(id_usuario),
  INDEX idx_nt_user (id_usuario, leida)
) ENGINE=InnoDB;
