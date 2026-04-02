import { useState } from 'react';

const s = {
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:    { background: '#1a1a1a', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' },
  title:    { fontSize: 20, fontWeight: 700, color: '#e5e5e5', marginBottom: 24 },
  grid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' },
  label:    { display: 'block', fontSize: 13, fontWeight: 600, color: '#a3a3a3', marginBottom: 5, marginTop: 14 },
  input:    { width: '100%', padding: '9px 12px', border: '1.5px solid #333', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#1e1e1e', color: '#e5e5e5' },
  select:   { width: '100%', padding: '9px 12px', border: '1.5px solid #333', borderRadius: 8, fontSize: 14, outline: 'none', background: '#1e1e1e', color: '#e5e5e5', boxSizing: 'border-box' },
  footer:   { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid #262626' },
  btnSave:  { background: '#00B39D', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  btnCancel:{ background: '#262626', color: '#a3a3a3', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  fullCol:  { gridColumn: '1 / -1' },
};

const CAMPOS = [
  { key: 'nome',          label: 'Nome completo *',  type: 'text',   required: true },
  { key: 'cargo',         label: 'Cargo *',           type: 'text',   required: true },
  { key: 'email',         label: 'E-mail',            type: 'email' },
  { key: 'telefone',      label: 'Telefone',          type: 'text' },
  { key: 'cpf',           label: 'CPF',               type: 'text' },
  { key: 'area',          label: 'Área',              type: 'text' },
  { key: 'data_admissao', label: 'Data de admissão *',type: 'date',   required: true },
  { key: 'salario',       label: 'Salário (R$)',      type: 'number' },
];

export default function ModalFuncionario({ funcionario, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome: '', cargo: '', email: '', telefone: '', cpf: '', area: '',
    data_admissao: '', salario: '', tipo_contrato: 'clt', status: 'ativo',
    observacoes: '',
    ...funcionario,
  });
  const [salvando, setSalvando] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSalvando(true);
    const payload = { ...form };
    if (payload.salario === '') delete payload.salario;
    await onSalvar(payload);
    setSalvando(false);
  }

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div style={s.modal}>
        <div style={s.title}>{funcionario?.id ? 'Editar Funcionário' : 'Admitir Funcionário'}</div>
        <form onSubmit={handleSubmit}>
          <div style={s.grid}>
            {CAMPOS.map(({ key, label, type, required }) => (
              <div key={key}>
                <label style={s.label}>{label}</label>
                <input
                  style={s.input}
                  type={type}
                  value={form[key] ?? ''}
                  onChange={set(key)}
                  required={required}
                  step={type === 'number' ? '0.01' : undefined}
                />
              </div>
            ))}

            <div>
              <label style={s.label}>Tipo de contrato</label>
              <select style={s.select} value={form.tipo_contrato} onChange={set('tipo_contrato')}>
                <option value="clt">CLT</option>
                <option value="pj">PJ</option>
                <option value="voluntario">Voluntário</option>
                <option value="estagiario">Estagiário</option>
              </select>
            </div>

            <div>
              <label style={s.label}>Status</label>
              <select style={s.select} value={form.status} onChange={set('status')}>
                <option value="ativo">Ativo</option>
                <option value="ferias">Férias</option>
                <option value="licenca">Licença</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            <div style={s.fullCol}>
              <label style={s.label}>Observações</label>
              <textarea
                style={{ ...s.input, height: 80, resize: 'vertical' }}
                value={form.observacoes ?? ''}
                onChange={set('observacoes')}
              />
            </div>
          </div>

          <div style={s.footer}>
            <button type="button" style={s.btnCancel} onClick={onFechar}>Cancelar</button>
            <button type="submit" style={s.btnSave} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
