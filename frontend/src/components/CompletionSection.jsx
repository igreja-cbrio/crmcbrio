import { useState, useEffect, useRef } from 'react';
import { completions } from '../api';
import { Upload, Check, RotateCcw } from 'lucide-react';

const C = {
  text: 'var(--cbrio-text)', t2: 'var(--cbrio-text2)', t3: 'var(--cbrio-text3)',
  border: 'var(--cbrio-border)', bg: 'var(--cbrio-bg)',
  green: '#10b981', red: '#ef4444', primary: '#7c3aed',
};

/**
 * Seção de conclusão para o modal de detalhe da tarefa.
 * Props:
 * - task: { id, event_id, event_phase_id, titulo, area, status }
 * - phase: { numero_fase, nome_fase }
 * - eventName: string
 * - isPMO: boolean
 * - onComplete: () => void (refresh callback)
 */
export default function CompletionSection({ task, phase, eventName, isPMO, onComplete }) {
  const [existing, setExisting] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [showReopen, setShowReopen] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (task?.id) {
      completions.getByTask(task.id).then(setExisting).catch(() => setExisting(null));
    }
  }, [task?.id]);

  const isDone = task.status === 'concluida';

  const handleComplete = async () => {
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('task_id', task.id);
      fd.append('event_id', task.event_id);
      fd.append('event_phase_id', task.event_phase_id || '');
      fd.append('phase_number', phase?.numero_fase || 0);
      fd.append('area', task.area || '');
      fd.append('event_name', eventName || '');
      if (observacao.trim()) fd.append('observacao', observacao.trim());
      if (file) fd.append('file', file);

      const result = await completions.complete(fd);
      if (result.error) throw new Error(result.error);

      setShowForm(false);
      setObservacao('');
      setFile(null);
      if (onComplete) onComplete();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async () => {
    setSubmitting(true);
    try {
      await completions.reopen(task.id, reopenReason);
      setShowReopen(false);
      setReopenReason('');
      setExisting(null);
      if (onComplete) onComplete();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Card já concluído ──
  if (isDone && existing) {
    return (
      <div style={{ border: `1px solid ${C.green}30`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: `${C.green}08`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check style={{ width: 16, height: 16, color: C.green }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>Concluído</span>
          <span style={{ fontSize: 11, color: C.t3, marginLeft: 'auto' }}>
            {existing.completed_by_name || '—'} · {new Date(existing.completed_at).toLocaleDateString('pt-BR')}
          </span>
        </div>
        {existing.observacao && (
          <div style={{ padding: '10px 16px', fontSize: 12, color: C.t2, borderTop: `1px solid ${C.border}`, fontStyle: 'italic' }}>
            "{existing.observacao}"
          </div>
        )}
        {existing.file_name && (
          <div style={{ padding: '8px 16px', fontSize: 12, color: C.text, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
            📎 {existing.file_name}
            {(existing.file_signed_url || existing.file_url) && (
              <a href={existing.file_signed_url || existing.file_url} target="_blank" rel="noopener noreferrer" style={{ color: C.primary, fontSize: 11 }}>Abrir</a>
            )}
          </div>
        )}
        {/* PMO pode reabrir */}
        {isPMO && (
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}` }}>
            {!showReopen ? (
              <button onClick={() => setShowReopen(true)} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6,
                border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer',
                fontSize: 11, color: C.t3,
              }}>
                <RotateCcw style={{ width: 12, height: 12 }} /> Reabrir
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="text" placeholder="Motivo da reabertura..." value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, color: C.text, background: 'var(--cbrio-input-bg, #fff)' }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setShowReopen(false)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 11 }}>Cancelar</button>
                  <button onClick={handleReopen} disabled={submitting} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: C.red, color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                    {submitting ? 'Reabrindo...' : 'Confirmar reabertura'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Card não concluído — mostrar botão Concluir ──
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
      {error && (
        <div style={{ padding: '8px 12px', background: '#fee2e2', color: C.red, fontSize: 11 }}>{error}</div>
      )}

      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{
          width: '100%', padding: '12px 16px', border: 'none', cursor: 'pointer',
          background: `${C.green}08`, color: C.green, fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = `${C.green}18`}
          onMouseLeave={e => e.currentTarget.style.background = `${C.green}08`}>
          <Check style={{ width: 16, height: 16 }} /> Concluir tarefa
        </button>
      ) : (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Registrar conclusão</div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.t2, display: 'block', marginBottom: 4 }}>
              Observação <span style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea rows={2} value={observacao} onChange={e => setObservacao(e.target.value)}
              placeholder="Como foi feito, resultado obtido, imprevisto..."
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, color: C.text, resize: 'vertical', boxSizing: 'border-box', background: 'var(--cbrio-input-bg, #fff)' }} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.t2, display: 'block', marginBottom: 4 }}>
              Arquivo <span style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <input ref={fileRef} type="file" onChange={e => setFile(e.target.files[0])}
              accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.gif"
              style={{ fontSize: 12, color: C.text }} />
            {file && <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>📎 {file.name} ({(file.size / 1024).toFixed(0)} KB)</div>}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setObservacao(''); setFile(null); }}
              style={{ padding: '7px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 12, color: C.t2 }}>
              Cancelar
            </button>
            <button onClick={handleComplete} disabled={submitting}
              style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: C.green, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {submitting ? 'Registrando...' : '✓ Marcar como concluído'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
