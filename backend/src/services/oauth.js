/**
 * Verificación en el servidor de los tokens entregados por cada proveedor.
 * La app obtiene el token con expo-auth-session / expo-apple-authentication y el backend
 * confirma con el proveedor que es auténtico antes de crear la sesión de MOVA.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');
const { HttpError } = require('../utils/http');

const fail = (msg) => new HttpError(401, 'SOCIAL_AUTH_FAILED', msg);
const notConfigured = (p) =>
  new HttpError(501, 'PROVIDER_NOT_CONFIGURED', `El inicio de sesión con ${p} todavía no está configurado en el servidor.`);

async function getJson(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body };
}

const splitName = (full = '') => {
  const parts = full.trim().split(/\s+/);
  return { nombre: parts[0] || 'Usuario', apellido: parts.slice(1).join(' ') || 'MOVA' };
};

const googleClient = new OAuth2Client();

async function google({ idToken, accessToken }) {
  if (idToken && (env.oauth.googleClientIds.length || !accessToken)) {
    if (!env.oauth.googleClientIds.length) throw notConfigured('Google');
    const ticket = await googleClient
      .verifyIdToken({ idToken, audience: env.oauth.googleClientIds })
      .catch(() => {
        throw fail('No se pudo validar la cuenta de Google');
      });
    const p = ticket.getPayload();
    if (!p.email_verified) throw fail('El email de Google no está verificado');
    return { providerId: p.sub, email: p.email, nombre: p.given_name || 'Usuario', apellido: p.family_name || 'MOVA', avatar: p.picture };
  }
  if (accessToken) {
    const { ok, body } = await getJson('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!ok || !body.email) throw fail('No se pudo validar la cuenta de Google');
    return { providerId: body.sub, email: body.email, nombre: body.given_name || 'Usuario', apellido: body.family_name || 'MOVA', avatar: body.picture };
  }
  throw fail('Falta el token de Google');
}

async function facebook({ accessToken }) {
  if (!accessToken) throw fail('Falta el token de Facebook');
  if (env.oauth.facebookAppId && env.oauth.facebookAppSecret) {
    // Confirma que el token fue emitido para NUESTRA app
    const appToken = `${env.oauth.facebookAppId}|${env.oauth.facebookAppSecret}`;
    const dbg = await getJson(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`
    );
    if (!dbg.ok || !dbg.body.data?.is_valid || dbg.body.data.app_id !== env.oauth.facebookAppId) {
      throw fail('El token de Facebook no es válido para MOVA');
    }
  } else if (env.isProd) {
    throw notConfigured('Facebook');
  }
  const { ok, body } = await getJson(
    `https://graph.facebook.com/me?fields=id,first_name,last_name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`
  );
  if (!ok || !body.id) throw fail('No se pudo validar la cuenta de Facebook');
  if (!body.email) throw fail('Tu cuenta de Facebook no comparte un email. Registrate con email y contraseña.');
  return { providerId: body.id, email: body.email, nombre: body.first_name, apellido: body.last_name, avatar: body.picture?.data?.url };
}

async function github({ code, codeVerifier, redirectUri }) {
  if (!env.oauth.githubClientId || !env.oauth.githubClientSecret) throw notConfigured('GitHub');
  if (!code) throw fail('Falta el código de GitHub');
  const tokenRes = await getJson('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.oauth.githubClientId,
      client_secret: env.oauth.githubClientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });
  const token = tokenRes.body.access_token;
  if (!token) throw fail('GitHub rechazó el inicio de sesión');
  const headers = { Authorization: `Bearer ${token}`, 'User-Agent': 'MOVA-App', Accept: 'application/vnd.github+json' };
  const user = await getJson('https://api.github.com/user', { headers });
  const emails = await getJson('https://api.github.com/user/emails', { headers });
  const primary = Array.isArray(emails.body) ? emails.body.find((e) => e.primary && e.verified) : null;
  if (!user.ok || !primary) throw fail('Tu cuenta de GitHub no tiene un email verificado');
  return { providerId: String(user.body.id), email: primary.email, ...splitName(user.body.name || user.body.login), avatar: user.body.avatar_url };
}

async function discord({ code, codeVerifier, redirectUri }) {
  if (!env.oauth.discordClientId || !env.oauth.discordClientSecret) throw notConfigured('Discord');
  if (!code) throw fail('Falta el código de Discord');
  const form = new URLSearchParams({
    client_id: env.oauth.discordClientId,
    client_secret: env.oauth.discordClientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri || '',
  });
  if (codeVerifier) form.set('code_verifier', codeVerifier);
  const tokenRes = await getJson('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const token = tokenRes.body.access_token;
  if (!token) throw fail('Discord rechazó el inicio de sesión');
  const me = await getJson('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` } });
  if (!me.ok || !me.body.email || !me.body.verified) throw fail('Tu cuenta de Discord no tiene un email verificado');
  return { providerId: String(me.body.id), email: me.body.email, ...splitName(me.body.global_name || me.body.username) };
}

let appleKeys = null;
async function apple({ identityToken, fullName }) {
  if (!identityToken) throw fail('Falta el token de Apple');
  if (!appleKeys) {
    const { body } = await getJson('https://appleid.apple.com/auth/keys');
    appleKeys = body.keys || [];
  }
  const decoded = jwt.decode(identityToken, { complete: true });
  const jwk = appleKeys.find((k) => k.kid === decoded?.header?.kid);
  if (!jwk) throw fail('No se pudo validar la cuenta de Apple');
  const pem = crypto.createPublicKey({ key: jwk, format: 'jwk' }).export({ type: 'spki', format: 'pem' });
  let p;
  try {
    p = jwt.verify(identityToken, pem, { issuer: 'https://appleid.apple.com', audience: env.oauth.appleBundleId });
  } catch {
    throw fail('No se pudo validar la cuenta de Apple');
  }
  if (!p.email) throw fail('Apple no compartió tu email');
  return { providerId: p.sub, email: p.email, nombre: fullName?.givenName || 'Usuario', apellido: fullName?.familyName || 'MOVA' };
}

const providers = { google, facebook, github, apple, discord };

const NOMBRES = { google: 'Google', facebook: 'Facebook', github: 'GitHub', apple: 'Apple', discord: 'Discord' };

/**
 * MODO DEMOSTRACIÓN (solo desarrollo): simula la respuesta del proveedor cuando todavía no se
 * cargaron sus credenciales, para poder mostrar el flujo completo (vinculación de la cuenta social
 * en la base, emisión de JWT y redirección por rol). En producción está desactivado.
 */
function demoProfile(provider, cuenta) {
  if (cuenta === 'existente') {
    return { providerId: `demo-${provider}-alumno`, email: 'alumno@mova.app', nombre: 'Sofía', apellido: 'Gómez' };
  }
  return { providerId: `demo-${provider}-nuevo`, email: `demo.${provider}@mova.app`, nombre: 'Demo', apellido: NOMBRES[provider] };
}

async function verifySocial(provider, payload) {
  const fn = providers[provider];
  if (!fn) throw new HttpError(400, 'BAD_PROVIDER', 'Proveedor no soportado');
  if (payload.demo) {
    if (!env.socialDemo) throw new HttpError(403, 'DEMO_DISABLED', 'El modo demostración está desactivado en este servidor.');
    return demoProfile(provider, payload.demoAccount);
  }
  const profile = await fn(payload);
  return { ...profile, email: profile.email.toLowerCase() };
}

module.exports = { verifySocial };