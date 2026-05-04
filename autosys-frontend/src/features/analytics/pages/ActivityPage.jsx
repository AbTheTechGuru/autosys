import { useEffect, useState } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { LiveDot } from '@/shared/components/ui/LiveDot';
import { fmtM }   from '@/shared/utils/format';
import { G }      from '@/shared/utils/tokens';
import { cn }     from '@/shared/utils/cn';

const SEED = [
  { id:1, type:'lead',    icon:'phone', title:'New lead captured',         desc:'Adeola Benson – BMW X5 via website',     time:'Just now', color:G.bl },
  { id:2, type:'pay',     icon:'pay',   title:'Payment confirmed ✓',       desc:'₦42M – Biodun Adeyemi – Lexus RX 350',   time:'2m ago',   color:G.ok },
  { id:3, type:'deal',    icon:'bars',  title:'Deal stage updated',         desc:'Amaka moved → Payment stage',            time:'5m ago',   color:G.g  },
  { id:4, type:'vehicle', icon:'car',   title:'Vehicle listed',             desc:'2024 BMW X5 at ₦89M',                   time:'12m ago',  color:G.wa },
  { id:5, type:'ai',      icon:'ai',    title:'AI description generated',   desc:'BMW X5 listing copy applied',            time:'18m ago',  color:G.pu },
  { id:6, type:'pay',     icon:'pay',   title:'Subscription renewed',       desc:'Pro Plan – ₦15,000 charged',            time:'1h ago',   color:G.g  },
  { id:7, type:'view',    icon:'eye',   title:'Website traffic spike',      desc:'GLE 450 viewed 8 times from Lagos',      time:'2h ago',   color:G.te },
];

const NEW_EVENTS = [
  { type:'lead', icon:'phone', title:'New WhatsApp inquiry', desc:'Musa Ibrahim – Toyota Camry', color:G.bl },
  { type:'view', icon:'eye',   title:'Traffic spike',        desc:'14 visitors in last 5 minutes', color:G.te },
  { type:'deal', icon:'bars',  title:'Follow-up overdue',    desc:'Chukwudi Eze – 1 day overdue', color:G.wa },
];

const FILTERS = ['all','lead','pay','deal','vehicle','ai','view'];

