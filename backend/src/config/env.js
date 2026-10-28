require('dotenv').config();

const int = (v, d) => (v === undefined || v === '' ? d : parseInt(v, 10));
const list = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: int(process.env.PORT, 4000),

  db: {
    url: process.env.DATABASE_URL || '',
    host: process.env.DB_HOST,
    port: int(process.env.DB_PORT, 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mova_db',
    ssl: String(process.env.DB_SSL || 'true') === 'true',
    sslCa: (process.env.DB_SSL_CA || '').replace(/\\n/g, '\n'),
    timezone: /^[+-]\d{2}:\d{2}$/.test(process.env.DB_TIMEZONE || '') ? process.env.DB_TIMEZONE : '-03:00',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_cambiar',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_cambiar',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshDays: int(process.env.JWT_REFRESH_DAYS, 7),
  },

  corsOrigin: process.env.CORS_ORIGIN || '*',

  smtp: {
    host: process.env.SMTP_HOST,
    port: int(process.env.SMTP_PORT, 465),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'MOVA <no-reply@mova.app>',
  },
  // Modo demostración del login social (solo desarrollo, cuando no hay credenciales de los proveedores)
  socialDemo: process.env.NODE_ENV !== 'production' && String(process.env.SOCIAL_DEMO || 'true') === 'true',
  devShowCodes: process.env.NODE_ENV !== 'production' && String(process.env.DEV_SHOW_CODES) === 'true',

  oauth: {
    googleClientIds: list(process.env.GOOGLE_CLIENT_IDS),
    facebookAppId: process.env.FACEBOOK_APP_ID,
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    discordClientId: process.env.DISCORD_CLIENT_ID,
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
    appleBundleId: process.env.APPLE_BUNDLE_ID || 'com.eest5.mova',
  },

  reglas: {
    avisoDiasAntes: int(process.env.AVISO_DIAS_ANTES, 2),
    graciaCuotaDias: int(process.env.GRACIA_CUOTA_DIAS, 5),
    graciaPrestamoDias: int(process.env.GRACIA_PRESTAMO_DIAS, 3),
    inactividadDias: int(process.env.INACTIVIDAD_DIAS, 60),
  },
};

if (env.isProd && env.jwt.accessSecret.startsWith('dev_')) {
  throw new Error('Configurá JWT_ACCESS_SECRET y JWT_REFRESH_SECRET en producción.');
}

module.exports = env;