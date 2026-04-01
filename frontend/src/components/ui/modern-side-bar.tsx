"use client";
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  Users,
  DollarSign,
  Truck,
  Tag,
  Calendar,
  FolderKanban,
  Map,
  Heart,
  UsersRound,
  HandHeart,
  HandHelping,
  BookOpen,
  Palette,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Church,
  BarChart3,
  FileText,
  CreditCard,
  ClipboardList,
  Package,
  ShoppingCart,
  Receipt,
  Warehouse,
  MapPin,
  RotateCcw,
  ClipboardCheck,
  UserPlus,
  GraduationCap,
  Palmtree,
  UserCheck,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavigationGroup {
  id: string;
  grupo: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  items: SubItem[];
}

const NAV: NavigationGroup[] = [
  {
    id: 'admin',
    grupo: 'Administrativo',
    icon: BarChart3,
    roles: ['admin', 'diretor'],
    items: [
      { label: 'RH', path: '/admin/rh', icon: Users },
      { label: 'Funcionários', path: '/admin/rh?tab=funcionarios', icon: UserPlus },
      { label: 'Treinamentos', path: '/admin/rh?tab=treinamentos', icon: GraduationCap },
      { label: 'Férias/Licenças', path: '/admin/rh?tab=ferias', icon: Palmtree },
      { label: 'Financeiro', path: '/admin/financeiro', icon: DollarSign },
      { label: 'Contas', path: '/admin/financeiro?tab=contas', icon: CreditCard },
      { label: 'Transações', path: '/admin/financeiro?tab=transacoes', icon: Receipt },
      { label: 'Contas a Pagar', path: '/admin/financeiro?tab=pagar', icon: FileText },
      { label: 'Reembolsos', path: '/admin/financeiro?tab=reembolsos', icon: ClipboardList },
      { label: 'Logística', path: '/admin/logistica', icon: Truck },
      { label: 'Fornecedores', path: '/admin/logistica?tab=fornecedores', icon: ShoppingCart },
      { label: 'Solicitações', path: '/admin/logistica?tab=solicitacoes', icon: ClipboardCheck },
      { label: 'Pedidos', path: '/admin/logistica?tab=pedidos', icon: Package },
      { label: 'Patrimônio', path: '/admin/patrimonio', icon: Tag },
      { label: 'Bens', path: '/admin/patrimonio?tab=bens', icon: Warehouse },
      { label: 'Localizações', path: '/admin/patrimonio?tab=localizacoes', icon: MapPin },
      { label: 'Inventários', path: '/admin/patrimonio?tab=inventarios', icon: RotateCcw },
    ],
  },
  {
    id: 'projetos',
    grupo: 'Projetos e Eventos',
    icon: FolderKanban,
    roles: ['assistente', 'admin', 'diretor'],
    items: [
      { label: 'Eventos', path: '/eventos', icon: Calendar },
      { label: 'Projetos', path: '/projetos', icon: FolderKanban },
      { label: 'Expansão', path: '/expansao', icon: Map },
    ],
  },
  {
    id: 'ministerial',
    grupo: 'Ministerial',
    icon: Church,
    roles: ['admin', 'diretor'],
    items: [
      { label: 'Integração', path: '/ministerial/integracao', icon: UserCheck },
      { label: 'Grupos', path: '/ministerial/grupos', icon: UsersRound },
      { label: 'Cuidados', path: '/ministerial/cuidados', icon: Heart },
      { label: 'Voluntariado', path: '/ministerial/voluntariado', icon: HandHelping },
      { label: 'Membresia', path: '/ministerial/membresia', icon: BookOpen },
    ],
  },
  {
    id: 'criativo',
    grupo: 'Criativo',
    icon: Palette,
    roles: ['admin', 'diretor'],
    items: [
      { label: 'Marketing', path: '/criativo/marketing', icon: Megaphone },
    ],
  },
];

