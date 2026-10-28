const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const { postOnly, errorHandler, notFound } = require('./middlewares');

const app = express();

app.set('trust proxy', 1); // detrás del proxy de Render/Railway
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((s) => s.trim()),
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '1mb' }));
if (!env.isProd) app.use(morgan('dev'));

// Requisito: solo método POST en toda la API
app.use(postOnly);

app.post('/', (req, res) => res.json({ ok: true, data: { app: 'MOVA API', version: '1.0.0', docs: 'Ver README.md' } }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
