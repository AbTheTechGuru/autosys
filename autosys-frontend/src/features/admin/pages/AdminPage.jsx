import { useState, useEffect, useCallback } from 'react';
import { Link }      from 'react-router-dom';
import { Button }    from '@/shared/components/ui/Button';
import { Icon }      from '@/shared/components/ui/Icon';
import { Tabs }      from '@/shared/components/ui/Tabs';
import { Spinner }   from '@/shared/components/ui/Spinner';
import { SearchBar } from '@/shared/components/ui/Input';
import { BarChart }  from '@/shared/components/charts/BarChart';
import { useToast }  from '@/context/ToastContext';
import { useBlogStore } from '@/store/blogStore';
import { AdminBlogDashboard } from '@/features/admin-blog/pages/AdminBlogDashboard';
import { fmtM } from '@/shared/utils/format';
import { G }    from '@/shared/utils/tokens';
import { MONTHS, PLANS } from '@/shared/constants';
import client from '@/services/api/client';

// TODO: Connect to backend endpoint when available
// Expected endpoint: GET /admin/dealers
// Expected response: { dealers: [{ id, name, owner_name, plan, vehicle_count, lead_count, revenue, status, mrr }] }
// Expected endpoint: GET /admin/stats
// Expected response: { total_dealers, active_dealers, platform_mrr, total_vehicles, mrr_history: [] }

const ADMIN_TABS = [
  { key:'overview', label:'Overview'       },
  { key:'dealers',  label:'All Dealers'    },
  { key:'content',  label:'Content (Blog)' },
  { key:'plans',    label:'Plan Management'},
  { key:'support',  label:'Support Tickets'},
];

const PLAN_COLOR = { Premium: G.g, Pro: G.bl, Free: G.t2 };

/* ── Blog analytics sub-section (uses real blogStore) ────────── */
function BlogAdminSection() {
  const adminPosts          = useBlogStore((s) => s.adminPosts);
  const adminAnalytics      = useBlogStore((s) => s.adminAnalytics);
  const isAdminLoading      = useBlogStore((s) => s.isAdminLoading);
  const fetchAdminPosts     = useBlogStore((s) => s.fetchAdminPosts);
  const fetchAdminAnalytics = useBlogStore((s) => s.fetchAdminAnalytics);

  useEffect(() => {
    fetchAdminPosts();
    fetchAdminAnalytics();
  }, [fetchAdminPosts, fetchAdminAnalytics]);

  const totalViews = adminAnalytics?.total_views
    ?? adminPosts.reduce((s, p) => s + (p.view_count || 0), 0);
  const published  = adminPosts.filter((p) => p.status === 'published').length;
  const drafts     = adminPosts.filter((p) => p.status === 'draft').length;
  const avgRead    = adminPosts.length > 0
    ? Math.round(adminPosts.reduce((s, p) => s + (p.read_time || 5), 0) / adminPosts.length)
    : 0;

  const blogStats = [
    { label:'Published Posts', value: published,                  color:G.ok, icon:'check'    },
    { label:'Total Views',     value: totalViews.toLocaleString(),color:G.bl, icon:'eye'      },
    { label:'Draft Posts',     value: drafts,                     color:G.wa, icon:'note'     },
    { label:'Avg. Read Time',  value: avgRead ? `${avgRead}m` :'—', color:G.pu, icon:'activity'},
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {blogStats.map(({ label, value, color, icon }) => (
          <div key={label} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px]">{label}</div>
              <Icon name={icon} size={15} color={color} />
            </div>
            {isAdminLoading
              ? <div className="h-7 w-16 bg-surface-3 rounded animate-pulse" />
              : <div className="font-display text-[26px] font-bold" style={{ color }}>{value}</div>
            }
          </div>
        ))}
      </div>

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
          <Button variant="ghost" size="xs" as={Link} to="/app/admin/blog">
            Full Editor →
          </Button>
        </div>
        <AdminBlogDashboard embedded />
      </div>
    </div>
  );
}

