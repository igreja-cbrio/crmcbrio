import { useState, useEffect, useRef } from 'react';
import { completions } from '../api';
import { Upload, Check, RotateCcw, X, FileText } from 'lucide-react';

const C = {
  text: 'var(--cbrio-text)', t2: 'var(--cbrio-text2)', t3: 'var(--cbrio-text3)',
  border: 'var(--cbrio-border)', bg: 'var(--cbrio-bg)',
  green: '#10b981', red: '#ef4444', primary: '#7c3aed',
};

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function CompletionSection({ task, phase, eventName, isPMO, onComplete }) {
  const [existing, setExisting] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [files, setFiles] = useState([]); // [{ file, progress, uploaded, result }]
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

  const addFiles = (e) => {
    const newFiles = Array.from(e.target.files || []).map(f => ({
      file: f, progress: 0, uploaded: false, result: null,
    }));
    setFiles(prev => [...prev, ...newFiles]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  // Upload cada arquivo direto pro SharePoint via upload session
  const uploadFilesToSharePoint = async () => {
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.uploaded && f.result) { uploaded.push(f.result); continue; }
      try {
        // 1. Obter upload URL do backend
        const { uploadUrl, sharepointPath, fileName } = await completions.getUploadUrl({
          fileName: f.file.name,
          eventName: eventName || '',
          phaseName: phase ? `Fase ${String(phase.numero_fase).padStart(2, '0')} - ${phase.nome_fase}` : '',
          area: task.area || '',
        });

        // 2. Upload direto para SharePoint (PUT com o arquivo inteiro)
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': f.file.size,
            'Content-Range': `bytes 0-${f.file.size - 1}/${f.file.size}`,
          },
          body: f.file,
        });

        if (!uploadRes.ok) {
          let errMsg = `SharePoint retornou ${uploadRes.status}`;
          try {
            const errData = await uploadRes.json();
            errMsg = errData.error?.message || errData.error || errMsg;
          } catch { /* resposta pode não ser JSON */ }
          throw new Error(errMsg);
        }

        const uploadData = await uploadRes.json();

        const result = {
          file_name: f.file.name,
          file_url: uploadData.webUrl || '',
          sharepoint_path: sharepointPath,
          sharepoint_item_id: uploadData.id || null,
          mime_type: f.file.type,
          size: f.file.size,
        };

        // Update progress
        setFiles(prev => prev.map((pf, pi) => pi === i ? { ...pf, progress: 100, uploaded: true, result } : pf));
        uploaded.push(result);
      } catch (err) {
        setFiles(prev => prev.map((pf, pi) => pi === i ? { ...pf, progress: -1 } : pf));
        throw new Error(`Falha ao enviar ${f.file.name}: ${err.message}`);
      }
    }
    return uploaded;
  };

  const handleComplete = async () => {
    setSubmitting(true);
    setError('');
    try {
      // Upload arquivos para SharePoint
      let uploadedFiles = [];
      if (files.length > 0) {
        uploadedFiles = await uploadFilesToSharePoint();
      }

      // Registrar conclusão com metadata dos arquivos
      const result = await completions.complete({
        task_id: task.id,
        event_id: task.event_id,
        event_phase_id: task.event_phase_id || '',
        phase_number: phase?.numero_fase || 0,
        phase_name: phase?.nome_fase || '',
        area: task.area || '',
        observacao: observacao.trim() || null,
        files: uploadedFiles,
      });
      if (result.error) throw new Error(result.error);

      setShowForm(false);
      setObservacao('');
      setFiles([]);
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
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
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
        {/* Lista de arquivos */}
        {existing.files && existing.files.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.border}` }}>
            {existing.files.map((f, i) => (
              <div key={i} style={{ padding: '6px 16px', fontSize: 12, color: C.text, display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${C.border}` }}>
                <FileText style={{ width: 14, height: 14, color: C.t3 }} />
                <span style={{ flex: 1 }}>{f.file_name}</span>
                <span style={{ fontSize: 10, color: C.t3 }}>{formatSize(f.file_size)}</span>
                {f.sharepoint_url && (
                  <a href={f.sharepoint_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: C.primary }}>Abrir</a>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Backward compat: arquivo único no card_completions */}
        {existing.file_name && (!existing.files || existing.files.length === 0) && (
          <div style={{ padding: '8px 16px', fontSize: 12, color: C.text, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
            📎 {existing.file_name}
            {(existing.file_signed_url || existing.file_url) && (
              <a href={existing.file_signed_url || existing.file_url} target="_blank" rel="noopener noreferrer" style={{ color: C.primary, fontSize: 11 }}>Abrir</a>
            )}
          </div>
        )}
        {/* PMO reabrir */}
        {isPMO && (
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}` }}>
            {!showReopen ? (
              <button onClick={() => setShowReopen(true)} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6,
                border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 11, color: C.t3,
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

  // ── Card não concluído ──
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
      {error && (
        <div style={{ padding: '8px 12px', background: '#fee2e2', color: C.red, fontSize: 11 }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: C.red }}>✕</button>
        </div>
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

          {/* Observação */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.t2, display: 'block', marginBottom: 4 }}>
              Observação <span style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea rows={2} value={observacao} onChange={e => setObservacao(e.target.value)}
              placeholder="Como foi feito, resultado obtido, imprevisto..."
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, color: C.text, resize: 'vertical', boxSizing: 'border-box', background: 'var(--cbrio-input-bg, #fff)' }} />
          </div>

          {/* Arquivos (múltiplos) */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.t2, display: 'block', marginBottom: 4 }}>
              Entregáveis <span style={{ fontWeight: 400 }}>(opcional — múltiplos arquivos)</span>
            </label>
            <input ref={fileRef} type="file" multiple onChange={addFiles} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{
              padding: '8px 14px', borderRadius: 6, border: `1px dashed ${C.border}`, background: 'transparent',
              cursor: 'pointer', fontSize: 12, color: C.t2, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Upload style={{ width: 14, height: 14 }} /> Adicionar arquivos
            </button>

            {/* Lista de arquivos selecionados */}
            {files.length > 0 && (
              <div style={{ marginTop: 8, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                {files.map((f, i) => (
                  <div key={i} style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                    <FileText style={{ width: 14, height: 14, color: C.t3, flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text }}>{f.file.name}</span>
                    <span style={{ fontSize: 10, color: C.t3, flexShrink: 0 }}>{formatSize(f.file.size)}</span>
                    {f.uploaded && <Check style={{ width: 14, height: 14, color: C.green, flexShrink: 0 }} />}
                    {f.progress === -1 && <span style={{ fontSize: 10, color: C.red }}>Erro</span>}
                    {!f.uploaded && f.progress === 0 && (
                      <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3, padding: 0 }}>
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 10, color: C.t3, marginTop: 4 }}>
              Sem limite de tamanho · Qualquer tipo de arquivo · Enviado direto para o SharePoint
            </div>
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setObservacao(''); setFiles([]); }}
              style={{ padding: '7px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 12, color: C.t2 }}>
              Cancelar
            </button>
            <button onClick={handleComplete} disabled={submitting}
              style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: C.green, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {submitting ? (files.length > 0 ? 'Enviando arquivos...' : 'Registrando...') : '✓ Marcar como concluído'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
