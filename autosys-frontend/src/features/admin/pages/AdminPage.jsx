import { useState, useEffect, useCallback } from 'react';
import { Link }      from 'react-router-dom';
import { Button }    from '@/shared/components/ui/Button';
import { Icon }      from '@/shared/components/ui/Icon';
import { Tabs }      from '@/shared/components/ui/Tabs';
import { SearchBar } from '@/shared/components/ui/Input';
import { Spinner }   from '@/shared/components/ui/Spinner';
import { BarChart }  from '@/shared/components/charts/BarChart';
import { useToast }  from '@/context/ToastContext';
import { fmtM }      from '@/shared/utils/format';
import { G }         from '@/shared/utils/tokens';
import { MONTHS }    from '@/shared/constants';
import { adminApi }  from '@/services/api';
import { AdminBlogDashboard } from '@/features/admin-blog/pages/AdminBlogDashboard';

const ADMIN_TABS = [
  { key:'overview', label:'Overview'       },
  { key:'dealers',  label:'All Dealers'    },
  { key:'content',  label:'Content (Blog)' },
  { key:'plans',    label:'Plan Management'},
  { key:'support',  label:'Support Tickets'},
];

const PLAN_COLOR = { premium: G.g, pro: G.bl, free: G.t2 };

/* ── Blog section ──────────────────────────────────────────── */
function BlogAdminSection() {
  return (
    <div className="space-y-5">
      <div className="flex gap-3 flex-wrap">
        <Button variant="gold" as={Link} to="/app/admin/blog/new">
          <Icon name="plus" size={15} />New Blog Post
        </Button>
        <Button variant="ghost" as={Link} to="/app/admin/blog">
          <Icon name="note" size={15} color={G.g} />Manage All Posts
        </Button>
        <Button variant="ghost" as="a" href="/blog" target="_blank">
          <Icon name="eye" size={15} color={G.bl} />View Live Blog
        </Button>
      </div>
      <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-4 flex items-center justify-between">
          <h3 className="font-bold text-[15px]">All Blog Posts</h3>
          <Button variant="ghost" size="xs" as={Link} to="/app/admin/blog">Full Editor →</Button>
        </div>
        <AdminBlogDashboard embedded />
      </div>
    </div>
  );
}

