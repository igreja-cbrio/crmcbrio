import { useState, useEffect, useCallback } from 'react';
import { Tag, ClipboardList, Trash2, Pencil, MapPin } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { patrimonio } from '../../../api';

const C = {
  bg: 'var(--cbrio-bg)', card: 'var(--cbrio-card)', primary: '#00B39D', primaryBg: '#00B39D18',
  text: 'var(--cbrio-text)', text2: 'var(--cbrio-text2)', text3: 'var(--cbrio-text3)',
  border: 'var(--cbrio-border)', green: '#10b981', greenBg: '#10b98118',
  red: '#ef4444', redBg: '#ef444418', amber: '#f59e0b', amberBg: '#f59e0b18',
  blue: '#3b82f6', blueBg: '#3b82f618',
};

const STATUS_BEM = {
  ativo: { c: C.green, bg: C.greenBg, label: 'Ativo' },
  manutencao: { c: C.amber, bg: C.amberBg, label: 'Manutenção' },
  baixado: { c: C.text3, bg: '#73737318', label: 'Baixado' },
  extraviado: { c: C.red, bg: C.redBg, label: 'Extraviado' },
};

const TIPO_MOV = {
  entrada: 'Entrada', saida: 'Saída', transferencia: 'Transferência',
  manutencao: 'Manutenção', baixa: 'Baixa',
};

const INV_STATUS = {
  em_andamento: { c: C.blue, bg: C.blueBg, label: 'Em andamento' },
  concluido: { c: C.green, bg: C.greenBg, label: 'Concluído' },
  cancelado: { c: C.red, bg: C.redBg, label: 'Cancelado' },
};

