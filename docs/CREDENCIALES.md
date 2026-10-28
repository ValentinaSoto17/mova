# MOVA — Credenciales de prueba

| Rol | Nombre | Email | Contraseña | Estado / qué probar |
|---|---|---|---|---|
| Administrador | Martín Ferreyra | admin@mova.app | Admin123! | Panel, usuarios, roles, stock, cuotas, distribuidoras |
| Entrenador | Lucas Benítez | entrenador@mova.app | Entrenador123! | 4 alumnos, rutinas, ejercicios |
| Entrenador | Camila Ríos | camila.rios@mova.app | Entrenador123! | 2 alumnos (cardio y rehabilitación) |
| Alumno | Sofía Gómez | alumno@mova.app | Alumno123! | Historial completo, 2 rutinas, revisión en 2 días |
| Alumno | Mateo Fernández | mateo.fernandez@mova.app | Alumno123! | Calistenia |
| Alumno | Julieta Paz | julieta.paz@mova.app | Alumno123! | Cuota vence en 2 días (aviso) |
| Alumno | Martina López | martina.lopez@mova.app | Alumno123! | Rehabilitación de rodilla, préstamo pendiente |
| Alumno | Tomás Acosta | tomas.acosta@mova.app | Alumno123! | **Bloqueado** por cuota vencida |
| Alumno | Bruno Díaz | bruno.diaz@mova.app | Alumno123! | **Bloqueado** por material no devuelto |

- En la pantalla de inicio de sesión están los atajos "Cuentas de prueba" (Alumno / Entrenador / Admin).
- Si el servidor no tiene email configurado (modo desarrollo), los códigos de verificación aparecen en pantalla.
- Para reiniciar todos los datos: `cd backend && npm run db:init`.
