/**
 * Cliente HTTP de MOVA.
 * Requisito del proyecto: TODAS las peticiones usan el método POST con los datos en el body.
 * Renueva el token de acceso automáticamente cuando vence (refresh token con rotación).
 */
import Constants from 'expo-constants';
import { secure } from './storage';

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://localhost:4000'
).replace(/\/$/, '');

const KEYS = { access: 'mova.access', refresh: 'mova.refresh' };
let accessToken = null;
let refreshPromise = null;
let onSessionLost = () => {};

export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message = 'Error inesperado', fields = null, block = null }) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.block = block;
  }
}

// Mensajes claros según el código HTTP cuando el servidor no envía uno
const STATUS_MSG = {
  400: 'La solicitud no es válida (400).',
  401: 'Tu sesión no es válida. Iniciá sesión de nuevo (401).',
  403: 'No tenés permisos para esto (403).',
  404: 'No se encontró lo que buscabas (404).',
  409: 'Hay un conflicto con los datos existentes (409).',
  413: 'Los datos son demasiado grandes (413).',
  422: 'Revisá los datos ingresados (422).',
  428: 'Esta acción necesita confirmación (428).',
  429: 'Demasiados intentos. Esperá un momento (429).',
  500: 'Error interno del servidor (500).',
  502: 'El servidor no responde (502).',
  503: 'El servicio no está disponible (503).',
};

export const tokens = {
  async load() {
    accessToken = await secure.get(KEYS.access);
    return { accessToken, refreshToken: await secure.get(KEYS.refresh) };
  },
  async save(access, refresh) {
    accessToken = access;
    await secure.set(KEYS.access, access);
    if (refresh) await secure.set(KEYS.refresh, refresh);
  },
  async clear() {
    accessToken = null;
    await secure.del(KEYS.access);
    await secure.del(KEYS.refresh);
  },
  getRefresh: () => secure.get(KEYS.refresh),
};

export const setSessionLostHandler = (fn) => {
  onSessionLost = fn;
};

async function rawPost(path, body, token, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    });
  } catch (e) {
    throw new ApiError({
      code: e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK',
      message:
        e.name === 'AbortError'
          ? 'El servidor tardó demasiado en responder. Revisá tu conexión.'
          : `No hay conexión con el servidor (${API_URL}). Verificá que el backend esté encendido y que EXPO_PUBLIC_API_URL apunte a él.`,
    });
  } finally {
    clearTimeout(timer);
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* respuesta sin JSON */
  }
  if (!res.ok || !json?.ok) {
    const e = json?.error || {};
    throw new ApiError({
      status: res.status,
      code: e.code || `HTTP_${res.status}`,
      message: e.message || STATUS_MSG[res.status] || `Error ${res.status}`,
      fields: e.fields || null,
      block: e.block || null,
    });
  }
  return json.data;
}

async function refreshAccess() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await tokens.getRefresh();
      if (!refreshToken) throw new ApiError({ status: 401, code: 'NO_SESSION', message: 'Iniciá sesión' });
      const data = await rawPost('/auth/refresh', { refreshToken });
      await tokens.save(data.accessToken, data.refreshToken);
      return data;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** POST autenticado. Reintenta una vez tras renovar el token si venció. */
export async function api(path, body) {
  try {
    return await rawPost(path, body, accessToken);
  } catch (err) {
    if (err.status === 401 && ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'UNAUTHORIZED'].includes(err.code)) {
      try {
        await refreshAccess();
      } catch (e) {
        onSessionLost(e);
        throw e;
      }
      return rawPost(path, body, accessToken);
    }
    if (err.code === 'ACCOUNT_BLOCKED') onSessionLost(err);
    throw err;
  }
}

/** POST sin token (login, registro, verificación). */
export const publicApi = (path, body) => rawPost(path, body, null);
export { refreshAccess };
