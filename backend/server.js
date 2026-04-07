require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security middleware ──
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://crmcbrio.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'production' ? 500 : 5000),
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
  skip: () => process.env.NODE_ENV !== 'production',
}));
app.use(hpp());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// ── Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/expansion', require('./routes/expansion'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/cycles', require('./routes/cycles'));
app.use('/api/occurrences', require('./routes/occurrences'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/rh', require('./routes/rh'));
app.use('/api/financeiro', require('./routes/financeiro'));
app.use('/api/logistica', require('./routes/logistica'));
app.use('/api/ml', require('./routes/mercadolivre'));
app.use('/api/arquivei', require('./routes/arquivei'));
app.use('/api/patrimonio', require('./routes/patrimonio'));
app.use('/api/membresia', require('./routes/membresia'));
app.use('/api/notificacoes', require('./routes/notificacoes'));
app.use('/api/permissoes', require('./routes/permissoes'));

// ── Health check ──
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Cron: run all agents every 6h ──
app.get('/api/cron/agents', async (req, res) => {
  // Verify cron secret (Vercel sends this header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { runModuleAudit } = require('./agents/moduleAuditor');
    const modules = ['module_rh', 'module_financeiro', 'module_eventos', 'module_projetos', 'module_logistica', 'module_patrimonio', 'module_membresia'];
    const results = [];
    for (const mod of modules) {
      try {
        const result = await runModuleAudit(mod, 'cron', {});
        results.push({ module: mod, status: 'ok', runId: result.runId, score: result.score });
      } catch (e) {
        results.push({ module: mod, status: 'error', error: e.message });
      }
    }
    res.json({ ok: true, timestamp: new Date().toISOString(), results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Serve frontend in production ──
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
}

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Only listen when not running as Vercel serverless function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[CBRio PMO] Servidor rodando na porta ${PORT}`);
    console.log(`[CBRio PMO] Ambiente: ${process.env.NODE_ENV || 'development'}`);

    // Cron: gerar notificações automáticas a cada 6 horas
    const { gerarTodasNotificacoes } = require('./services/notificacaoGenerator');
    setTimeout(() => gerarTodasNotificacoes(), 30000);
    setInterval(() => gerarTodasNotificacoes(), 6 * 60 * 60 * 1000);
  });
}

module.exports = app;
