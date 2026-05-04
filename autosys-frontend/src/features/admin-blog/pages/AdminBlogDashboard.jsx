import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button }    from '@/shared/components/ui/Button';
import { Badge }     from '@/shared/components/ui/Badge';
import { Icon }      from '@/shared/components/ui/Icon';
import { SearchBar } from '@/shared/components/ui/Input';
import { useToast }  from '@/context/ToastContext';
import { G }         from '@/shared/utils/tokens';
import { DEMO_POSTS, DEMO_CATEGORIES } from '@/store/blogStore';

/* ── Helpers ─────────────────────────────────────────────────── */
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { month:'short', day:'numeric', year:'numeric' }) : '—';

const STATUS_CONFIG = {
  published: { label:'Published', color:G.ok,  bg:'rgba(22,163,74,.12)',  border:'rgba(22,163,74,.25)'  },
  draft:     { label:'Draft',     color:G.wa,  bg:'rgba(217,119,6,.12)',  border:'rgba(217,119,6,.25)'  },
  archived:  { label:'Archived',  color:G.t2,  bg:'rgba(78,75,88,.15)',   border:'rgba(78,75,88,.3)'    },
};

/* ── Stats card ─────────────────────────────────────────────── */
function StatCard({ label, value, color, icon, sub }) {
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px]">{label}</p>
        <Icon name={icon} size={15} color={color} />
      </div>
      <p className="font-display text-[28px] font-bold mb-0.5" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-text-muted">{sub}</p>}
    </div>
  );
}

