import { useEffect, useState, useCallback } from 'react';
import { Icon }    from '@/shared/components/ui/Icon';
import { Spinner } from '@/shared/components/ui/Spinner';
import { LiveDot } from '@/shared/components/ui/LiveDot';
import { fmtM }   from '@/shared/utils/format';
import { G }      from '@/shared/utils/tokens';
import { cn }     from '@/shared/utils/cn';
import { analyticsApi } from '@/services/api/index';
import { useToast } from '@/context/ToastContext';

// TODO: Connect to backend endpoint when available
// Expected endpoint: GET /activity?limit=50&type=all
// Expected response: { events: [{ id, type, icon, title, desc, created_at }] }
// Expected endpoint: GET /activity/stats?period=today
// Expected response: { events_today, leads_today, revenue_today, active_users }

const SEED = [
  { id:1, type:'lead',    icon:'phone', title:'New lead captured',       desc:'Adeola Benson – BMW X5 via website',   time:'Just now', color:G.bl },
  { id:2, type:'pay',     icon:'pay',   title:'Payment confirmed ✓',     desc:'₦42M – Biodun Adeyemi – Lexus RX 350', time:'2m ago',   color:G.ok },
  { id:3, type:'deal',    icon:'bars',  title:'Deal stage updated',       desc:'Amaka moved → Payment stage',          time:'5m ago',   color:G.g  },
  { id:4, type:'vehicle', icon:'car',   title:'Vehicle listed',           desc:'2024 BMW X5 at ₦89M',                 time:'12m ago',  color:G.wa },
  { id:5, type:'ai',      icon:'ai',    title:'AI description generated', desc:'BMW X5 listing copy applied',          time:'18m ago',  color:G.pu },
];

const NEW_EVENTS = [
  { type:'lead', icon:'phone', title:'New WhatsApp inquiry', desc:'Musa Ibrahim – Toyota Camry', color:G.bl },
  { type:'view', icon:'eye',   title:'Traffic spike',        desc:'14 visitors in last 5 minutes', color:G.wa },
  { type:'deal', icon:'bars',  title:'Follow-up overdue',    desc:'Chukwudi Eze – 1 day overdue', color:G.g },
];

const FILTERS = ['all','lead','pay','deal','vehicle','ai','view'];

function relativeTime(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(ts).toLocaleDateString('en-NG', { month:'short', day:'numeric' });
}

export function ActivityPage() {
  const toast = useToast();
  const [events,    setEvents]  = useState(SEED);
  const [stats,     setStats]   = useState(null);
  const [paused,    setPaused]  = useState(false);
  const [filter,    setFilter]  = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  /* ── Fetch real activity + overview stats ────────────────── */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await analyticsApi.overview('7d');
      setStats(data);
    } catch { /* keep derived from seed */ } finally {
      setIsLoading(false);
    }

    // TODO: Replace with real activity feed when endpoint is ready
    // try {
    //   const { data } = await client.get('/activity', { params: { limit: 50 } });
    //   if (data.events?.length > 0) setEvents(data.events.map(e => ({
    //     ...e, time: relativeTime(e.created_at), color: TYPE_COLOR[e.type] || G.t1
    //   })));
    // } catch {}
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Simulated live feed (replace with WebSocket when ready) */
  // TODO: Replace interval with WebSocket connection when available
  // Expected: ws://api.autosys.app/ws?token=...
  // Expected messages: { type: 'activity', event: { id, type, title, desc } }
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      const ev = NEW_EVENTS[Math.floor(Math.random() * NEW_EVENTS.length)];
      setEvents((es) => [{ ...ev, id: Date.now(), time:'Just now' }, ...es.slice(0, 49)]);
    }, 9000);
    return () => clearInterval(interval);
  }, [paused]);

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);

  const statCards = [
    { label:'Events Today', value: stats ? String(stats.leads_total ?? '—') : '—',       color:G.g,  icon:'activity' },
    { label:'Leads Today',  value: stats ? String(stats.leads_new ?? '—')   : '—',       color:G.bl, icon:'phone'    },
    { label:'Revenue Today',value: stats ? fmtM(Math.round((stats.revenue ?? 0)/100)) : '—', color:G.ok, icon:'pay' },
    { label:'Active Users', value:'—',                                                    color:G.pu, icon:'users'    },
  ];

  return (
    <div className="max-w-[1100px] px-4 md:px-[22px] pt-[22px] pb-[88px] md:pb-[22px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-3">
            <LiveDot /> Activity Feed
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            Real-time events across your dealership
          </p>
        </div>
        <button
          onClick={() => setPaused((p) => !p)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] text-[11.5px] font-bold transition-colors border',
            paused
              ? 'border-gold bg-[rgba(200,151,58,.1)] text-gold'
              : 'border-surface-4 bg-surface-2 text-text-muted hover:border-surface-5'
          )}>
          <Icon name={paused ? 'play' : 'pause'} size={12} color={paused ? '#C8973A' : '#4E4B58'} />
          {paused ? 'Resume' : 'Pause feed'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[16px]">
            <div className="flex items-center gap-2 mb-2">
              <Icon name={s.icon} size={13} color={s.color} />
              <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">{s.label}</span>
            </div>
            {isLoading
              ? <div className="h-7 w-16 bg-surface-3 rounded animate-pulse" />
              : <div className="font-display text-[22px] font-bold" style={{ color:s.color }}>{s.value}</div>
            }
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-[5px] text-[11px] font-bold rounded-[7px] capitalize transition-colors',
              filter === f ? 'bg-gold text-[#0A0812]' : 'text-text-muted hover:text-text-primary hover:bg-surface-3'
            )}>
            {f}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-2">
        {filtered.map((ev) => (
          <div key={ev.id}
            className="group flex items-start gap-3 bg-surface-1 border border-surface-4 rounded-[12px] px-4 py-3 transition-all hover:border-surface-5"
            style={{ animation:'up .35s ease both' }}>
            <div className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 border"
              style={{ background:`${ev.color}16`, borderColor:`${ev.color}22` }}>
              <Icon name={ev.icon} size={13} color={ev.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-bold text-text-primary">{ev.title}</p>
              <p className="text-[11.5px] text-text-secondary mt-[2px]">{ev.desc}</p>
            </div>
            <span className="text-[10px] text-text-muted shrink-0 pt-0.5 whitespace-nowrap">
              {ev.created_at ? relativeTime(ev.created_at) : ev.time}
            </span>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <Icon name="activity" size={28} color="#4E4B58" />
            <p className="text-[13px] font-semibold mt-3">No events for this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
