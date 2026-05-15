import { useState } from 'react';
import { Link }      from 'react-router-dom';
import { Button }    from '@/shared/components/ui/Button';
import { Badge }     from '@/shared/components/ui/Badge';
import { Icon }      from '@/shared/components/ui/Icon';
import { Tabs }      from '@/shared/components/ui/Tabs';
import { SearchBar } from '@/shared/components/ui/Input';
import { BarChart }  from '@/shared/components/charts/BarChart';
import { useToast }  from '@/context/ToastContext';
import { fmtM }      from '@/shared/utils/format';
import { G }         from '@/shared/utils/tokens';
import { MONTHS, PLANS } from '@/shared/constants';
import { AdminBlogDashboard } from '@/features/admin-blog/pages/AdminBlogDashboard';
import { DEMO_POSTS }        from '@/store/blogStore';

/* ── Demo data ───────────────────────────────────────────────── */
const DEALERS = [
  { id:1, name:'Dangote Motors Lagos',  owner:'Chukwuemeka Obi', plan:'Pro',     vehicles:48,  leads:127, rev:1240000000, status:'Active',    mrr:15000 },
  { id:2, name:'Okafor Motors Abuja',   owner:'Emeka Okafor',    plan:'Premium', vehicles:124, leads:312, rev:4800000000, status:'Active',    mrr:40000 },
  { id:3, name:'AliyuAuto PH',          owner:'Fatima Aliyu',    plan:'Pro',     vehicles:31,  leads:89,  rev:820000000,  status:'Active',    mrr:15000 },
  { id:4, name:'Lagos Premium Cars',    owner:'Biodun Adeyemi',  plan:'Free',    vehicles:4,   leads:12,  rev:0,          status:'Active',    mrr:0     },
  { id:5, name:'Delta Autos',           owner:'Chide Eze',       plan:'Pro',     vehicles:22,  leads:55,  rev:450000000,  status:'Suspended', mrr:0     },
];

const ADMIN_TABS = [
  { key:'overview',  label:'Overview'          },
  { key:'dealers',   label:'All Dealers'       },
  { key:'content',   label:'Content (Blog)'    },   // ← NEW
  { key:'plans',     label:'Plan Management'   },
  { key:'support',   label:'Support Tickets'   },
];

const PLAN_COLOR = { Premium: G.g, Pro: G.bl, Free: G.t2 };