/* ── Dealers table ─────────────────────────────────────────── */
function DealersTab() {
  const toast = useToast();
  const [dealers,   setDealers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [acting,    setActing]    = useState(null); // id being acted on

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getDealers({ limit: 100 });
      setDealers(data.dealers ?? []);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load dealers', 'danger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDealers(); }, [fetchDealers]);

  const handleSuspend = async (dealer) => {
    if (!window.confirm(`Suspend "${dealer.name}"?`)) return;
    setActing(dealer.id);
    try {
      await adminApi.suspendDealer(dealer.id);
      setDealers((prev) => prev.map((d) => d.id === dealer.id ? { ...d, is_active: false } : d));
      toast(`${dealer.name} suspended`, 'ok');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'danger');
    } finally {
      setActing(null);
    }
  };

  const handleRestore = async (dealer) => {
    setActing(dealer.id);
    try {
      await adminApi.restoreDealer(dealer.id);
      setDealers((prev) => prev.map((d) => d.id === dealer.id ? { ...d, is_active: true } : d));
      toast(`${dealer.name} restored`, 'ok');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'danger');
    } finally {
      setActing(null);
    }
  };

  const handleLoginAs = async (dealer) => {
    if (!window.confirm(`Log in as "${dealer.name}"? This will generate a 30-minute impersonation token.`)) return;
    setActing(dealer.id);
    try {
      const { data } = await adminApi.loginAsDealer(dealer.id);
      // Store impersonation token and reload
      localStorage.setItem('accessToken', data.access_token);
      toast(`Logged in as ${data.dealer} — 30 min session`, 'ok');
      setTimeout(() => window.location.href = '/app/dashboard', 1200);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'danger');
    } finally {
      setActing(null);
    }
  };

  const filtered = dealers.filter((d) =>
    !search || (d.name + (d.subdomain || '')).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dealers…"
          className="flex-1 max-w-[320px]"
        />
        <Button variant="ghost" size="sm" onClick={fetchDealers}>
          <Icon name="refresh" size={13} />Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-10"><Spinner size={22} /></div>
      )}

      {!loading && (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((d) => (
              <div key={d.id} className="bg-surface-2 border border-surface-4 rounded-[12px] p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-[14px]">{d.name}</div>
                    <div className="text-[11.5px] text-text-muted font-mono">{d.subdomain}.autosys.app</div>
                  </div>
                  <span
                    className="text-[10px] font-extrabold px-2 py-[3px] rounded-[5px] uppercase"
                    style={{ color: PLAN_COLOR[d.plan] || G.t2, background:`${PLAN_COLOR[d.plan]||G.t2}18` }}
                  >
                    {d.plan}
                  </span>
                </div>
                <div className="flex gap-3 text-[11.5px] text-text-muted mb-3">
                  <span>🚗 {d.vehicle_count ?? 0}</span>
                  <span>👤 {d.lead_count ?? 0} leads</span>
                  <span className={d.is_active ? 'text-green-400' : 'text-red-400'}>
                    ● {d.is_active ? 'Active' : 'Suspended'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="xs" onClick={() => handleLoginAs(d)} disabled={acting === d.id}>
                    {acting === d.id ? <Spinner size={10} /> : '🔑'} Login As
                  </Button>
                  {d.is_active
                    ? <Button variant="danger" size="xs" onClick={() => handleSuspend(d)} disabled={acting === d.id}>Suspend</Button>
                    : <Button variant="ghost" size="xs" onClick={() => handleRestore(d)} disabled={acting === d.id}>Restore</Button>
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-surface-2 border border-surface-4 rounded-[14px] overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-4" style={{ background:G.s3 }}>
                  {['Dealer','Subdomain','Plan','Vehicles','Leads','Status','Actions'].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-surface-4 last:border-0 hover:bg-surface-3 transition-colors">
                    <td className="py-3 px-3 font-bold text-[13px]">{d.name}</td>
                    <td className="py-3 px-3 text-text-muted text-[11.5px] font-mono">{d.subdomain}</td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-extrabold px-2 py-[3px] rounded-[5px] uppercase"
                        style={{ color:PLAN_COLOR[d.plan]||G.t2, background:`${PLAN_COLOR[d.plan]||G.t2}18` }}>
                        {d.plan}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[12.5px]">{d.vehicle_count ?? 0}</td>
                    <td className="py-3 px-3 text-[12.5px]">{d.lead_count ?? 0}</td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-extrabold px-2 py-[3px] rounded-[5px]"
                        style={{ color:d.is_active?G.ok:G.er, background:`${d.is_active?G.ok:G.er}18` }}>
                        {d.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="xs" onClick={() => handleLoginAs(d)} disabled={acting === d.id}>
                          {acting === d.id ? <Spinner size={10} /> : '🔑'} Login As
                        </Button>
                        {d.is_active
                          ? <Button variant="danger" size="xs" onClick={() => handleSuspend(d)} disabled={acting === d.id}>Suspend</Button>
                          : <Button variant="ghost" size="xs" onClick={() => handleRestore(d)} disabled={acting === d.id}>Restore</Button>
                        }
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-muted text-[13px]">
                      No dealers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Plans tab ─────────────────────────────────────────────── */
function PlansTab() {
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    adminApi.getPlans()
      .then(({ data }) => setPlans(data.plans ?? []))
      .catch(() => toast('Failed to load plans', 'danger'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Spinner size={22} /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {plans.map((plan) => (
        <div key={plan.id} className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
          <h3 className="font-display text-[18px] font-bold mb-1 capitalize">{plan.name}</h3>
          <p className="text-[24px] font-display font-bold mb-1" style={{ color:G.g }}>
            {plan.price === 0 ? 'Free' : fmtM(plan.price)}
            {plan.price > 0 && <span className="text-[14px] text-text-muted font-normal">/mo</span>}
          </p>
          <p className="text-[12px] text-text-muted mb-1">
            {plan.subscribers} active dealers
          </p>
          {plan.mrr > 0 && (
            <p className="text-[12px] font-bold mb-3" style={{ color:G.ok }}>
              MRR: {fmtM(plan.mrr)}
            </p>
          )}
          <ul className="text-[12px] text-text-secondary space-y-1 mb-4">
            {(plan.features || []).map((f) => (
              <li key={f} className="flex items-center gap-1">
                <Icon name="check" size={10} color={G.ok} />{f}
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="w-full">Edit Plan</Button>
        </div>
      ))}
    </div>
  );
}

/* ── Support tab ───────────────────────────────────────────── */
function SupportTab() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    adminApi.getSupport()
      .then(({ data }) => setTickets(data.tickets ?? []))
      .catch(() => toast('Failed to load tickets', 'danger'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Spinner size={22} /></div>;

  if (tickets.length === 0) {
    return (
      <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-8 text-center">
        <Icon name="bell" size={28} color={G.t2} />
        <p className="text-[14px] font-semibold text-text-muted mt-3">No support tickets yet</p>
        <p className="text-[12px] text-text-muted mt-1">Contact: support@autosys.ng</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-4" style={{ background:G.s3 }}>
            {['Dealer','Subject','Status','Date'].map((h) => (
              <th key={h} className="text-left py-3 px-4 text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id} className="border-b border-surface-4 last:border-0 hover:bg-surface-3">
              <td className="py-3 px-4 font-bold text-[13px]">{t.dealer?.name || '—'}</td>
              <td className="py-3 px-4 text-[12.5px] text-text-secondary">{t.subject || '—'}</td>
              <td className="py-3 px-4">
                <span className="text-[11px] font-bold px-2 py-[2px] rounded-[5px]"
                  style={{ color:t.status==='open'?G.ok:G.t2, background:`${t.status==='open'?G.ok:G.t2}18` }}>
                  {t.status}
                </span>
              </td>
              <td className="py-3 px-4 text-[12px] text-text-muted">
                {new Date(t.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* Super Admin Page                                              */
/* ══════════════════════════════════════════════════════════════ */
export function AdminPage() {
  const toast = useToast();
  const [tab,       setTab]       = useState('overview');
  const [stats,     setStats]     = useState(null);
  const [mrr,       setMrr]       = useState(null);
  const [statsLoad, setStatsLoad] = useState(true);

  // Fetch platform stats + MRR on mount
  useEffect(() => {
    Promise.allSettled([adminApi.getStats(), adminApi.getMrr()])
      .then(([statsRes, mrrRes]) => {
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (mrrRes.status === 'fulfilled')   setMrr(mrrRes.value.data);
      })
      .catch(() => toast('Failed to load platform stats', 'danger'))
      .finally(() => setStatsLoad(false));
  }, []);

  // Build MRR chart data from history
  const mrrChartData = (() => {
    if (!mrr?.history?.length) {
      return MONTHS.map((label) => ({ label, value: 0 }));
    }
    return mrr.history.slice(-12).map(({ month, mrr: val }) => ({
      label: MONTHS[new Date(month + '-01').getMonth()] || month,
      value: val,
    }));
  })();

  const kpis = [
    ['Total Dealers',  stats?.dealers?.total      ?? '…', G.bl, 'building'],
    ['Monthly Revenue',mrr   ? fmtM(mrr.current_mrr) : '…', G.ok, 'pay'   ],
    ['Total Vehicles', stats?.vehicles            ?? '…', G.g,  'car'    ],
    ['Total Leads',    stats?.leads               ?? '…', G.pu, 'users'  ],
    ['Active Dealers', stats?.dealers?.active     ?? '…', G.ok, 'check'  ],
  ];

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">

      {/* Warning banner */}
      <div className="mb-5 px-[18px] py-3 rounded-[12px] flex items-center gap-[10px] border"
        style={{ background:G.erl, borderColor:'rgba(220,38,38,.25)' }} role="alert">
        <Icon name="shield" size={17} color={G.er} />
        <div>
          <div className="font-extrabold text-[14px]" style={{ color:G.er }}>Super Admin Mode</div>
          <div className="text-[12px] text-text-secondary">Elevated access to all dealer accounts. All actions are logged.</div>
        </div>
      </div>

      <h2 className="font-display text-[23px] font-bold mb-[4px]">Platform Overview</h2>
      <p className="text-text-secondary text-[12.5px] mb-5">Manage all dealerships, content, and platform settings</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {kpis.map(([l, v, c, icon]) => (
          <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px]">{l}</div>
              <Icon name={icon} size={16} color={c} />
            </div>
            <div className="font-display text-[26px] font-bold" style={{ color:c }}>
              {statsLoad ? <span className="w-12 h-5 bg-surface-4 rounded animate-pulse inline-block" /> : v}
            </div>
          </div>
        ))}
      </div>

      <Tabs tabs={ADMIN_TABS} active={tab} onChange={setTab} className="mb-5" />

      {/* ── Overview tab ───────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* MRR chart */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
            <div className="flex justify-between items-center mb-4">
              <div className="font-display text-[19px] font-bold">Platform MRR Growth</div>
              {mrr && (
                <div className="font-display text-[22px] font-bold" style={{ color:G.ok }}>
                  {fmtM(mrr.current_mrr)}/mo
                </div>
              )}
            </div>
            {statsLoad
              ? <div className="h-[160px] bg-surface-3 rounded-[8px] animate-pulse" />
              : <BarChart data={mrrChartData} color={G.ok} height={160} />
            }
          </div>

          {/* Plan breakdown */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
            <div className="font-display text-[19px] font-bold mb-4">Plan Breakdown</div>
            {statsLoad
              ? <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="h-10 bg-surface-3 rounded animate-pulse" />)}</div>
              : Object.entries(stats?.dealers?.by_plan ?? {}).map(([plan, count]) => (
                  <div key={plan} className="flex items-center gap-3 py-[10px] border-b border-surface-4 last:border-0">
                    <span
                      className="text-[11px] font-extrabold px-2 py-[3px] rounded-[5px] uppercase w-[70px] text-center"
                      style={{ color:PLAN_COLOR[plan]||G.t2, background:`${PLAN_COLOR[plan]||G.t2}18` }}
                    >
                      {plan}
                    </span>
                    <div className="flex-1 bg-surface-3 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.round((count / (stats?.dealers?.total || 1)) * 100)}%`,
                          background: PLAN_COLOR[plan] || G.t2,
                        }}
                      />
                    </div>
                    <span className="font-extrabold text-[13px] w-[30px] text-right">{count}</span>
                  </div>
                ))
            }
          </div>
        </div>
      )}

      {tab === 'dealers'  && <DealersTab />}
      {tab === 'content'  && <BlogAdminSection />}
      {tab === 'plans'    && <PlansTab />}
      {tab === 'support'  && <SupportTab />}
    </div>
  );
}
