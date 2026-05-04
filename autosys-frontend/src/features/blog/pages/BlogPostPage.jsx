import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Logo }   from '@/shared/components/ui/Logo';
import { Button } from '@/shared/components/ui/Button';
import { Icon }   from '@/shared/components/ui/Icon';
import { G }      from '@/shared/utils/tokens';
import { DEMO_POSTS, DEMO_CATEGORIES } from '@/store/blogStore';

/* ── Helpers ─────────────────────────────────────────────────── */
const fmtDate = (d) => new Date(d).toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' });

function useSeoMeta({ title, desc, image, url }) {
  useEffect(() => {
    if (title) document.title = title;
    const setMeta = (name, content, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel);
      if (!el) {
        el = document.createElement('meta');
        prop ? el.setAttribute('property', name) : el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content || '');
    };
    if (desc)  setMeta('description', desc);
    if (title) setMeta('og:title', title, true);
    if (desc)  setMeta('og:description', desc, true);
    if (image) setMeta('og:image', image, true);
    if (url)   setMeta('og:url', url, true);
    setMeta('og:type', 'article', true);
    setMeta('twitter:card', 'summary_large_image');
    return () => { document.title = 'AutoSys'; };
  }, [title, desc, image, url]);
}

/* ── Extract TOC headings from HTML ─────────────────────────── */
function extractHeadings(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  const nodes = div.querySelectorAll('h2, h3');
  return Array.from(nodes).map((n, i) => ({
    id:    `heading-${i}`,
    level: parseInt(n.tagName[1]),
    text:  n.textContent.trim(),
  }));
}

/* ── Inject IDs into HTML for anchor links ───────────────────── */
function injectHeadingIds(html) {
  let i = 0;
  return html.replace(/<(h[23])[^>]*>(.*?)<\/h[23]>/gi, (_, tag, text) =>
    `<${tag} id="heading-${i++}">${text}</${tag}>`
  );
}

/* ── Blog Nav ────────────────────────────────────────────────── */
function BlogNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <nav className="fixed top-0 left-0 right-0 z-[300] h-[60px] px-5 lg:px-8 flex items-center justify-between transition-all duration-300"
      style={{ background:'rgba(7,7,11,.97)', backdropFilter:'blur(20px)', borderBottom:`1px solid ${scrolled?'rgba(200,151,58,.2)':'rgba(200,151,58,.06)'}` }}>
      <div className="flex items-center gap-3">
        <Link to="/"><Logo size={22} /></Link>
        <span className="text-surface-5 text-[16px] hidden sm:block">/</span>
        <Link to="/blog" className="text-[12.5px] font-bold text-text-muted hover:text-gold transition-colors hidden sm:block">Blog</Link>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" as={Link} to="/blog">← All Articles</Button>
        <Button variant="gold"  size="sm" as={Link} to="/auth">Start Free Trial</Button>
      </div>
    </nav>
  );
}

