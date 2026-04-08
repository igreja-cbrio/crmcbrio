import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificacoes as notifApi, rh, financeiro, patrimonio, logistica } from '../api';
import { StatisticsCard } from '../components/ui/statistics-card';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Users, DollarSign, CalendarDays, FolderKanban,
  Truck, Tag, BookOpen, ShoppingCart, Bell, ArrowRight,
  Clock, AlertTriangle, Package, ChevronRight, Sparkles,
  Activity, LayoutGrid,
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
      className="flex items-start gap-2.5 w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 rounded-lg group cursor-pointer"
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
          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
            {timeAgo}
          </span>
        </div>
        <p className={`text-[13px] leading-snug text-foreground ${n.lida ? 'font-normal' : 'font-semibold'}`}>
          {n.titulo}
        </p>
        <p className="text-[11px] mt-0.5 leading-relaxed text-muted-foreground">
          {n.mensagem}
        </p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 mt-1.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground" />
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
      { title: 'Colaboradores Ativos', value: rhData.ativos ?? rhData.total ?? 0, icon: Users, iconColor: '#8b5cf6', path: '/admin/rh' },
    );
    if (rhData.ferias > 0) kpis.push(
      { title: 'Em Férias', value: rhData.ferias, icon: Clock, iconColor: '#f59e0b', path: '/admin/rh' },
    );
  }

  if (finData) {
    const saldo = finData.saldo ?? finData.saldoTotal ?? 0;
    kpis.push(
      { title: 'Saldo Total', value: `R$ ${Number(saldo).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, icon: DollarSign, iconColor: '#10b981', path: '/admin/financeiro' },
    );
    const vencendo = finData.contasVencendo ?? finData.contas_vencendo ?? 0;
    if (vencendo > 0) kpis.push(
      { title: 'Contas Vencendo', value: vencendo, icon: AlertTriangle, iconColor: '#ef4444', path: '/admin/financeiro' },
    );
  }

  if (patData) {
    kpis.push(
      { title: 'Bens Cadastrados', value: patData.total ?? 0, icon: Package, iconColor: '#6366f1', path: '/admin/patrimonio' },
    );
  }

  if (logData) {
    const pendentes = logData.pedidosPendentes ?? logData.pedidos_pendentes ?? 0;
    if (pendentes > 0) kpis.push(
      { title: 'Pedidos Pendentes', value: pendentes, icon: Truck, iconColor: '#ef4444', path: '/admin/logistica' },
    );
  }

  if (unread.length > 0) {
    kpis.push(
      { title: 'Notificações', value: unread.length, icon: Bell, iconColor: '#00B39D' },
    );
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-[1400px] mx-auto px-6 space-y-8 pb-8">
      {/* ── Greeting ────────────────────────────── */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
          {dateStr}
        </p>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {greeting}, {firstName}
        </h1>
      </div>

      {/* ── KPI Cards ────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Visão Geral</h2>
        </div>
        {loading ? (
          <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-[96px] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : kpis.length > 0 ? (
          <div className="cbrio-stagger grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((kpi, i) => (
              <StatisticsCard
                key={i}
                title={kpi.title}
                value={kpi.value}
                icon={kpi.icon}
                iconColor={kpi.iconColor}
                onClick={kpi.path ? () => navigate(kpi.path) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <StatisticsCard title="Colaboradores" value="—" icon={Users} iconColor="#8b5cf6" />
            <StatisticsCard title="Saldo" value="—" icon={DollarSign} iconColor="#10b981" />
            <StatisticsCard title="Bens" value="—" icon={Package} iconColor="#6366f1" />
            <StatisticsCard title="Pedidos" value="—" icon={Truck} iconColor="#ef4444" />
            <StatisticsCard title="Notificações" value="0" icon={Bell} iconColor="#00B39D" />
          </div>
        )}
      </section>

      {/* ── Quick access modules ─────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Acesso Rápido</h2>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {links.map(link => {
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card shadow-sm text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer w-full px-5 py-4"
              >
                <div
                  className="flex items-center justify-center size-11 rounded-xl shrink-0 transition-transform group-hover:scale-110"
                  style={{ background: `${link.color}14` }}
                >
                  <Icon className="size-5" style={{ color: link.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{link.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{link.desc}</div>
                </div>
                <ArrowRight className="size-4 shrink-0 opacity-0 group-hover:opacity-60 transition-all group-hover:translate-x-0.5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Notifications feed — full width ──────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Atividade Recente
            </h2>
            {unread.length > 0 && (
              <span className="flex items-center justify-center h-5 min-w-5 rounded-full text-[10px] font-bold px-1.5 bg-primary text-primary-foreground">
                {unread.length}
              </span>
            )}
          </div>
          {notifs.length > 0 && (
            <button
              onClick={() => navigate('/admin/notificacao-regras')}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              Ver todas →
            </button>
          )}
        </div>
        <Card className="py-0 gap-0 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 animate-pulse bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 rounded animate-pulse w-16 bg-muted" />
                      <div className="h-4 rounded animate-pulse w-3/4 bg-muted" />
                      <div className="h-3 rounded animate-pulse w-1/2 bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="size-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Bell className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Tudo em dia</p>
                <p className="text-xs text-muted-foreground">Nenhuma notificação recente</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40">
                <div className="py-1">
                  {notifs.slice(0, Math.ceil(Math.min(notifs.length, 12) / 2)).map(n => (
                    <NotifItem
                      key={n.id}
                      n={n}
                      onClick={() => { if (n.link) navigate(n.link); }}
                    />
                  ))}
                </div>
                {notifs.length > 1 && (
                  <div className="py-1">
                    {notifs.slice(Math.ceil(Math.min(notifs.length, 12) / 2), 12).map(n => (
                      <NotifItem
                        key={n.id}
                        n={n}
                        onClick={() => { if (n.link) navigate(n.link); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
