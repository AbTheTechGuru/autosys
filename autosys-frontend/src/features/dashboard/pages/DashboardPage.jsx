import { useEffect, useState, useCallback } from 'react';
import { Link }    from 'react-router-dom';
import { Icon }    from '@/shared/components/ui/Icon';
import { Button }  from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useAuthStore } from '@/store/authStore';
import { fmtM }    from '@/shared/utils/format';
import { G }       from '@/shared/utils/tokens';
import { analyticsApi, crmApi, salesApi } from '@/services/api';

function StatCard({ label, value, icon, change, color=G.g, loading }) {
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px] hover:border-[rgba(200,151,58,.22)] hover:-translate-y-[2px] transition-all duration-200">
      <div className="flex justify-between items-start mb-[13px]">
        <div>
          <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[6px]">{label}</div>
          {loading ? <div className="h-8 w-24 bg-surface-4 rounded animate-pulse"/> : <div className="font-display text-[29px] font-bold leading-none">{value}</div>}
          {!loading && change !== undefined && <div className="text-[11px] font-extrabold mt-[5px]" style={{color:change>=0?G.ok:G.er}}>{change>=0?'▲':'▼'} {Math.abs(change)}% vs last month</div>}
        </div>
        <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center border" style={{background:`${color}14`,borderColor:`${color}24`}}>
          <Icon name={icon} size={17} color={color}/>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const user   = useAuthStore((s) => s.user);
  const dealer = useAuthStore((s) => s.dealer);
  const [data, setData]       = useState(null);
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, leadsRes] = await Promise.allSettled([
        analyticsApi.getOverview(),
        crmApi.getLeads({ limit:5 }),
      ]);
      if (overviewRes.status==='fulfilled') setData(overviewRes.value.data);
      if (leadsRes.status==='fulfilled') setLeads((leadsRes.value.data.leads??[]).slice(0,5));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const overview = data || {};  // FIX: backend returns flat object, not nested under 'overview'
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-[23px] font-bold">{greeting}, {user?.name?.split(' ')[0] || 'Admin'} 👋</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">{dealer?.name} · Here's your dealership overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>{loading?<Spinner size={12}/>:<Icon name="refresh" size={12}/>}</Button>
          <Button variant="gold" size="sm" as={Link} to="/app/crm"><Icon name="plus" size={13}/>Add Lead</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Leads"    value={overview.leads_total     ?? '—'} icon="phone"   color={G.bl} change={overview.leads_change}   loading={loading}/>
        <StatCard label="Revenue (MTD)"  value={overview.revenue ? fmtM(overview.revenue/100) : '—'} icon="pay" color={G.ok} change={overview.revenue_change} loading={loading}/>
        <StatCard label="Vehicles Listed" value={overview.fleet_size      ?? '—'} icon="car"     color={G.g}  loading={loading}/>
        <StatCard label="Deals Won"       value={overview.deals_closed    ?? '—'} icon="check"   color={G.pu} change={overview.deals_change}    loading={loading}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Recent leads */}
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-surface-4">
            <h3 className="font-bold text-[15px]">Recent Leads</h3>
            <Button variant="ghost" size="xs" as={Link} to="/app/crm">View all →</Button>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">{Array(4).fill(0).map((_,i)=><div key={i} className="h-12 bg-surface-3 rounded animate-pulse"/>)}</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-text-muted"><p className="text-[13px]">No leads yet</p><Button variant="ghost" size="sm" className="mt-2" as={Link} to="/app/crm">Add first lead →</Button></div>
          ) : (
            <div>
              {leads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 px-5 py-3 border-b border-surface-4 last:border-0 hover:bg-surface-3 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center font-bold text-[12px] shrink-0">{(lead.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-bold truncate">{lead.name}</p>
                    <p className="text-[11px] text-text-muted truncate">{lead.vehicle_interest||lead.phone||'—'}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-[2px] rounded-full capitalize" style={{background:`${G.bl}18`,color:G.bl}}>{lead.stage||'new'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="space-y-3">
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">Quick Actions</p>
            {[
              ['/app/inventory','Add Vehicle','car',G.g],
              ['/app/crm','Add Lead','phone',G.bl],
              ['/app/marketing','New Campaign','send',G.pu],
              ['/app/calendar','Add Task','activity',G.wa],
              ['/app/ai','Ask AI','ai',G.t2],
            ].map(([to,label,icon,color])=>(
              <Link key={to} to={to} className="flex items-center gap-3 py-2.5 border-b border-surface-4 last:border-0 hover:text-gold transition-colors no-underline">
                <div className="w-7 h-7 rounded-[7px] flex items-center justify-center" style={{background:`${color}18`}}><Icon name={icon} size={13} color={color}/></div>
                <span className="text-[12.5px] font-semibold text-text-primary">{label}</span>
                <Icon name="arr" size={11} color="#4E4B58" className="ml-auto"/>
              </Link>
            ))}
          </div>

          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">Plan</p>
            <p className="text-[22px] font-display font-bold capitalize" style={{color:G.g}}>{dealer?.plan||'Free'}</p>
            <p className="text-[11.5px] text-text-muted mt-1 mb-3">{dealer?.trial_ends_at ? `Trial ends ${new Date(dealer.trial_ends_at).toLocaleDateString('en-NG',{day:'numeric',month:'short'})}` : 'Active subscription'}</p>
            <Button variant="ghost" size="sm" className="w-full justify-center" as={Link} to="/app/settings?tab=billing">Manage Plan →</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
