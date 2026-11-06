/**
 * Cliente HTTP de MOVA.
 * Requisito del proyecto: TODAS las peticiones usan el método POST con los datos en el body.
 * Renueva el token de acceso automáticamente cuando vence (refresh token con rotación).
 */
import Constants from 'expo-constants';
import { secure } from './storage';

// Servidor publicado en Render (se usa siempre que la app no corre en la propia computadora)
const PROD_API_URL = 'https://mova-nwyl.onrender.com';

function resolveApiUrl() {
  const configured = (
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    ''
  ).trim().replace(/\/$/, '');
  const host = typeof window !== 'undefined' && window.location ? window.location.hostname : '';
  // En la página publicada (https://...vercel.app) nunca se usa una dirección local
  if (host && host !== 'localhost' && host !== '127.0.0.1' && !/^192\.168\./.test(host)) {
    if (!configured || /localhost|127\.0\.0\.1|192\.168\.|^http:/.test(configured)) return PROD_API_URL;
  }
  return configured || 'http://localhost:4000';
}

export const API_URL = resolveApiUrl();

const KEYS = { access: 'mova.access', refresh: 'mova.refresh' };
let accessToken: string | null = null;
let refreshPromise: Promise<any> | null = null;
let onSessionLost: (err?: any) => void = () => {};

interface ApiErrorInit {
  status?: number;
  code?: string;
  message?: string;
  fields?: Record<string, string> | null;
  block?: any;
}

/** Error de la API con código HTTP, código interno y errores por campo. */
export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string> | null;
  block: any;

  constructor({ status = 0, code = 'UNKNOWN', message = 'Error inesperado', fields = null, block = null }: ApiErrorInit) {
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
  async save(access: string, refresh: string) {
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

export const setSessionLostHandler = (fn: (err?: any) => void) => {
  onSessionLost = fn;
};

async function rawPost(path: string, body?: Record<string, any> | null, token?: string | null, timeoutMs = 75000): Promise<any> {
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
          ? 'El servidor está despertando (el plan gratuito se duerme tras 15 min sin uso). Esperá unos segundos y tocá Ingresar de nuevo.'
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

async function refreshAccess(): Promise<any> {
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
export async function api<T = any>(path: string, body?: Record<string, any>): Promise<T> {
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
export const publicApi = <T = any>(path: string, body?: Record<string, any>): Promise<T> => rawPost(path, body, null);
export { refreshAccess };
