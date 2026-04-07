import { useState, useRef, useEffect } from 'react';
import { attachments } from '../api';
import { Paperclip, Upload, X, FileText, Download, Trash2, Check } from 'lucide-react';

const C = {
  text: 'var(--cbrio-text)', t2: 'var(--cbrio-text2)', t3: 'var(--cbrio-text3)',
  border: 'var(--cbrio-border)', card: 'var(--cbrio-card)', bg: 'var(--cbrio-bg)',
  primary: '#7c3aed', green: '#10b981', red: '#ef4444', amber: '#f59e0b',
};

const FILE_ICONS = {
  'application/pdf': '📄',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'image/jpeg': '🖼️', 'image/png': '🖼️', 'image/gif': '🖼️',
};

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function AttachmentButton({ eventId, taskId, taskType = 'event', phaseName, area, onAttachmentChange, inline = false }) {
  const [open, setOpen] = useState(inline); // inline mode starts open
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const fileRef = useRef(null);
  const panelRef = useRef(null);

  const loadAttachments = async () => {
    try {
      const data = await attachments.listByTask(eventId, taskId);
      setItems(data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (open || inline) loadAttachments();
  }, [open, inline, eventId, taskId]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Tipo não permitido. Use PDF, DOCX, XLSX ou imagem.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo excede 10MB.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', description);
      formData.append('area', area || '');
      formData.append('phase_name', phaseName || '');
      formData.append('task_type', taskType);

      await attachments.upload(eventId, taskId, formData);
      setDescription('');
      await loadAttachments();
      if (onAttachmentChange) onAttachmentChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    try {
      await attachments.remove(id);
      await loadAttachments();
      if (onAttachmentChange) onAttachmentChange();
    } catch (err) { setError(err.message); }
  };

  const count = items.length;

  // ── Conteúdo de anexos (reusado em ambos modos) ──
  const renderContent = () => (
    <>
      {error && (
        <div style={{ padding: '8px 12px', background: '#fee2e2', color: C.red, fontSize: 11, borderRadius: 6, marginBottom: 8 }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: C.red }}>✕</button>
        </div>
      )}

      {/* File list */}
      {items.length === 0 ? (
        <div style={{ padding: 12, textAlign: 'center', color: C.t3, fontSize: 12 }}>
          Nenhum arquivo anexado ainda.
        </div>
      ) : items.map(a => (
        <div key={a.id} style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{FILE_ICONS[a.file_type] || '📎'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.file_name}
            </div>
            <div style={{ fontSize: 10, color: C.t3 }}>
              {a.area && <span>{a.area} · </span>}
              {formatSize(a.file_size)}
              {a.description && <span> · {a.description}</span>}
            </div>
          </div>
          {a.signed_url && (
            <a href={a.signed_url} target="_blank" rel="noopener noreferrer" style={{ color: C.primary }} title="Download">
              <Download style={{ width: 14, height: 14 }} />
            </a>
          )}
          <button onClick={() => handleDelete(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, padding: 2 }} title="Excluir">
            <Trash2 style={{ width: 13, height: 13 }} />
          </button>
        </div>
      ))}

      {/* Upload area */}
      <div style={{ padding: '10px 0', marginTop: 4 }}>
        <input
          type="text"
          placeholder="Descrição do entregável (opcional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, marginBottom: 8, background: 'var(--cbrio-input-bg, #fff)', color: C.text, boxSizing: 'border-box' }}
        />
        <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.gif" onChange={handleUpload} style={{ display: 'none' }} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none',
            background: uploading ? C.t3 : C.primary, color: '#fff', fontSize: 12,
            fontWeight: 600, cursor: uploading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {uploading ? <>Enviando...</> : <><Upload style={{ width: 14, height: 14 }} /> Anexar arquivo</>}
        </button>
        <div style={{ fontSize: 10, color: C.t3, marginTop: 4, textAlign: 'center' }}>
          PDF, DOCX, XLSX ou imagem · Máx 10MB
        </div>
      </div>
    </>
  );

  // ── Modo inline: renderiza direto, sem dropdown ──
  if (inline) {
    return (
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', background: C.bg }}>
        {renderContent()}
      </div>
    );
  }

  // ── Modo botão + dropdown (para cards do kanban) ──
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6,
          border: `1px solid ${C.border}`, background: count > 0 ? `${C.primary}10` : 'transparent',
          cursor: 'pointer', fontSize: 11, fontWeight: 600, color: count > 0 ? C.primary : C.t3,
        }}
        title={`${count} anexo(s)`}
      >
        <Paperclip style={{ width: 13, height: 13 }} />
        {count > 0 && <span>{count}</span>}
      </button>

      {open && (
        <div ref={panelRef} onClick={e => e.stopPropagation()} style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 100,
          width: 340, background: 'var(--cbrio-modal-bg, #fff)', borderRadius: 12,
          border: `1px solid ${C.border}`, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Entregáveis</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3 }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          {renderContent()}
        </div>
      )}
    </div>
  );
}