const styles = {
  page: { maxWidth: 1200, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.text2, marginTop: 2 },
  tabs: { display: 'flex', gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 24 },
  tab: (a) => ({ padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', color: a ? C.primary : C.text2, borderBottom: a ? `2px solid ${C.primary}` : '2px solid transparent', marginBottom: -2, transition: 'all 0.15s' }),
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 },
  kpi: (color) => ({ background: C.card, borderRadius: 12, padding: '16px 20px', border: `1px solid ${C.border}`, borderLeft: `4px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }),
  kpiValue: { fontSize: 28, fontWeight: 800, color: C.text },
  kpiLabel: { fontSize: 11, fontWeight: 600, color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  card: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' },
  cardHeader: { padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: C.text },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: `1px solid ${C.border}`, background: 'var(--cbrio-table-header)' },
  td: { padding: '12px 16px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}` },
  badge: (c, bg) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: c, background: bg }),
  btn: (v = 'primary') => ({ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s', ...(v === 'primary' ? { background: C.primary, color: '#fff' } : {}), ...(v === 'secondary' ? { background: 'transparent', color: C.primary, border: `1px solid ${C.primary}` } : {}), ...(v === 'danger' ? { background: C.red, color: '#fff' } : {}), ...(v === 'ghost' ? { background: 'transparent', color: C.text2, padding: '6px 12px' } : {}) }),
  btnSm: { padding: '4px 10px', fontSize: 11 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', width: '100%', background: 'var(--cbrio-input-bg)', color: 'var(--cbrio-text)' },
  select: { padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: 'var(--cbrio-input-bg)', color: 'var(--cbrio-text)', outline: 'none' },
  label: { fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 },
  formGroup: { marginBottom: 14 },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'var(--cbrio-overlay)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60, zIndex: 1000 },
  modal: { background: 'var(--cbrio-modal-bg)', borderRadius: 16, width: '95%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader: { padding: '20px 24px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: C.text },
  modalBody: { padding: '16px 24px 24px' },
  modalFooter: { padding: '12px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' },
  empty: { textAlign: 'center', padding: 40, color: C.text3, fontSize: 14 },
  clickRow: { cursor: 'pointer', transition: 'background 0.1s' },
};

const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
const fmtMoney = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.modalTitle}>{title}</div>
          <button style={{ ...styles.btn('ghost'), fontSize: 18 }} onClick={onClose}>✕</button>
        </div>
        <div style={styles.modalBody}>{children}</div>
        {footer && <div style={styles.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}
function Input({ label, ...props }) { return (<div style={styles.formGroup}>{label && <label style={styles.label}>{label}</label>}<input style={styles.input} {...props} /></div>); }
function Select({ label, children, ...props }) { return (<div style={styles.formGroup}>{label && <label style={styles.label}>{label}</label>}<select style={{ ...styles.select, width: '100%' }} {...props}>{children}</select></div>); }
function Badge({ status, map }) { const s = map[status] || { c: C.text3, bg: '#73737318', label: status }; return <span style={styles.badge(s.c, s.bg)}>{s.label}</span>; }

const TABS = ['Dashboard', 'Bens', 'Categorias / Localizações', 'Inventários'];

export default function Patrimonio() {
  const { isDiretor } = useAuth();
  const [tab, setTab] = useState(0);
  const [dash, setDash] = useState(null);
  const [bens, setBens] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [localizacoes, setLocalizacoes] = useState([]);
  const [inventarios, setInventarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCat, setFiltroCat] = useState('');
  const [filtroLoc, setFiltroLoc] = useState('');
  const [busca, setBusca] = useState('');
  const [modalBem, setModalBem] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [modalMov, setModalMov] = useState(null);
  const [modalInv, setModalInv] = useState(null);
  const [newCat, setNewCat] = useState('');
  const [newLoc, setNewLoc] = useState('');

  const loadDash = useCallback(async () => { try { setDash(await patrimonio.dashboard()); } catch (e) { console.error(e); } }, []);
  const loadBens = useCallback(async () => {
    try { setLoading(true); const p = {}; if (filtroStatus) p.status = filtroStatus; if (filtroCat) p.categoria_id = filtroCat; if (filtroLoc) p.localizacao_id = filtroLoc; if (busca) p.busca = busca; setBens(await patrimonio.bens.list(p)); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, [filtroStatus, filtroCat, filtroLoc, busca]);
  const loadCats = useCallback(async () => { try { setCategorias(await patrimonio.categorias.list()); } catch (e) { console.error(e); } }, []);
  const loadLocs = useCallback(async () => { try { setLocalizacoes(await patrimonio.localizacoes.list()); } catch (e) { console.error(e); } }, []);
  const loadInvs = useCallback(async () => { try { setInventarios(await patrimonio.inventarios.list()); } catch (e) { console.error(e); } }, []);

  useEffect(() => { loadDash(); loadBens(); loadCats(); loadLocs(); loadInvs(); }, []);
  useEffect(() => { loadBens(); }, [filtroStatus, filtroCat, filtroLoc, busca]);

  async function saveBem(data) {
    try { if (data.id) await patrimonio.bens.update(data.id, data); else await patrimonio.bens.create(data); setModalBem(null); loadBens(); loadDash(); } catch (e) { alert(e.message); }
  }
  async function deleteBem(id) { if (!confirm('Remover este bem?')) return; try { await patrimonio.bens.remove(id); loadBens(); loadDash(); setModalDetail(null); } catch (e) { alert(e.message); } }
  async function openDetail(id) { try { setModalDetail(await patrimonio.bens.get(id)); } catch (e) { alert(e.message); } }
  async function saveMov(bemId, data) {
    try { await patrimonio.bens.movimentar(bemId, data); setModalMov(null); openDetail(bemId); loadBens(); loadDash(); } catch (e) { alert(e.message); }
  }
  async function addCat() { if (!newCat.trim()) return; try { await patrimonio.categorias.create({ nome: newCat }); setNewCat(''); loadCats(); loadDash(); } catch (e) { alert(e.message); } }
  async function removeCat(id) { if (!confirm('Remover categoria?')) return; try { await patrimonio.categorias.remove(id); loadCats(); } catch (e) { alert(e.message); } }
  async function addLoc() { if (!newLoc.trim()) return; try { await patrimonio.localizacoes.create({ nome: newLoc }); setNewLoc(''); loadLocs(); loadDash(); } catch (e) { alert(e.message); } }
  async function removeLoc(id) { if (!confirm('Remover localização?')) return; try { await patrimonio.localizacoes.remove(id); loadLocs(); } catch (e) { alert(e.message); } }
  async function saveInv(data) { try { await patrimonio.inventarios.create(data); setModalInv(null); loadInvs(); loadDash(); } catch (e) { alert(e.message); } }
  async function updateInvStatus(id, status) { try { const upd = { status }; if (status === 'concluido') upd.data_fim = new Date().toISOString().slice(0, 10); await patrimonio.inventarios.atualizar(id, upd); loadInvs(); loadDash(); } catch (e) { alert(e.message); } }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div><div style={{ ...styles.title, display: 'flex', alignItems: 'center', gap: 10 }}><Tag className="h-7 w-7" style={{ color: '#00B39D' }} /> Patrimônio</div><div style={styles.subtitle}>Gestão de bens, localizações e inventários</div></div>
      </div>
      <div style={styles.tabs}>{TABS.map((t, i) => <button key={t} style={styles.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>)}</div>

      {tab === 0 && <DashboardTab dash={dash} />}
      {tab === 1 && (
        <BensTab bens={bens} loading={loading} busca={busca} setBusca={setBusca}
          filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus}
          filtroCat={filtroCat} setFiltroCat={setFiltroCat} filtroLoc={filtroLoc} setFiltroLoc={setFiltroLoc}
          categorias={categorias} localizacoes={localizacoes}
          onNew={() => setModalBem({})} onDetail={openDetail} onDelete={deleteBem} isDiretor={isDiretor}
        />
      )}
      {tab === 2 && <CatLocTab categorias={categorias} localizacoes={localizacoes} newCat={newCat} setNewCat={setNewCat} addCat={addCat} removeCat={removeCat} newLoc={newLoc} setNewLoc={setNewLoc} addLoc={addLoc} removeLoc={removeLoc} isDiretor={isDiretor} />}
      {tab === 3 && <InventariosTab inventarios={inventarios} onNew={() => setModalInv({})} onUpdate={updateInvStatus} isDiretor={isDiretor} />}

      <BemFormModal open={!!modalBem} data={modalBem} categorias={categorias} localizacoes={localizacoes} onClose={() => setModalBem(null)} onSave={saveBem} />
      <BemDetailModal open={!!modalDetail} data={modalDetail} onClose={() => setModalDetail(null)} onEdit={(b) => { setModalDetail(null); setModalBem(b); }} onDelete={deleteBem} onMov={(bemId) => setModalMov({ bem_id: bemId })} isDiretor={isDiretor} />
      <MovFormModal open={!!modalMov} data={modalMov} localizacoes={localizacoes} onClose={() => setModalMov(null)} onSave={saveMov} />
      <InvFormModal open={!!modalInv} onClose={() => setModalInv(null)} onSave={saveInv} />
    </div>
  );
}

function DashboardTab({ dash }) {
  if (!dash) return <div style={styles.empty}>Carregando dashboard...</div>;
  return (
    <>
      <div style={styles.kpiGrid}>
        <div style={styles.kpi(C.primary)}><div style={styles.kpiValue}>{dash.totalBens}</div><div style={styles.kpiLabel}>Total de Bens</div></div>
        <div style={styles.kpi(C.green)}><div style={styles.kpiValue}>{dash.ativos}</div><div style={styles.kpiLabel}>Ativos</div></div>
        <div style={styles.kpi(C.amber)}><div style={styles.kpiValue}>{dash.manutencao}</div><div style={styles.kpiLabel}>Manutenção</div></div>
        <div style={styles.kpi(C.text3)}><div style={styles.kpiValue}>{dash.baixados}</div><div style={styles.kpiLabel}>Baixados</div></div>
        <div style={styles.kpi(C.red)}><div style={styles.kpiValue}>{dash.extraviados}</div><div style={styles.kpiLabel}>Extraviados</div></div>
        <div style={styles.kpi(C.blue)}><div style={styles.kpiValue}>{fmtMoney(dash.valorTotal)}</div><div style={styles.kpiLabel}>Valor Total</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={styles.card}>
          <div style={styles.cardHeader}><div style={styles.cardTitle}>Por Categoria</div></div>
          <div style={{ padding: 16 }}>
            {Object.entries(dash.porCategoria || {}).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13 }}>{k}</span><span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{v}</span>
              </div>
            ))}
            {Object.keys(dash.porCategoria || {}).length === 0 && <div style={styles.empty}>Nenhum dado</div>}
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardHeader}><div style={styles.cardTitle}>Por Localização</div></div>
          <div style={{ padding: 16 }}>
            {Object.entries(dash.porLocalizacao || {}).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13 }}>{k}</span><span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{v}</span>
              </div>
            ))}
            {Object.keys(dash.porLocalizacao || {}).length === 0 && <div style={styles.empty}>Nenhum dado</div>}
          </div>
        </div>
      </div>
      {dash.inventariosAbertos > 0 && (
        <div style={{ ...styles.card, borderLeft: `4px solid ${C.amber}`, padding: 16, fontSize: 13, color: C.text }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ClipboardList style={{ width: 16, height: 16, color: '#00B39D' }} /> {dash.inventariosAbertos} inventário(s) em andamento</span>
        </div>
      )}
    </>
  );
}