/* ── Blog analytics for admin ─────────────────────────────────── */
function BlogAdminSection() {
  const totalViews = DEMO_POSTS.reduce((s, p) => s + (p.view_count || 0), 0);
  const published  = DEMO_POSTS.filter((p) => p.status === 'published').length;
  const topPost    = [...DEMO_POSTS].sort((a, b) => (b.view_count||0) - (a.view_count||0))[0];

  return (
    <div className="space-y-5">
      {/* Blog stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Published Posts', value: published,                         color:G.ok, icon:'check'    },
          { label:'Total Views',     value: totalViews.toLocaleString(),        color:G.bl, icon:'eye'      },
          { label:'Draft Posts',     value: DEMO_POSTS.filter(p=>p.status==='draft').length, color:G.wa, icon:'note' },
          { label:'Avg. Read Time',  value: `${Math.round(DEMO_POSTS.reduce((s,p)=>s+p.read_time,0)/DEMO_POSTS.length)}m`, color:G.pu, icon:'activity' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px]">{label}</div>
              <Icon name={icon} size={15} color={color} />
            </div>
            <div className="font-display text-[26px] font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
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

      {/* Full blog dashboard */}
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

/* ══════════════════════════════════════════════════════════════ */
/* Super Admin Page                                              */
/* ══════════════════════════════════════════════════════════════ */
export function AdminPage() {
  const toast  = useToast();
  const [tab,    setTab]    = useState('overview');
  const [search, setSearch] = useState('');

  const totalMRR = DEALERS.reduce((s, d) => s + d.mrr, 0);
  const filtered = DEALERS.filter((d) =>
    !search || (d.name + d.owner).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">

      {/* Admin warning banner */}
      <div className="mb-5 px-[18px] py-3 rounded-[12px] flex items-center gap-[10px] border"
        style={{ background:G.erl, borderColor:'rgba(220,38,38,.25)' }} role="alert">
        <Icon name="shield" size={17} color={G.er} />
        <div>
          <div className="font-extrabold text-[14px]" style={{ color:G.er }}>Super Admin Mode</div>
          <div className="text-[12px] text-text-secondary">Elevated access to all dealer accounts and platform content. Actions are logged.</div>
        </div>
      </div>

      <h2 className="font-display text-[23px] font-bold mb-[4px]">Platform Overview</h2>
      <p className="text-text-secondary text-[12.5px] mb-5">Manage all dealerships, content, and platform settings</p>

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {[
          ['Total Dealers',  DEALERS.length,                                          G.bl, 'building' ],
          ['Monthly Revenue',fmtM(totalMRR),                                          G.ok, 'pay'      ],
          ['Total Vehicles', DEALERS.reduce((s,d)=>s+d.vehicles,0).toLocaleString(), G.g,  'car'      ],
          ['Blog Posts',     DEMO_POSTS.filter(p=>p.status==='published').length,     G.pu, 'note'     ],
          ['Active Dealers', DEALERS.filter((d)=>d.status==='Active').length,         G.ok, 'users'    ],
        ].map(([l,v,c,icon]) => (
          <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="flex justify-between items-start mb-2">
              <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px]">{l}</div>
              <Icon name={icon} size={16} color={c} />
            </div>
            <div className="font-display text-[26px] font-bold" style={{ color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs tabs={ADMIN_TABS} active={tab} onChange={setTab} className="mb-5" />

      {/* ── Overview Tab ─────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
            <div className="flex justify-between items-center mb-4">
              <div className="font-display text-[19px] font-bold">Platform MRR Growth</div>
              <div className="font-display text-[22px] font-bold" style={{ color:G.ok }}>₦70,000/mo</div>
            </div>
            <BarChart
              data={[12,18,24,31,38,45,52,60,70,70,70,70].map((v,i)=>({ label:MONTHS[i], value:v*1000 }))}
              color={G.ok} height={160} />
          </div>

          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
            <div className="font-display text-[19px] font-bold mb-4">Recent Blog Performance</div>
            <div className="space-y-3">
              {DEMO_POSTS.slice(0,4).map((post) => (
                <div key={post.id} className="flex items-center gap-3 py-2 border-b border-surface-4 last:border-0">
                  {post.featured_image && (
                    <img src={post.featured_image} alt=""
                      className="w-[42px] h-[32px] object-cover rounded-[6px] shrink-0 opacity-80" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold line-clamp-1">{post.title}</p>
                    <p className="text-[10.5px] text-text-muted">{post.read_time} min · {post.author_name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] text-text-muted shrink-0">
                    <Icon name="eye" size={12} color={G.t2} />
                    {post.view_count?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => setTab('content')}>
              Manage Blog Content →
            </Button>
          </div>
        </div>
      )}

      {/* ── Dealers Tab ──────────────────────────────────────── */}
      {tab === 'dealers' && (
        <div>
          <div className="flex gap-3 mb-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search dealers…" className="flex-1 max-w-[320px]" />
          </div>
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-4" style={{ background:G.s3 }}>
                  {['Dealer','Owner','Plan','Vehicles','Leads','Revenue','Status','Actions'].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-surface-4 hover:bg-surface-3 transition-colors">
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
                    <td className="py-3 px-3 text-[12.5px]">{fmtM(d.rev)}</td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-extrabold px-2 py-[3px] rounded-[5px]"
                        style={{ color:d.status==='Active'?G.ok:G.er, background:`${d.status==='Active'?G.ok:G.er}18` }}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="xs" onClick={() => toast(`Viewing ${d.name}`)}>View</Button>
                        <Button variant={d.status==='Active'?'warning':'ok'} size="xs"
                          onClick={() => toast(`${d.name} ${d.status==='Active'?'suspended':'activated'}`)}>
                          {d.status==='Active' ? 'Suspend' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Content Tab ──────────────────────────────────────── */}
      {tab === 'content' && <BlogAdminSection />}

      {/* ── Plans Tab ────────────────────────────────────────── */}
      {tab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(PLANS||[]).map((plan) => (
            <div key={plan.name} className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
              <h3 className="font-display text-[18px] font-bold mb-1">{plan.name}</h3>
              <p className="text-[24px] font-display font-bold mb-3" style={{ color:G.g }}>{plan.monthlyPrice}<span className="text-[14px] text-text-muted font-normal">/mo</span></p>
              <p className="text-[12px] text-text-muted mb-4">{DEALERS.filter(d=>d.plan===plan.name).length} active dealers</p>
              <Button variant="ghost" size="sm" className="w-full">Edit Plan</Button>
            </div>
          ))}
        </div>
      )}

      {/* ── Support Tab ──────────────────────────────────────── */}
      {tab === 'support' && (
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-8 text-center">
          <Icon name="bell" size={28} color={G.t2} />
          <p className="text-[14px] font-semibold text-text-muted mt-3">Support ticket system coming soon</p>
          <p className="text-[12px] text-text-muted mt-1">Currently managed via email: support@autosys.ng</p>
        </div>
      )}
    </div>
  );
}