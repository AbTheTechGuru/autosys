import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Logo }   from '@/shared/components/ui/Logo';
import { Button } from '@/shared/components/ui/Button';
import { Icon }   from '@/shared/components/ui/Icon';
import { G }      from '@/shared/utils/tokens';
import { DEMO_POSTS, DEMO_CATEGORIES } from '@/store/blogStore';

/* ── Helpers ──────────────────────────────────────────────────── */
const fmtDate = (d) => new Date(d).toLocaleDateString('en-NG', { month:'short', day:'numeric', year:'numeric' });

function calcReadTime(words) {
  return Math.max(1, Math.round(words / 200));
}

/* ── SEO Head (simple title update) ─────────────────────────── */
function useSeoTitle(title) {
  useEffect(() => {
    document.title = title;
    return () => { document.title = 'AutoSys'; };
  }, [title]);
}

/* ── Shared Blog Nav ─────────────────────────────────────────── */
function BlogNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[300] h-[60px] px-5 lg:px-8 flex items-center justify-between transition-all duration-300"
      style={{
        background: 'rgba(7,7,11,.95)',
        backdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${scrolled ? 'rgba(200,151,58,.2)' : 'rgba(200,151,58,.08)'}`,
      }}
    >
      <div className="flex items-center gap-4">
        <Link to="/"><Logo size={22} /></Link>
        <span className="text-surface-5 text-[16px]">/</span>
        <span className="text-[13px] font-bold text-text-primary">Blog</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" as={Link} to="/">Home</Button>
        <Button variant="gold"  size="sm" as={Link} to="/auth">Start Free Trial</Button>
      </div>
    </nav>
  );
}

/* ── Blog Card (full) ────────────────────────────────────────── */
function BlogCard({ post, variant = 'grid' }) {
  const cat      = DEMO_CATEGORIES.find((c) => c.slug === post.category_slug);
  const catColor = cat?.color || G.g;
  const catName  = cat?.name  || post.category_slug;

  if (variant === 'featured') {
    return (
      <Link
        to={`/blog/${post.slug}`}
        className="group relative flex flex-col md:flex-row overflow-hidden rounded-[20px] border border-surface-4 hover:border-[rgba(200,151,58,.4)] transition-all duration-300 hover:shadow-[0_16px_60px_rgba(0,0,0,.6)]"
        style={{ background: G.s2 }}
      >
        <div className="relative md:w-[55%] h-[240px] md:h-auto overflow-hidden shrink-0">
          {post.featured_image && (
            <img src={post.featured_image} alt={post.title}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[rgba(19,19,28,.6)] md:block hidden" />
        </div>
        <div className="flex flex-col justify-center p-7 md:p-10 flex-1">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10.5px] font-extrabold px-[8px] py-[3px] rounded-[6px]"
              style={{ background:`${catColor}22`, color:catColor, border:`1px solid ${catColor}40` }}>
              {catName}
            </span>
            <span className="text-[11px] text-text-muted">{post.read_time} min read</span>
          </div>
          <h2 className="font-display text-[clamp(18px,2.5vw,26px)] font-bold leading-[1.3] mb-3 group-hover:text-gold transition-colors">
            {post.title}
          </h2>
          <p className="text-text-secondary text-[14px] leading-[1.7] mb-5 line-clamp-3">{post.excerpt}</p>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold"
              style={{ background:`rgba(200,151,58,.15)`, color:G.g, border:`1px solid rgba(200,151,58,.25)` }}>
              {post.author_name?.charAt(0)}
            </div>
            <span className="text-[12.5px] font-semibold text-text-primary">{post.author_name}</span>
            <span className="text-text-muted text-[11px]">·</span>
            <span className="text-text-muted text-[11px]">{fmtDate(post.published_at)}</span>
            <span className="text-text-muted text-[11px]">·</span>
            <Icon name="eye" size={12} color={G.t2} />
            <span className="text-text-muted text-[11px]">{post.view_count?.toLocaleString()} views</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-[16px] border border-surface-4 hover:border-[rgba(200,151,58,.35)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_12px_40px_rgba(0,0,0,.5)]"
      style={{ background: G.s2 }}
    >
      <div className="relative overflow-hidden h-[200px] bg-surface-3 shrink-0">
        {post.featured_image ? (
          <img src={post.featured_image} alt={post.title}
            className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
            loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="note" size={32} color={G.t2} />
          </div>
        )}
        <span className="absolute top-3 left-3 text-[10.5px] font-extrabold px-[8px] py-[3px] rounded-[6px]"
          style={{ background:`${catColor}22`, color:catColor, border:`1px solid ${catColor}44`, backdropFilter:'blur(8px)' }}>
          {catName}
        </span>
      </div>
      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-display text-[15px] font-bold leading-[1.4] mb-2 group-hover:text-gold transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-[12.5px] text-text-secondary leading-[1.6] line-clamp-2 flex-1 mb-4">{post.excerpt}</p>
        <div className="flex items-center gap-2 pt-3 border-t border-surface-4">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0"
            style={{ background:`rgba(200,151,58,.15)`, color:G.g, border:`1px solid rgba(200,151,58,.25)` }}>
            {post.author_name?.charAt(0)}
          </div>
          <span className="text-[11px] font-bold text-text-primary flex-1 truncate">{post.author_name}</span>
          <span className="text-[10.5px] text-text-muted shrink-0">{fmtDate(post.published_at)}</span>
          <span className="text-[10.5px] text-text-muted shrink-0">· {post.read_time}m</span>
        </div>
      </div>
    </Link>
  );
}

/* ── Category Pill ───────────────────────────────────────────── */
function CategoryPill({ cat, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-[12px] font-bold px-4 py-[6px] rounded-full border transition-all whitespace-nowrap"
      style={active
        ? { background: cat.color, color: '#0A0812', borderColor: cat.color }
        : { background: `${cat.color}12`, color: cat.color, borderColor: `${cat.color}40` }
      }
    >
      {cat.name}
      {cat.post_count > 0 && (
        <span className="ml-1.5 text-[10px] opacity-70">({cat.post_count})</span>
      )}
    </button>
  );
}

/* ── Main Blog Homepage ──────────────────────────────────────── */
export function BlogHomePage() {
  useSeoTitle('Blog | AutoSys — Car Dealership Insights & Growth');

  const [searchParams, setSearchParams] = useSearchParams();
  const [search,   setSearch]   = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('cat') || '');
  const [page,     setPage]     = useState(1);

  const PER_PAGE = 9;

  // Update URL params on filter change
  useEffect(() => {
    const params = {};
    if (search)   params.q   = search;
    if (category) params.cat = category;
    setSearchParams(params, { replace: true });
    setPage(1);
  }, [search, category]);

  const filtered = useMemo(() => {
    let posts = DEMO_POSTS;
    if (category) posts = posts.filter((p) => p.category_slug === category);
    if (search)   posts = posts.filter((p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(search.toLowerCase())
    );
    return posts;
  }, [search, category]);

  const totalPages  = Math.ceil(filtered.length / PER_PAGE);
  const paginated   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const featuredPost = DEMO_POSTS.find((p) => p.featured && p.id === '1');

  return (
    <div className="min-h-screen" style={{ background: G.bg }}>
      <BlogNav />

      {/* ── Hero Banner ────────────────────────────────────────── */}
      <div className="pt-[80px]" style={{ background: G.s1, borderBottom: `1px solid rgba(200,151,58,.1)` }}>
        <div className="max-w-[1200px] mx-auto px-5 py-[60px]">
          <div className="max-w-[600px]">
            <div className="text-[11px] font-extrabold uppercase tracking-[2px] mb-3" style={{ color:G.g }}>
              AUTOSYS BLOG
            </div>
            <h1 className="font-display text-[clamp(30px,5vw,52px)] font-bold mb-4 leading-[1.15]">
              Insights to Scale<br />
              <span className="gold-text">Your Dealership</span>
            </h1>
            <p className="text-text-secondary text-[16px] leading-[1.7] mb-6">
              Proven strategies, case studies, and expert guides from Nigeria's top car dealers — to help you sell more, earn more, and stress less.
            </p>
            {/* Search bar */}
            <div className="flex gap-2 max-w-[480px]">
              <div className="relative flex-1">
                <Icon name="search" size={16} color={G.t2}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-[10px] text-[13.5px] text-text-primary outline-none transition-colors"
                  style={{ background:G.s3, border:`1px solid ${G.s5}`, '--focus-border':'rgba(200,151,58,.5)' }}
                  onFocus={(e) => e.target.style.borderColor='rgba(200,151,58,.5)'}
                  onBlur={(e)  => e.target.style.borderColor=G.s5}
                />
              </div>
              {search && (
                <Button variant="ghost" size="md" onClick={() => setSearch('')}>Clear</Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-5 py-10">

        {/* ── Category filter ──────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setCategory('')}
            className="text-[12px] font-bold px-4 py-[6px] rounded-full border transition-all"
            style={!category
              ? { background: G.g, color: '#0A0812', borderColor: G.g }
              : { background: 'rgba(200,151,58,.08)', color: G.g, borderColor: 'rgba(200,151,58,.3)' }
            }
          >
            All Topics
          </button>
          {DEMO_CATEGORIES.map((cat) => (
            <CategoryPill key={cat.slug} cat={cat}
              active={category === cat.slug}
              onClick={() => setCategory(category === cat.slug ? '' : cat.slug)} />
          ))}
        </div>

        {/* ── Featured post (only on no-filter view) ───────────── */}
        {!search && !category && page === 1 && featuredPost && (
          <div className="mb-10">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[2px] mb-4" style={{ color:G.g }}>
              ⭐ FEATURED
            </p>
            <BlogCard post={featuredPost} variant="featured" />
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-[13px] text-text-muted">
            {filtered.length} article{filtered.length !== 1 ? 's' : ''}
            {search && ` for "${search}"`}
            {category && ` in ${DEMO_CATEGORIES.find(c=>c.slug===category)?.name}`}
          </p>
        </div>

        {paginated.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-[40px] mb-4">🔍</div>
            <p className="font-display text-[20px] font-bold mb-2">No articles found</p>
            <p className="text-text-muted text-[14px] mb-6">Try a different search term or category</p>
            <Button variant="ghost" onClick={() => { setSearch(''); setCategory(''); }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginated.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className="w-9 h-9 rounded-[8px] text-[13px] font-bold transition-colors"
                style={page === p
                  ? { background: G.g, color: '#0A0812' }
                  : { background: G.s3, color: G.t1 }}>
                {p}
              </button>
            ))}
            <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        )}
      </div>

      {/* ── Inline CTA ──────────────────────────────────────────── */}
      <div className="border-t border-surface-4 py-16 px-5 text-center" style={{ background: G.s1 }}>
        <div className="max-w-[540px] mx-auto">
          <h2 className="font-display text-[clamp(22px,4vw,34px)] font-bold mb-3">
            Ready to Grow Your Dealership?
          </h2>
          <p className="text-text-secondary text-[15px] mb-6">
            Join 500+ dealers using AutoSys to automate their operations and close more deals.
          </p>
          <Button variant="gold" size="lg" as={Link} to="/auth">
            Start Free Trial — No Credit Card
          </Button>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-surface-4 py-8 px-5" style={{ background: G.bg }}>
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size={20} />
          <div className="flex gap-5 text-[12.5px] text-text-muted">
            <Link to="/"          className="hover:text-gold transition-colors">Home</Link>
            <Link to="/blog"      className="hover:text-gold transition-colors">Blog</Link>
            <Link to="/auth"      className="hover:text-gold transition-colors">Get Started</Link>
            <a href="#"           className="hover:text-gold transition-colors">Privacy</a>
            <a href="#"           className="hover:text-gold transition-colors">Contact</a>
          </div>
          <p className="text-text-muted text-[12px]">© {new Date().getFullYear()} AutoSys</p>
        </div>
      </footer>
    </div>
  );
}
