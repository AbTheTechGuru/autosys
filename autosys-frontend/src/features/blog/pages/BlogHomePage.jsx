import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Logo }    from '@/shared/components/ui/Logo';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useBlogStore } from '@/store/blogStore';
import { G } from '@/shared/utils/tokens';

const PER_PAGE = 9;
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-NG', { month:'short', day:'numeric', year:'numeric' }) : '';

function useSeoTitle(title) {
  useEffect(() => {
    document.title = title;
    return () => { document.title = 'AutoSys'; };
  }, [title]);
}

/* ── Nav ─────────────────────────────────────────────────────── */
function BlogNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-[14px] border-b"
      style={{ background:`${G.bg}ee`, backdropFilter:'blur(14px)', borderColor:`rgba(200,151,58,.1)` }}>
      <Link to="/" className="no-underline"><Logo size={22} /></Link>
      <div className="flex gap-4 items-center">
        <Link to="/blog" className="text-[13px] font-bold text-text-secondary hover:text-gold transition-colors">Blog</Link>
        <Link to="/auth?signup" className="text-[13px] font-bold text-gold">Get AutoSys →</Link>
      </div>
    </nav>
  );
}

/* ── Post card ───────────────────────────────────────────────── */
function PostCard({ post }) {
  return (
    <Link to={`/blog/${post.slug}`} className="group no-underline block">
      <article className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden transition-all duration-200 hover:border-[rgba(200,151,58,.3)] hover:-translate-y-[3px] hover:shadow-[0_14px_42px_rgba(0,0,0,.4)]">
        <div className="h-[170px] overflow-hidden" style={{ background:`${G.s3}` }}>
          {post.featured_image
            ? <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center text-[48px]">📝</div>
          }
        </div>
        <div className="p-[18px]">
          {post.category_name && (
            <span className="inline-block text-[10px] font-extrabold uppercase tracking-[1.5px] px-[8px] py-[3px] rounded-full mb-2"
              style={{ color:G.g, background:`${G.g}16` }}>
              {post.category_name}
            </span>
          )}
          <h3 className="font-display text-[16px] font-bold leading-[1.3] mb-2 line-clamp-2 text-text-primary group-hover:text-gold transition-colors">
            {post.title}
          </h3>
          <p className="text-[12.5px] text-text-secondary leading-[1.6] line-clamp-2 mb-3">{post.excerpt}</p>
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>{post.author_name || 'AutoSys Team'}</span>
            <div className="flex items-center gap-2">
              <span>{fmtDate(post.published_at || post.created_at)}</span>
              {post.read_time && <span>· {post.read_time}m read</span>}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

/* ── Featured post ───────────────────────────────────────────── */
function FeaturedPost({ post }) {
  if (!post) return null;
  return (
    <Link to={`/blog/${post.slug}`} className="group no-underline block">
      <div className="relative rounded-[16px] overflow-hidden h-[380px] flex flex-col justify-end"
        style={{ background:`linear-gradient(135deg,${G.s2},${G.s3})` }}>
        {post.featured_image && (
          <img src={post.featured_image} alt={post.title}
            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-300" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,7,11,.95)] via-[rgba(7,7,11,.5)] to-transparent" />
        <div className="relative p-[28px]">
          <span className="inline-block text-[10px] font-extrabold uppercase tracking-[1.5px] px-[8px] py-[3px] rounded-full mb-3"
            style={{ color:G.g, background:`${G.g}22` }}>
            {post.category_name || 'Featured'}
          </span>
          <h2 className="font-display text-[clamp(20px,3vw,28px)] font-bold text-white leading-[1.2] mb-2 line-clamp-2 group-hover:text-gold transition-colors">
            {post.title}
          </h2>
          <p className="text-[13px] text-[rgba(255,255,255,.7)] line-clamp-2 mb-3">{post.excerpt}</p>
          <div className="flex items-center gap-3 text-[12px] text-[rgba(255,255,255,.5)]">
            <span>{post.author_name || 'AutoSys Team'}</span>
            <span>·</span>
            <span>{post.read_time}m read</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export function BlogHomePage() {
  useSeoTitle('AutoSys Blog — Insights for Nigerian Car Dealers');

  const posts          = useBlogStore((s) => s.posts);
  const categories     = useBlogStore((s) => s.categories);
  const isLoading      = useBlogStore((s) => s.isLoading);
  const fetchPosts     = useBlogStore((s) => s.fetchPosts);
  const fetchCategories= useBlogStore((s) => s.fetchCategories);

  const [searchParams, setSearchParams] = useSearchParams();
  const [search,   setSearch]   = useState(searchParams.get('q')   || '');
  const [category, setCategory] = useState(searchParams.get('cat') || '');
  const [page,     setPage]     = useState(1);

  const load = useCallback(() => {
    fetchPosts({ page: 1, status: 'published' });
    fetchCategories();
  }, [fetchPosts, fetchCategories]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const params = {};
    if (search)   params.q   = search;
    if (category) params.cat = category;
    setSearchParams(params, { replace: true });
    setPage(1);
  }, [search, category, setSearchParams]);

  const filtered = useMemo(() => {
    let p = posts.filter((x) => x.status === 'published');
    if (category) p = p.filter((x) => x.category_slug === category);
    if (search)   p = p.filter((x) =>
      x.title.toLowerCase().includes(search.toLowerCase()) ||
      (x.excerpt || '').toLowerCase().includes(search.toLowerCase())
    );
    return p;
  }, [posts, category, search]);

  const totalPages  = Math.ceil(filtered.length / PER_PAGE);
  const paginated   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const featuredPost = posts.find((p) => p.featured && p.status === 'published');

  return (
    <div className="min-h-screen" style={{ background: G.bg }}>
      <BlogNav />

      {/* Hero banner */}
      <div className="pt-[80px]" style={{ background:G.s1, borderBottom:`1px solid rgba(200,151,58,.1)` }}>
        <div className="max-w-[1200px] mx-auto px-5 py-[60px]">
          <div className="max-w-[600px]">
            <div className="text-[11px] font-extrabold uppercase tracking-[2px] mb-3" style={{ color:G.g }}>AUTOSYS BLOG</div>
            <h1 className="font-display text-[clamp(30px,5vw,52px)] font-bold mb-4 leading-[1.15]">
              Insights to Scale<br />
              <span className="gold-text">Your Dealership</span>
            </h1>
            <p className="text-text-secondary text-[16px] leading-[1.7] mb-6">
              Proven strategies, case studies, and expert guides from Nigeria's top car dealers — to help you sell more, earn more, and stress less.
            </p>
            <div className="flex gap-2 max-w-[440px]">
              <input
                placeholder="Search articles…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-surface-3 border border-surface-4 rounded-[10px] px-4 py-[10px] text-[13.5px] text-text-primary outline-none focus:border-gold transition-colors placeholder:text-text-muted" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="px-3 bg-surface-3 border border-surface-4 rounded-[10px] text-text-muted hover:text-text-primary transition-colors">✕</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-5 py-[50px]">
        {/* Category filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button onClick={() => setCategory('')}
              className="px-4 py-[7px] rounded-[8px] text-[12.5px] font-bold transition-all"
              style={!category ? { background:G.g, color:G.bg } : { background:G.s3, color:G.t1 }}>
              All
            </button>
            {categories.map((c) => (
              <button key={c.slug} onClick={() => setCategory(category === c.slug ? '' : c.slug)}
                className="px-4 py-[7px] rounded-[8px] text-[12.5px] font-bold transition-all"
                style={category===c.slug ? { background:G.g, color:G.bg } : { background:G.s3, color:G.t1 }}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {isLoading && posts.length === 0 && (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        )}

        {/* Featured post (first load, no filters) */}
        {!search && !category && featuredPost && page === 1 && (
          <div className="mb-10">
            <FeaturedPost post={featuredPost} />
          </div>
        )}

        {/* Post grid */}
        {paginated.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {paginated
              .filter((p) => !(!search && !category && page === 1 && p.id === featuredPost?.id))
              .map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        ) : !isLoading ? (
          <div className="text-center py-16 text-text-muted">
            <span className="text-[36px]">📭</span>
            <p className="text-[15px] font-semibold mt-4">
              {posts.length === 0 ? 'No posts published yet' : 'No articles match your search'}
            </p>
            {search && (
              <button onClick={() => setSearch('')}
                className="mt-4 text-gold font-bold hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer">
                Clear search
              </button>
            )}
          </div>
        ) : null}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className="w-9 h-9 rounded-[8px] text-[13px] font-bold transition-all"
                style={n===page ? { background:G.g, color:G.bg } : { background:G.s3, color:G.t1 }}>
                {n}
              </button>
            ))}
            <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
          </div>
        )}
      </div>
    </div>
  );
}
