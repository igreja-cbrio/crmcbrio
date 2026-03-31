// ══════════════════════════════════════════════════════
// CBRio PMO — Backend Seguro
// Node.js + Express + PostgreSQL + JWT + RBAC
// ══════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const morgan = require('morgan');
const compression = require('compression');

const db = require('./utils/db');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const taskRoutes = require('./routes/tasks');
const meetingRoutes = require('./routes/meetings');
const expansionRoutes = require('./routes/expansion');
const agentRoutes = require('./routes/agents');

const app = express();
const PORT = process.env.PORT || 3001;

// ══════════════════════════════════════
// SEGURANÇA: Middleware global
// ══════════════════════════════════════

// Helmet: headers de segurança (X-Frame-Options, CSP, HSTS, etc)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS: só aceita requests do frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting global: 100 req/15min por IP
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// HPP: previne HTTP Parameter Pollution
app.use(hpp());

// Compressão gzip
app.use(compression());

// Body parser com limite de tamanho (previne payloads gigantes)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Logging (em produção, só erros)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Desabilitar header X-Powered-By
app.disable('x-powered-by');

// ══════════════════════════════════════
// ROTAS
// ══════════════════════════════════════

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/expansion', expansionRoutes);
app.use('/api/agents', agentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ══════════════════════════════════════
// ERROR HANDLING
// ══════════════════════════════════════

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler global (nunca expõe stack trace em produção)
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message,
  });
});

// ══════════════════════════════════════
// INICIAR
// ══════════════════════════════════════

app.listen(PORT, () => {
  console.log(`[CBRio PMO] Servidor rodando na porta ${PORT}`);
  console.log(`[CBRio PMO] Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
