import { useEffect, useState } from 'react';
import { Tabs }       from '@/shared/components/ui/Tabs';
import { Button }     from '@/shared/components/ui/Button';
import { Icon }       from '@/shared/components/ui/Icon';
import { LineChart }  from '@/shared/components/charts/LineChart';
import { DonutChart } from '@/shared/components/charts/DonutChart';
import { StatCardSkeleton } from '@/shared/components/ui/Skeleton';
import { G } from '@/shared/utils/tokens';
import { MONTHS, REVENUE_DATA, LEADS_MONTHLY } from '@/shared/constants';

const TABS = [
  { key:'overview', label:'Overview' },
  { key:'revenue',  label:'Revenue'  },
  { key:'leads',    label:'Leads'    },
  { key:'funnel',   label:'Funnel'   },
];

function StatCard({ label, value, change }) {
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px] hover:border-[rgba(200,151,58,.22)] hover:-translate-y-[2px] transition-all duration-200">
      <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[5px]">{label}</div>
      <div className="font-display text-[26px] font-bold">{value}</div>
      {change && <div className="text-[11px] font-extrabold mt-[4px] text-status-ok">{change}</div>}
    </div>
  );
}

function ProgressBar({ label, pct, color, animated }) {
  return (
    <div className="mb-[11px]">
      <div className="flex justify-between text-[12.5px] mb-[4px]">
        <span className="text-text-secondary">{label}</span>
        <span className="font-extrabold">{pct}%</span>
      </div>
      <div className="h-[4px] bg-surface-5 rounded-[2px] overflow-hidden">
        <div
          className="h-full rounded-[2px] transition-[width] duration-[1s]"
          style={{ width: animated ? `${pct}%` : '0%', background: `linear-gradient(90deg,${color}80,${color})` }}
        />
      </div>
    </div>
  );
}

