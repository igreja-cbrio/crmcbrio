import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { notificacoes as notifApi } from '../../api';
import MegaMenu from '../ui/mega-menu';
import { CommandSearch } from '../ui/command-search';
import {
  Users, DollarSign, Truck, Tag,
  CalendarDays, FolderKanban, Map,
  UserCheck, UsersRound, Heart, HandHelping, BookOpen,
  Megaphone, BrainCircuit, ShoppingCart,
  Sun, Moon, Bell, LogOut, Search, CheckCheck, Sparkles, Inbox,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from '../ui/dropdown-menu';
import { ScrollArea } from '../ui/scroll-area';

const NAV_ITEMS = [
  {
    id: 1,
    label: 'Administrativo',
    subMenus: [
      {
        title: 'Gestão',
        items: [
          { label: 'Recursos Humanos', description: 'Funcionários, treinamentos e férias', icon: Users, path: '/admin/rh', perm: 'canRH' },
          { label: 'Financeiro', description: 'Contas, transações e reembolsos', icon: DollarSign, path: '/admin/financeiro', perm: 'canFinanceiro' },
          { label: 'Logística', description: 'Fornecedores, compras e pedidos', icon: Truck, path: '/admin/logistica', perm: 'canLogistica' },
          { label: 'Patrimônio', description: 'Bens, localizações e inventário', icon: Tag, path: '/admin/patrimonio', perm: 'canPatrimonio' },
        ],
      },
      {
        title: 'Serviços',
        items: [
          { label: 'Solicitar Compra', description: 'Peça materiais ou serviços', icon: ShoppingCart, path: '/solicitar-compra' },
        ],
      },
      {
        title: 'Inteligência',
        items: [
          { label: 'Assistente IA', description: 'Agentes de auditoria e análise', icon: BrainCircuit, path: '/assistente-ia', perm: 'canIA' },
        ],
      },
    ],
  },
  {
    id: 2,
    label: 'Projetos e Eventos',
    path: '/planejamento',
    subMenus: [
      {
        title: 'Módulos',
        items: [
          { label: 'Eventos', description: 'Gestão de eventos da igreja', icon: CalendarDays, path: '/eventos', perm: 'canAgenda' },
          { label: 'Projetos', description: 'Acompanhamento de projetos', icon: FolderKanban, path: '/projetos', perm: 'canProjetos' },
          { label: 'Expansão', description: 'Metas de expansão', icon: Map, path: '/expansao', perm: 'canExpansao' },
        ],
      },
    ],
  },
  {
    id: 3,
    label: 'Ministerial',
    subMenus: [
      {
        title: 'Áreas',
        items: [
          { label: 'Integração', description: 'Batismo, apresentação e cultos', icon: UserCheck, path: '/ministerial/integracao' },
          { label: 'Grupos', description: 'Dashboard, inscrição e material', icon: UsersRound, path: '/ministerial/grupos' },
          { label: 'Cuidados', description: 'Capelania e aconselhamento', icon: Heart, path: '/ministerial/cuidados' },
          { label: 'Voluntariado', description: 'Check-in e lista de voluntários', icon: HandHelping, path: '/ministerial/voluntariado' },
          { label: 'Membresia', description: 'Cadastro e trilha dos valores', icon: BookOpen, path: '/ministerial/membresia' },
        ],
      },
    ],
  },
  {
    id: 4,
    label: 'Criativo',
    subMenus: [
      {
        title: 'Áreas',
        items: [
          { label: 'Marketing', description: 'Projetos e solicitações', icon: Megaphone, path: '/criativo/marketing' },
        ],
      },
    ],
  },
];

export default function AppShell() {
  const { profile, role, signOut, isAdmin, canRH, canFinanceiro, canLogistica, canPatrimonio, canMembresia, canProjetos, canExpansao, canAgenda, canIA } = useAuth();
  const permMap = { canRH, canFinanceiro, canLogistica, canPatrimonio, canMembresia, canProjetos, canExpansao, canAgenda, canIA };

  // Filtrar itens de navegação por permissões
  const filteredNavItems = NAV_ITEMS.map(section => ({
    ...section,
    subMenus: section.subMenus.map(sub => ({
      ...sub,
      items: sub.items.filter(item => !item.perm || permMap[item.perm] !== false),
    })).filter(sub => sub.items.length > 0),
  })).filter(section => section.subMenus.length > 0);
  const { isDark, setIsDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = (profile?.name || '??')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const [notifCount, setNotifCount] = useState(0);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    loadNotifCount();
    const interval = setInterval(loadNotifCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadNotifCount() {
    try {
      const { count } = await notifApi.count();
      setNotifCount(count);
    } catch { /* backend might not be ready */ }
  }

  async function openNotifs() {
    try {
      const data = await notifApi.list();
      setNotifs(data);
    } catch { }
  }

  async function markRead(id) {
    await notifApi.ler(id);
    setNotifs(n => n.map(x => x.id === id ? { ...x, lida: true } : x));
    setNotifCount(c => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await notifApi.lerTodas();
    setNotifs(n => n.map(x => ({ ...x, lida: true })));
    setNotifCount(0);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--cbrio-bg)', color: 'var(--cbrio-text)' }}>
      {/* Header */}
      <header
        className="flex items-center h-14 sm:h-16 px-4 sm:px-8 shrink-0 border-b border-border z-30 bg-card backdrop-blur-sm bg-opacity-80"
      >
        {/* Logo — click to go to dashboard */}
        <div
          className="flex items-center gap-2.5 mr-4 sm:mr-12 shrink-0 cursor-pointer select-none group"
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && navigate('/')}
        >
          <div className="flex items-center justify-center h-9 w-9 rounded-lg transition-transform group-hover:scale-105" style={{ background: '#00B39D' }}>
            <img
              src="/images/logo-cbrio.svg"
              alt="CBRio"
              className="h-5 w-5"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight whitespace-nowrap" style={{ color: 'var(--cbrio-text)' }}>
              CBRio
            </span>
            <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'var(--cbrio-text3)' }}>
              ERP
            </span>
          </div>
        </div>

        {/* Mega Menu — centered, hidden on mobile */}
        <nav className="hidden md:flex flex-1 items-center justify-center">
          <MegaMenu items={filteredNavItems} role={role} />
        </nav>
        <div className="flex-1 md:hidden" />

        {/* Right side: search, theme toggle, notifications, user */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Search */}
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="hidden sm:flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span>Buscar...</span>
            <kbd className="ml-2 inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notifications */}
          <DropdownMenu onOpenChange={(open) => { if (open) openNotifs(); }}>
            <DropdownMenuTrigger asChild>
              <button
                className="relative flex items-center justify-center h-8 w-8 rounded-lg transition-colors hover:bg-accent"
                style={{ color: 'var(--cbrio-text3)' }}
              >
                <Bell className="h-4 w-4" />
                {notifCount > 0 && (
                  <span className="cbrio-badge-pulse absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#00B39D] px-1 text-[9px] font-bold text-white">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[380px] p-0 rounded-xl shadow-xl border-border/60">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground">Notificações</span>
                <div className="flex items-center gap-2">
                  {role === 'diretor' && (
                    <button
                      onClick={async (e) => { e.stopPropagation(); try { await notifApi.gerar(); loadNotifCount(); openNotifs(); } catch {} }}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      Gerar
                    </button>
                  )}
                  {notifCount > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAllRead(); }}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Marcar lidas
                    </button>
                  )}
                </div>
              </div>

              {/* Notification list */}
              <ScrollArea className="max-h-[360px]">
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                      <Inbox className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                  </div>
                ) : (
                  <div className="cbrio-stagger">
                    {notifs.slice(0, 20).map(n => {
                      const MOD_COLORS = { rh: '#00B39D', financeiro: '#0ea5e9', logistica: '#8b5cf6', patrimonio: '#f59e0b', eventos: '#ec4899', projetos: '#6366f1', sistema: '#6b7280' };
                      const MOD_LABELS = { rh: 'RH', financeiro: 'Financeiro', logistica: 'Logística', patrimonio: 'Patrimônio', eventos: 'Eventos', projetos: 'Projetos', sistema: 'Sistema' };
                      const SEV_COLORS = { urgente: '#ef4444', aviso: '#f59e0b', info: '#00B39D' };
                      const modColor = MOD_COLORS[n.modulo] || '#6b7280';
                      const sevColor = SEV_COLORS[n.severidade] || '#00B39D';
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.lida) markRead(n.id);
                            if (n.link) { navigate(n.link); }
                          }}
                          className="group flex gap-3 px-4 py-3 cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/50"
                          style={{ borderLeft: `3px solid ${sevColor}` }}
                        >
                          {/* Unread dot */}
                          <div className="pt-1.5 shrink-0">
                            {!n.lida ? (
                              <div className="h-2 w-2 rounded-full" style={{ background: sevColor }} />
                            ) : (
                              <div className="h-2 w-2" />
                            )}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              {n.modulo && (
                                <span
                                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded"
                                  style={{ color: '#fff', background: modColor }}
                                >
                                  {MOD_LABELS[n.modulo] || n.modulo}
                                </span>
                              )}
                              {n.severidade === 'urgente' && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded bg-red-500 text-white">
                                  Urgente
                                </span>
                              )}
                            </div>
                            <p className={`text-[13px] leading-snug ${n.lida ? 'text-foreground/70' : 'text-foreground font-semibold'}`}>
                              {n.titulo}
                            </p>
                            {n.mensagem && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                                {n.mensagem}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                              {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Separator */}
          <div className="h-6 w-px mx-2" style={{ background: 'var(--cbrio-border)' }} />

          {/* User avatar + sign out */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 cursor-pointer rounded-lg px-1.5 py-1 -mx-1.5 transition-colors hover:bg-accent"
              onClick={() => navigate('/perfil')}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate('/perfil')}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00B39D] text-white dark:text-[#0a0a0a] text-[11px] font-semibold shrink-0">
                {initials}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-sm font-medium truncate leading-tight" style={{ color: 'var(--cbrio-text)' }}>{profile?.name || '—'}</p>
                <p className="text-[10px] capitalize" style={{ color: 'var(--cbrio-text3)' }}>{profile?.role || ''}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content with page transition */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div key={location.pathname} style={{
          animation: 'fadeInUp 0.25s ease-out',
        }}>
          <Outlet />
        </div>
      </main>
      <CommandSearch />
    </div>
  );
}