/* ── Main Admin Page ─────────────────────────────────────────── */
export function AdminPage() {
  const toast = useToast();

  const [tab,       setTab]       = useState('overview');
  const [search,    setSearch]    = useState('');
  const [dealers,   setDealers]   = useState([]);
  const [stats,     setStats]     = useState(null);
  const [mrrHistory,setMrrHistory]= useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Blog store for KPI count in header
  const adminPosts    = useBlogStore((s) => s.adminPosts);
  const fetchAdminPosts = useBlogStore((s) => s.fetchAdminPosts);

  /* ── Fetch platform-level data ───────────────────────────── */
  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dealersRes, statsRes] = await Promise.allSettled([
        client.get('/admin/dealers'),
        client.get('/admin/stats'),
      ]);

      if (dealersRes.status === 'fulfilled') {
        const d = dealersRes.value.data.dealers ?? [];
        setDealers(d.map((x) => ({
          id:       x.id,
          name:     x.name,
          owner:    x.owner_name || x.owner || '—',
          plan:     (x.plan || 'free').charAt(0).toUpperCase() + (x.plan || 'free').slice(1),
          vehicles: x.vehicle_count ?? x.vehicles ?? 0,
          leads:    x.lead_count    ?? x.leads    ?? 0,
          rev:      Math.round((x.revenue ?? 0) / 100),
          status:   (x.status || 'active').charAt(0).toUpperCase() + (x.status || 'active').slice(1),
          mrr:      Math.round((x.mrr ?? 0) / 100),
        })));
      }

      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value.data;
        setStats(s);
        if (s.mrr_history?.length > 0) {
          setMrrHistory(s.mrr_history.map((v) => Math.round(v / 100)));
        }
      }
    } catch {
      // TODO: Backend /admin/* endpoints not yet connected
      // Keep empty state — no mock data shown
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
    fetchAdminPosts();
  }, [fetchAdminData, fetchAdminPosts]);

  /* ── Suspend / Activate dealer ───────────────────────────── */
  const handleDealerAction = async (dealer) => {
    const action = dealer.status === 'Active' ? 'suspend' : 'activate';
    try {
      await client.post(`/admin/dealers/${dealer.id}/${action}`);
      setDealers((prev) => prev.map((d) =>
        d.id === dealer.id
          ? { ...d, status: action === 'suspend' ? 'Suspended' : 'Active' }
          : d
      ));
      toast(`${dealer.name} ${action}d`);
    } catch (err) {
      toast(err.response?.data?.message || `${action} failed`, 'danger');
    }
  };

  const filtered = dealers.filter((d) =>
    !search || (d.name + d.owner).toLowerCase().includes(search.toLowerCase()),
  );

  const totalMRR       = stats ? Math.round((stats.platform_mrr ?? 0) / 100) : dealers.reduce((s, d) => s + d.mrr, 0);
  const totalVehicles  = stats?.total_vehicles ?? dealers.reduce((s, d) => s + d.vehicles, 0);
  const activeDealers  = stats?.active_dealers ?? dealers.filter((d) => d.status === 'Active').length;
  const publishedPosts = adminPosts.filter((p) => p.status === 'published').length;

  const platformKpis = [
    ['Total Dealers',   dealers.length || (stats?.total_dealers ?? '—'), G.bl, 'building'],
    ['Monthly Revenue', fmtM(totalMRR),                                  G.ok, 'pay'     ],
    ['Total Vehicles',  totalVehicles.toLocaleString(),                  G.g,  'car'     ],
    ['Blog Posts',      publishedPosts,                                  G.pu, 'note'    ],
    ['Active Dealers',  activeDealers,                                   G.ok, 'users'   ],
  ];

  // MRR chart data — real from backend or placeholder zeros
  const chartData = mrrHistory.length > 0
    ? mrrHistory
    : Array(12).fill(0);
  const chartLabels = MONTHS;

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">

      {/* Admin warning banner */}
      <div className="mb-5 px-[18px] py-3 rounded-[12px] flex items-center gap-[10px] border"
        style={{ background:G.erl, borderColor:'rgba(220,38,38,.25)' }} role="alert">
        <Icon name="shield" size={17} color={G.er} />
        <div>
          <div className="font-extrabold text-[14px]" style={{ color:G.er }}>Super Admin Mode</div>
          <div className="text-[12px] text-text-secondary">
            Elevated access to all dealer accounts and platform content. Actions are logged.
          </div>
        </div>
      </div>

      <h2 className="font-display text-[23px] font-bold mb-[4px]">Platform Overview</h2>
      <p className="text-text-secondary text-[12.5px] mb-5">
        Manage all dealerships, content, and platform settings
      </p>

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {isLoading
          ? Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-[90px] bg-surface-2 border border-surface-4 rounded-[14px] animate-pulse" />
            ))
          : platformKpis.map(([l, v, c, icon]) => (
              <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px]">{l}</div>
                  <Icon name={icon} size={16} color={c} />
                </div>
                <div className="font-display text-[26px] font-bold" style={{ color:c }}>{v}</div>
              </div>
            ))
        }
      </div>

      <Tabs tabs={ADMIN_TABS} active={tab} onChange={setTab} className="mb-5" />

      {/* ── Overview Tab ─────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* MRR Chart */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
            <div className="flex justify-between items-center mb-4">
              <div className="font-display text-[19px] font-bold">Platform MRR Growth</div>
              <div className="font-display text-[22px] font-bold" style={{ color:G.ok }}>
                {fmtM(totalMRR)}/mo
              </div>
            </div>
            {isLoading
              ? <div className="h-[160px] bg-surface-3 rounded-[10px] animate-pulse" />
              : <BarChart
                  data={chartData.map((v, i) => ({ label: chartLabels[i], value: v }))}
                  color={G.ok}
                  height={160}
                />
            }
            {!isLoading && chartData.every((v) => v === 0) && (
              <p className="text-[11px] text-text-muted text-center mt-2">
                {/* TODO: Connect to GET /admin/stats mrr_history when available */}
                MRR history will show here once /admin/stats is connected
              </p>
            )}
          </div>

          {/* Top Dealers */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
            <div className="font-display text-[19px] font-bold mb-4">Top Dealers by Revenue</div>
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-10 bg-surface-3 rounded-[8px] animate-pulse mb-2" />
              ))
            ) : dealers.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <p className="text-[13px]">No dealer data yet</p>
                <p className="text-[11px] mt-1">Connect /admin/dealers endpoint to see data</p>
              </div>
            ) : (
              [...dealers]
                .sort((a, b) => b.rev - a.rev)
                .slice(0, 5)
                .map((d, i) => (
                  <div key={d.id} className="flex items-center gap-3 py-[10px] border-b border-surface-4 last:border-0">
                    <span className="text-[11px] text-text-muted w-4">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-bold truncate">{d.name}</p>
                      <p className="text-[10.5px] text-text-muted">{d.plan} · {d.vehicles} vehicles</p>
                    </div>
                    <span className="font-extrabold text-[13px]" style={{ color:G.g }}>{fmtM(d.rev)}</span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ── Dealers Tab ──────────────────────────────────────── */}
      {tab === 'dealers' && (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dealers…"
              className="max-w-[320px]"
            />
            {isLoading && <Spinner size={16} />}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-4" style={{ background:G.s3 }}>
                  {['Dealer','Owner','Plan','Vehicles','Leads','Revenue','Status','Actions'].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-surface-4">
                      {Array(8).fill(0).map((_, j) => (
                        <td key={j} className="py-3 px-3">
                          <div className="h-4 bg-surface-3 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-text-muted text-[13px]">
                      {dealers.length === 0
                        ? 'No dealers yet — /admin/dealers endpoint not connected'
                        : 'No dealers match your search'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => (
                    <tr key={d.id} className="border-b border-surface-4 hover:bg-surface-3/50 transition-colors">
                      <td className="py-3 px-3 font-bold text-[13px]">{d.name}</td>
                      <td className="py-3 px-3 text-text-secondary text-[12.5px]">{d.owner}</td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-extrabold px-2 py-[3px] rounded-[5px]"
                          style={{ color:PLAN_COLOR[d.plan]||G.t1, background:`${PLAN_COLOR[d.plan]||G.t2}18`, border:`1px solid ${PLAN_COLOR[d.plan]||G.t2}30` }}>
                          {d.plan}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[12.5px]">{d.vehicles}</td>
                      <td className="py-3 px-3 text-[12.5px]">{d.leads}</td>
                      <td className="py-3 px-3 font-bold" style={{ color:G.g }}>{fmtM(d.rev)}</td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-extrabold px-2 py-[3px] rounded-[5px]"
                          style={{ color:d.status==='Active'?G.ok:G.er, background:`${d.status==='Active'?G.ok:G.er}18` }}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="xs"
                            onClick={() => toast(`Impersonate view coming soon`)}>
                            View
                          </Button>
                          <Button
                            variant={d.status === 'Active' ? 'danger' : 'ok'}
                            size="xs"
                            onClick={() => handleDealerAction(d)}>
                            {d.status === 'Active' ? 'Suspend' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((d) => (
              <div key={d.id} className="bg-surface-2 border border-surface-4 rounded-[12px] p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-[13.5px]">{d.name}</p>
                    <p className="text-[11.5px] text-text-muted">{d.owner}</p>
                  </div>
                  <span className="text-[11px] font-extrabold px-2 py-1 rounded-full"
                    style={{ color:PLAN_COLOR[d.plan]||G.t1, background:`${PLAN_COLOR[d.plan]||G.t2}18` }}>
                    {d.plan}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  {[['Vehicles',d.vehicles,G.g],['Leads',d.leads,G.bl],['Revenue',fmtM(d.rev),G.ok]].map(([l,v,c]) => (
                    <div key={l} className="bg-surface-3 rounded-[8px] p-2">
                      <p className="font-bold text-[12px]" style={{ color:c }}>{v}</p>
                      <p className="text-[10px] text-text-muted">{l}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="ghost" size="xs" className="flex-1 justify-center">View</Button>
                  <Button variant={d.status==='Active'?'danger':'ok'} size="xs" className="flex-1 justify-center"
                    onClick={() => handleDealerAction(d)}>
                    {d.status === 'Active' ? 'Suspend' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Content Tab ──────────────────────────────────────── */}
      {tab === 'content' && <BlogAdminSection />}

      {/* ── Plans Tab ────────────────────────────────────────── */}
      {tab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(PLANS || []).map((plan) => (
            <div key={plan.name} className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
              <h3 className="font-display text-[18px] font-bold mb-1">{plan.name}</h3>
              <p className="text-[24px] font-display font-bold mb-3" style={{ color:G.g }}>
                {plan.monthlyPrice}
                <span className="text-[14px] text-text-muted font-normal">/mo</span>
              </p>
              <p className="text-[12px] text-text-muted mb-4">
                {dealers.filter((d) => d.plan === plan.name).length} active dealers
              </p>
              {/* TODO: Connect to backend endpoint when available */}
              {/* Expected endpoint: PUT /admin/plans/:name */}
              {/* Expected body: { monthlyPrice, features, limits } */}
              <Button variant="ghost" size="sm" className="w-full"
                onClick={() => toast('Plan editing coming soon')}>
                Edit Plan
              </Button>
            </div>
          ))}
          {(!PLANS || PLANS.length === 0) && (
            <div className="col-span-3 text-center py-10 text-text-muted text-[13px]">
              Plan configuration not available — add PLANS to shared/constants
            </div>
          )}
        </div>
      )}

      {/* ── Support Tab ──────────────────────────────────────── */}
      {tab === 'support' && (
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-8 text-center">
          <Icon name="bell" size={28} color={G.t2} />
          <p className="text-[14px] font-semibold text-text-muted mt-3">
            Support ticket system coming soon
          </p>
          <p className="text-[12px] text-text-muted mt-1">
            Currently managed via email: support@autosys.ng
          </p>
          {/* TODO: Connect to backend endpoint when available */}
          {/* Expected endpoint: GET /admin/support/tickets */}
          {/* Expected response: { tickets: [{ id, dealer, subject, status, created_at }] } */}
        </div>
      )}
    </div>
  );
}
