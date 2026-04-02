import { useState, useEffect } from 'react';
import { Calendar } from '../components/ui/calendar';
import { supabase } from '../supabaseClient';
import { CalendarIcon, Clock, Plus } from 'lucide-react';

const BADGE_COLORS = {
  culto: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  evento: 'bg-green-500/15 text-green-400 border-green-500/25',
  reuniao: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  prazo: 'bg-red-500/15 text-red-400 border-red-500/25',
  default: 'bg-[#00B39D]/15 text-[#00B39D] border-[#00B39D]/25',
};

export default function Calendario() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      // Try fetching from events table if it exists
      const { data, error } = await supabase
        .from('events')
        .select('id, name, date, status, category_id')
        .order('date', { ascending: true });

      if (!error && data) {
        setEvents(data.map(e => ({
          id: e.id,
          title: e.name,
          date: new Date(e.date),
          type: 'evento',
          status: e.status,
        })));
      }
    } catch {
      // Events table might not exist yet — that's ok
    } finally {
      setLoading(false);
    }
  }

  const getEventsForDate = (d) => {
    if (!d) return [];
    return events.filter(e =>
      e.date.getDate() === d.getDate() &&
      e.date.getMonth() === d.getMonth() &&
      e.date.getFullYear() === d.getFullYear()
    );
  };

  const eventDates = events.map(e => e.date);
  const currentEvents = getEventsForDate(date);

  const upcomingEvents = events
    .filter(e => e.date >= new Date())
    .slice(0, 5);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <CalendarIcon style={{ width: 28, height: 28, color: '#00B39D' }} />
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e5e5e5', margin: 0 }}>Calendário</h1>
        </div>
        <p style={{ fontSize: 13, color: '#737373' }}>Gerencie sua agenda e eventos da igreja</p>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Calendar Card */}
        <div style={{
          background: '#161616',
          border: '1px solid #262626',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e5e5e5', margin: 0 }}>Selecione uma data</h2>
            <p style={{ fontSize: 12, color: '#737373', marginTop: 4 }}>Clique em uma data para ver os eventos</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              className="rounded-lg border border-[#262626]"
              modifiers={{ hasEvent: eventDates }}
              modifiersStyles={{
                hasEvent: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  textDecorationColor: '#00B39D',
                  textDecorationThickness: '2px',
                },
              }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Events for selected date */}
          <div style={{
            background: '#161616',
            border: '1px solid #262626',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Clock style={{ width: 18, height: 18, color: '#00B39D' }} />
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#e5e5e5', margin: 0 }}>Eventos</h3>
            </div>
            <p style={{ fontSize: 12, color: '#737373', marginBottom: 16 }}>
              {date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            {currentEvents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentEvents.map((event, i) => (
                  <div key={i} style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #262626',
                    background: '#1a1a1a',
                    transition: 'background 0.15s',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#e5e5e5', margin: 0 }}>{event.title}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${BADGE_COLORS[event.type] || BADGE_COLORS.default}`}>
                        {event.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#525252' }}>
                <CalendarIcon style={{ width: 40, height: 40, margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ fontSize: 13 }}>Nenhum evento nesta data</p>
              </div>
            )}
          </div>

          {/* Upcoming events */}
          <div style={{
            background: '#161616',
            border: '1px solid #262626',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#e5e5e5', margin: '0 0 4px' }}>Próximos</h3>
            <p style={{ fontSize: 12, color: '#737373', marginBottom: 16 }}>Eventos agendados</p>

            {upcomingEvents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingEvents.map((event, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 8,
                    borderRadius: 8, transition: 'background 0.15s', cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 8, background: '#00B39D15',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 10, color: '#737373' }}>
                        {event.date.toLocaleDateString('pt-BR', { month: 'short' })}
                      </span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#e5e5e5' }}>
                        {event.date.getDate()}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#e5e5e5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
                      <p style={{ fontSize: 11, color: '#737373', margin: 0, textTransform: 'capitalize' }}>{event.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#525252', textAlign: 'center', padding: '16px 0' }}>
                Nenhum evento agendado
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
