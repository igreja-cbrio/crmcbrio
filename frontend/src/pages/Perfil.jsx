import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { logistica } from '../api';
import { Button } from '../components/ui/button';
import { User, Mail, Phone, Briefcase, Calendar, Shield, ShoppingCart, Clock } from 'lucide-react';

const C = {
  text: 'var(--cbrio-text)', text2: 'var(--cbrio-text2)', text3: 'var(--cbrio-text3)',
  card: 'var(--cbrio-card)', border: 'var(--cbrio-border)', primary: '#00B39D',
  green: '#10b981', greenBg: '#10b98118', amber: '#f59e0b', amberBg: '#f59e0b18',
  red: '#ef4444', redBg: '#ef444418', blue: '#3b82f6', blueBg: '#3b82f618',
};

const STATUS_SOL = {
  pendente: { c: C.amber, bg: C.amberBg, label: 'Pendente' },
  aprovada: { c: C.green, bg: C.greenBg, label: 'Aprovada' },
  rejeitada: { c: C.red, bg: C.redBg, label: 'Rejeitada' },
};

const inputClass = "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm shadow-black/5 transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary hover:border-muted-foreground/50";
const labelClass = "text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block";

export default function Perfil() {
  const { user, profile } = useAuth();
  const [rhData, setRhData] = useState(null);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loadingSol, setLoadingSol] = useState(true);
  const [tab, setTab] = useState(0);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    // Fetch RH data by email
    if (profile?.email) {
      supabase.from('rh_funcionarios')
        .select('*')
        .eq('email', profile.email)
        .eq('status', 'ativo')
        .maybeSingle()
        .then(({ data }) => setRhData(data));
    }

    // Fetch user's purchase requests
    logistica.solicitacoes.list()
      .then(data => setSolicitacoes(Array.isArray(data) ? data : []))
      .catch(() => setSolicitacoes([]))
      .finally(() => setLoadingSol(false));
  }, [profile]);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) { setPwMsg('Senha deve ter pelo menos 6 caracteres'); return; }
    if (newPassword !== confirmPassword) { setPwMsg('Senhas não conferem'); return; }
    setPwLoading(true);
    setPwMsg('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) { setPwMsg(error.message); return; }
    setPwMsg('Senha alterada com sucesso!');
    setNewPassword('');
    setConfirmPassword('');
  }

  const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
  const fmtMoney = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
  const initials = (profile?.name || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const tabs = ['Meus Dados', 'Minhas Solicitações', 'Alterar Senha'];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, marginTop: 8 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: C.primary, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.25 }}>{profile?.name || '—'}</h1>
          <p style={{ fontSize: 14, color: C.text3, marginTop: 2 }}>{profile?.email} · {profile?.role}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid var(--cbrio-border)`, marginBottom: 24 }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '12px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none',
            color: tab === i ? C.primary : 'var(--cbrio-text2)',
            borderBottom: tab === i ? `2px solid ${C.primary}` : '2px solid transparent',
            marginBottom: -2, transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* Tab: Meus Dados */}
      {tab === 0 && (
        <div style={{
          background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: 24,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InfoRow icon={User} label="Nome" value={rhData?.nome || profile?.name || '—'} />
            <InfoRow icon={Mail} label="Email" value={profile?.email || '—'} />
            <InfoRow icon={Phone} label="Telefone" value={rhData?.telefone || '—'} />
            <InfoRow icon={Briefcase} label="Cargo" value={rhData?.cargo || '—'} />
            <InfoRow icon={Shield} label="Área" value={rhData?.area || profile?.area || '—'} />
            <InfoRow icon={Shield} label="Contrato" value={(rhData?.tipo_contrato || '').toUpperCase() || '—'} />
            <InfoRow icon={Calendar} label="Admissão" value={fmtDate(rhData?.data_admissao)} />
            <InfoRow icon={Shield} label="Status" value={rhData?.status || '—'} />
          </div>
          <p style={{ fontSize: 12, color: C.text3, marginTop: 16, lineHeight: 1.5 }}>
            Para alterar seus dados, entre em contato com o RH.
          </p>
        </div>
      )}

      {/* Tab: Minhas Solicitações */}
      {tab === 1 && (
        <div style={{
          background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden',
        }}>
          <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Solicitações de Compra</span>
            <Button size="sm" onClick={() => window.location.href = '/solicitar-compra'}>+ Nova</Button>
          </div>
          {loadingSol ? (
            <div className="flex items-center justify-center py-6 gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-primary" />
              <span className="text-xs text-muted-foreground">Carregando...</span>
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <ShoppingCart className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">Nenhuma solicitação</span>
              <span className="text-xs text-muted-foreground">Suas solicitações de compra aparecerão aqui</span>
            </div>
          ) : (
            <div>
              {solicitacoes.map(s => {
                const st = STATUS_SOL[s.status] || STATUS_SOL.pendente;
                return (
                  <div key={s.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.titulo}</span>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                        fontSize: 12, fontWeight: 600, color: st.c, background: st.bg,
                      }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.text3, display: 'flex', gap: 12 }}>
                      <span>{fmtDate(s.created_at?.split('T')[0])}</span>
                      {s.valor_estimado && <span>{fmtMoney(s.valor_estimado)}</span>}
                      {s.urgencia && <span>Urgência: {s.urgencia}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Alterar Senha */}
      {tab === 2 && (
        <div style={{
          background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: 24,
        }}>
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: 16 }}>
              <label className={labelClass}>Nova Senha</label>
              <input className={inputClass} type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className={labelClass}>Confirmar Senha</label>
              <input className={inputClass} type="password" placeholder="Repita a senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            {pwMsg && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 16, fontSize: 14,
                background: pwMsg.includes('sucesso') ? C.greenBg : C.redBg,
                color: pwMsg.includes('sucesso') ? C.green : C.red,
              }}>{pwMsg}</div>
            )}
            <Button type="submit" disabled={pwLoading}>
              {pwLoading ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
      <Icon style={{ width: 16, height: 16, color: 'var(--cbrio-text3)', marginTop: 2, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 12, color: 'var(--cbrio-text3)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: 'var(--cbrio-text)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}