export function Sidebar() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['admin', 'projetos']);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev =>
      prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
    );
  };

  const isGroupActive = (group: NavigationGroup) => {
    return group.items.some(item => location.pathname === item.path.split('?')[0]);
  };

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const initials = (profile?.name || '??')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-white shadow-md border border-slate-200 md:hidden hover:bg-slate-50 transition-all"
        aria-label="Toggle sidebar"
      >
        {isOpen ?
          <X className="h-5 w-5 text-slate-600" /> :
          <Menu className="h-5 w-5 text-slate-600" />
        }
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full bg-sidebar text-sidebar-foreground z-40 transition-all duration-300 ease-in-out flex flex-col border-r border-sidebar-border",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-[72px]" : "w-[260px]",
          "md:translate-x-0 md:static md:z-auto"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center shadow-sm">
                <Church className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-white text-sm">CBRio ERP</span>
                <span className="text-[11px] text-sidebar-muted">Sistema de Gestão</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center mx-auto shadow-sm">
              <Church className="h-5 w-5 text-white" />
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-md hover:bg-sidebar-accent transition-all"
          >
            {isCollapsed ?
              <ChevronRight className="h-4 w-4 text-sidebar-muted" /> :
              <ChevronLeft className="h-4 w-4 text-sidebar-muted" />
            }
          </button>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="px-3 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-muted" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-9 pr-3 py-2 bg-sidebar-accent border border-sidebar-border rounded-md text-sm text-sidebar-foreground placeholder-sidebar-muted focus:outline-none focus:ring-1 focus:ring-sidebar-primary transition-all"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-1 overflow-y-auto">
          {NAV.map((group) => {
            if (!group.roles.includes(role || '')) return null;
            const GroupIcon = group.icon;
            const isExpanded = openGroups.includes(group.id);
            const groupActive = isGroupActive(group);

            return (
              <div key={group.id} className="mb-1">
                {/* Group header */}
                <button
                  onClick={() => isCollapsed ? undefined : toggleGroup(group.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all group",
                    groupActive ? "bg-sidebar-accent text-white" : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                    isCollapsed ? "justify-center px-2" : ""
                  )}
                  title={isCollapsed ? group.grupo : undefined}
                >
                  <GroupIcon className={cn(
                    "h-4 w-4 shrink-0",
                    groupActive ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground"
                  )} />
                  {!isCollapsed && (
                    <>
                      <span className="text-[13px] font-semibold flex-1">{group.grupo}</span>
                      <ChevronDown className={cn(
                        "h-3.5 w-3.5 text-sidebar-muted transition-transform duration-200",
                        isExpanded ? "rotate-0" : "-rotate-90"
                      )} />
                    </>
                  )}
                  {/* Tooltip collapsed */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                      {group.grupo}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1.5 h-1.5 bg-slate-800 rotate-45" />
                    </div>
                  )}
                </button>

                {/* Sub-items */}
                {!isCollapsed && isExpanded && (
                  <div className="ml-3 pl-3 border-l border-sidebar-border/50 mt-0.5 mb-1">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const basePath = item.path.split('?')[0];
                      const isActive = location.pathname === basePath;

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all group/item",
                            isActive
                              ? "bg-sidebar-primary/20 text-sidebar-primary-foreground font-medium"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                          )}
                        >
                          <ItemIcon className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isActive ? "text-sidebar-primary" : "text-sidebar-muted group-hover/item:text-sidebar-foreground"
                          )} />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Profile + Logout */}
        <div className="mt-auto border-t border-sidebar-border">
          <div className={cn("border-b border-sidebar-border/50", isCollapsed ? "py-3 px-2" : "p-3")}>
            {!isCollapsed ? (
              <div className="flex items-center px-2 py-2 rounded-md hover:bg-sidebar-accent/30 transition-colors">
                <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-xs">{initials}</span>
                </div>
                <div className="flex-1 min-w-0 ml-2.5">
                  <p className="text-sm font-medium text-white truncate">{profile?.name ?? '—'}</p>
                  <p className="text-[11px] text-sidebar-muted truncate capitalize">{profile?.role ?? ''}</p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full ml-2" title="Online" />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-9 h-9 bg-sidebar-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-xs">{initials}</span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-sidebar" />
                </div>
              </div>
            )}
          </div>

          <div className="p-2">
            <button
              onClick={handleSignOut}
              className={cn(
                "w-full flex items-center rounded-md text-left transition-all group text-red-400 hover:bg-red-500/10 hover:text-red-300",
                isCollapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2"
              )}
              title={isCollapsed ? "Sair" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0 text-red-400 group-hover:text-red-300" />
              {!isCollapsed && <span className="text-sm">Sair</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  Sair
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