/* ── Table of Contents ───────────────────────────────────────── */
function TableOfContents({ headings, activeId }) {
  if (!headings.length) return null;
  return (
    <div className="rounded-[14px] border border-surface-4 p-5 sticky top-[80px]"
      style={{ background: G.s2 }}>
      <p className="text-[10.5px] font-extrabold uppercase tracking-[2px] mb-4" style={{ color: G.g }}>
        TABLE OF CONTENTS
      </p>
      <ul className="space-y-1">
        {headings.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior:'smooth', block:'start' }); }}
              className="block text-[12.5px] leading-[1.5] py-[4px] transition-colors rounded-[5px] px-2 -mx-2"
              style={{
                color:      activeId === h.id ? G.g : G.t1,
                fontWeight: activeId === h.id ? '700' : '500',
                paddingLeft: h.level === 3 ? '20px' : '8px',
                background: activeId === h.id ? 'rgba(200,151,58,.08)' : 'transparent',
              }}>
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Related Post Card ───────────────────────────────────────── */
function RelatedCard({ post }) {
  const cat = DEMO_CATEGORIES.find((c) => c.slug === post.category_slug);
  return (
    <Link to={`/blog/${post.slug}`}
      className="group flex gap-4 items-start p-4 rounded-[12px] border border-surface-4 hover:border-[rgba(200,151,58,.3)] transition-all"
      style={{ background: G.s2 }}>
      {post.featured_image && (
        <img src={post.featured_image} alt={post.title}
          className="w-[80px] h-[60px] rounded-[8px] object-cover shrink-0 group-hover:opacity-80 transition-opacity"
          loading="lazy" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold mb-1" style={{ color: cat?.color || G.g }}>{cat?.name}</p>
        <p className="text-[13px] font-bold text-text-primary leading-[1.4] line-clamp-2 group-hover:text-gold transition-colors">
          {post.title}
        </p>
        <p className="text-[11px] text-text-muted mt-1">{post.read_time} min read</p>
      </div>
    </Link>
  );
}

/* ── Inline CTA Block ────────────────────────────────────────── */
function InlineCta({ slug }) {
  const trackClick = () => {
    // In production: blogApi.trackCta(slug, 'inline', '/auth')
    console.log('CTA click tracked: inline');
  };
  return (
    <div className="my-10 rounded-[16px] p-7 border relative overflow-hidden"
      style={{ background:'linear-gradient(135deg,rgba(200,151,58,.08),rgba(200,151,58,.03))', borderColor:'rgba(200,151,58,.25)' }}>
      <div className="absolute top-0 right-0 w-[120px] h-[120px] rounded-full opacity-[0.07]"
        style={{ background: G.g, filter:'blur(40px)', transform:'translate(20%,-20%)' }} />
      <div className="relative">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[2px] mb-2" style={{ color: G.g }}>
          🚀 AUTOSYS PLATFORM
        </p>
        <h3 className="font-display text-[20px] font-bold mb-2">
          Ready to apply this in your dealership?
        </h3>
        <p className="text-text-secondary text-[14px] mb-5 leading-[1.6]">
          AutoSys gives you the CRM, WhatsApp integration, pipeline, and automation tools described in this article — all in one platform. Start free, no credit card needed.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="gold" size="md" as={Link} to="/auth" onClick={trackClick}>
            <Icon name="zap" size={15} />Start Free Trial
          </Button>
          <Button variant="ghost" size="md" as={Link} to="/auth">
            Book a Demo →
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Sticky CTA Bar (appears after scroll) ───────────────────── */
function StickyCta({ show, slug }) {
  const trackClick = () => console.log('CTA click tracked: sticky');
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] transition-all duration-300 px-4 pb-4"
      style={{ transform: show ? 'translateY(0)' : 'translateY(120%)', opacity: show ? 1 : 0 }}>
      <div className="max-w-[700px] mx-auto flex items-center gap-4 px-5 py-3 rounded-[14px] border shadow-[0_-4px_40px_rgba(0,0,0,.7)]"
        style={{ background:'rgba(14,14,22,.97)', backdropFilter:'blur(20px)', borderColor:'rgba(200,151,58,.3)' }}>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-text-primary truncate">
            🚀 Manage your dealership like a pro
          </p>
          <p className="text-[11px] text-text-muted">AutoSys · Free forever plan</p>
        </div>
        <Button variant="gold" size="sm" as={Link} to="/auth" onClick={trackClick}>
          Start Free →
        </Button>
        <button onClick={() => {}} className="text-text-muted hover:text-text-primary transition-colors p-1">
          <Icon name="x" size={14} color="currentColor" />
        </button>
      </div>
    </div>
  );
}

/* ── Social Share ────────────────────────────────────────────── */
function ShareButtons({ url, title }) {
  const encode = encodeURIComponent;
  const shares = [
    { label:'Twitter/X',  href:`https://twitter.com/intent/tweet?url=${encode(url)}&text=${encode(title)}`,   icon:'🐦', color:'#1DA1F2' },
    { label:'LinkedIn',   href:`https://www.linkedin.com/sharing/share-offsite/?url=${encode(url)}`,          icon:'💼', color:'#0A66C2' },
    { label:'WhatsApp',   href:`https://wa.me/?text=${encode(title+' '+url)}`,                                 icon:'💬', color:'#25D366' },
    { label:'Facebook',   href:`https://www.facebook.com/sharer/sharer.php?u=${encode(url)}`,                 icon:'📘', color:'#1877F2' },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {shares.map(({ label, href, icon, color }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-[6px] rounded-[8px] border text-[12px] font-bold transition-all hover:-translate-y-[1px]"
          style={{ background:`${color}12`, color, borderColor:`${color}40` }}>
          <span>{icon}</span>{label}
        </a>
      ))}
    </div>
  );
}

/* ── End of Article CTA ──────────────────────────────────────── */
function EndCta({ slug }) {
  const trackClick = () => console.log('CTA click tracked: end');
  return (
    <div className="mt-14 rounded-[20px] p-8 md:p-10 border text-center relative overflow-hidden"
      style={{ background:'linear-gradient(135deg,rgba(200,151,58,.07),rgba(200,151,58,.02))', borderColor:'rgba(200,151,58,.25)' }}>
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="relative">
        <div className="text-[32px] mb-3">🚗</div>
        <h2 className="font-display text-[clamp(20px,3vw,30px)] font-bold mb-3">
          Transform Your Dealership Today
        </h2>
        <p className="text-text-secondary text-[15px] leading-[1.7] mb-6 max-w-[460px] mx-auto">
          Join 500+ Nigerian car dealers using AutoSys to automate their operations, capture more leads, and close deals faster.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="gold" size="lg" as={Link} to="/auth" onClick={trackClick}>
            <Icon name="zap" size={17} />Start Free Trial — No Credit Card
          </Button>
          <Button variant="ghost" size="lg" as={Link} to="/blog">
            Read More Articles
          </Button>
        </div>
        <p className="text-text-muted text-[12px] mt-4">Free forever plan · Setup in 5 minutes · 500+ dealers trust AutoSys</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* Main Blog Post Page                                           */
/* ══════════════════════════════════════════════════════════════ */
export function BlogPostPage() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const contentRef  = useRef(null);

  const [activeId,    setActiveId]    = useState('');
  const [showSticky,  setShowSticky]  = useState(false);
  const [showStickyX, setShowStickyX] = useState(false);
  const [copied,      setCopied]      = useState(false);

  // Find post from demo data (replace with API call in production)
  const post = DEMO_POSTS.find((p) => p.slug === slug);

  // Redirect if not found
  useEffect(() => {
    if (!post) navigate('/blog', { replace: true });
  }, [post, navigate]);

  // SEO metadata
  useSeoMeta({
    title: post ? `${post.title} | AutoSys Blog` : 'AutoSys Blog',
    desc:  post?.excerpt,
    image: post?.featured_image,
    url:   window.location.href,
  });

  // Track view on mount
  useEffect(() => {
    if (post) {
      // In production: blogApi.trackView(slug)
      console.log('View tracked:', slug);
    }
  }, [slug, post]);

  // Table of contents from HTML content
  const headings = useMemo(() =>
    post?.content ? extractHeadings(post.content) : [],
    [post?.content]
  );

  // Inject IDs into rendered content
  const processedContent = useMemo(() =>
    post?.content ? injectHeadingIds(post.content) : '',
    [post?.content]
  );

  // Scroll-based effects: active TOC heading + sticky CTA
  useEffect(() => {
    const handler = () => {
      const scrollY = window.scrollY;

      // Sticky CTA — show after 40% of page scroll
      const docH  = document.documentElement.scrollHeight - window.innerHeight;
      setShowSticky(scrollY > docH * 0.3 && !showStickyX);

      // Active TOC heading
      if (!headings.length) return;
      const ids  = headings.map((h) => h.id);
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) current = id;
      }
      setActiveId(current);
    };

    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [headings, showStickyX]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!post) return null;

  const cat      = DEMO_CATEGORIES.find((c) => c.slug === post.category_slug);
  const related  = DEMO_POSTS.filter((p) => p.slug !== slug && p.category_slug === post.category_slug).slice(0, 3);
  const pageUrl  = window.location.href;

  return (
    <div className="min-h-screen" style={{ background: G.bg }}>
      <BlogNav />

      {/* ── Hero / Featured Image ─────────────────────────────── */}
      <div className="pt-[60px]">
        {post.featured_image && (
          <div className="relative h-[340px] md:h-[460px] overflow-hidden">
            <img src={post.featured_image} alt={post.title}
              className="w-full h-full object-cover" />
            <div className="absolute inset-0"
              style={{ background:'linear-gradient(to bottom, rgba(7,7,11,0) 0%, rgba(7,7,11,0.5) 60%, rgba(7,7,11,1) 100%)' }} />
          </div>
        )}
      </div>

      <div className="max-w-[1200px] mx-auto px-5">
        {/* ── Post header ─────────────────────────────────────── */}
        <div className={`max-w-[760px] mx-auto ${post.featured_image ? '-mt-[120px] relative z-10' : 'pt-16'} mb-10`}>
          {/* Category + meta */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {cat && (
              <span className="text-[11px] font-extrabold px-3 py-[4px] rounded-[6px]"
                style={{ background:`${cat.color}22`, color:cat.color, border:`1px solid ${cat.color}44` }}>
                {cat.name}
              </span>
            )}
            <span className="text-text-muted text-[12.5px]">
              {fmtDate(post.published_at)}
            </span>
            <span className="text-text-muted text-[12.5px]">
              {post.read_time} min read
            </span>
            <span className="text-text-muted text-[12.5px] flex items-center gap-1">
              <Icon name="eye" size={12} color={G.t2} />
              {post.view_count?.toLocaleString()} views
            </span>
          </div>

          {/* Title */}
          <h1 className="font-display text-[clamp(26px,4.5vw,48px)] font-bold leading-[1.15] mb-6 text-text-primary">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="text-[17px] text-text-secondary leading-[1.75] mb-7">
            {post.excerpt}
          </p>

          {/* Author bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-7 border-b border-surface-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-extrabold"
                style={{ background:`rgba(200,151,58,.15)`, color:G.g, border:`2px solid rgba(200,151,58,.3)` }}>
                {post.author_name?.charAt(0)}
              </div>
              <div>
                <p className="text-[14px] font-bold text-text-primary">{post.author_name}</p>
                <p className="text-[12px] text-text-muted">AutoSys Content Team</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={copyLink}
                className="flex items-center gap-2 px-3 py-[6px] rounded-[8px] border text-[12px] font-bold transition-all"
                style={{ background:'rgba(200,151,58,.08)', color:G.g, borderColor:'rgba(200,151,58,.25)' }}>
                <Icon name="copy" size={13} color={G.g} />
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Main layout: content + sidebar ───────────────────── */}
        <div className="flex flex-col lg:flex-row gap-10 max-w-[1200px] mx-auto mb-16">

          {/* ── Article content ──────────────────────────────── */}
          <article className="flex-1 min-w-0 max-w-[760px] mx-auto lg:mx-0" ref={contentRef}>

            {/* Inject inline CTA after ~40% of content */}
            <div
              className="blog-content prose-autosys"
              dangerouslySetInnerHTML={{ __html: processedContent.replace(
                // Inject CTA after the 2nd </h2>
                /((?:.*?<\/h2>.*?){2})<h2/s,
                `$1<!-- CTA_PLACEHOLDER --><h2`
              ).replace('<!-- CTA_PLACEHOLDER -->', '') }}
            />

            {/* Inline CTA (always rendered after content) */}
            <InlineCta slug={slug} />

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-surface-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-text-muted w-full mb-1">Tags:</p>
                {post.tags.map((tag) => (
                  <Link key={tag} to={`/blog?tag=${tag}`}
                    className="text-[11.5px] font-bold px-3 py-[5px] rounded-[6px] transition-colors"
                    style={{ background:`rgba(200,151,58,.1)`, color:G.g, border:`1px solid rgba(200,151,58,.25)` }}>
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Share buttons */}
            <div className="mt-8 pt-8 border-t border-surface-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[2px] mb-4" style={{ color: G.g }}>
                SHARE THIS ARTICLE
              </p>
              <ShareButtons url={pageUrl} title={post.title} />
            </div>

            {/* End CTA */}
            <EndCta slug={slug} />
          </article>

          {/* ── Sidebar ──────────────────────────────────────── */}
          <aside className="w-full lg:w-[280px] shrink-0 space-y-6">
            {/* TOC */}
            <TableOfContents headings={headings} activeId={activeId} />

            {/* Related posts */}
            {related.length > 0 && (
              <div className="rounded-[14px] border border-surface-4 p-5" style={{ background: G.s2 }}>
                <p className="text-[10.5px] font-extrabold uppercase tracking-[2px] mb-4" style={{ color: G.g }}>
                  RELATED ARTICLES
                </p>
                <div className="space-y-3">
                  {related.map((p) => <RelatedCard key={p.id} post={p} />)}
                </div>
              </div>
            )}

            {/* Sidebar CTA */}
            <div className="rounded-[14px] border p-5 text-center"
              style={{ background:'linear-gradient(135deg,rgba(200,151,58,.08),rgba(200,151,58,.03))', borderColor:'rgba(200,151,58,.25)' }}>
              <div className="text-[28px] mb-2">🚗</div>
              <h3 className="font-display text-[16px] font-bold mb-2">Manage Your Dealership Like a Pro</h3>
              <p className="text-text-muted text-[12.5px] mb-4 leading-[1.6]">
                CRM, WhatsApp, pipeline, payments — all in one platform. Free forever plan.
              </p>
              <Button variant="gold" size="sm" className="w-full" as={Link} to="/auth">
                Start Free Trial
              </Button>
            </div>

            {/* All categories */}
            <div className="rounded-[14px] border border-surface-4 p-5" style={{ background: G.s2 }}>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[2px] mb-4" style={{ color: G.g }}>
                CATEGORIES
              </p>
              <div className="space-y-1">
                {DEMO_CATEGORIES.map((c) => (
                  <Link key={c.slug} to={`/blog?cat=${c.slug}`}
                    className="flex items-center justify-between py-[6px] px-2 -mx-2 rounded-[6px] hover:bg-surface-3 transition-colors group">
                    <span className="text-[13px] font-semibold text-text-secondary group-hover:text-text-primary transition-colors">
                      {c.name}
                    </span>
                    <span className="text-[11px] font-bold px-[6px] py-[1px] rounded-full"
                      style={{ background:`${c.color}18`, color:c.color }}>
                      {c.post_count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Sticky bottom CTA ────────────────────────────────── */}
      <StickyCta show={showSticky && !showStickyX} slug={slug} />

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-surface-4 py-8 px-5" style={{ background: G.s1 }}>
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size={20} />
          <div className="flex gap-5 text-[12.5px] text-text-muted">
            <Link to="/"     className="hover:text-gold transition-colors">Home</Link>
            <Link to="/blog" className="hover:text-gold transition-colors">Blog</Link>
            <Link to="/auth" className="hover:text-gold transition-colors">Get Started</Link>
            <a href="#"      className="hover:text-gold transition-colors">Privacy</a>
          </div>
          <p className="text-text-muted text-[12px]">© {new Date().getFullYear()} AutoSys</p>
        </div>
      </footer>

      {/* ── Blog content CSS ─────────────────────────────────── */}
      <style>{`
        .blog-content h2 {
          font-family: 'Domine', serif;
          font-size: clamp(20px, 3vw, 28px);
          font-weight: 700;
          color: #F0EDE2;
          margin: 2.2em 0 0.8em;
          padding-bottom: 0.4em;
          border-bottom: 1px solid rgba(200,151,58,.2);
          scroll-margin-top: 80px;
        }
        .blog-content h3 {
          font-family: 'Domine', serif;
          font-size: clamp(17px, 2.5vw, 22px);
          font-weight: 700;
          color: #E2B96A;
          margin: 1.8em 0 0.6em;
          scroll-margin-top: 80px;
        }
        .blog-content p {
          font-size: 16px;
          line-height: 1.85;
          color: #8A8680;
          margin: 0 0 1.3em;
        }
        .blog-content strong {
          color: #F0EDE2;
          font-weight: 700;
        }
        .blog-content ul, .blog-content ol {
          margin: 1em 0 1.5em 1.5em;
          color: #8A8680;
          font-size: 16px;
          line-height: 1.8;
        }
        .blog-content li {
          margin-bottom: 0.5em;
        }
        .blog-content blockquote {
          border-left: 3px solid #C8973A;
          margin: 1.8em 0;
          padding: 1em 1.5em;
          border-radius: 0 12px 12px 0;
          background: rgba(200,151,58,.06);
          font-style: italic;
          color: #E2B96A;
          font-size: 15.5px;
          line-height: 1.75;
        }
        .blog-content blockquote p { color: #E2B96A; margin: 0; }
        .blog-content a {
          color: #C8973A;
          text-decoration: underline;
          text-decoration-color: rgba(200,151,58,.4);
          text-underline-offset: 3px;
          transition: color 0.15s;
        }
        .blog-content a:hover { color: #E2B96A; }
        .blog-content code {
          font-family: 'JetBrains Mono', monospace;
          background: rgba(200,151,58,.1);
          border: 1px solid rgba(200,151,58,.2);
          border-radius: 5px;
          padding: 2px 6px;
          font-size: 14px;
          color: #E2B96A;
        }
        .blog-content pre {
          background: #0E0E16;
          border: 1px solid #21212E;
          border-radius: 12px;
          padding: 1.2em 1.5em;
          overflow-x: auto;
          margin: 1.5em 0;
        }
        .blog-content pre code {
          background: none;
          border: none;
          padding: 0;
          color: #F0EDE2;
          font-size: 14px;
        }
        .blog-content img {
          width: 100%;
          border-radius: 12px;
          margin: 1.5em 0;
          border: 1px solid #21212E;
        }
      `}</style>
    </div>
  );
}
