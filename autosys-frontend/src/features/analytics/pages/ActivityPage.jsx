import { useEffect, useState, useCallback } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Spinner } from '@/shared/components/ui/Spinner';
import { LiveDot } from '@/shared/components/ui/LiveDot';
import { fmtM }    from '@/shared/utils/format';
import { G }       from '@/shared/utils/tokens';
import { cn }      from '@/shared/utils/cn';
import { analyticsApi } from '@/services/api';

const FILTERS = ['all','lead','pay','deal','vehicle','ai','view'];
const TYPE_COLORS = { lead:G.bl, pay:G.ok, deal:G.g, vehicle:G.wa, ai:G.pu, view:G.te };
const TYPE_ICONS  = { lead:'phone', pay:'pay', deal:'bars', vehicle:'car', ai:'ai', view:'eye' };

export function ActivityPage() {
  const [events,  setEvents]  = useState([]);
  const [paused,  setPaused]  = useState(false);
  const [filter,  setFilter]  = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState(null);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await analyticsApi.getOverview();
      const ov = data?.overview || {};
      setStats(ov);
      // Map events if available
      if (data?.events?.length) {
        setEvents(data.events.map((e,i)=>({
          id: e.id||i, type:e.type||'lead',
          icon: TYPE_ICONS[e.type]||'activity',
          title: e.title||e.description||'Activity',
          desc:  e.detail||e.meta||'',
          time:  e.created_at ? (() => { const d=Date.now()-new Date(e.created_at); return d<60000?'Just now':d<3600000?`${Math.floor(d/60000)}m ago`:`${Math.floor(d/3600000)}h ago`; })() : 'Now',
          color: TYPE_COLORS[e.type]||G.bl,
        })));
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchActivity(); },[fetchActivity]);

  // Real-time simulation with polling when not paused
  useEffect(()=>{
    if (paused) return;
    const iv = setInterval(()=>{ fetchActivity(); },30000);
    return ()=>clearInterval(iv);
  },[paused,fetchActivity]);

  const filtered = filter==='all' ? events : events.filter(e=>e.type===filter);
  const s = stats || {};

  const kpis = [
    { label:'Events Today', value:s.events_today||events.length,           color:G.g,  icon:'activity' },
    { label:'Leads Today',  value:s.leads_today||'—',                       color:G.bl, icon:'phone'    },
    { label:'Revenue Today',value:s.revenue_today?fmtM(s.revenue_today/100):'—', color:G.ok, icon:'pay' },
    { label:'Active Users', value:s.active_users||'—',                      color:G.pu, icon:'users'    },
  ];

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-2">
            <LiveDot/> Live Activity
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Real-time events across your dealership</p>
        </div>
        <div className="flex gap-2">
          <Button variant={paused?'gold':'ghost'} size="sm" onClick={()=>setPaused(p=>!p)}>{paused?'▶ Resume':'⏸ Pause'}</Button>
          <Button variant="ghost" size="sm" onClick={fetchActivity} disabled={loading}>{loading?<Spinner size={12}/>:<Icon name="refresh" size={12}/>}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map(s=>(
          <div key={s.label} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="flex justify-between items-start mb-2"><div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px]">{s.label}</div><Icon name={s.icon} size={16} color={s.color}/></div>
            {loading?<div className="h-7 bg-surface-4 rounded animate-pulse"/>:<div className="font-display text-[26px] font-bold" style={{color:s.color}}>{s.value}</div>}
          </div>
        ))}
      </div>

      <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-4 flex-wrap">
          {FILTERS.map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={cn('px-3 py-[5px] text-[11.5px] font-bold rounded-[7px] capitalize transition-colors',filter===f?'bg-gold text-[#0A0812]':'text-text-muted hover:bg-surface-3')}>
              {f}
            </button>
          ))}
        </div>

        {loading&&<div className="p-4 space-y-3">{Array(5).fill(0).map((_,i)=><div key={i} className="flex gap-3 animate-pulse"><div className="w-9 h-9 rounded-[9px] bg-surface-3 shrink-0"/><div className="flex-1"><div className="h-3 bg-surface-3 rounded w-1/2 mb-1.5"/><div className="h-2.5 bg-surface-3 rounded w-3/4"/></div></div>)}</div>}

        {!loading&&filtered.length===0&&(
          <div className="text-center py-12 text-text-muted">
            <Icon name="activity" size={28} color="#4E4B58"/>
            <p className="text-[13px] font-semibold mt-3">No activity yet</p>
            <p className="text-[12px] mt-1">Events will appear here as your team works</p>
          </div>
        )}

        {!loading&&filtered.map(ev=>(
          <div key={ev.id} className="flex items-start gap-3 px-4 py-[12px] border-b border-surface-4 last:border-0 hover:bg-surface-3 transition-colors">
            <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0" style={{background:`${ev.color}18`,border:`1px solid ${ev.color}28`}}>
              <Icon name={ev.icon} size={15} color={ev.color}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-[13px]">{ev.title}</div>
              {ev.desc&&<div className="text-[12px] text-text-secondary mt-[2px] truncate">{ev.desc}</div>}
            </div>
            <div className="text-[11px] text-text-muted shrink-0">{ev.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
