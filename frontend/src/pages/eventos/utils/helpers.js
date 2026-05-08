// Helpers compartilhados do módulo Eventos.
// Importar em Eventos.jsx, CycleView.jsx e demais componentes do módulo.

export function normDate(d) {
  return d ? (typeof d === 'string' ? d.slice(0, 10) : '') : '';
}

// DD/MM/YYYY com '—' quando vazio. Usar em Eventos.jsx (lista, modais).
export function fmtDate(d) {
  const s = normDate(d);
  if (!s) return '—';
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

// DD/MM com string vazia quando ausente. Usar em CycleView (cards compactos).
export function fmtDateShort(d) {
  const s = normDate(d);
  if (!s) return '';
  const [y, m, day] = s.split('-');
  return `${day}/${m}`;
}

export function fmtMoney(v) {
  return v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
}

export function filterByHorizon(items, days, dateField = 'prazo') {
  if (!days) return items;
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  return items.filter(t => {
    const d = normDate(t[dateField]);
    if (!d) return true;
    return new Date(d + 'T12:00:00') <= limit;
  });
}

export function sortByUrgency(tasks) {
  return [...tasks].sort((a, b) => {
    const pa = normDate(a.prazo || a.deadline);
    const pb = normDate(b.prazo || b.deadline);
    if (!pa && !pb) return 0;
    if (!pa) return 1;
    if (!pb) return -1;
    return pa.localeCompare(pb);
  });
}

// Categorias do ciclo criativo (usado em CycleView e no kanban global de Eventos.jsx).
export const CYCLE_CATEGORIES = {
  marketing:  { label: 'Marketing',  color: '#00B39D', bg: '#d1fae5', border: '#5dcaa5' },
  compras:    { label: 'Compras',    color: '#3b82f6', bg: '#dbeafe', border: '#85b7eb' },
  financeiro: { label: 'Financeiro', color: '#10b981', bg: '#d1fae5', border: '#5dcaa5' },
  manutencao: { label: 'Manutenção', color: '#f59e0b', bg: '#fef3c7', border: '#ef9f27' },
  limpeza:    { label: 'Limpeza',    color: '#8b5cf6', bg: '#ede9fe', border: '#afa9ec' },
  cozinha:    { label: 'Cozinha',    color: '#ec4899', bg: '#fce7f3', border: '#f0997b' },
  outros:     { label: 'Outros',     color: 'var(--cbrio-text3)', bg: 'var(--cbrio-bg)', border: 'var(--cbrio-border)' },
};
