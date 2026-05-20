import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button }    from '@/shared/components/ui/Button';
import { Icon }      from '@/shared/components/ui/Icon';
import { Spinner }   from '@/shared/components/ui/Spinner';
import { SearchBar } from '@/shared/components/ui/Input';
import { useToast }  from '@/context/ToastContext';
import { useBlogStore } from '@/store/blogStore';
import { G } from '@/shared/utils/tokens';
import { cn } from '@/shared/utils/cn';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-NG', { month:'short', day:'numeric', year:'numeric' })
  : '—';

const STATUS_CONFIG = {
  published: { label:'Published', color:G.ok, bg:'rgba(22,163,74,.12)',  border:'rgba(22,163,74,.25)'  },
  draft:     { label:'Draft',     color:G.wa, bg:'rgba(217,119,6,.12)',  border:'rgba(217,119,6,.25)'  },
  archived:  { label:'Archived',  color:G.t2, bg:'rgba(78,75,88,.15)',   border:'rgba(78,75,88,.3)'    },
};

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

function PostRow({ post, onTogglePublish, onDelete, isProcessing }) {
  const sc = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-[14px] border-b border-surface-4 last:border-0 hover:bg-surface-3/30 transition-colors group">
      {/* Thumbnail */}
      <div className="w-full sm:w-[80px] h-[50px] sm:h-[50px] shrink-0 rounded-[8px] overflow-hidden bg-surface-3 border border-surface-4">
        {post.featured_image
          ? <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[20px]">📝</div>
        }
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[13px] truncate">{post.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
          <span className="text-[11px] text-text-muted">{post.author_name || '—'}</span>
          <span className="text-[11px] text-text-muted">{fmtDate(post.published_at || post.created_at)}</span>
          {post.read_time && (
            <span className="text-[11px] text-text-muted">{post.read_time}m read</span>
          )}
          {(post.view_count > 0) && (
            <span className="text-[11px] text-text-muted">👁 {(post.view_count||0).toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className="self-start sm:self-auto shrink-0 text-[10px] font-extrabold px-[8px] py-[3px] rounded-full border"
        style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
        {sc.label}
      </span>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
          className="text-[11px] font-bold text-text-muted hover:text-text-primary px-2 py-1 rounded-[6px] hover:bg-surface-3 transition-colors"
          aria-label={`Preview ${post.title}`}>
          <Icon name="eye" size={12} color="currentColor" />
        </button>
        <Link to={`/app/admin/blog/edit/${post.id}`}
          className="text-[11px] font-bold text-text-muted hover:text-text-primary px-2 py-1 rounded-[6px] hover:bg-surface-3 transition-colors"
          aria-label={`Edit ${post.title}`}>
          <Icon name="edit" size={12} color="currentColor" />
        </Link>
        <button
          onClick={() => onTogglePublish(post)}
          disabled={isProcessing === post.id}
          className="text-[11px] font-bold text-text-muted hover:text-gold px-2 py-1 rounded-[6px] hover:bg-surface-3 transition-colors"
          aria-label={`${post.status === 'published' ? 'Unpublish' : 'Publish'} ${post.title}`}>
          {isProcessing === post.id
            ? <Spinner size={11} />
            : post.status === 'published' ? 'Unpublish' : 'Publish'}
        </button>
        <button
          onClick={() => onDelete(post.id, post.title)}
          disabled={isProcessing === post.id}
          className="text-[11px] font-bold text-text-muted hover:text-red-400 px-2 py-1 rounded-[6px] hover:bg-surface-3 transition-colors"
          aria-label={`Delete ${post.title}`}>
          <Icon name="trash" size={12} color="currentColor" />
        </button>
      </div>
    </div>
  );
}

export function AdminBlogDashboard() {
  const toast    = useToast();
  const navigate = useNavigate();

  const adminPosts        = useBlogStore((s) => s.adminPosts);
  const adminAnalytics    = useBlogStore((s) => s.adminAnalytics);
  const isAdminLoading    = useBlogStore((s) => s.isAdminLoading);
  const fetchAdminPosts   = useBlogStore((s) => s.fetchAdminPosts);
  const fetchAdminAnalytics = useBlogStore((s) => s.fetchAdminAnalytics);
  const togglePublish     = useBlogStore((s) => s.togglePublish);
  const deletePost        = useBlogStore((s) => s.deletePost);
  const categories        = useBlogStore((s) => s.categories);
  const fetchCategories   = useBlogStore((s) => s.fetchCategories);

  const [search,       setSearch]      = useState('');
  const [filter,       setFilter]      = useState('all');
  const [category,     setCategory]    = useState('');
  const [isProcessing, setIsProcessing] = useState(null);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchAdminPosts(), fetchAdminAnalytics(), fetchCategories()]);
  }, [fetchAdminPosts, fetchAdminAnalytics, fetchCategories]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Toggle publish ───────────────────────────────────────── */
  const handleTogglePublish = async (post) => {
    setIsProcessing(post.id);
    try {
      await togglePublish(post.id);
      toast(`"${post.title.slice(0,30)}…" ${post.status === 'published' ? 'moved to draft' : 'published'}!`);
    } catch {
      toast('Update failed', 'danger');
    } finally {
      setIsProcessing(null);
    }
  };

  /* ── Delete ───────────────────────────────────────────────── */
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title.slice(0,40)}…"? This cannot be undone.`)) return;
    setIsProcessing(id);
    try {
      await deletePost(id);
      toast('Post deleted');
    } catch {
      toast('Delete failed', 'danger');
    } finally {
      setIsProcessing(null);
    }
  };

  /* ── Filter + search ─────────────────────────────────────── */
  const filtered = useMemo(() => {
    let p = adminPosts;
    if (filter !== 'all') p = p.filter((x) => x.status === filter);
    if (category)         p = p.filter((x) => x.category_slug === category);
    if (search)           p = p.filter((x) => x.title.toLowerCase().includes(search.toLowerCase()));
    return p;
  }, [adminPosts, filter, category, search]);

  /* ── Derived stats ─────────────────────────────────────────── */
  const totalViews = adminAnalytics?.total_views
    ?? adminPosts.reduce((s, p) => s + (p.view_count || 0), 0);
  const avgReadTime = adminPosts.length > 0
    ? Math.round(adminPosts.reduce((s, p) => s + (p.read_time || 5), 0) / adminPosts.length)
    : 0;

  const FILTER_TABS = [
    { key:'all',       label:'All Posts', count: adminPosts.length },
    { key:'published', label:'Published', count: adminPosts.filter(p=>p.status==='published').length },
    { key:'draft',     label:'Drafts',    count: adminPosts.filter(p=>p.status==='draft').length },
  ];

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
          <Button variant="gold" size="md" onClick={() => navigate('/app/admin/blog/new')}>
            <Icon name="plus" size={15} />New Post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {isAdminLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-[110px] bg-surface-2 border border-surface-4 rounded-[14px] animate-pulse" />
          ))
        ) : (
          <>
            <StatCard label="Total Posts"    value={adminPosts.length} icon="note"     color={G.g}  sub="all time" />
            <StatCard label="Published"      value={adminPosts.filter(p=>p.status==='published').length} icon="check" color={G.ok} sub="live on blog" />
            <StatCard label="Total Views"    value={totalViews.toLocaleString()} icon="eye"      color={G.bl} sub="across all posts" />
            <StatCard label="Avg. Read Time" value={avgReadTime ? `${avgReadTime}m` : '—'} icon="activity" color={G.pu} sub="per article" />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex rounded-[10px] p-[3px] gap-[2px]"
          style={{ background:G.s2, border:`1px solid ${G.s4}` }}>
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

        {categories.length > 0 && (
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="bg-surface-2 border border-surface-4 rounded-[9px] px-3 py-[7px] text-[12px] font-bold text-text-primary outline-none">
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        )}

        <SearchBar
          placeholder="Search posts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-[260px] ml-auto"
        />
      </div>

      {/* Post list */}
      <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden">
        {isAdminLoading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-[14px] border-b border-surface-4">
              <div className="w-[80px] h-[50px] bg-surface-3 rounded-[8px] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface-3 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-surface-3 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-text-muted">
            <Icon name="note" size={30} color="#4E4B58" />
            <p className="text-[14px] font-semibold mt-3">No posts found</p>
            <p className="text-[12px] mt-1">
              {adminPosts.length === 0 ? 'Create your first post' : 'Adjust your filters'}
            </p>
            {adminPosts.length === 0 && (
              <Button variant="gold" size="sm" className="mt-4"
                onClick={() => navigate('/app/admin/blog/new')}>
                <Icon name="plus" size={13} />New Post
              </Button>
            )}
          </div>
        ) : (
          filtered.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              onTogglePublish={handleTogglePublish}
              onDelete={handleDelete}
              isProcessing={isProcessing}
            />
          ))
        )}
      </div>

      {/* Pagination hint */}
      {filtered.length > 0 && (
        <p className="text-[11px] text-text-muted text-center mt-4">
          Showing {filtered.length} of {adminPosts.length} posts
        </p>
      )}
    </div>
  );
}
