import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificacoes as notifApi, rh, financeiro, patrimonio, logistica } from '../api';
import { NumberTicker } from '../components/ui/number-ticker';
import {
  Users, DollarSign, CalendarDays, FolderKanban,
  Truck, Tag, BookOpen, ShoppingCart, Bell, ArrowRight,
  TrendingUp, TrendingDown, Clock, AlertTriangle,
  Package, ChevronRight, Sparkles,
  Activity,
} from 'lucide-react';

/* ── Quick-access modules ──────────────────────── */
const MODULES = [
  { label: 'Recursos Humanos', desc: 'Colaboradores e DP', icon: Users, path: '/admin/rh', color: '#8b5cf6', perm: 'canRH' },
  { label: 'Financeiro', desc: 'Contas e transações', icon: DollarSign, path: '/admin/financeiro', color: '#10b981', perm: 'canFinanceiro' },
  { label: 'Eventos', desc: 'Gestão de eventos', icon: CalendarDays, path: '/eventos', color: '#3b82f6', perm: 'canAgenda' },
  { label: 'Projetos', desc: 'Acompanhamento', icon: FolderKanban, path: '/projetos', color: '#f59e0b', perm: 'canProjetos' },
  { label: 'Logística', desc: 'Compras e pedidos', icon: Truck, path: '/admin/logistica', color: '#ef4444', perm: 'canLogistica' },
  { label: 'Patrimônio', desc: 'Bens e inventário', icon: Tag, path: '/admin/patrimonio', color: '#6366f1', perm: 'canPatrimonio' },
  { label: 'Membresia', desc: 'Membros e famílias', icon: BookOpen, path: '/ministerial/membresia', color: '#00B39D', perm: 'canMembresia' },
  { label: 'Solicitar Compra', desc: 'Peça materiais', icon: ShoppingCart, path: '/solicitar-compra', color: '#ec4899' },
];

/* ── KPI card component ────────────────────────── */
function KpiCard({ icon: Icon, label, value, prefix, suffix, color, trend, trendLabel, onClick, delay = 0 }) {
  return (
    <button
      onClick={onClick}
      className="group relative rounded-xl border text-left transition-all duration-200 hover:shadow-md hover:-translate-y-px cursor-pointer w-full"
      style={{
        background: 'var(--cbrio-card)',
        borderColor: 'var(--cbrio-border)',
      }}
    >
      {/* Gradient accent top */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }}
      />
      <div style={{ padding: '16px 20px 14px' }}>
        <div className="flex items-start justify-between mb-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-transform group-hover:scale-110"
            style={{ background: `${color}15` }}
          >
            <Icon className="w-[18px] h-[18px]" style={{ color }} />
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 text-xs font-medium" style={{ color: trend >= 0 ? '#10b981' : '#ef4444' }}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trend >= 0 ? '+' : ''}{trend}%</span>
            </div>
          )}
        </div>
        <div className="mb-1">
          <span className="text-2xl font-bold" style={{ color: 'var(--cbrio-text)' }}>
            {value !== null && value !== undefined ? (
              <NumberTicker value={value} prefix={prefix} suffix={suffix} delay={delay} />
            ) : (
              <span className="inline-block w-14 h-6 rounded animate-pulse" style={{ background: 'var(--cbrio-border)' }} />
            )}
          </span>
        </div>
        <p className="text-xs font-medium" style={{ color: 'var(--cbrio-text3)' }}>{label}</p>
        {trendLabel && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--cbrio-text3)' }}>{trendLabel}</p>
        )}
      </div>
    </button>
  );
}

/* ── Notification item ─────────────────────────── */
const SEV_COLORS = { urgente: '#ef4444', aviso: '#f59e0b', info: '#00B39D' };
const MOD_COLORS = { rh: '#8b5cf6', financeiro: '#10b981', logistica: '#ef4444', patrimonio: '#6366f1', eventos: '#3b82f6', projetos: '#f59e0b', sistema: '#6b7280' };
const MOD_LABELS = { rh: 'RH', financeiro: 'Financeiro', logistica: 'Logística', patrimonio: 'Patrimônio', eventos: 'Eventos', projetos: 'Projetos', sistema: 'Sistema' };

