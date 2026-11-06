const nodemailer = require('nodemailer');
const env = require('../config/env');

// Opción 0 (la más simple en Render gratis): un script de Google Apps Script que envía con tu propio Gmail.
// Ver docs/EMAIL_CON_GMAIL.md. Variables: GMAIL_SCRIPT_URL y GMAIL_SCRIPT_SECRET.
// Busca las variables aunque el nombre tenga espacios o minúsculas (errores comunes al cargarlas en Render)
function envLike(...names) {
  const wanted = names.map((n) => n.toUpperCase());
  const key = Object.keys(process.env).find((k) => wanted.includes(k.trim().toUpperCase()));
  return key ? String(process.env[key]).trim() : '';
}
const gmailScriptUrl = envLike('GMAIL_SCRIPT_URL');
const gmailScriptSecret = envLike('GMAIL_SCRIPT_SECRET', 'GMAIL_SECRET_URL', 'GMAIL_SECRET');
const useGmailScript = Boolean(gmailScriptUrl && gmailScriptSecret);
// Opción 1: API HTTP de Brevo. Render bloquea los puertos SMTP en el plan gratuito.
const brevoKey = process.env.BREVO_API_KEY || '';
const brevoSender = process.env.BREVO_SENDER_EMAIL || env.smtp.user || '';
const useBrevo = Boolean(brevoKey && brevoSender);
// Opción 2: SMTP clásico (Gmail con contraseña de aplicación). Sirve en la computadora local.
const smtpConfigured = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
const configured = useGmailScript || useBrevo || smtpConfigured;

const transporter = !useGmailScript && !useBrevo && smtpConfigured
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  : null;

function layout(title, body) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#F6F5FF;border-radius:16px">
    <h1 style="color:#5B4BFF;margin:0 0 8px">MOVA</h1>
    <p style="color:#6B6A80;margin:0 0 24px">Entrena. Progresa. Evoluciona.</p>
    <h2 style="color:#1A1830">${title}</h2>
    ${body}
  </div>`;
}

/** Envía un email. Si no hay SMTP configurado lo muestra en consola (modo desarrollo). */
async function sendMail({ to, subject, title, html, code }) {
  if (!configured) {
    console.log(`[MAIL simulado] Para: ${to} | ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')}`);
    return { simulated: true };
  }
  const content = layout(title || subject, html);
  if (useGmailScript) {
    const res = await fetch(gmailScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: gmailScriptSecret, to, subject, html: content }),
      redirect: 'follow',
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* Google devolvió una página HTML */ }
    if (!res.ok || !data || !data.ok) {
      throw new Error(`Script de Gmail: ${data?.error || `respuesta inesperada (${res.status}). Revisá que esté implementado como "Cualquier usuario".`}`);
    }
    console.log(`[MAIL] Enviado con Gmail (Apps Script) a ${to}`);
    return { simulated: false };
  }
  if (useBrevo) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'MOVA', email: brevoSender }, to: [{ email: to }], subject, htmlContent: content }),
    });
    if (!res.ok) throw new Error(`Brevo respondió ${res.status}: ${await res.text()}`);
    console.log(`[MAIL] Enviado con Brevo a ${to}`);
    return { simulated: false };
  }
  await transporter.sendMail({ from: env.smtp.from, to, subject, html: content });
  console.log(`[MAIL] Enviado por SMTP a ${to}`);
  return { simulated: false };
}

function sendCode(to, code, tipo) {
  const titulos = {
    verificacion_email: 'Verificá tu email',
    doble_factor: 'Tu código de acceso',
    recuperacion: 'Recuperar contraseña',
  };
  return sendMail({
    to,
    subject: `${titulos[tipo]} - MOVA`,
    title: titulos[tipo],
    code,
    html: `<p>Tu código es:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#5B4BFF">${code}</p>
      <p style="color:#6B6A80">Vence en 10 minutos. Si no fuiste vos, ignorá este mensaje.</p>`,
  });
}

const gmailKeys = Object.keys(process.env).filter((k) => /gmail/i.test(k));
console.log(`[MAIL] Variables de Gmail encontradas: ${gmailKeys.length ? gmailKeys.join(', ') : 'ninguna'} · URL: ${gmailScriptUrl ? (/^https:\/\/script\.google\.com\/.+\/exec$/.test(gmailScriptUrl) ? 'ok' : 'cargada pero no termina en /exec') : 'falta'} · clave: ${gmailScriptSecret ? 'ok' : 'falta'}`);
console.log(`[MAIL] Método de envío: ${useGmailScript ? 'Gmail (Apps Script)' : useBrevo ? 'Brevo' : smtpConfigured ? 'SMTP' : 'ninguno (simulado)'}`);

module.exports = { sendMail, sendCode, mailConfigured: configured };