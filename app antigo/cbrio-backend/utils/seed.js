// ══════════════════════════════════════
// Seed: criar usuários iniciais com senha bcrypt
// Rodar: node utils/seed.js
// ══════════════════════════════════════

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const USERS = [
  { name: 'Diretor', email: 'diretor@cbrio.com.br', role: 'diretor', password: 'diretor' },
  { name: 'Administração', email: 'admin@cbrio.com.br', role: 'admin', password: 'admin' },
  { name: 'Assistente', email: 'assistente@cbrio.com.br', role: 'assistente', password: '123' },
];

async function seed() {
  console.log('[SEED] Criando usuários...');

  for (const u of USERS) {
    // Gerar hash bcrypt (custo 12 = seguro e rápido)
    const hash = await bcrypt.hash(u.password, 12);

    await pool.query(`
      INSERT INTO users (name, email, role, password_hash)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash
    `, [u.name, u.email, u.role, hash]);

    console.log(`  ✓ ${u.role}: ${u.email} (senha: ${u.password})`);
  }

  console.log('[SEED] Concluído!');
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║  CREDENCIAIS DE ACESSO               ║');
  console.log('╠══════════════════════════════════════╣');
  console.log('║  Diretor:    diretor@cbrio / diretor  ║');
  console.log('║  Admin:      admin@cbrio / admin       ║');
  console.log('║  Assistente: assistente@cbrio / 123    ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log('⚠  TROQUE as senhas após o primeiro login!');

  await pool.end();
}

seed().catch(err => {
  console.error('[SEED] Erro:', err.message);
  process.exit(1);
});
