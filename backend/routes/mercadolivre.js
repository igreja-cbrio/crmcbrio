const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { supabase } = require('../utils/supabase');

const ML_API = 'https://api.mercadolibre.com';
const ML_AUTH = 'https://auth.mercadolivre.com.br';

// Helper: get stored ML config
async function getMLConfig() {
  const { data } = await supabase.from('ml_config').select('*').limit(1).single();
  return data;
}

// Helper: refresh token if expired
async function ensureValidToken(config) {
  if (!config || !config.access_token) return null;
  if (config.token_expires && new Date(config.token_expires) > new Date()) return config;

  // Token expired — refresh
  try {
    const res = await fetch(`${ML_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: config.client_id,
        client_secret: config.client_secret,
        refresh_token: config.refresh_token,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.message || data.error);

    await supabase.from('ml_config').update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', config.id);

    return { ...config, access_token: data.access_token, refresh_token: data.refresh_token };
  } catch (e) {
    console.error('[ML] Erro ao renovar token:', e.message);
    return null;
  }
}

// Helper: ML API fetch with auth
async function mlFetch(path, config) {
  const validConfig = await ensureValidToken(config);
  if (!validConfig) throw new Error('Token inválido. Reconecte ao Mercado Livre.');
  const res = await fetch(`${ML_API}${path}`, {
    headers: { Authorization: `Bearer ${validConfig.access_token}` },
  });
  if (res.status === 401) throw new Error('Token expirado. Reconecte ao Mercado Livre.');
  const data = await res.json();
  if (data.error) throw new Error(data.message || data.error);
  return data;
}

// ── Auth routes (no auth middleware — OAuth callback needs to be public) ──

// GET /api/ml/status — check connection status
router.get('/status', authenticate, authorize('admin', 'diretor'), async (req, res) => {
  try {
    const config = await getMLConfig();
    if (!config || !config.connected) return res.json({ connected: false });
    // Test if token works
    try {
      const validConfig = await ensureValidToken(config);
      if (!validConfig) return res.json({ connected: false });
      const user = await mlFetch(`/users/${config.user_id}`, validConfig);
      res.json({ connected: true, user_id: config.user_id, nickname: user.nickname });
    } catch (e) {
      res.json({ connected: false, error: e.message });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ml/config — save client_id and client_secret
router.post('/config', authenticate, authorize('admin', 'diretor'), async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;
    if (!client_id || !client_secret) return res.status(400).json({ error: 'client_id e client_secret são obrigatórios' });

    // Upsert config
    const existing = await getMLConfig();
    if (existing) {
      await supabase.from('ml_config').update({ client_id, client_secret, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('ml_config').insert({ client_id, client_secret });
    }

    // Generate auth URL
    const redirectUri = `https://${req.get('host')}/api/ml/callback`;
    const authUrl = `${ML_AUTH}/authorization?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.json({ auth_url: authUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ml/auth-url — get authorization URL for already configured app
router.get('/auth-url', authenticate, authorize('admin', 'diretor'), async (req, res) => {
  try {
    const config = await getMLConfig();
    if (!config) return res.status(400).json({ error: 'Configure client_id e client_secret primeiro' });
    const redirectUri = `https://${req.get('host')}/api/ml/callback`;
    const authUrl = `${ML_AUTH}/authorization?response_type=code&client_id=${config.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.json({ auth_url: authUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ml/callback — OAuth2 callback (public, redirects to frontend)
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Código de autorização não recebido');

    const config = await getMLConfig();
    if (!config) return res.status(400).send('Configuração ML não encontrada');

    const redirectUri = `https://${req.get('host')}/api/ml/callback`;

    // Exchange code for token
    const tokenRes = await fetch(`${ML_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: config.client_id,
        client_secret: config.client_secret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.message || tokenData.error);

    // Save tokens
    await supabase.from('ml_config').update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      user_id: String(tokenData.user_id),
      token_expires: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      connected: true,
      updated_at: new Date().toISOString(),
    }).eq('id', config.id);

    // Redirect to frontend logística page
    res.redirect('/admin/logistica?ml=connected');
  } catch (e) {
    console.error('[ML] Callback error:', e.message);
    res.redirect('/admin/logistica?ml=error&msg=' + encodeURIComponent(e.message));
  }
});

// POST /api/ml/disconnect
router.post('/disconnect', authenticate, authorize('admin', 'diretor'), async (req, res) => {
  try {
    const config = await getMLConfig();
    if (config) {
      await supabase.from('ml_config').update({
        access_token: null, refresh_token: null, user_id: null,
        connected: false, updated_at: new Date().toISOString(),
      }).eq('id', config.id);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Protected API proxy routes ──────────────────────────────
router.use(authenticate, authorize('admin', 'diretor'));

// GET /api/ml/orders?offset=0&limit=20&status=paid
router.get('/orders', async (req, res) => {
  try {
    const config = await getMLConfig();
    if (!config?.connected) return res.status(400).json({ error: 'Mercado Livre não conectado' });

    const { offset = 0, limit = 20, status, q } = req.query;
    let path = `/orders/search?buyer=${config.user_id}&offset=${offset}&limit=${limit}&sort=date_desc`;
    if (status) path += `&order.status=${status}`;
    if (q) path += `&q=${encodeURIComponent(q)}`;

    const data = await mlFetch(path, config);

    // Enrich order items with product thumbnails
    const itemIds = new Set();
    (data.results || []).forEach(o => {
      (o.order_items || []).forEach(oi => {
        if (oi.item?.id) itemIds.add(oi.item.id);
      });
    });
    if (itemIds.size > 0) {
      try {
        const ids = [...itemIds].slice(0, 20).join(',');
        const items = await mlFetch(`/items?ids=${ids}`, config);
        const thumbMap = {};
        (items || []).forEach(r => {
          if (r.code === 200 && r.body) {
            thumbMap[r.body.id] = r.body.thumbnail || r.body.pictures?.[0]?.url || null;
          }
        });
        (data.results || []).forEach(o => {
          (o.order_items || []).forEach(oi => {
            if (oi.item?.id && thumbMap[oi.item.id]) {
              oi.item.thumbnail = thumbMap[oi.item.id];
            }
          });
        });
      } catch (e) { console.error('[ML] Thumbnail enrichment failed:', e.message); }
    }

    res.json(data);
  } catch (e) {
    console.error('[ML] Orders:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ml/orders/:id
router.get('/orders/:id', async (req, res) => {
  try {
    const config = await getMLConfig();
    if (!config?.connected) return res.status(400).json({ error: 'Mercado Livre não conectado' });
    const data = await mlFetch(`/orders/${req.params.id}`, config);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ml/shipments/:id
router.get('/shipments/:id', async (req, res) => {
  try {
    const config = await getMLConfig();
    if (!config?.connected) return res.status(400).json({ error: 'Mercado Livre não conectado' });
    const data = await mlFetch(`/shipments/${req.params.id}`, config);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ml/shipments — all pending shipments (em trânsito)
router.get('/shipments', async (req, res) => {
  try {
    const config = await getMLConfig();
    if (!config?.connected) return res.status(400).json({ error: 'Mercado Livre não conectado' });

    // Get recent orders that have shipments
    const ordersData = await mlFetch(`/orders/search?buyer=${config.user_id}&sort=date_desc&limit=50`, config);
    const orders = ordersData.results || [];

    // Get shipment details for orders with shipping
    const shipmentsPromises = orders
      .filter(o => o.shipping?.id)
      .map(async (o) => {
        try {
          const ship = await mlFetch(`/shipments/${o.shipping.id}`, config);
          return {
            ...ship,
            order_id: o.id,
            order_items: o.order_items,
            total_amount: o.total_amount,
            buyer: o.buyer,
          };
        } catch (e) { return null; }
      });

    const shipments = (await Promise.all(shipmentsPromises)).filter(Boolean);
    res.json(shipments);
  } catch (e) {
    console.error('[ML] Shipments:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ml/sync-notas — extract NF data from ML orders and save to log_notas_fiscais
router.post('/sync-notas', async (req, res) => {
  try {
    const config = await getMLConfig();
    if (!config?.connected) return res.status(400).json({ error: 'Mercado Livre não conectado' });

    // Fetch recent orders
    const ordersData = await mlFetch(`/orders/search?buyer=${config.user_id}&sort=date_desc&limit=50`, config);
    const orders = ordersData.results || [];

    let imported = 0;
    for (const order of orders) {
      if (!order.order_items?.length) continue;

      // Check if already imported
      const { data: existing } = await supabase.from('log_notas_fiscais')
        .select('id').eq('ml_order_id', String(order.id)).limit(1);
      if (existing?.length) continue;

      // Get seller info
      let sellerName = '';
      try {
        const seller = await mlFetch(`/users/${order.seller?.id}`, config);
        sellerName = seller.nickname || '';
      } catch (e) { /* ignore */ }

      const items = order.order_items.map(i => i.item?.title).join(', ');
      const dataEmissao = order.date_created ? order.date_created.slice(0, 10) : new Date().toISOString().slice(0, 10);

      await supabase.from('log_notas_fiscais').insert({
        numero: String(order.id),
        valor: order.total_amount,
        data_emissao: dataEmissao,
        origem: 'mercadolivre',
        ml_order_id: String(order.id),
        emitente_nome: sellerName,
        serie: items.slice(0, 200),
      });
      imported++;
    }

    res.json({ imported, total: orders.length });
  } catch (e) {
    console.error('[ML] Sync notas:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