/* ── Post row ────────────────────────────────────────────────── */
function PostRow({ post, onTogglePublish, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const cat    = DEMO_CATEGORIES.find((c) => c.slug === post.category_slug);
  const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;

  const handleDelete = () => {
    if (!confirming) { setConfirming(true); return; }
    onDelete(post.id);
    setConfirming(false);
  };

  return (
    <tr className="border-b border-surface-4 hover:bg-surface-2 transition-colors group">
      {/* Featured image thumbnail */}
      <td className="py-3 pl-4 w-[60px]">
        {post.featured_image ? (
          <img src={post.featured_image} alt=""
            className="w-[50px] h-[36px] object-cover rounded-[6px] opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="w-[50px] h-[36px] rounded-[6px] flex items-center justify-center"
            style={{ background: G.s4 }}>
            <Icon name="img" size={16} color={G.t2} />
          </div>
        )}
      </td>

      {/* Title */}
      <td className="py-3 px-3 max-w-[320px]">
        <p className="text-[13px] font-bold text-text-primary line-clamp-1 mb-[2px]">
          {post.title}
        </p>
        <div className="flex items-center gap-2">
          {cat && (
            <span className="text-[10px] font-bold"
              style={{ color: cat.color }}>{cat.name}</span>
          )}
          <span className="text-[10.5px] text-text-muted">/blog/{post.slug}</span>
        </div>
      </td>

      {/* Status */}
      <td className="py-3 px-3">
        <span className="text-[10.5px] font-extrabold px-[8px] py-[3px] rounded-[6px]"
          style={{ color:status.color, background:status.bg, border:`1px solid ${status.border}` }}>
          {status.label}
        </span>
      </td>

      {/* Stats */}
      <td className="py-3 px-3 hidden md:table-cell">
        <div className="flex items-center gap-1 text-[12px] text-text-muted">
          <Icon name="eye" size={12} color={G.t2} />
          {post.view_count?.toLocaleString() || 0}
        </div>
      </td>

      {/* Author */}
      <td className="py-3 px-3 hidden lg:table-cell">
        <span className="text-[12.5px] text-text-secondary">{post.author_name}</span>
      </td>

      {/* Read time */}
      <td className="py-3 px-3 hidden lg:table-cell">
        <span className="text-[12px] text-text-muted">{post.read_time} min</span>
      </td>

      {/* Date */}
      <td className="py-3 px-3 hidden sm:table-cell">
        <span className="text-[12px] text-text-muted whitespace-nowrap">
          {fmtDate(post.published_at || post.created_at)}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3 pr-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          {/* View live */}
          {post.status === 'published' && (
            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="xs">
                <Icon name="eye" size={12} color={G.bl} />View
              </Button>
            </a>
          )}

          {/* Edit */}
          <Link to={`/app/admin/blog/edit/${post.id}`}>
            <Button variant="ghost" size="xs">
              <Icon name="edit" size={12} color={G.g} />Edit
            </Button>
          </Link>

          {/* Toggle publish */}
          <Button
            variant={post.status === 'published' ? 'warning' : 'ok'}
            size="xs"
            onClick={() => onTogglePublish(post)}
          >
            {post.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>

          {/* Delete */}
          <Button
            variant={confirming ? 'danger' : 'ghost'}
            size="xs"
            onClick={handleDelete}
            onBlur={() => setConfirming(false)}
          >
            <Icon name="trash" size={12} color={confirming ? '#F87171' : G.t2} />
            {confirming ? 'Sure?' : ''}
          </Button>
        </div>
      </td>
    </tr>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* Admin Blog Dashboard                                          */
/* ══════════════════════════════════════════════════════════════ */
export function AdminBlogDashboard() {
  const toast    = useToast();
  const navigate = useNavigate();

  const [posts,    setPosts]    = useState(DEMO_POSTS);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');    // all | published | draft
  const [category, setCategory] = useState('');

  const FILTER_TABS = [
    { key:'all',       label:'All Posts',  count: posts.length },
    { key:'published', label:'Published',  count: posts.filter(p=>p.status==='published').length },
    { key:'draft',     label:'Drafts',     count: posts.filter(p=>p.status==='draft').length },
  ];

  const filtered = useMemo(() => {
    let p = posts;
    if (filter !== 'all') p = p.filter((x) => x.status === filter);
    if (category)         p = p.filter((x) => x.category_slug === category);
    if (search)           p = p.filter((x) => x.title.toLowerCase().includes(search.toLowerCase()));
    return p;
  }, [posts, filter, category, search]);

  const totalViews = posts.reduce((s, p) => s + (p.view_count || 0), 0);

  const handleTogglePublish = (post) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, status: newStatus } : p));
    toast(`"${post.title.slice(0,30)}…" ${newStatus === 'published' ? 'published' : 'moved to draft'}`);
  };

  const handleDelete = (id) => {
    const post = posts.find((p) => p.id === id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast(`"${post?.title?.slice(0,30)}…" deleted`);
  };

  return (
    <div className="max-w-[1400px] px-4 md:px-[22px] pt-[22px] pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-2">
            <Icon name="note" size={20} color={G.g} />Content Management
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            Create and manage blog posts, categories, and SEO content
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" as={Link} to="/blog" target="_blank">
            <Icon name="eye" size={13} color={G.bl} />View Blog
          </Button>
          <Button variant="gold" size="md" as={Link} to="/app/admin/blog/new">
            <Icon name="plus" size={15} />New Post
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Posts"    value={posts.length}                                                icon="note"  color={G.g}  sub="all time" />
        <StatCard label="Published"      value={posts.filter(p=>p.status==='published').length}             icon="check" color={G.ok} sub="live on blog" />
        <StatCard label="Total Views"    value={totalViews.toLocaleString()}                                icon="eye"   color={G.bl} sub="across all posts" />
        <StatCard label="Avg. Read Time" value={`${Math.round(posts.reduce((s,p)=>s+p.read_time,0)/posts.length)}m`} icon="activity" color={G.pu} sub="per article" />
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Status tabs */}
        <div className="flex rounded-[10px] p-[3px] gap-[2px]" style={{ background:G.s2, border:`1px solid ${G.s4}` }}>
          {FILTER_TABS.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className="flex items-center gap-1.5 px-3 py-[5px] rounded-[8px] text-[12px] font-bold transition-all whitespace-nowrap"
              style={filter===t.key ? { background:G.g, color:G.bg } : { color:G.t1 }}>
              {t.label}
              <span className="text-[10px] px-[5px] py-[1px] rounded-full font-extrabold"
                style={{ background: filter===t.key ? 'rgba(0,0,0,.2)' : G.s4, color: filter===t.key ? G.bg : G.t1 }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-surface-2 border border-surface-4 rounded-[9px] px-3 py-2 text-[12.5px] text-text-primary outline-none focus:border-gold transition-colors"
        >
          <option value="">All Categories</option>
          {DEMO_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>

        {/* Search */}
        <div className="flex-1 relative">
          <Icon name="search" size={14} color={G.t2}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts by title…"
            className="w-full pl-9 pr-4 py-[9px] rounded-[9px] text-[12.5px] text-text-primary outline-none transition-colors"
            style={{ background:G.s2, border:`1px solid ${G.s4}` }}
            onFocus={(e) => e.target.style.borderColor='rgba(200,151,58,.5)'}
            onBlur={(e)  => e.target.style.borderColor=G.s4}
          />
        </div>
      </div>

      {/* Posts table */}
      <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="note" size={28} color={G.t2} />
            <p className="text-[14px] font-semibold text-text-muted mt-3 mb-5">No posts found</p>
            <Button variant="gold" as={Link} to="/app/admin/blog/new">
              <Icon name="plus" size={15} />Create Your First Post
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-4" style={{ background:G.s3 }}>
                  <th className="py-3 pl-4 w-[60px]" />
                  <th className="py-3 px-3 text-left text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted">Title</th>
                  <th className="py-3 px-3 text-left text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted">Status</th>
                  <th className="py-3 px-3 text-left text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted hidden md:table-cell">Views</th>
                  <th className="py-3 px-3 text-left text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted hidden lg:table-cell">Author</th>
                  <th className="py-3 px-3 text-left text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted hidden lg:table-cell">Read Time</th>
                  <th className="py-3 px-3 text-left text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted hidden sm:table-cell">Date</th>
                  <th className="py-3 pr-4 text-right text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    onTogglePublish={handleTogglePublish}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Result count */}
      {filtered.length > 0 && (
        <p className="text-[12px] text-text-muted mt-3 text-right">
          Showing {filtered.length} of {posts.length} posts
        </p>
      )}
    </div>
  );
}
