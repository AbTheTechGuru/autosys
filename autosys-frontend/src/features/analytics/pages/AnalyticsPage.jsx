import { useState, useEffect, useCallback } from 'react';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { G }       from '@/shared/utils/tokens';
import { analyticsApi } from '@/services/api';
import { fmtM }    from '@/shared/utils/format';

const TABS = [
  { key:'overview', label:'Overview' },
  { key:'revenue',  label:'Revenue'  },
  { key:'leads',    label:'Leads'    },
  { key:'funnel',   label:'Funnel'   },
];

function StatCard({ label, value, change, loading }) {
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px] hover:border-[rgba(200,151,58,.22)] hover:-translate-y-[2px] transition-all duration-200">
      <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[5px]">{label}</div>
      {loading ? <div className="h-7 bg-surface-4 rounded animate-pulse"/> : <div className="font-display text-[26px] font-bold">{value}</div>}
      {!loading && change && <div className="text-[11px] font-extrabold mt-[4px] text-status-ok">{change}</div>}
    </div>
  );
}

function BarChart({ data=[], color=G.g, height=120 }) {
  const max = Math.max(...data.map(d=>d.value||d.v||0), 1);
  return (
    <div className="flex items-end gap-1" style={{height}}>
      {data.map((d,i)=>(
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-[3px]" style={{height:`${Math.round(((d.value||d.v||0)/max)*100)}%`,minHeight:2,background:color,opacity:0.6+i*0.02}}/>
          <span className="text-[8px] text-text-muted">{d.label||d.month||''}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ label, pct, color, animated }) {
  return (
    <div className="mb-[11px]">
      <div className="flex justify-between text-[12.5px] mb-[4px]"><span className="text-text-secondary">{label}</span><span className="font-extrabold">{pct}%</span></div>
      <div className="h-[4px] bg-surface-5 rounded-[2px] overflow-hidden"><div className="h-full rounded-[2px] transition-[width] duration-[1s]" style={{width:animated?`${pct}%`:'0%',background:`linear-gradient(90deg,${color}80,${color})`}}/></div>
    </div>
  );
}

export function AnalyticsPage() {
  const toast = useToast();
  const [tab,      setTab]      = useState('overview');
  const [data,     setData]     = useState({});
  const [loading,  setLoading]  = useState(true);
  const [anim,     setAnim]     = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoints = {
        overview: analyticsApi.getOverview(),
        revenue:  analyticsApi.getRevenue(),
        leads:    analyticsApi.getLeads(),
        funnel:   analyticsApi.getFunnel(),
      };
      const results = await Promise.allSettled(Object.values(endpoints));
      const keys    = Object.keys(endpoints);
      const merged  = {};
      keys.forEach((k,i) => { if (results[i].status==='fulfilled') merged[k]=results[i].value.data; });
      setData(merged);
    } catch (err) { toast('Failed to load analytics','danger'); }
    finally { setLoading(false); setTimeout(()=>setAnim(true),300); }
  }, []);

  useEffect(()=>{ fetchData(); },[fetchData]);

  const ov  = data.overview || {};  // FIX: backend returns flat object
  const rev = data.revenue?.revenue   || data.revenue  || {};
  const ld  = data.leads?.leads       || data.leads    || {};
  const fn  = data.funnel?.funnel     || data.funnel   || {};

  const revChart = (rev.monthly||[]).map(r=>({label:r.month?.slice(5),value:r.total||r.amount||0}));
  const ldChart  = (ld.monthly||[]).map(r=>({label:r.month?.slice(5),value:r.count||r.leads||0}));

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Analytics</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Performance insights for your dealership</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>{loading?<Spinner size={12}/>:<Icon name="refresh" size={12}/>}</Button>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-5"/>

      {tab==='overview'&&(
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total Leads"     value={ov.leads_total??'—'} change={ov.leads_change?`▲ ${ov.leads_change}% vs last month`:null} loading={loading}/>
            <StatCard label="Revenue (MTD)"   value={ov.revenue?fmtM(ov.revenue/100):'—'} loading={loading}/>
            <StatCard label="Conversion Rate" value={ov.conversion_rate?`${ov.conversion_rate}%`:'—'} loading={loading}/>
            <StatCard label="Avg Deal Value"  value={ov.avg_deal?fmtM(ov.avg_deal/100):'—'} loading={loading}/>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
              <div className="font-display text-[19px] font-bold mb-4">Revenue Trend</div>
              {loading?<div className="h-[120px] bg-surface-3 rounded animate-pulse"/>:<BarChart data={revChart.length?revChart:Array(6).fill(0).map((_,i)=>({label:`M${i+1}`,value:0}))} color={G.ok}/>}
            </div>
            <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
              <div className="font-display text-[19px] font-bold mb-4">Lead Sources</div>
              {loading?<div className="h-[120px] bg-surface-3 rounded animate-pulse"/>:(
                (ov.lead_sources||[{name:'WhatsApp',pct:45},{name:'Website',pct:30},{name:'Referral',pct:15},{name:'Walk-in',pct:10}]).map((s,i)=>(
                  <ProgressBar key={i} label={s.name} pct={s.pct||0} color={[G.g,G.bl,G.pu,G.wa][i%4]} animated={anim}/>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {tab==='revenue'&&(
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[['MTD Revenue',rev.mtd?fmtM(rev.mtd/100):'—',G.ok],['YTD Revenue',rev.ytd?fmtM(rev.ytd/100):'—',G.g],['Units Sold',rev.units_sold||'—',G.bl],['Avg Sale',rev.avg_sale?fmtM(rev.avg_sale/100):'—',G.pu]].map(([l,v,c])=>(
              <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
                <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[5px]">{l}</div>
                {loading?<div className="h-7 bg-surface-4 rounded animate-pulse"/>:<div className="font-display text-[26px] font-bold" style={{color:c}}>{v}</div>}
              </div>
            ))}
          </div>
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
            <div className="font-display text-[19px] font-bold mb-4">Monthly Revenue</div>
            {loading?<div className="h-[160px] bg-surface-3 rounded animate-pulse"/>:<BarChart data={revChart.length?revChart:Array(12).fill(0).map((_,i)=>({label:`M${i+1}`,value:0}))} color={G.ok} height={160}/>}
          </div>
        </div>
      )}

      {tab==='leads'&&(
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[['Total',ld.total||'—',G.bl],['This Month',ld.this_month||'—',G.g],['Converted',ld.converted||'—',G.ok],['Avg Score',ld.avg_score?`${ld.avg_score}/100`:'—',G.pu]].map(([l,v,c])=>(
              <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
                <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[5px]">{l}</div>
                {loading?<div className="h-7 bg-surface-4 rounded animate-pulse"/>:<div className="font-display text-[26px] font-bold" style={{color:c}}>{v}</div>}
              </div>
            ))}
          </div>
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
            <div className="font-display text-[19px] font-bold mb-4">Leads Per Month</div>
            {loading?<div className="h-[160px] bg-surface-3 rounded animate-pulse"/>:<BarChart data={ldChart.length?ldChart:Array(12).fill(0).map((_,i)=>({label:`M${i+1}`,value:0}))} color={G.bl} height={160}/>}
          </div>
        </div>
      )}

      {tab==='funnel'&&(
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
          <div className="font-display text-[19px] font-bold mb-5">Sales Funnel</div>
          {loading?<div className="space-y-3">{Array(5).fill(0).map((_,i)=><div key={i} className="h-12 bg-surface-3 rounded animate-pulse"/>)}</div>:(
            (fn.stages||[
              {name:'New Leads',count:fn.total||100,pct:100,color:G.bl},
              {name:'Contacted',count:Math.round((fn.total||100)*0.7),pct:70,color:G.pu},
              {name:'Negotiating',count:Math.round((fn.total||100)*0.4),pct:40,color:G.wa},
              {name:'Payment',count:Math.round((fn.total||100)*0.2),pct:20,color:G.g},
              {name:'Closed Won',count:Math.round((fn.total||100)*0.12),pct:12,color:G.ok},
            ]).map((s,i)=>(
              <div key={i} className="flex items-center gap-4 mb-4">
                <div className="w-[120px] text-[12.5px] font-semibold text-right shrink-0">{s.name}</div>
                <div className="flex-1 h-[32px] bg-surface-3 rounded-[6px] overflow-hidden">
                  <div className="h-full rounded-[6px] flex items-center px-3 transition-[width] duration-[1s]" style={{width:anim?`${s.pct}%`:'0%',background:s.color,minWidth:40}}>
                    <span className="text-[11px] font-extrabold text-white">{s.count}</span>
                  </div>
                </div>
                <div className="text-[12px] font-bold w-[40px] shrink-0" style={{color:s.color}}>{s.pct}%</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