function NotifItem({ n, onClick }) {
  const sevColor = SEV_COLORS[n.severidade] || '#00B39D';
  const modColor = MOD_COLORS[n.modulo] || '#6b7280';
  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(n.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }, [n.created_at]);

  return (
    <button
      onClick={onClick}
      className="flex items-start gap-2.5 w-full text-left px-4 py-3 transition-colors rounded-lg group cursor-pointer"
      style={{ background: n.lida ? 'transparent' : `${sevColor}06` }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--cbrio-input-bg)'}
      onMouseLeave={e => e.currentTarget.style.background = n.lida ? 'transparent' : `${sevColor}06`}
    >
      <div
        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
        style={{ background: n.lida ? 'var(--cbrio-border)' : sevColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-px rounded"
            style={{ background: `${modColor}18`, color: modColor }}
          >
            {MOD_LABELS[n.modulo] || n.modulo}
          </span>
          <span className="text-[10px] ml-auto shrink-0" style={{ color: 'var(--cbrio-text3)' }}>
            {timeAgo}
          </span>
        </div>
        <p className="text-[13px] leading-snug" style={{ color: 'var(--cbrio-text)', fontWeight: n.lida ? 400 : 600 }}>
          {n.titulo}
        </p>
        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--cbrio-text2)' }}>
          {n.mensagem}
        </p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 mt-1.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--cbrio-text3)' }} />
    </button>
  );
}

