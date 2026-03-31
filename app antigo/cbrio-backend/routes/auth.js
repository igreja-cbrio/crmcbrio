// ══════════════════════════════════════
// Rotas de Autenticação
// POST /api/auth/login
// POST /api/auth/refresh
// GET  /api/auth/me
// ══════════════════════════════════════

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../utils/db');
const { generateTokens, authenticate } = require('../middleware/auth');
const { sanitize } = require('../utils/sanitize');

// Rate limit específico para login: 5 tentativas por 15min por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Contar apenas tentativas falhadas
  skipSuccessfulRequests: true,
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { user, pass } = req.body;

    if (!user || !pass) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    // Sanitizar input
    const cleanUser = sanitize(user).toLowerCase();

    // Buscar usuário no banco (SEMPRE parameterized query — anti SQL injection)
    const result = await db.query(
      'SELECT id, name, email, role, password_hash, active FROM users WHERE LOWER(email) = $1 OR LOWER(name) = $1',
      [cleanUser]
    );

    if (result.rows.length === 0) {
      // Não revelar se o usuário existe ou não (anti user enumeration)
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const dbUser = result.rows[0];

    // Verificar se conta está ativa
    if (!dbUser.active) {
      return res.status(401).json({ error: 'Conta desativada' });
    }

    // Comparar senha com bcrypt (timing-safe)
    const validPass = await bcrypt.compare(pass, dbUser.password_hash);
    if (!validPass) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gerar tokens JWT
    const tokens = generateTokens(dbUser);

    // Log de auditoria
    await db.query(
      `INSERT INTO activity_log (user_id, action, entity_type) VALUES ($1, $2, $3)`,
      [dbUser.id, 'Login realizado', 'auth']
    );

    res.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        role: dbUser.role,
      },
      ...tokens,
    });

  } catch (err) {
    console.error('[AUTH] Erro no login:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token obrigatório' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Buscar usuário atualizado
    const result = await db.query(
      'SELECT id, name, role, active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].active) {
      return res.status(401).json({ error: 'Usuário inválido' });
    }

    const tokens = generateTokens(result.rows[0]);
    res.json(tokens);

  } catch (err) {
    res.status(401).json({ error: 'Refresh token inválido ou expirado' });
  }
});

// GET /api/auth/me — retorna dados do usuário logado
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, area, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
