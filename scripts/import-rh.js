/**
 * Script para importar colaboradores e férias do Excel para o CRM
 * Uso: cd backend && node ../scripts/import-rh.js
 */
const path = require('path');
const backendModules = path.join(__dirname, '..', 'backend', 'node_modules');
require(path.join(backendModules, 'dotenv')).config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { createClient } = require(path.join(backendModules, '@supabase', 'supabase-js'));
const XLSX = require(path.join(backendModules, 'xlsx'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const RH_DIR = '/Users/MatheusToscano/Library/CloudStorage/OneDrive-IgrejaComunidadeBatistadoRiodejaneiro/Analytics/Dados de RH';

async function importColaboradores() {
  console.log('📋 Importando colaboradores...');
  const wb = XLSX.readFile(path.join(RH_DIR, 'Cadastro de colaboradores 2026.xlsx'));
  const ws = wb.Sheets['Cadastro de colaboradores'];
  const rows = XLSX.utils.sheet_to_json(ws);

  const vinculoMap = { CLT: 'clt', PJ: 'pj', 'PJ NF': 'pj', 'PJ C': 'pj' };
  const statusMap = { Ativo: 'ativo', Inativo: 'inativo', Afastado: 'licenca' };

  let imported = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    const nome = (row['Colaborador'] || '').trim();
    if (!nome) continue;

    let cpf = String(row['CPF'] || '').trim();
    if (cpf && cpf.length < 11) cpf = cpf.padStart(11, '0');
    if (!cpf || cpf === '0' || cpf === 'undefined') cpf = null;

    // Check if already exists (by name, since CPF might be null)
    const { data: existing } = await supabase.from('rh_funcionarios')
      .select('id').ilike('nome', nome).limit(1);
    if (existing?.length) {
      console.log(`  ⏭ ${nome} — já existe`);
      skipped++;
      continue;
    }

    const cargo = (row['Função'] || '').trim();
    const area = (row['Área'] || '').trim();
    const tipo_contrato = vinculoMap[row['Vínculo']] || 'pj';
    const status = statusMap[row['Situação']] || 'ativo';
    const salario = parseFloat(row['Salário base']) || null;

    const { error } = await supabase.from('rh_funcionarios').insert({
      nome, cpf, cargo, area, tipo_contrato, status, salario,
      data_admissao: '2025-01-01', // placeholder
    });

    if (error) {
      console.log(`  ❌ ${nome}: ${error.message}`);
      errors++;
    } else {
      console.log(`  ✅ ${nome}`);
      imported++;
    }
  }

  console.log(`\n📊 Resultado: ${imported} importados, ${skipped} já existiam, ${errors} erros\n`);
}

async function importFerias() {
  console.log('🏖️ Importando planner de férias...');
  const wb = XLSX.readFile(path.join(RH_DIR, 'Planner de Férias.xlsx'));
  const ws = wb.Sheets['Planilha1'];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Row 0: headers with year markers (2025, 2026)
  // Row 1: month names
  // Row 2+: data
  const months2026 = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]; // columns for 2026 Jan-Dec

  let imported = 0;

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const nome = (row[1] || '').trim();
    if (!nome) continue;

    // Find the funcionario
    const { data: funcs } = await supabase.from('rh_funcionarios')
      .select('id').ilike('nome', `%${nome}%`).limit(1);
    if (!funcs?.length) {
      console.log(`  ⚠ ${nome} — não encontrado no cadastro`);
      continue;
    }
    const funcId = funcs[0].id;

    // Check each 2026 month for vacation entries
    for (let m = 0; m < 12; m++) {
      const colIdx = months2026[m];
      const val = row[colIdx];
      if (!val) continue;

      const diasStr = String(val).trim();
      const diasMatch = diasStr.match(/(\d+)/);
      if (!diasMatch) continue;
      const dias = parseInt(diasMatch[1]);

      const dataInicio = `2026-${String(m + 1).padStart(2, '0')}-01`;
      const fim = new Date(2026, m, dias);
      const dataFim = `2026-${String(m + 1).padStart(2, '0')}-${String(Math.min(dias, 28)).padStart(2, '0')}`;

      // Check if already exists
      const { data: existing } = await supabase.from('rh_ferias_licencas')
        .select('id').eq('funcionario_id', funcId)
        .gte('data_inicio', `2026-${String(m + 1).padStart(2, '0')}-01`)
        .lte('data_inicio', `2026-${String(m + 1).padStart(2, '0')}-28`)
        .limit(1);
      if (existing?.length) {
        console.log(`  ⏭ ${nome} — férias em ${String(m + 1).padStart(2, '0')}/2026 já existe`);
        continue;
      }

      const { error } = await supabase.from('rh_ferias_licencas').insert({
        funcionario_id: funcId,
        tipo: 'ferias',
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: 'aprovado',
        observacoes: `${dias} dias (importado do planner)`,
      });

      if (error) {
        console.log(`  ❌ ${nome} férias ${m + 1}/2026: ${error.message}`);
      } else {
        console.log(`  ✅ ${nome} — ${dias} dias em ${String(m + 1).padStart(2, '0')}/2026`);
        imported++;
      }
    }
  }

  console.log(`\n📊 Férias: ${imported} períodos importados\n`);
}

async function main() {
  console.log('🚀 Iniciando importação de RH...\n');
  await importColaboradores();
  await importFerias();
  console.log('✅ Importação concluída!');
}

main().catch(console.error);
