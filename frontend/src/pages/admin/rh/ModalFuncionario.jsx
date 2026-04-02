import { useState, useRef } from 'react';
import { supabase } from '../../../supabaseClient';

const s = {
  overlay:  { position: 'fixed', inset: 0, background: 'var(--cbrio-overlay)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:    { background: 'var(--cbrio-modal-bg)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' },
  title:    { fontSize: 20, fontWeight: 700, color: 'var(--cbrio-text)', marginBottom: 24 },
  grid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' },
  label:    { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--cbrio-text2)', marginBottom: 5, marginTop: 14 },
  input:    { width: '100%', padding: '9px 12px', border: '1.5px solid #333', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--cbrio-input-bg)', color: 'var(--cbrio-text)' },
  select:   { width: '100%', padding: '9px 12px', border: '1.5px solid #333', borderRadius: 8, fontSize: 14, outline: 'none', background: 'var(--cbrio-input-bg)', color: 'var(--cbrio-text)', boxSizing: 'border-box' },
  footer:   { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--cbrio-border)' },
  btnSave:  { background: '#00B39D', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  btnCancel:{ background: 'var(--cbrio-border)', color: 'var(--cbrio-text2)', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  fullCol:  { gridColumn: '1 / -1' },
};

const CAMPOS = [
  { key: 'nome',          label: 'Nome completo *',  type: 'text',   required: true, fullRow: true },
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
    observacoes: '', foto_url: '',
    ...funcionario,
  });
  const [salvando, setSalvando] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(funcionario?.foto_url || '');
  const fileRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `colaboradores/${fileName}`;

      const { error } = await supabase.storage
        .from('rh-fotos')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('rh-fotos')
        .getPublicUrl(filePath);

      setForm((f) => ({ ...f, foto_url: publicUrl }));
      setPreviewUrl(publicUrl);
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
      alert('Erro ao fazer upload da foto. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveFoto() {
    setForm((f) => ({ ...f, foto_url: '' }));
    setPreviewUrl('');
    if (fileRef.current) fileRef.current.value = '';
  }

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
        <div style={s.title}>{funcionario?.id ? 'Editar Colaborador' : 'Admitir Colaborador'}</div>
        <form onSubmit={handleSubmit}>
          <div style={s.grid}>
            {CAMPOS.map(({ key, label, type, required, fullRow }) => (
              <div key={key} style={fullRow ? s.fullCol : undefined}>
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

            <div style={s.fullCol}>
              <label style={s.label}>Foto do colaborador</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Foto"
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--cbrio-border)', flexShrink: 0 }}
                    onError={() => setPreviewUrl('')}
                  />
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      style={{
                        background: 'var(--cbrio-border)', color: 'var(--cbrio-text)',
                        border: 'none', borderRadius: 8, padding: '8px 16px',
                        fontSize: 13, fontWeight: 600, cursor: uploading ? 'wait' : 'pointer',
                        opacity: uploading ? 0.6 : 1,
                      }}
                    >
                      {uploading ? 'Enviando...' : previewUrl ? 'Trocar foto' : 'Escolher foto'}
                    </button>
                    {previewUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveFoto}
                        style={{
                          background: 'transparent', color: '#ef4444',
                          border: '1px solid #ef4444', borderRadius: 8, padding: '8px 12px',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--cbrio-text2)' }}>JPG, PNG — máx. 5MB</span>
                </div>
              </div>
            </div>

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
            <button type="submit" style={s.btnSave} disabled={salvando || uploading}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
