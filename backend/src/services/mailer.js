const nodemailer = require('nodemailer');
const env = require('../config/env');

// Opción 1 (recomendada en Render gratis): API HTTP de Brevo. Render bloquea los puertos SMTP en el plan gratuito.
const brevoKey = process.env.BREVO_API_KEY || '';
const brevoSender = process.env.BREVO_SENDER_EMAIL || env.smtp.user || '';
const useBrevo = Boolean(brevoKey && brevoSender);
// Opción 2: SMTP clásico (Gmail con contraseña de aplicación). Sirve en la computadora local.
const smtpConfigured = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
const configured = useBrevo || smtpConfigured;

const transporter = !useBrevo && smtpConfigured
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
async function sendMail({ to, subject, title, html }) {
  if (!configured) {
    console.log(`[MAIL simulado] Para: ${to} | ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')}`);
    return { simulated: true };
  }
  const content = layout(title || subject, html);
  if (useBrevo) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'MOVA', email: brevoSender }, to: [{ email: to }], subject, htmlContent: content }),
    });
    if (!res.ok) throw new Error(`Brevo respondió ${res.status}: ${await res.text()}`);
    return { simulated: false };
  }
  await transporter.sendMail({ from: env.smtp.from, to, subject, html: content });
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
    html: `<p>Tu código es:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#5B4BFF">${code}</p>
      <p style="color:#6B6A80">Vence en 10 minutos. Si no fuiste vos, ignorá este mensaje.</p>`,
  });
}

module.exports = { sendMail, sendCode, mailConfigured: configured };