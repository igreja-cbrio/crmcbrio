import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { events as api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import EventFormModal from './components/EventFormModal';

const C = {
  bg: '#f3f4f6', card: '#fff', dark: '#1a1a2e', t2: '#6b7280', t3: '#9ca3af',
  border: '#e5e7eb', accent: '#7c3aed', accentBg: '#f3e8ff',
};

const STATUS = {
  'no-prazo':  { label: 'No prazo',   color: '#10b981', bg: '#ecfdf5' },
  'em-risco':  { label: 'Em risco',   color: '#f59e0b', bg: '#fffbeb' },
  'atrasado':  { label: 'Atrasado',   color: '#ef4444', bg: '#fef2f2' },
  'concluido': { label: 'Concluído',  color: '#6b7280', bg: '#f3f4f6' },
};

function DaysCounter({ date }) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date + 'T12:00:00') - new Date()) / 86400000);
  const color = diff < 0 ? '#ef4444' : diff <= 7 ? '#f59e0b' : '#10b981';
  const text = diff < 0 ? `${Math.abs(diff)}d atrás` : diff === 0 ? 'Hoje' : `${diff}d`;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, padding: '1px 6px', borderRadius: 4, background: `${color}15` }}>
      {text}
    </span>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || C.dark }}>{value}</div>
      <div style={{ fontSize: 11, color: C.t2, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Calendar({ eventsByDate, viewMonth, setViewMonth }) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} style={navBtn}>&lt;</button>
        <span style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>{monthNames[month]} {year}</span>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} style={navBtn}>&gt;</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} style={{ fontSize: 10, fontWeight: 600, color: C.t3, padding: '4px 0' }}>{d}</div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const evs = eventsByDate[ds] || [];
          const isToday = ds === todayStr;
          return (
            <div key={d} style={{
              padding: '4px 0', borderRadius: 6, fontSize: 12,
              background: isToday ? C.accent : 'transparent',
              color: isToday ? '#fff' : C.dark,
              fontWeight: isToday ? 700 : 400,
            }}>
              {d}
              {evs.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                  {evs.slice(0, 3).map((ev, j) => (
                    <div key={j} style={{ width: 4, height: 4, borderRadius: 2, background: ev.category_color || C.accent }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navBtn = {
  background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
  padding: '4px 10px', cursor: 'pointer', fontSize: 14, color: '#1a1a2e',
};

export default function Eventos() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isDiretor = profile?.role === 'diretor';

  const [eventsList, setEventsList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [viewMonth, setViewMonth] = useState(new Date());

  const load = async () => {
    try {
      const [evs, cats] = await Promise.all([api.list(), api.categories()]);
      setEventsList(evs);
      setCategories(cats);
    } catch (e) {
      console.error('Erro ao carregar eventos:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = eventsList;
    if (filter !== 'all') list = list.filter(e => e.status === filter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(s) || (e.responsible || '').toLowerCase().includes(s));
    }
    return list;
  }, [eventsList, filter, search]);

  const eventsByDate = useMemo(() => {
    const map = {};
    eventsList.forEach(ev => {
      const d = ev.date?.slice(0, 10);
      if (d) { if (!map[d]) map[d] = []; map[d].push(ev); }
      (ev.occurrence_dates || []).forEach(od => {
        const odn = typeof od === 'string' ? od.slice(0, 10) : od;
        if (odn && odn !== d) { if (!map[odn]) map[odn] = []; map[odn].push(ev); }
      });
    });
    return map;
  }, [eventsList]);

  const counts = useMemo(() => {
    const c = { total: eventsList.length, 'no-prazo': 0, 'em-risco': 0, 'atrasado': 0, 'concluido': 0 };
    eventsList.forEach(e => { if (c[e.status] !== undefined) c[e.status]++; });
    return c;
  }, [eventsList]);

  const handleSave = async (data) => {
    if (editEvent) {
      await api.update(editEvent.id, data);
    } else {
      await api.create(data);
    }
    setShowForm(false);
    setEditEvent(null);
    load();
  };

  if (loading) return <div style={{ padding: 40, color: C.t2 }}>Carregando eventos...</div>;

  return (
    <div>
      <div className="header-actions">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>Eventos</h1>
        {isDiretor && (
          <button onClick={() => { setEditEvent(null); setShowForm(true); }} style={primaryBtn}>
            + Novo Evento
          </button>
        )}
      </div>

      <div className="kpi-grid">
        <KpiCard label="Total" value={counts.total} />
        <KpiCard label="No prazo" value={counts['no-prazo']} color="#10b981" />
        <KpiCard label="Em risco" value={counts['em-risco']} color="#f59e0b" />
        <KpiCard label="Atrasados" value={counts['atrasado']} color="#ef4444" />
        <KpiCard label="Concluídos" value={counts['concluido']} color="#6b7280" />
      </div>

      <div className="search-row" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[{ key: 'all', label: 'Todos' }, ...Object.entries(STATUS).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: filter === f.key ? `1.5px solid ${f.key === 'all' ? C.accent : STATUS[f.key]?.color || C.accent}` : `1px solid ${C.border}`,
              background: filter === f.key ? (STATUS[f.key]?.bg || C.accentBg) : 'transparent',
              color: filter === f.key ? (STATUS[f.key]?.color || C.accent) : C.t3,
            }}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text" placeholder="Buscar evento..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, flex: 1, minWidth: 180 }}
        />
      </div>

      <div className="grid-2">
        <Calendar eventsByDate={eventsByDate} viewMonth={viewMonth} setViewMonth={setViewMonth} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: C.t3, fontSize: 13 }}>Nenhum evento encontrado</div>
          )}
          {filtered.map(ev => {
            const st = STATUS[ev.status] || STATUS['no-prazo'];
            return (
              <div key={ev.id} onClick={() => navigate(`/eventos/${ev.id}`)} style={{
                background: '#fff', borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                border: `1px solid ${C.border}`, borderLeft: `4px solid ${ev.category_color || C.accent}`,
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{ev.name}</div>
                    <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>
                      {ev.date && new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      {ev.responsible && ` · ${ev.responsible}`}
                      {ev.category_name && ` · ${ev.category_name}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <DaysCounter date={ev.date} />
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                      color: st.color, background: st.bg,
                    }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <EventFormModal
          event={editEvent}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditEvent(null); }}
        />
      )}
    </div>
  );
}

const primaryBtn = {
  padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: '#7c3aed', color: '#fff', fontWeight: 600, fontSize: 13,
};