/* ── Main Dashboard ────────────────────────────── */
export default function Dashboard() {
  const { profile, isAdmin, canRH, canFinanceiro, canLogistica, canPatrimonio, canAgenda, canProjetos, canMembresia } = useAuth();
  const navigate = useNavigate();

  const permMap = { canRH, canFinanceiro, canLogistica, canPatrimonio, canAgenda, canProjetos, canMembresia };
  const links = MODULES.filter(l => !l.perm || isAdmin || permMap[l.perm]);

  // ── Data state ──
  const [notifs, setNotifs] = useState([]);
  const [rhData, setRhData] = useState(null);
  const [finData, setFinData] = useState(null);
  const [patData, setPatData] = useState(null);
  const [logData, setLogData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const promises = [];

    promises.push(notifApi.list().then(setNotifs).catch(() => {}));

    if (canRH !== false)
      promises.push(rh.dashboard().then(setRhData).catch(() => {}));
    if (canFinanceiro !== false)
      promises.push(financeiro.dashboard().then(setFinData).catch(() => {}));
    if (canPatrimonio !== false)
      promises.push(patrimonio.dashboard().then(setPatData).catch(() => {}));
    if (canLogistica !== false)
      promises.push(logistica.dashboard().then(setLogData).catch(() => {}));

    Promise.allSettled(promises).finally(() => setLoading(false));
  }, []);

  const unread = notifs.filter(n => !n.lida);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = (profile?.name || '').split(' ')[0];

  // ── Build KPI cards from real data ──
  const kpis = [];

  if (rhData) {
    kpis.push(
      { icon: Users, label: 'Colaboradores ativos', value: rhData.ativos ?? rhData.total ?? 0, color: '#8b5cf6', path: '/admin/rh', delay: 0 },
    );
    if (rhData.ferias > 0) kpis.push(
      { icon: Clock, label: 'Em férias', value: rhData.ferias, color: '#f59e0b', path: '/admin/rh', delay: 0.1 },
    );
  }

  if (finData) {
    kpis.push(
      { icon: DollarSign, label: 'Saldo total', value: finData.saldo ?? finData.saldoTotal ?? 0, prefix: 'R$ ', color: '#10b981', path: '/admin/financeiro', delay: 0.15 },
    );
    if ((finData.contasVencendo ?? finData.contas_vencendo ?? 0) > 0) kpis.push(
      { icon: AlertTriangle, label: 'Contas vencendo', value: finData.contasVencendo ?? finData.contas_vencendo ?? 0, color: '#ef4444', path: '/admin/financeiro', delay: 0.2 },
    );
  }

  if (patData) {
    kpis.push(
      { icon: Package, label: 'Bens cadastrados', value: patData.total ?? 0, color: '#6366f1', path: '/admin/patrimonio', delay: 0.25 },
    );
  }

  if (logData) {
    if ((logData.pedidosPendentes ?? logData.pedidos_pendentes ?? 0) > 0) kpis.push(
      { icon: Truck, label: 'Pedidos pendentes', value: logData.pedidosPendentes ?? logData.pedidos_pendentes ?? 0, color: '#ef4444', path: '/admin/logistica', delay: 0.3 },
    );
  }

  if (unread.length > 0) {
    kpis.push(
      { icon: Bell, label: 'Notificações não lidas', value: unread.length, color: '#00B39D', delay: 0.1 },
    );
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
      {/* ── Hero greeting ────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border mb-5" style={{ background: 'var(--cbrio-card)', borderColor: 'var(--cbrio-border)' }}>
        {/* Decorative gradient */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          background: 'radial-gradient(ellipse at top right, #00B39D, transparent 60%), radial-gradient(ellipse at bottom left, #8b5cf6, transparent 60%)',
        }} />
        <div className="relative px-6 py-5 sm:px-8 sm:py-6">
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--cbrio-text3)' }}>
            {dateStr}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--cbrio-text)' }}>
            {greeting}, {firstName}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--cbrio-text2)' }}>
            Aqui está o resumo do seu dia no CBRio ERP.
          </p>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────── */}
      {kpis.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4" style={{ color: '#00B39D' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--cbrio-text)' }}>Visão Geral</h2>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {kpis.map((kpi, i) => (
              <KpiCard
                key={i}
                icon={kpi.icon}
                label={kpi.label}
                value={kpi.value}
                prefix={kpi.prefix}
                suffix={kpi.suffix}
                color={kpi.color}
                trend={kpi.trend}
                trendLabel={kpi.trendLabel}
                onClick={kpi.path ? () => navigate(kpi.path) : undefined}
                delay={kpi.delay}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Main content grid ────────────────────── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)' }}>

        {/* Left column — Quick access */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: '#00B39D' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--cbrio-text)' }}>Acesso Rápido</h2>
          </div>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {links.map(link => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="group flex items-center gap-3 rounded-xl border text-left transition-all duration-200 hover:shadow-md hover:-translate-y-px cursor-pointer w-full"
                  style={{
                    background: 'var(--cbrio-card)',
                    borderColor: 'var(--cbrio-border)',
                    padding: '12px 16px',
                  }}
                >
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-transform group-hover:scale-110"
                    style={{ background: `${link.color}12` }}
                  >
                    <Icon className="w-[18px] h-[18px]" style={{ color: link.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--cbrio-text)' }}>{link.label}</div>
                    <div className="text-[11px]" style={{ color: 'var(--cbrio-text3)' }}>{link.desc}</div>
                  </div>
                  <ArrowRight
                    className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-60 transition-all group-hover:translate-x-0.5"
                    style={{ color: 'var(--cbrio-text3)' }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column — Notifications feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: '#00B39D' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--cbrio-text)' }}>
                Atividade Recente
              </h2>
              {unread.length > 0 && (
                <span
                  className="flex items-center justify-center h-5 min-w-5 rounded-full text-[10px] font-bold px-1.5"
                  style={{ background: '#00B39D', color: '#fff' }}
                >
                  {unread.length}
                </span>
              )}
            </div>
          </div>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--cbrio-card)', borderColor: 'var(--cbrio-border)' }}
          >
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 animate-pulse" style={{ background: 'var(--cbrio-border)' }} />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 rounded animate-pulse w-16" style={{ background: 'var(--cbrio-border)' }} />
                      <div className="h-4 rounded animate-pulse w-3/4" style={{ background: 'var(--cbrio-border)' }} />
                      <div className="h-3 rounded animate-pulse w-1/2" style={{ background: 'var(--cbrio-border)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifs.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--cbrio-text3)' }} />
                <p className="text-sm" style={{ color: 'var(--cbrio-text3)' }}>Nenhuma notificação recente</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--cbrio-border)' }}>
                <div className="max-h-[420px] overflow-y-auto py-1">
                  {notifs.slice(0, 10).map(n => (
                    <NotifItem
                      key={n.id}
                      n={n}
                      onClick={() => {
                        if (n.link) navigate(n.link);
                      }}
                    />
                  ))}
                </div>
                {notifs.length > 10 && (
                  <div className="p-3 text-center">
                    <button
                      onClick={() => navigate('/admin/notificacao-regras')}
                      className="text-xs font-medium transition-colors cursor-pointer"
                      style={{ color: '#00B39D' }}
                    >
                      Ver todas as notificações →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
