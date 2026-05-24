import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Icon }   from '@/shared/components/ui/Icon';
import { Toggle } from '@/shared/components/ui/Toggle';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { G } from '@/shared/utils/tokens';
import { analyticsApi, settingsApi } from '@/services/api';
import { fmtM } from '@/shared/utils/format';

const REPORT_TYPES = [
  { key:'revenue',    icon:'pay',    title:'Sales Revenue Report',      desc:'Monthly & YTD revenue breakdown',             color:G.g  },
  { key:'leads',      icon:'phone',  title:'Lead Conversion Report',    desc:'Source attribution, conversion rates',         color:G.bl },
  { key:'inventory',  icon:'car',    title:'Inventory Movement Report', desc:'Stock levels, turnover, days listed',          color:G.ok },
  { key:'agents',     icon:'users',  title:'Agent Performance Report',  desc:'KPIs, deal count, commissions',                color:G.pu },
  { key:'website',    icon:'globe',  title:'Website Analytics Report',  desc:'Traffic, bounce rate, lead inquiries',         color:G.wa },
  { key:'funnel',     icon:'bars',   title:'Sales Funnel Report',       desc:'Stage conversion, drop-off analysis',          color:G.te },
  { key:'marketing',  icon:'send',   title:'Marketing Campaign Report', desc:'Open rates, click rates, ROI',                 color:G.er },
  { key:'finance',    icon:'chart',  title:'Financial Summary',         desc:'P&L, cash flow, gateway performance',          color:G.g  },
];

export function ReportsPage() {
  const toast = useToast();
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [genId,    setGenId]    = useState(null); // report being generated
  const [sched,    setSched]    = useState({ weekly:true, monthly:true, daily:false });
  const [downloads,setDownloads]= useState([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await analyticsApi.getOverview();
      setStats(data?.overview || data);
    } catch { /* keep empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchStats(); },[fetchStats]);

  const generateReport = async (type) => {
    setGenId(type);
    try {
      const { data } = await analyticsApi.getReport(type);
      // Build CSV from returned data
      let csv = '';
      if (data?.rows?.length) {
        csv = [Object.keys(data.rows[0]).join(','), ...data.rows.map(r=>Object.values(r).join(','))].join('\n');
      } else {
        csv = `Report: ${type}\nGenerated: ${new Date().toLocaleString()}\nNo data available yet.`;
      }
      const blob = new Blob([csv],{type:'text/csv'});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href=url; a.download=`${type}-report-${Date.now()}.csv`; a.click();
      const name = REPORT_TYPES.find(r=>r.key===type)?.title || type;
      setDownloads(prev=>[{name:`${name} — ${new Date().toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}`,type:'CSV',date:'Just now'},...prev].slice(0,5));
      toast('Report downloaded!','ok');
    } catch (err) {
      toast(err.response?.data?.message||'Failed to generate report','danger');
    } finally { setGenId(null); }
  };

  const s = stats || {};

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Reports</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Download, schedule, and export reports</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchStats} disabled={loading}>{loading?<Spinner size={12}/>:<Icon name="refresh" size={12}/>}</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          ['YTD Revenue', s.ytd_revenue ? fmtM(s.ytd_revenue/100) : '—', G.g],
          ['Units Sold',  s.units_sold  || '—',                           G.bl],
          ['Avg Deal',    s.avg_deal    ? fmtM(s.avg_deal/100)   : '—',  G.ok],
          ['Growth',      s.growth      ? `${s.growth}%`         : '—',  G.pu],
        ].map(([l,v,c])=>(
          <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[5px]">{l}</div>
            {loading?<div className="h-7 bg-surface-4 rounded animate-pulse"/>:<div className="font-display text-[26px] font-bold" style={{color:c}}>{v}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Report list */}
        <div>
          <h3 className="font-display text-[18px] font-bold mb-4">Available Reports</h3>
          <div className="flex flex-col gap-3">
            {REPORT_TYPES.map((r)=>(
              <div key={r.key} className="bg-surface-2 border border-surface-4 rounded-[14px] px-4 py-[16px] hover:border-[rgba(200,151,58,.2)] transition-all">
                <div className="flex items-center gap-[11px]">
                  <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0" style={{background:`${r.color}18`,border:`1px solid ${r.color}28`}}>
                    <Icon name={r.icon} size={17} color={r.color}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-[13.5px]">{r.title}</div>
                    <div className="text-[12px] text-text-muted mt-[2px]">{r.desc}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="xs" onClick={()=>generateReport(r.key)} disabled={genId===r.key}>
                      {genId===r.key?<Spinner size={11}/>:<Icon name="dl" size={11}/>} CSV
                    </Button>
                    <Button size="xs" onClick={()=>generateReport(r.key)} disabled={genId===r.key} style={{background:r.color,border:'none'}}>
                      {genId===r.key?<Spinner size={11}/>:<><Icon name="dl" size={11}/>PDF</>}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
            <h3 className="font-display text-[16px] font-bold mb-4">Scheduled Reports</h3>
            {[['Daily Digest','daily'],['Weekly Summary','weekly'],['Monthly Report','monthly']].map(([l,k])=>(
              <div key={k} className="flex items-center justify-between py-[10px] border-b border-surface-4 last:border-0">
                <span className="text-[13px] font-semibold">{l}</span>
                <Toggle checked={!!sched[k]} onChange={()=>setSched(s=>({...s,[k]:!s[k]}))}/>
              </div>
            ))}
          </div>

          {downloads.length > 0 && (
            <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
              <h3 className="font-display text-[16px] font-bold mb-3">Recent Downloads</h3>
              {downloads.map((d,i)=>(
                <div key={i} className="flex items-center gap-3 py-[10px] border-b border-surface-4 last:border-0">
                  <div className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center shrink-0" style={{background:`${G.bl}18`}}><Icon name="dl" size={14} color={G.bl}/></div>
                  <div className="flex-1 min-w-0"><div className="text-[12px] font-bold truncate">{d.name}</div><div className="text-[11px] text-text-muted">{d.type} · {d.date}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
