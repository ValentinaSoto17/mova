const nodemailer = require('nodemailer');
const env = require('../config/env');

const configured = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

const transporter = configured
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
  await transporter.sendMail({ from: env.smtp.from, to, subject, html: layout(title || subject, html) });
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
