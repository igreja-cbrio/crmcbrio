import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { notificacoes as notifApi } from '../../api';
import MegaMenu from '../ui/mega-menu';
import {
  Users, DollarSign, Truck, Tag,
  CalendarDays, FolderKanban, Map,
  UserCheck, UsersRound, Heart, HandHelping, BookOpen,
  Megaphone,
  Sun, Moon, Bell, LogOut, Check,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    id: 1,
    label: 'Administrativo',
    subMenus: [
      {
        title: 'Gestão',
        items: [
          { label: 'Recursos Humanos', description: 'Funcionários, treinamentos e férias', icon: Users, path: '/admin/rh' },
          { label: 'Financeiro', description: 'Contas, transações e reembolsos', icon: DollarSign, path: '/admin/financeiro' },
          { label: 'Logística', description: 'Fornecedores, compras e pedidos', icon: Truck, path: '/admin/logistica' },
          { label: 'Patrimônio', description: 'Bens, localizações e inventário', icon: Tag, path: '/admin/patrimonio' },
        ],
      },
    ],
  },
  {
    id: 2,
    label: 'Projetos e Eventos',
    subMenus: [
      {
        title: 'Módulos',
        items: [
          { label: 'Eventos', description: 'Gestão de eventos da igreja', icon: CalendarDays, path: '/eventos' },
          { label: 'Projetos', description: 'Acompanhamento de projetos', icon: FolderKanban, path: '/projetos' },
          { label: 'Expansão', description: 'Metas de expansão', icon: Map, path: '/expansao' },
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
  const { profile, role, signOut } = useAuth();
  const { isDark, setIsDark } = useTheme();
  const navigate = useNavigate();

  const initials = (profile?.name || '??')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const [notifCount, setNotifCount] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

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
    setShowNotifs(!showNotifs);
    if (!showNotifs) {
      try {
        const data = await notifApi.list();
        setNotifs(data);
      } catch { }
    }
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
        className="flex items-center h-16 px-8 shrink-0 border-b z-30"
        style={{ background: 'var(--cbrio-card)', borderColor: 'var(--cbrio-border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mr-12 shrink-0">
          <img
            src="/images/logo-cbrio.svg"
            alt="CBRio"
            className="h-6 w-6"
            style={{ filter: isDark
              ? 'invert(56%) sepia(30%) saturate(600%) hue-rotate(140deg) brightness(85%)'
              : 'invert(35%) sepia(20%) saturate(800%) hue-rotate(140deg) brightness(75%)'
            }}
          />
          <span className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--cbrio-text)' }}>
            CBRio ERP
          </span>
        </div>

        {/* Mega Menu — centered */}
        <nav className="flex-1 flex items-center justify-center">
          <MegaMenu items={NAV_ITEMS} role={role} />
        </nav>

        {/* Right side: theme toggle, notifications, user */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex items-center justify-center h-8 w-8 rounded-lg transition-colors"
            style={{ color: 'var(--cbrio-text3)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--cbrio-border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={openNotifs}
              className="relative flex items-center justify-center h-8 w-8 rounded-lg transition-colors"
              style={{ color: 'var(--cbrio-text3)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--cbrio-border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Bell className="h-4 w-4" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#00B39D] px-1 text-[9px] font-bold text-[#0a0a0a]">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifs && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowNotifs(false)} />
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 8,
                  width: 360, maxHeight: 420, overflow: 'auto',
                  background: 'var(--cbrio-card)', border: '1px solid var(--cbrio-border)',
                  borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', zIndex: 50,
                }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--cbrio-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--cbrio-text)' }}>Notificações</span>
                    {notifCount > 0 && (
                      <button onClick={markAllRead} style={{ fontSize: 12, color: '#00B39D', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  {notifs.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--cbrio-text3)', fontSize: 13 }}>
                      Nenhuma notificação
                    </div>
                  ) : (
                    notifs.slice(0, 20).map(n => (
                      <div
                        key={n.id}
                        onClick={() => !n.lida && markRead(n.id)}
                        style={{
                          padding: '14px 20px', borderBottom: '1px solid var(--cbrio-border)',
                          cursor: n.lida ? 'default' : 'pointer',
                          background: n.lida ? 'transparent' : '#00B39D08',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: n.lida ? 400 : 600, color: 'var(--cbrio-text)', margin: 0 }}>{n.titulo}</p>
                            <p style={{ fontSize: 12, color: 'var(--cbrio-text2)', margin: '4px 0 0', lineHeight: 1.4 }}>{n.mensagem}</p>
                          </div>
                          {!n.lida && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00B39D', flexShrink: 0, marginTop: 4 }} />}
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--cbrio-text3)', marginTop: 6 }}>
                          {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Separator */}
          <div className="h-6 w-px mx-2" style={{ background: 'var(--cbrio-border)' }} />

          {/* User avatar + sign out */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00B39D] text-[#0a0a0a] text-[11px] font-semibold shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-sm font-medium truncate leading-tight" style={{ color: 'var(--cbrio-text)' }}>{profile?.name || '—'}</p>
              <p className="text-[10px] capitalize" style={{ color: 'var(--cbrio-text3)' }}>{profile?.role || ''}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center h-8 w-8 rounded-lg transition-colors"
              style={{ color: 'var(--cbrio-text3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ef444418'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cbrio-text3)'; }}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