function BensTab({ bens, loading, busca, setBusca, filtroStatus, setFiltroStatus, filtroCat, setFiltroCat, filtroLoc, setFiltroLoc, categorias, localizacoes, onNew, onDetail, onDelete, isDiretor }) {
  return (
    <>
      <div style={styles.filterRow}>
        <input style={{ ...styles.input, maxWidth: 280 }} placeholder="🔍 Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select style={styles.select} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_BEM).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={styles.select} value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
          <option value="">Todas categorias</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select style={styles.select} value={filtroLoc} onChange={e => setFiltroLoc(e.target.value)}>
          <option value="">Todas localizações</option>
          {localizacoes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
        {isDiretor && <div style={{ marginLeft: 'auto' }}><button style={styles.btn('primary')} onClick={onNew}>+ Novo Bem</button></div>}
      </div>
      <div style={styles.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead><tr>
              <th style={styles.th}>Código</th><th style={styles.th}>Nome</th><th style={styles.th}>Categoria</th>
              <th style={styles.th}>Localização</th><th style={styles.th}>Marca/Modelo</th><th style={styles.th}>Valor</th><th style={styles.th}>Status</th>
              {isDiretor && <th style={styles.th}></th>}
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: C.text3 }}>Carregando...</td></tr>}
              {!loading && bens.length === 0 && <tr><td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: C.text3 }}>Nenhum bem encontrado</td></tr>}
              {bens.map(b => (
                <tr key={b.id} style={styles.clickRow} onMouseEnter={e => e.currentTarget.style.background = '#1e1e1e'} onMouseLeave={e => e.currentTarget.style.background = ''} onClick={() => onDetail(b.id)}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12 }}>{b.codigo_barras}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{b.nome}</td>
                  <td style={styles.td}>{b.pat_categorias?.nome || '—'}</td>
                  <td style={styles.td}>{b.pat_localizacoes?.nome || '—'}</td>
                  <td style={styles.td}>{[b.marca, b.modelo].filter(Boolean).join(' ') || '—'}</td>
                  <td style={styles.td}>{fmtMoney(b.valor_aquisicao)}</td>
                  <td style={styles.td}><Badge status={b.status} map={STATUS_BEM} /></td>
                  {isDiretor && <td style={styles.td}><button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={e => { e.stopPropagation(); onDelete(b.id); }}><Trash2 style={{ width: 14, height: 14 }} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function CatLocTab({ categorias, localizacoes, newCat, setNewCat, addCat, removeCat, newLoc, setNewLoc, addLoc, removeLoc, isDiretor }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={styles.card}>
        <div style={styles.cardHeader}><div style={styles.cardTitle}>Categorias ({categorias.length})</div></div>
        <div style={{ padding: 16 }}>
          {isDiretor && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input style={{ ...styles.input, flex: 1 }} placeholder="Nova categoria..." value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCat()} />
              <button style={{ ...styles.btn('primary'), ...styles.btnSm }} onClick={addCat}>+</button>
            </div>
          )}
          {categorias.length === 0 && <div style={styles.empty}>Nenhuma categoria</div>}
          {categorias.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13 }}>{c.icone && `${c.icone} `}{c.nome}</span>
              {isDiretor && <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => removeCat(c.id)}><Trash2 style={{ width: 14, height: 14 }} /></button>}
            </div>
          ))}
        </div>
      </div>
      <div style={styles.card}>
        <div style={styles.cardHeader}><div style={styles.cardTitle}>Localizações ({localizacoes.length})</div></div>
        <div style={{ padding: 16 }}>
          {isDiretor && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input style={{ ...styles.input, flex: 1 }} placeholder="Nova localização..." value={newLoc} onChange={e => setNewLoc(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLoc()} />
              <button style={{ ...styles.btn('primary'), ...styles.btnSm }} onClick={addLoc}>+</button>
            </div>
          )}
          {localizacoes.length === 0 && <div style={styles.empty}>Nenhuma localização</div>}
          {localizacoes.map(l => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin style={{ width: 14, height: 14, color: '#00B39D' }} /> {l.nome}</span>
              {isDiretor && <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => removeLoc(l.id)}><Trash2 style={{ width: 14, height: 14 }} /></button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InventariosTab({ inventarios, onNew, onUpdate, isDiretor }) {
  return (
    <>
      {isDiretor && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><button style={styles.btn('primary')} onClick={onNew}>+ Novo Inventário</button></div>}
      <div style={styles.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead><tr>
              <th style={styles.th}>Nome</th><th style={styles.th}>Data Início</th><th style={styles.th}>Data Fim</th>
              <th style={styles.th}>Responsável</th><th style={styles.th}>Status</th>{isDiretor && <th style={styles.th}>Ações</th>}
            </tr></thead>
            <tbody>
              {inventarios.length === 0 && <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: C.text3 }}>Nenhum inventário</td></tr>}
              {inventarios.map(inv => (
                <tr key={inv.id}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{inv.nome}</td>
                  <td style={styles.td}>{fmtDate(inv.data_inicio)}</td>
                  <td style={styles.td}>{fmtDate(inv.data_fim)}</td>
                  <td style={styles.td}>{inv.profiles?.name || '—'}</td>
                  <td style={styles.td}><Badge status={inv.status} map={INV_STATUS} /></td>
                  {isDiretor && (
                    <td style={styles.td}>
                      {inv.status === 'em_andamento' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button style={{ ...styles.btn('primary'), ...styles.btnSm }} onClick={() => onUpdate(inv.id, 'concluido')}>✓ Concluir</button>
                          <button style={{ ...styles.btn('danger'), ...styles.btnSm }} onClick={() => onUpdate(inv.id, 'cancelado')}>✕ Cancelar</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function BemFormModal({ open, data, categorias, localizacoes, onClose, onSave }) {
  const [f, setF] = useState({});
  useEffect(() => { if (data) setF({ ...data }); }, [data]);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} title={f?.id ? 'Editar Bem' : 'Novo Bem'}
      footer={<button style={styles.btn('primary')} onClick={() => onSave(f)}>Salvar</button>}>
      <div style={styles.formRow}>
        <Input label="Código de Barras *" value={f.codigo_barras || ''} onChange={e => upd('codigo_barras', e.target.value)} />
        <Input label="Nome *" value={f.nome || ''} onChange={e => upd('nome', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Select label="Categoria" value={f.categoria_id || ''} onChange={e => upd('categoria_id', e.target.value)}>
          <option value="">Selecionar</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Select label="Localização" value={f.localizacao_id || ''} onChange={e => upd('localizacao_id', e.target.value)}>
          <option value="">Selecionar</option>
          {localizacoes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </Select>
      </div>
      <div style={styles.formRow}>
        <Input label="Marca" value={f.marca || ''} onChange={e => upd('marca', e.target.value)} />
        <Input label="Modelo" value={f.modelo || ''} onChange={e => upd('modelo', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Input label="Nº Série" value={f.numero_serie || ''} onChange={e => upd('numero_serie', e.target.value)} />
        <Input label="Valor Aquisição (R$)" type="number" value={f.valor_aquisicao || ''} onChange={e => upd('valor_aquisicao', e.target.value)} />
      </div>
      <div style={styles.formRow}>
        <Input label="Data Aquisição" type="date" value={f.data_aquisicao || ''} onChange={e => upd('data_aquisicao', e.target.value)} />
        {f.id && <Select label="Status" value={f.status || 'ativo'} onChange={e => upd('status', e.target.value)}>
          {Object.entries(STATUS_BEM).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>}
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Descrição</label>
        <textarea style={{ ...styles.input, minHeight: 50, resize: 'vertical' }} value={f.descricao || ''} onChange={e => upd('descricao', e.target.value)} />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>Observações</label>
        <textarea style={{ ...styles.input, minHeight: 40, resize: 'vertical' }} value={f.observacoes || ''} onChange={e => upd('observacoes', e.target.value)} />
      </div>
    </Modal>
  );
}

function BemDetailModal({ open, data, onClose, onEdit, onDelete, onMov, isDiretor }) {
  if (!data) return null;
  return (
    <Modal open={open} onClose={onClose} title={data.nome}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 20 }}>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Código:</span><div style={{ fontSize: 14, fontFamily: 'monospace' }}>{data.codigo_barras}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Status:</span><div><Badge status={data.status} map={STATUS_BEM} /></div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Categoria:</span><div style={{ fontSize: 14 }}>{data.pat_categorias?.nome || '—'}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Localização:</span><div style={{ fontSize: 14 }}>{data.pat_localizacoes?.nome || '—'}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Marca/Modelo:</span><div style={{ fontSize: 14 }}>{[data.marca, data.modelo].filter(Boolean).join(' ') || '—'}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Nº Série:</span><div style={{ fontSize: 14 }}>{data.numero_serie || '—'}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Valor Aquisição:</span><div style={{ fontSize: 14, fontWeight: 600 }}>{fmtMoney(data.valor_aquisicao)}</div></div>
        <div><span style={{ fontSize: 11, color: C.text2 }}>Data Aquisição:</span><div style={{ fontSize: 14 }}>{fmtDate(data.data_aquisicao)}</div></div>
      </div>
      {data.descricao && <div style={{ padding: '8px 12px', background: 'var(--cbrio-input-bg)', borderRadius: 8, marginBottom: 12, fontSize: 13, color: C.text2 }}>{data.descricao}</div>}
      {data.observacoes && <div style={{ padding: '8px 12px', background: 'var(--cbrio-input-bg)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: C.text2 }}>{data.observacoes}</div>}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text2, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6 }}><ClipboardList style={{ width: 14, height: 14, color: '#00B39D' }} /> Movimentações ({(data.movimentacoes || []).length})</span>
          {isDiretor && <button style={{ ...styles.btn('ghost'), ...styles.btnSm }} onClick={() => onMov(data.id)}>+ Registrar</button>}
        </div>
        {(data.movimentacoes || []).length === 0 && <div style={{ fontSize: 13, color: C.text3 }}>Nenhuma movimentação registrada</div>}
        {(data.movimentacoes || []).map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
            <div><span style={{ fontWeight: 600 }}>{TIPO_MOV[m.tipo] || m.tipo}</span>{m.motivo && ` — ${m.motivo}`}</div>
            <div style={{ color: C.text2 }}>{m.profiles?.name || ''} • {new Date(m.data_movimentacao).toLocaleDateString('pt-BR')}</div>
          </div>
        ))}
      </div>

      {isDiretor && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <button style={styles.btn('secondary')} onClick={() => onEdit(data)}><Pencil style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Editar</button>
          <button style={styles.btn('danger')} onClick={() => onDelete(data.id)}><Trash2 style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Remover</button>
        </div>
      )}
    </Modal>
  );
}

function MovFormModal({ open, data, localizacoes, onClose, onSave }) {
  const [f, setF] = useState({ tipo: 'transferencia' });
  useEffect(() => { if (open) setF({ tipo: 'transferencia' }); }, [open]);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} title="Registrar Movimentação"
      footer={<button style={styles.btn('primary')} onClick={() => onSave(data?.bem_id, f)}>Registrar</button>}>
      <Select label="Tipo *" value={f.tipo} onChange={e => upd('tipo', e.target.value)}>
        {Object.entries(TIPO_MOV).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>
      {(f.tipo === 'transferencia' || f.tipo === 'saida') && (
        <Select label="Localização Origem" value={f.localizacao_origem_id || ''} onChange={e => upd('localizacao_origem_id', e.target.value)}>
          <option value="">Selecionar</option>
          {localizacoes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </Select>
      )}
      {(f.tipo === 'transferencia' || f.tipo === 'entrada') && (
        <Select label="Localização Destino" value={f.localizacao_destino_id || ''} onChange={e => upd('localizacao_destino_id', e.target.value)}>
          <option value="">Selecionar</option>
          {localizacoes.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </Select>
      )}
      <div style={styles.formGroup}>
        <label style={styles.label}>Motivo</label>
        <textarea style={{ ...styles.input, minHeight: 60, resize: 'vertical' }} value={f.motivo || ''} onChange={e => upd('motivo', e.target.value)} />
      </div>
    </Modal>
  );
}

function InvFormModal({ open, onClose, onSave }) {
  const [f, setF] = useState({});
  useEffect(() => { if (open) setF({}); }, [open]);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} title="Novo Inventário"
      footer={<button style={styles.btn('primary')} onClick={() => onSave(f)}>Criar</button>}>
      <Input label="Nome *" value={f.nome || ''} onChange={e => upd('nome', e.target.value)} />
      <Input label="Data Início *" type="date" value={f.data_inicio || ''} onChange={e => upd('data_inicio', e.target.value)} />
      <div style={styles.formGroup}>
        <label style={styles.label}>Observações</label>
        <textarea style={{ ...styles.input, minHeight: 60, resize: 'vertical' }} value={f.observacoes || ''} onChange={e => upd('observacoes', e.target.value)} />
      </div>
    </Modal>
  );
}
