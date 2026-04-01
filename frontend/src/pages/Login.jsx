import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a2e',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '48px 40px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  logo: { fontSize: 32, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 700, textAlign: 'center', color: '#1a1a2e', marginBottom: 4 },
  subtitle: { fontSize: 13, textAlign: 'center', color: '#6b7280', marginBottom: 32 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 16,
  },
  btnPrimary: {
    width: '100%',
    padding: '12px',
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 12,
  },
  divider: { textAlign: 'center', color: '#9ca3af', fontSize: 12, margin: '12px 0' },
  btnOAuth: {
    width: '100%',
    padding: '10px',
    background: '#f9fafb',
    border: '1.5px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
};

export default function Login() {
  const { signInWithEmail, signInWithGoogle, signInWithMicrosoft } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmail(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signInWithEmail(email, password);
    setLoading(false);
    if (err) return setError(err.message);
    navigate('/');
  }

  async function handleGoogle() {
    setError('');
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message);
  }

  async function handleMicrosoft() {
    setError('');
    const { error: err } = await signInWithMicrosoft();
    if (err) setError(err.message);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>⛪</div>
        <div style={styles.title}>CBRio ERP</div>
        <div style={styles.subtitle}>Sistema de gestão interna</div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleEmail}>
          <label style={styles.label}>E-mail</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@cbrio.com.br"
            required
          />
          <label style={styles.label}>Senha</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <button style={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={styles.divider}>ou continue com</div>
        <button style={styles.btnOAuth} onClick={handleGoogle}>
          <span>🔵</span> Google
        </button>
        <button style={styles.btnOAuth} onClick={handleMicrosoft}>
          <span>🟦</span> Microsoft
        </button>
      </div>
    </div>
  );
}