export function ActivityPage() {
  const [events,  setEvents]  = useState(SEED);
  const [paused,  setPaused]  = useState(false);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      const ev = NEW_EVENTS[Math.floor(Math.random() * NEW_EVENTS.length)];
      setEvents((es) => [{ ...ev, id: Date.now(), time: 'Just now' }, ...es.slice(0, 19)]);
    }, 9000);
    return () => clearInterval(interval);
  }, [paused]);

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);

  const stats = [
    { label:'Events Today', value:'284',         color:G.g,  icon:'activity' },
    { label:'Leads Today',  value:'14',          color:G.bl, icon:'phone'    },
    { label:'Revenue Today',value:fmtM(18500000),color:G.ok, icon:'pay'      },
    { label:'Active Users', value:'4',           color:G.pu, icon:'users'    },
  ];

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-[10px]">
            Live Activity Feed
            <div className="flex items-center gap-[5px] px-[10px] py-[3px] rounded-[20px] border" style={{ background:'rgba(22,163,74,.12)', borderColor:'rgba(22,163,74,.28)' }}>
              <LiveDot /><span className="text-[11px] text-status-ok font-bold">LIVE</span>
            </div>
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Real-time events · updating every 9s</p>
        </div>
        <div className="flex gap-2">
          <Button variant={paused ? 'gold' : 'ghost'} size="sm" onClick={() => setPaused(!paused)}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </Button>
          <Button variant="ghost" size="sm"><Icon name="dl" size={13} />Export</Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {stats.map(({ label, value, color, icon }) => (
          <div key={label} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="flex justify-between items-start mb-2">
              <Icon name={icon} size={18} color={color} />
              <LiveDot />
            </div>
            <div className="font-display text-[24px] font-bold" style={{ color }}>{value}</div>
            <div className="text-[11px] text-text-secondary">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* Event stream */}
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden">
          <div className="px-[18px] py-[14px] border-b border-surface-4 flex gap-2 flex-wrap items-center">
            <div className="font-display text-[17px] font-bold flex-1">Event Stream</div>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'text-[11px] font-extrabold uppercase px-[8px] py-[3px] rounded-[7px] border cursor-pointer transition-all capitalize',
                  filter === f
                    ? 'border-gold text-surface-bg btn-gold'
                    : 'border-surface-4 text-text-secondary bg-transparent hover:bg-surface-3',
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="max-h-[520px] overflow-y-auto" role="log" aria-live="polite" aria-label="Activity feed">
            {filtered.map((ev, i) => (
              <div
                key={ev.id}
                className="flex gap-[9px] items-start px-[18px] py-3 border-b border-[rgba(33,33,46,.3)] last:border-0"
                style={{ animation: i === 0 && !paused ? 'up .4s ease' : 'none' }}
              >
                <div
                  className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center shrink-0 border"
                  style={{ background:`${ev.color}18`, borderColor:`${ev.color}22` }}
                >
                  <Icon name={ev.icon} size={14} color={ev.color} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-bold">{ev.title}</div>
                  <div className="text-[12px] text-text-secondary">{ev.desc}</div>
                  <div className="text-[10.5px] text-text-muted mt-[2px]">{ev.time}</div>
                </div>
                <div className="w-[6px] h-[6px] rounded-full shrink-0 mt-[6px] opacity-60" style={{ background:ev.color }} />
              </div>
            ))}
          </div>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4">
          {/* Hourly chart */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="font-display text-[17px] font-bold mb-3">Events by Hour</div>
            <div className="flex items-end gap-[2px] h-[80px]">
              {[3,8,12,18,25,32,28,14,22,38,45,62,58,44,38,29,42,55,48,36,22,14,8,4].map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[2px]"
                  style={{
                    height: `${(v / 62) * 100}%`,
                    background: i >= 8 && i <= 17
                      ? `linear-gradient(to top,${G.gd},${G.g})`
                      : `linear-gradient(to top,${G.s5},${G.s6})`,
                    minHeight: 2,
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1 text-[9.5px] text-text-muted">
              <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
            </div>
          </div>

          {/* Top sources */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="font-display text-[17px] font-bold mb-4">Top Sources Today</div>
            {[['WhatsApp','47 events','#25D366'],['Website','38 events',G.bl],['Instagram','22 events','#E1306C'],['Referrals','14 events',G.g],['Facebook','9 events','#1877F2']].map(([s,v,c]) => (
              <div key={s} className="flex justify-between items-center mb-[10px]">
                <div className="flex items-center gap-[7px]">
                  <div className="w-[8px] h-[8px] rounded-full" style={{ background:c }} />
                  <span className="text-[13px] text-text-secondary">{s}</span>
                </div>
                <span className="text-[12px] font-bold" style={{ color:c }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Online now */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="font-display text-[17px] font-bold mb-3">Online Now</div>
            {[['Sarah K.','Sales Agent',G.ok],['John D.','Sales Agent',G.ok],['Mike A.','Sales Agent',G.wa],['You','Admin',G.ok]].map(([name,role,c]) => (
              <div key={name} className="flex items-center gap-[9px] mb-[10px]">
                <div
                  className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center font-extrabold text-[10px] shrink-0"
                  style={{ background:'linear-gradient(135deg,#8B5E18,#C8973A)', color:'#07070B' }}
                >
                  {name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">{name}</div>
                  <div className="text-[11px] text-text-muted">{role}</div>
                </div>
                <div className="w-[7px] h-[7px] rounded-full" style={{ background:c, boxShadow: c===G.ok?`0 0 6px ${G.ok}`:'none' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
