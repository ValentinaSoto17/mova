/**
 * Rutas de la API de MOVA. TODAS usan el método POST (requisito del proyecto):
 * los parámetros viajan en el cuerpo (body) en formato JSON.
 */
const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { asyncHandler: h, ok } = require('../utils/http');
const { authenticate, requireRole } = require('../middlewares');
const { pool } = require('../config/db');

const auth = require('../controllers/auth.controller');
const users = require('../controllers/users.controller');
const admin = require('../controllers/admin.controller');
const exercises = require('../controllers/exercises.controller');
const routines = require('../controllers/routines.controller');
const progress = require('../controllers/progress.controller');
const messages = require('../controllers/messages.controller');
const equipment = require('../controllers/equipment.controller');
const notifications = require('../controllers/notifications.controller');

const r = Router();
const ADMIN = requireRole('Administrador');
const STAFF = requireRole('Administrador', 'Entrenador');
const ALUMNO = requireRole('Alumno');

// Limita intentos de login/registro para frenar ataques de fuerza bruta
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ ok: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Esperá unos minutos.' } }),
});

// ---------- Salud del servicio ----------
r.post('/health', h(async (req, res) => {
  await pool.query('SELECT 1');
  ok(res, { status: 'ok', db: 'conectada', time: new Date().toISOString() });
}));

// ---------- Autenticación (públicas) ----------
r.post('/auth/register', authLimiter, h(auth.register));
r.post('/auth/login', authLimiter, h(auth.login));
r.post('/auth/verify-email', authLimiter, h(auth.verifyEmail));
r.post('/auth/verify-2fa', authLimiter, h(auth.verifyTwoFactor));
r.post('/auth/resend-code', authLimiter, h(auth.resendCode));
r.post('/auth/social', authLimiter, h(auth.social));
r.post('/auth/refresh', h(auth.refresh));
r.post('/auth/logout', h(auth.logout));
r.post('/auth/forgot-password', authLimiter, h(auth.forgotPassword));
r.post('/auth/reset-password', authLimiter, h(auth.resetPassword));

// A partir de acá todas requieren token de acceso
r.use(authenticate);
r.post('/auth/me', h(auth.me));

// ---------- Usuarios ----------
r.post('/users/profile', h(users.profile));
r.post('/users/update-profile', h(users.updateProfile));
r.post('/users/change-password', h(users.changePassword));
r.post('/users/two-factor', h(users.twoFactor));
r.post('/users/contacts', h(users.contacts));
r.post('/users/list', STAFF, h(users.list));
r.post('/users/detail', STAFF, h(users.detail));
r.post('/users/status', ADMIN, h(users.status));
r.post('/users/block-reasons', ADMIN, h(users.blockReasons));

// ---------- Panel de administración ----------
r.post('/admin/roles', ADMIN, h(admin.roles));
r.post('/admin/users/manage', ADMIN, h(admin.manageUser));
r.post('/admin/trainers', ADMIN, h(admin.trainers));
r.post('/admin/memberships', ADMIN, h(admin.memberships));
r.post('/admin/stats', ADMIN, h(admin.stats));
r.post('/admin/run-jobs', ADMIN, h(admin.runJobs));

// ---------- Ejercicios ----------
r.post('/exercises/list', h(exercises.list));
r.post('/exercises/detail', h(exercises.detail));
r.post('/exercises/manage', STAFF, h(exercises.manage));

// ---------- Rutinas ----------
r.post('/routines/list', h(routines.list));
r.post('/routines/detail', h(routines.detail));
r.post('/routines/manage', STAFF, h(routines.manage));
r.post('/routines/assignments', STAFF, h(routines.assignments));

// ---------- Progreso ----------
r.post('/progress/create', ALUMNO, h(progress.create));
r.post('/progress/history', h(progress.history));
r.post('/progress/detail', h(progress.detail));
r.post('/progress/summary', h(progress.summary));
r.post('/progress/checkin', ALUMNO, h(progress.checkin));

// ---------- Mensajes ----------
r.post('/messages/conversations', h(messages.conversations));
r.post('/messages/thread', h(messages.thread));
r.post('/messages/send', h(messages.send));
r.post('/messages/suppliers', ADMIN, h(messages.suppliers));

// ---------- Equipamiento y préstamos ----------
r.post('/equipment/list', h(equipment.list));
r.post('/equipment/manage', ADMIN, h(equipment.manage));
r.post('/equipment/loans', h(equipment.loans));

// ---------- Notificaciones ----------
r.post('/notifications/list', h(notifications.list));
r.post('/notifications/read', h(notifications.read));
r.post('/notifications/upcoming', h(notifications.upcoming));

module.exports = r;
