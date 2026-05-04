import { useEffect, useState } from 'react';
import { Icon }    from '@/shared/components/ui/Icon';
import { Button }  from '@/shared/components/ui/Button';
import { Badge }   from '@/shared/components/ui/Badge';
import { StatCardSkeleton } from '@/shared/components/ui/Skeleton';
import { BarChart } from '@/shared/components/charts/BarChart';
import { useAuthStore } from '@/store/authStore';
import { useSalesStore } from '@/store/salesStore';
import { useCrmStore }   from '@/store/crmStore';
import { fmtM }    from '@/shared/utils/format';
import { G }       from '@/shared/utils/tokens';
import { MONTHS, REVENUE_DATA } from '@/shared/constants';

/* ── Stat card ──────────────────────────────────────────────── */
function StatCard({ label, value, icon, change, color = G.g, spark = [] }) {
  const [a, setA] = useState(false);
  useEffect(() => { const t = setTimeout(() => setA(true), 80); return () => clearTimeout(t); }, []);

  return (
    <div
      className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]
                 transition-all duration-200 hover:border-[rgba(200,151,58,.22)] hover:-translate-y-[2px]"
    >
      <div className="flex justify-between items-start mb-[13px]">
        <div>
          <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[6px]">
            {label}
          </div>
          <div className="font-display text-[29px] font-bold leading-none">{value}</div>
          {change !== undefined && (
            <div
              className="text-[11px] font-extrabold mt-[5px]"
              style={{ color: change >= 0 ? G.ok : G.er }}
            >
              {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs last month
            </div>
          )}
        </div>
        <div
          className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center border"
          style={{ background: `${color}14`, borderColor: `${color}24` }}
        >
          <Icon name={icon} size={17} color={color} />
        </div>
      </div>

      {/* Sparkline */}
      {spark.length > 0 && (
        <div className="flex items-end gap-[2px] h-[28px]">
          {spark.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-[2px] opacity-70"
              style={{
                height:     `${(v / Math.max(...spark)) * 100}%`,
                background: `linear-gradient(to top, ${color}70, ${color})`,
                transition: `height .8s ease ${i * 0.04}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Pipeline mini ──────────────────────────────────────────── */
function PipelineMini() {
  const total = useSalesStore((s) => s.getPipelineTotal());

  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
      <div className="font-display text-[17px] font-bold mb-3">Pipeline</div>
      {[['Lead', 24, G.bl], ['Negotiation', 11, G.wa], ['Payment', 6, G.g], ['Delivered', 38, G.ok]].map(([stage, n, c]) => (
        <div key={stage} className="flex justify-between items-center mb-[9px]">
          <div className="flex items-center gap-[6px]">
            <div className="w-[7px] h-[7px] rounded-full" style={{ background: c }} />
            <span className="text-[12.5px] text-text-secondary">{stage}</span>
          </div>
          <span className="font-extrabold text-[13px]" style={{ color: c }}>{n}</span>
        </div>
      ))}
      <div className="border-t border-surface-4 pt-2 mt-2 text-[12px] text-text-secondary">
        Total: <span className="font-extrabold text-gold">{fmtM(total)}</span>
      </div>
    </div>
  );
}

/* ── Quick actions ──────────────────────────────────────────── */
function QuickActions() {
  const actions = [
    { label: 'Add Car',  icon: 'car',   color: G.g  },
    { label: 'Add Lead', icon: 'phone', color: G.bl },
    { label: 'Invoice',  icon: 'pay',   color: G.ok },
    { label: 'AI',       icon: 'ai',    color: G.pu },
  ];
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
      <div className="font-display text-[17px] font-bold mb-3">Quick Actions</div>
      <div className="grid grid-cols-2 gap-[7px]">
        {actions.map(({ label, icon, color }) => (
          <button
            key={label}
            className="bg-surface-3 border border-surface-4 rounded-[9px] p-[11px]
                       flex flex-col items-center gap-[5px] cursor-pointer
                       hover:bg-surface-4 transition-colors text-center"
          >
            <Icon name={icon} size={17} color={color} />
            <span className="text-[11px] font-bold text-text-primary">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Live feed ──────────────────────────────────────────────── */
function LiveFeed() {
  const events = [
    { icon:'phone', t:'New lead — Adeola B.', s:'BMW X5',    tm:'2m',  c:G.bl },
    { icon:'pay',   t:'₦42M received',         s:'Biodun A.', tm:'28m', c:G.ok },
    { icon:'bars',  t:'Deal → Payment',         s:'GLE 450',  tm:'1h',  c:G.g  },
    { icon:'car',   t:'BMW X5 listed',          s:'Sarah K.', tm:'3h',  c:G.wa },
    { icon:'star',  t:'5★ review',              s:'Chukwudi', tm:'5h',  c:G.g  },
  ];
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
      <div className="font-display text-[17px] font-bold mb-3">Live Feed</div>
      {events.map((e, i) => (
        <div key={i} className="flex gap-2 items-start py-[7px] border-b border-[rgba(33,33,46,.28)] last:border-0">
          <div
            className="w-[24px] h-[24px] rounded-[7px] flex items-center justify-center shrink-0 border"
            style={{ background: `${e.c}16`, borderColor: `${e.c}22` }}
          >
            <Icon name={e.icon} size={11} color={e.c} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-bold truncate">{e.t}</div>
            <div className="text-[11px] text-text-secondary">{e.s}</div>
          </div>
          <span className="text-[10px] text-text-muted shrink-0">{e.tm}</span>
        </div>
      ))}
    </div>
  );
}

/* ── AI insights ────────────────────────────────────────────── */
function AiInsights() {
  const insights = [
    'Camry: 284 views, 12 inquiries — price ₦1.5M above market',
    'Emeka not contacted 2d — risk of losing this lead',
    'BMW X5 trending — post to Instagram today',
    '3 vehicles >20d listed — consider price review',
  ];
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
      <div className="font-display text-[17px] font-bold mb-3 flex items-center gap-[7px]">
        <Icon name="ai" size={14} color={G.pu} />
        AI Insights
      </div>
      {insights.map((t, i) => (
        <div
          key={i}
          className="flex gap-[9px] p-[10px] rounded-[9px] mb-[7px] border text-[12.5px] leading-[1.55]"
          style={{ background: 'rgba(200,151,58,.07)', borderColor: 'rgba(200,151,58,.16)' }}
        >
          <Icon name="ai" size={12} color={G.pu} style={{ flexShrink: 0, marginTop: 1 }} />
          <span className="text-text-secondary">{t}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export function DashboardPage() {
  const user     = useAuthStore((s) => s.user);
  const vehicles = useSalesStore((s) => s.vehicles);
  const leads    = useCrmStore((s) => s.leads);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = useSalesStore((s) => s.fetchVehicles);
  const fetchPipeline  = useSalesStore((s) => s.fetchPipeline);
  const fetchLeads     = useCrmStore((s) => s.fetchLeads);

  useEffect(() => {
    // Fetch real data; seed data already shown so UX is instant
    fetchVehicles();
    fetchPipeline();
    fetchLeads();
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = [
    { label:'Fleet Size',   value: String(vehicles.length), icon:'car',     change:12, color:G.g,  spark:[30,42,38,48,44,52,50,vehicles.length] },
    { label:'Active Leads', value: String(leads.length),    icon:'phone',   change:8,  color:G.bl, spark:[72,88,80,102,94,110,120,leads.length] },
    { label:'Jan Revenue',  value: fmtM(176000000),         icon:'pay',     change:22, color:G.ok, spark:[58,72,78,94,86,108,125,176] },
    { label:'Conv. Rate',   value:'34.2%',                  icon:'percent', change:-3, color:G.wa, spark:[31,37,33,40,36,34,37,34] },
  ];

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px]">
      {/* Setup banner */}
      <div
        className="mb-[18px] px-4 py-3 rounded-[11px] flex flex-col sm:flex-row sm:items-center
                   justify-between gap-3 border"
        style={{ background: 'rgba(200,151,58,.07)', borderColor: 'rgba(200,151,58,.18)' }}
      >
        <div className="flex items-center gap-[9px]">
          <Icon name="sparkle" size={16} color={G.g} />
          <div>
            <div className="font-extrabold text-[13.5px]">
              Setup <span className="text-gold">3 of 5</span> — connect your payment gateway
            </div>
            <div className="text-[11.5px] text-text-secondary">Complete setup to unlock all features</div>
          </div>
        </div>
        <Button variant="gold" size="sm">Continue Setup →</Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {loading
          ? Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map((s, i) => (
              <div key={i} style={{ animation: `up .5s ease ${i * 0.08}s both` }}>
                <StatCard {...s} />
              </div>
            ))}
      </div>

      {/* Revenue chart + side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
          <div className="flex justify-between items-center mb-4">
            <div className="font-display text-[19px] font-bold">Revenue 2024</div>
            <div className="text-[13px] text-text-secondary">
              Total: <span className="text-gold font-extrabold">₦1.25B</span>
            </div>
          </div>
          <BarChart data={REVENUE_DATA} labels={MONTHS} height={150} />
        </div>

        {/* Pipeline + Quick actions stack */}
        <div className="flex flex-col gap-3">
          <PipelineMini />
          <QuickActions />
        </div>
      </div>

      {/* 3-column bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6">
        <LiveFeed />
        <AiInsights />
        {/* Top vehicles */}
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
          <div className="font-display text-[17px] font-bold mb-3 flex items-center gap-[7px]">
            <Icon name="trophy" size={14} color={G.g} /> Top Vehicles
          </div>
          {vehicles.slice(0, 4).map((v, i) => (
            <div key={v.id} className="flex items-center gap-2 mb-[10px]">
              <div className="text-[10px] text-text-muted w-3">#{i + 1}</div>
              <div
                className="w-[28px] h-[20px] rounded-[5px] flex items-center justify-center text-[13px] shrink-0"
                style={{ background: `${v.color}44` }}
              >
                {v.e}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold truncate">{v.model} {v.year}</div>
                <div className="h-[4px] bg-surface-5 rounded-[2px] mt-[3px] overflow-hidden">
                  <div
                    className="h-full rounded-[2px] transition-[width] duration-[1s]"
                    style={{
                      width: `${(v.inq / 41) * 100}%`,
                      background: `linear-gradient(90deg, ${G.gd}, ${G.gl})`,
                    }}
                  />
                </div>
              </div>
              <span className="text-[11px] text-gold font-extrabold shrink-0">{v.inq}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
