const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

const ARQUIVEI_API = 'https://api.arquivei.com.br';

async function getArquiveiConfig() {
  const { data } = await supabase.from('arquivei_config').select('*').limit(1).single();
  return data;
}

router.use(authenticate, authorize('admin', 'diretor'));

// GET /api/arquivei/status
router.get('/status', async (req, res) => {
  try {
    const config = await getArquiveiConfig();
    if (!config) return res.json({ connected: false });
    res.json({ connected: config.connected, cnpj: config.cnpj, last_sync: config.last_sync });
  } catch (e) { res.json({ connected: false }); }
});

// POST /api/arquivei/config — save API credentials
router.post('/config', async (req, res) => {
  try {
    const { api_id, api_key, cnpj } = req.body;
    if (!api_id || !api_key || !cnpj) return res.status(400).json({ error: 'API ID, API Key e CNPJ são obrigatórios' });

    // Test connection
    const testRes = await fetch(`${ARQUIVEI_API}/v1/nfe/received?limit=1`, {
      headers: { 'X-API-ID': api_id, 'X-API-KEY': api_key, 'X-Use-ApiGateway': 'always' },
    });
    if (!testRes.ok) {
      const err = await testRes.json().catch(() => ({}));
      return res.status(400).json({ error: err.message || 'Credenciais inválidas' });
    }

    // Upsert
    const existing = await getArquiveiConfig();
    if (existing) {
      await supabase.from('arquivei_config').update({
        api_id, api_key, cnpj, connected: true, updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('arquivei_config').insert({ api_id, api_key, cnpj, connected: true });
    }

    res.json({ connected: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/arquivei/disconnect
router.post('/disconnect', async (req, res) => {
  try {
    const config = await getArquiveiConfig();
    if (config) {
      await supabase.from('arquivei_config').update({
        connected: false, updated_at: new Date().toISOString(),
      }).eq('id', config.id);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/arquivei/sync — fetch NFs from Arquivei and save to log_notas_fiscais
router.post('/sync', async (req, res) => {
  try {
    const config = await getArquiveiConfig();
    if (!config?.connected) return res.status(400).json({ error: 'Arquivei não conectado' });

    let cursor = config.last_cursor || '';
    let imported = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `${ARQUIVEI_API}/v1/nfe/received?limit=50${cursor ? `&cursor=${cursor}` : ''}`;
      const response = await fetch(url, {
        headers: { 'X-API-ID': config.api_id, 'X-API-KEY': config.api_key, 'X-Use-ApiGateway': 'always' },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Arquivei error ${response.status}`);
      }

      const result = await response.json();
      const nfes = result.data || [];

      for (const nfe of nfes) {
        // Decode XML to extract NF data
        let nfData = {};
        try {
          if (nfe.xml) {
            const xml = Buffer.from(nfe.xml, 'base64').toString('utf-8');
            nfData = parseNFeXML(xml);
          }
        } catch (e) { /* use fallback data */ }

        const accessKey = nfe.access_key || nfData.chave_acesso || '';

        // Check if already exists
        if (accessKey) {
          const { data: existing } = await supabase.from('log_notas_fiscais')
            .select('id').eq('chave_acesso', accessKey).limit(1);
          if (existing?.length) continue;
        }

        await supabase.from('log_notas_fiscais').insert({
          numero: nfData.numero || accessKey.slice(-9, -1) || '—',
          serie: nfData.serie || null,
          chave_acesso: accessKey || null,
          valor: nfData.valor || 0,
          data_emissao: nfData.data_emissao || new Date().toISOString().slice(0, 10),
          origem: 'arquivei',
          emitente_nome: nfData.emitente_nome || null,
          emitente_cnpj: nfData.emitente_cnpj || null,
          xml_content: nfe.xml || null,
        });
        imported++;
      }

      // Pagination
      if (result.page?.next && nfes.length > 0) {
        cursor = result.page.next;
      } else {
        hasMore = false;
      }

      // Safety: max 5 pages per sync
      if (imported > 200) break;
    }

    // Save cursor for incremental sync
    await supabase.from('arquivei_config').update({
      last_cursor: cursor, last_sync: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', config.id);

    res.json({ imported });
  } catch (e) {
    console.error('[ARQUIVEI] Sync error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Simple XML parser for NFe — extracts key fields without heavy dependencies
function parseNFeXML(xml) {
  const get = (tag) => {
    const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return match ? match[1] : '';
  };
  const getInBlock = (block, tag) => {
    const blockMatch = xml.match(new RegExp(`<${block}>[\\s\\S]*?</${block}>`));
    if (!blockMatch) return '';
    const m = blockMatch[0].match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return m ? m[1] : '';
  };

  return {
    numero: get('nNF'),
    serie: get('serie'),
    chave_acesso: get('chNFe'),
    valor: parseFloat(getInBlock('ICMSTot', 'vNF') || get('vNF')) || 0,
    data_emissao: (get('dhEmi') || get('dEmi') || '').slice(0, 10),
    emitente_nome: getInBlock('emit', 'xNome') || getInBlock('emit', 'xFant'),
    emitente_cnpj: getInBlock('emit', 'CNPJ'),
  };
}

module.exports = router;
