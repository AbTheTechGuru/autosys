import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Logo }    from '@/shared/components/ui/Logo';
import { Button }  from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useBlogStore } from '@/store/blogStore';
import { G } from '@/shared/utils/tokens';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { weekday:'long', month:'long', day:'numeric', year:'numeric' }) : '';

function BlogNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-[14px] border-b"
      style={{ background:`${G.bg}ee`, backdropFilter:'blur(14px)', borderColor:`rgba(200,151,58,.1)` }}>
      <Link to="/" className="no-underline"><Logo size={22} /></Link>
      <div className="flex gap-4 items-center">
        <Link to="/blog" className="text-[13px] font-bold text-text-secondary hover:text-gold transition-colors no-underline">← Blog</Link>
        <Link to="/auth?signup" className="text-[13px] font-bold text-gold no-underline">Get AutoSys →</Link>
      </div>
    </nav>
  );
}

function RelatedCard({ post }) {
  return (
    <Link to={`/blog/${post.slug}`} className="no-underline group block">
      <div className="bg-surface-2 border border-surface-4 rounded-[12px] overflow-hidden hover:border-[rgba(200,151,58,.3)] transition-all">
        <div className="h-[110px] overflow-hidden" style={{ background:G.s3 }}>
          {post.featured_image
            ? <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center text-[32px]">📝</div>
          }
        </div>
        <div className="p-[14px]">
          <h4 className="font-bold text-[13px] line-clamp-2 leading-[1.35] group-hover:text-gold transition-colors">{post.title}</h4>
          <p className="text-[11px] text-text-muted mt-1">{post.read_time}m read</p>
        </div>
      </div>
    </Link>
  );
}

export function BlogPostPage() {
  const { slug }   = useParams();
  const navigate   = useNavigate();

  const currentPost  = useBlogStore((s) => s.currentPost);
  const posts        = useBlogStore((s) => s.posts);
  const isLoading    = useBlogStore((s) => s.isLoading);
  const error        = useBlogStore((s) => s.error);
  const fetchPost    = useBlogStore((s) => s.fetchPost);
  const fetchPosts   = useBlogStore((s) => s.fetchPosts);

  // Sticky CTA
  const [showStickyCta, setStickyCta] = useState(false);
  useEffect(() => {
    const handler = () => setStickyCta(window.scrollY > 600);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Fetch post from backend
  useEffect(() => {
    fetchPost(slug);
    // Ensure we have related posts
    if (posts.length === 0) fetchPosts({ status: 'published' });
    window.scrollTo({ top: 0 });
  }, [slug, fetchPost, fetchPosts, posts.length]);

  // Update page title
  useEffect(() => {
    if (currentPost) {
      document.title = `${currentPost.meta_title || currentPost.title} | AutoSys Blog`;
    }
    return () => { document.title = 'AutoSys'; };
  }, [currentPost]);

  const related = posts
    .filter((p) => p.slug !== slug && p.status === 'published' && p.category_slug === currentPost?.category_slug)
    .slice(0, 3);

  /* ── Loading ─────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background:G.bg }}>
        <BlogNav />
        <Spinner size={32} />
      </div>
    );
  }

  /* ── Error / 404 ─────────────────────────────────────────── */
  if (error || (!isLoading && !currentPost)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-5" style={{ background:G.bg }}>
        <BlogNav />
        <span className="text-[48px] mb-4">🔍</span>
        <h2 className="font-display text-[24px] font-bold mb-2">Article not found</h2>
        <p className="text-text-secondary mb-6">
          {error || 'This article may have been moved or removed.'}
        </p>
        <Button variant="gold" onClick={() => navigate('/blog')}>← Back to Blog</Button>
      </div>
    );
  }

  const post = currentPost;

  return (
    <div className="min-h-screen" style={{ background:G.bg }}>
      <BlogNav />

      {/* Sticky CTA */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${showStickyCta ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ background:`${G.s2}f0`, backdropFilter:'blur(10px)', borderTop:`1px solid rgba(200,151,58,.15)` }}>
        <div className="max-w-[780px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <p className="text-[13px] font-semibold text-text-secondary hidden sm:block">
            Ready to grow your dealership?
          </p>
          <Link to="/auth?signup" className="no-underline">
            <Button variant="gold" size="sm">Get AutoSys Free →</Button>
          </Link>
        </div>
      </div>

      {/* Hero image */}
      <div className="pt-[64px]">
        {post.featured_image && (
          <div className="max-w-[900px] mx-auto px-5 pt-8">
            <div className="rounded-[16px] overflow-hidden h-[clamp(200px,40vw,420px)]">
              <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>

      {/* Article content */}
      <div className="max-w-[780px] mx-auto px-5 py-[48px]">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {post.category_name && (
            <span className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] px-[8px] py-[3px] rounded-full"
              style={{ color:G.g, background:`${G.g}16` }}>
              {post.category_name}
            </span>
          )}
          {(post.tags || []).slice(0, 2).map((t) => (
            <span key={t} className="text-[10.5px] font-bold px-[8px] py-[3px] rounded-full"
              style={{ color:G.t1, background:G.s4 }}>
              #{t}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-bold leading-[1.15] mb-5">
          {post.title}
        </h1>

        {/* Author + date */}
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-surface-4">
          <div className="w-10 h-10 rounded-full bg-surface-3 border border-surface-4 flex items-center justify-center font-bold text-[15px]">
            {(post.author_name || 'AT').split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="font-bold text-[13.5px]">{post.author_name || 'AutoSys Team'}</p>
            <div className="flex gap-2 text-[12px] text-text-muted">
              <span>{fmtDate(post.published_at || post.created_at)}</span>
              {post.read_time && <><span>·</span><span>{post.read_time} min read</span></>}
              {post.view_count > 0 && <><span>·</span><span>{post.view_count.toLocaleString()} views</span></>}
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          className="prose prose-sm prose-invert max-w-none text-[15.5px] leading-[1.85]"
          style={{ color:'rgba(240,237,226,.85)' }}
          dangerouslySetInnerHTML={{ __html: post.content || '<p>Content coming soon…</p>' }}
        />

        {/* Author bio */}
        {post.author_bio && (
          <div className="mt-10 p-5 bg-surface-2 border border-surface-4 rounded-[14px] flex gap-4 items-start">
            <div className="w-12 h-12 rounded-full bg-surface-3 border border-surface-4 flex items-center justify-center font-bold text-[16px] shrink-0">
              {(post.author_name || 'AT').split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="font-bold text-[14px] mb-1">{post.author_name}</p>
              <p className="text-[13px] text-text-secondary leading-[1.6]">{post.author_bio}</p>
            </div>
          </div>
        )}

        {/* Inline CTA */}
        <div className="mt-12 rounded-[14px] p-8 text-center border"
          style={{ background:`linear-gradient(135deg,${G.s2},${G.s3})`, borderColor:`rgba(200,151,58,.15)` }}>
          <h3 className="font-display text-[22px] font-bold mb-2">Ready to grow your dealership?</h3>
          <p className="text-text-secondary text-[14px] mb-5">
            Join 500+ Nigerian dealers using AutoSys to manage leads, inventory, and revenue.
          </p>
          <Link to="/auth?signup" className="no-underline">
            <Button variant="gold" size="lg">Start Free Trial — No Credit Card</Button>
          </Link>
        </div>
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <div className="max-w-[1100px] mx-auto px-5 pb-16">
          <h2 className="font-display text-[22px] font-bold mb-5">Related Articles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((p) => <RelatedCard key={p.id} post={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
