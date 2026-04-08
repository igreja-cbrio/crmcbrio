import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificacoes as notifApi } from '../api';
import { Button } from '../components/ui/button';
import {
  Users, DollarSign, CalendarDays, FolderKanban,
  Truck, Tag, BookOpen, ShoppingCart, Bell, ArrowRight,
} from 'lucide-react';

const C = {
  text: 'var(--cbrio-text)', text2: 'var(--cbrio-text2)', text3: 'var(--cbrio-text3)',
  card: 'var(--cbrio-card)', border: 'var(--cbrio-border)', primary: '#00B39D',
};

const QUICK_LINKS = [
  { label: 'Recursos Humanos', icon: Users, path: '/admin/rh', color: '#8b5cf6', perm: 'canRH' },
  { label: 'Financeiro', icon: DollarSign, path: '/admin/financeiro', color: '#10b981', perm: 'canFinanceiro' },
  { label: 'Eventos', icon: CalendarDays, path: '/eventos', color: '#3b82f6', perm: 'canAgenda' },
  { label: 'Projetos', icon: FolderKanban, path: '/projetos', color: '#f59e0b', perm: 'canProjetos' },
  { label: 'Logística', icon: Truck, path: '/admin/logistica', color: '#ef4444', perm: 'canLogistica' },
  { label: 'Patrimônio', icon: Tag, path: '/admin/patrimonio', color: '#6b7280', perm: 'canPatrimonio' },
  { label: 'Membresia', icon: BookOpen, path: '/ministerial/membresia', color: '#00B39D', perm: 'canMembresia' },
  { label: 'Solicitar Compra', icon: ShoppingCart, path: '/solicitar-compra', color: '#8b5cf6' },
];

export default function Dashboard() {
  const { profile, isAdmin, canRH, canFinanceiro, canLogistica, canPatrimonio, canAgenda, canProjetos, canMembresia } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);

  const permMap = { canRH, canFinanceiro, canLogistica, canPatrimonio, canAgenda, canProjetos, canMembresia };

  const links = QUICK_LINKS.filter(l => !l.perm || isAdmin || permMap[l.perm]);

  useEffect(() => {
    notifApi.list().then(setNotifs).catch(() => {});
  }, []);

  const unread = notifs.filter(n => !n.lida);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = (profile?.name || '').split(' ')[0];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 32, marginTop: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.25 }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ fontSize: 14, color: C.text3, marginTop: 4, lineHeight: 1.5 }}>
          Bem-vindo ao CBRio ERP. Aqui está um resumo rápido do seu dia.
        </p>
      </div>

      {/* Notifications preview */}
      {unread.length > 0 && (
        <div style={{
          background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: 16, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell className="h-4 w-4" style={{ color: C.primary }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{unread.length} notificação(ões) não lida(s)</span>
            </div>
          </div>
          {unread.slice(0, 3).map(n => (
            <div key={n.id} style={{
              padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 14, color: C.text2, lineHeight: 1.5,
            }}>
              <strong style={{ color: C.text }}>{n.titulo}</strong>
              <span style={{ marginLeft: 8, fontSize: 12, color: C.text3 }}>{n.modulo}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick links grid */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: C.text2, marginBottom: 12 }}>Acesso Rápido</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
        {links.map(link => {
          const Icon = link.icon;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="cbrio-interactive"
              style={{
                background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: 16,
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: `${link.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon style={{ width: 20, height: 20, color: link.color }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{link.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tip */}
      <div style={{
        background: `${C.primary}08`, borderRadius: 12, border: `1px solid ${C.primary}20`,
        padding: 16, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Dica: Use ⌘K para buscar</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>Navegue rapidamente para qualquer módulo do sistema.</div>
        </div>
      </div>
    </div>
  );
}