function Heatmap() {
  const days = ['S','M','T','W','T','F','S'];
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
      <div className="font-display text-[19px] font-bold mb-[4px]">Activity Heatmap</div>
      <div className="text-[12.5px] text-text-secondary mb-4">Lead volume by day and month</div>
      <div className="flex gap-[4px] overflow-x-auto">
        <div className="flex flex-col gap-[4px] mr-[6px] shrink-0">
          {days.map((d, i) => (
            <div key={i} className="h-[16px] text-[9.5px] text-text-muted flex items-center">{d}</div>
          ))}
        </div>
        <div className="grid gap-[4px]" style={{ gridTemplateColumns:'repeat(12,1fr)', flex:1 }}>
          {days.map((_, wi) =>
            MONTHS.map((_, di) => {
              const v = Math.floor(Math.random() * 10);
              const bg = v === 0 ? G.s4 : v < 3 ? `${G.g}30` : v < 6 ? `${G.g}60` : v < 9 ? `${G.g}90` : G.g;
              return (
                <div
                  key={`${wi}-${di}`}
                  className="h-[16px] rounded-[3px]"
                  style={{ background: bg }}
                  title={`${v} leads`}
                />
              );
            })
          )}
        </div>
      </div>
      <div className="flex gap-[4px] items-center mt-[10px] justify-end">
        <span className="text-[10px] text-text-muted">Less</span>
        {[0,.3,.6,.9,1].map((o) => (
          <div key={o} className="w-[11px] h-[11px] rounded-[3px]"
            style={{ background: o === 0 ? G.s4 : `${G.g}${Math.round(o*255).toString(16).padStart(2,'0')}` }} />
        ))}
        <span className="text-[10px] text-text-muted">More</span>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const [tab,  setTab]  = useState('overview');
  const [anim, setAnim] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setLoading(false), 600);
    const t2 = setTimeout(() => setAnim(true), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Analytics</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Business intelligence &amp; performance</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-surface-3 rounded-[10px] p-[3px] flex gap-[2px]">
            {['7D','30D','3M','12M'].map((r) => (
              <button key={r} className="px-[13px] py-[6px] rounded-[7px] text-[12.5px] font-bold text-text-secondary cursor-pointer hover:text-text-primary transition-colors border-none bg-transparent font-sans">
                {r}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm"><Icon name="dl" size={13} />Export</Button>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-5" />

      {/* Overview */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
            {loading
              ? Array(6).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
              : [['Revenue','₦1.24B','+28%'],['Units Sold','134','+18%'],['Avg Deal','₦18.7M','+9%'],['Conv. Rate','33.9%','+4pp'],['Days to Close','14.2','-3.1d'],['Active Leads','127','+12%']].map(([l,v,c]) => (
                <StatCard key={l} label={l} value={v} change={c} />
              ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2 bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
              <div className="font-display text-[19px] font-bold mb-4">Revenue 2024</div>
              <LineChart data={REVENUE_DATA} labels={MONTHS} color={G.g} height={180} />
            </div>
            <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[20px]">
              <div className="font-display text-[17px] font-bold mb-4">Lead Sources</div>
              <div className="flex justify-center mb-3">
                <DonutChart
                  segments={[{v:38,c:G.bl},{v:25,c:G.g},{v:20,c:'#25D366'},{v:12,c:G.pu},{v:5,c:G.t2}]}
                  size={110}
                  center={{ top:'127', bot:'leads' }}
                />
              </div>
              {[['Website',38,G.bl],['Referral',25,G.g],['WhatsApp',20,'#25D366'],['Social',12,G.pu],['Other',5,G.t2]].map(([l,p,c]) => (
                <div key={l} className="flex justify-between items-center mb-[6px]">
                  <div className="flex items-center gap-[6px]">
                    <div className="w-[7px] h-[7px] rounded-full" style={{ background:c }} />
                    <span className="text-[12px] text-text-secondary">{l}</span>
                  </div>
                  <span className="text-[12px] font-extrabold">{p}%</span>
                </div>
              ))}
            </div>
          </div>
          <Heatmap />
        </>
      )}

      {/* Revenue tab */}
      {tab === 'revenue' && (
        <div className="flex flex-col gap-4">
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
            <div className="font-display text-[19px] font-bold mb-4">Monthly Revenue</div>
            <LineChart data={REVENUE_DATA} labels={MONTHS} color={G.g} height={200} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
              <div className="font-display text-[17px] font-bold mb-4">By Brand</div>
              {[['Toyota',42,G.g],['Mercedes',18,G.t1],['Lexus',15,G.bl],['Honda',12,G.ok],['BMW',8,G.pu],['Others',5,G.t2]].map(([b,p,c]) => (
                <ProgressBar key={b} label={b} pct={p} color={c} animated={anim} />
              ))}
            </div>
            <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
              <div className="font-display text-[17px] font-bold mb-4">Revenue Split</div>
              <div className="flex justify-center mb-4">
                <DonutChart segments={[{v:890,c:G.g},{v:350,c:G.bl},{v:24,c:G.pu}]} size={120} center={{ top:'₦1.24B', bot:'2024' }} />
              </div>
              {[['Vehicle Sales','₦890M',G.g],['Finance','₦350M',G.bl],['Other','₦24M',G.pu]].map(([l,v,c]) => (
                <div key={l} className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-[6px]">
                    <div className="w-[7px] h-[7px] rounded-full" style={{ background:c }} />
                    <span className="text-[12.5px] text-text-secondary">{l}</span>
                  </div>
                  <span className="font-extrabold" style={{ color:c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leads tab */}
      {tab === 'leads' && (
        <div className="flex flex-col gap-4">
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
            <div className="font-display text-[19px] font-bold mb-4">Lead Volume 2024</div>
            <LineChart data={LEADS_MONTHLY} labels={MONTHS} color={G.bl} height={180} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
              <div className="font-display text-[17px] font-bold mb-4">Conversion by Source</div>
              {[['Website','38%',G.bl],['Referral','52%',G.g],['WhatsApp','31%','#25D366'],['Instagram','24%','#E1306C']].map(([l,p,c]) => (
                <ProgressBar key={l} label={l} pct={parseInt(p)} color={c} animated={anim} />
              ))}
            </div>
            <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
              <div className="font-display text-[17px] font-bold mb-4">Lead Quality</div>
              {[['Hot (90–100)','22%',G.ok],['Warm (70–89)','38%',G.g],['Cool (50–69)','28%',G.wa],['Cold (0–49)','12%',G.er]].map(([l,p,c]) => (
                <ProgressBar key={l} label={l} pct={parseInt(p)} color={c} animated={anim} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Funnel tab */}
      {tab === 'funnel' && (
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
          <div className="font-display text-[19px] font-bold mb-[4px]">Conversion Funnel</div>
          <div className="text-[12.5px] text-text-secondary mb-6">From website visit to delivered vehicle</div>
          <div className="max-w-[600px]">
            {[['Website Visits',4280,100,G.t2],['Inquiries',384,9,G.bl],['Leads Captured',127,3,G.g],['Test Drives',68,1.6,G.wa],['Negotiations',43,1,G.pu],['Deals Closed',38,0.9,G.ok]].map(([label,n,p,c]) => (
              <div key={label} className="mb-3">
                <div className="flex justify-between text-[13px] mb-[5px]">
                  <span className="font-bold">{label}</span>
                  <div className="flex gap-3">
                    <span className="text-text-secondary">{n.toLocaleString()}</span>
                    <span className="font-extrabold" style={{ color:c }}>{p}%</span>
                  </div>
                </div>
                <div className="h-[18px] bg-surface-5 rounded-[5px] overflow-hidden">
                  <div
                    className="h-full rounded-[5px] transition-[width] duration-[1s]"
                    style={{ width: anim ? `${p}%` : '0%', background: `linear-gradient(90deg,${c}80,${c})`, minWidth:4 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 p-4 rounded-[10px] border" style={{ background:'rgba(37,99,235,.12)', borderColor:'rgba(37,99,235,.18)' }}>
            <div className="text-[13px] font-extrabold mb-[5px]">💡 Key Insight</div>
            <div className="text-[13px] text-text-secondary leading-[1.65]">
              Biggest drop-off between Inquiries → Leads. Adding live WhatsApp chat could recover 40+ leads/month worth ~₦12M.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
