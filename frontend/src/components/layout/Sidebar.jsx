import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NAV = [
  {
    grupo: 'Administrativo',
    items: [
      { label: 'RH', path: '/admin/rh', icon: '👥', roles: ['admin', 'diretor'] },
      { label: 'Financeiro', path: '/admin/financeiro', icon: '💰', roles: ['admin', 'diretor'] },
      { label: 'Logística', path: '/admin/logistica', icon: '🚚', roles: ['admin', 'diretor'] },
      { label: 'Patrimônio', path: '/admin/patrimonio', icon: '🏷️', roles: ['admin', 'diretor'] },
    ],
  },
  {
    grupo: 'Projetos e Eventos',
    items: [
      { label: 'Eventos', path: '/eventos', icon: '📅', roles: ['assistente', 'admin', 'diretor'] },
      { label: 'Projetos', path: '/projetos', icon: '📋', roles: ['admin', 'diretor'] },
      { label: 'Expansão', path: '/expansao', icon: '🗺️', roles: ['admin', 'diretor'] },
    ],
  },
  {
    grupo: 'Ministerial',
    items: [
      { label: 'Integração', path: '/ministerial/integracao', icon: '✝️', roles: ['admin', 'diretor'] },
      { label: 'Grupos', path: '/ministerial/grupos', icon: '🏘️', roles: ['admin', 'diretor'] },
      { label: 'Cuidados', path: '/ministerial/cuidados', icon: '🤝', roles: ['admin', 'diretor'] },
      { label: 'Voluntariado', path: '/ministerial/voluntariado', icon: '🙋', roles: ['admin', 'diretor'] },
      { label: 'Membresia', path: '/ministerial/membresia', icon: '📖', roles: ['admin', 'diretor'] },
    ],
  },
  {
    grupo: 'Criativo',
    items: [
      { label: 'Marketing', path: '/criativo/marketing', icon: '🎨', roles: ['admin', 'diretor'] },
    ],
  },
];

const styles = {
  sidebar: {
    width: 220,
    minHeight: '100vh',
    background: '#1a1a2e',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0 16px',
    flexShrink: 0,
  },
  logo: {
    padding: '0 20px 24px',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 1,
    color: '#a78bfa',
  },
  grupo: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#6b7280',
    padding: '12px 20px 4px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 20px',
    fontSize: 14,
    color: '#d1d5db',
    textDecoration: 'none',
    borderRadius: 0,
    transition: 'background 0.15s',
  },
  linkActive: {
    background: '#7c3aed',
    color: '#fff',
  },
  userArea: {
    marginTop: 'auto',
    borderTop: '1px solid #374151',
    padding: '16px 20px 0',
  },
  userName: { fontSize: 13, fontWeight: 600, color: '#f3f4f6' },
  userRole: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  signOut: {
    marginTop: 10,
    background: 'none',
    border: '1px solid #374151',
    color: '#9ca3af',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    width: '100%',
  },
};

export default function Sidebar() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <nav style={styles.sidebar}>
      <div style={styles.logo}>⛪ CBRio ERP</div>

      {NAV.map((grupo) => {
        const itensVisiveis = grupo.items.filter((i) => i.roles.includes(role));
        if (!itensVisiveis.length) return null;
        return (
          <div key={grupo.grupo}>
            <div style={styles.grupo}>{grupo.grupo}</div>
            {itensVisiveis.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  ...styles.link,
                  ...(isActive ? styles.linkActive : {}),
                })}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        );
      })}

      <div style={styles.userArea}>
        <div style={styles.userName}>{profile?.name ?? '—'}</div>
        <div style={styles.userRole}>{profile?.role ?? ''}</div>
        <button style={styles.signOut} onClick={handleSignOut}>Sair</button>
      </div>
    </nav>
  );
}
