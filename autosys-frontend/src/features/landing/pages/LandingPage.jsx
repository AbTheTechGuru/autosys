import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Logo }   from '@/shared/components/ui/Logo';
import { Button } from '@/shared/components/ui/Button';
import { Icon }   from '@/shared/components/ui/Icon';
import { G }      from '@/shared/utils/tokens';
import { PLANS }  from '@/shared/constants';
import { DEMO_POSTS, DEMO_CATEGORIES } from '@/store/blogStore';

/* ── Static data ────────────────────────────────────────────── */
const FEATURES = [
  { icon:'car',    color:G.g,        title:'Smart Inventory',      desc:'List vehicles in seconds. Track status, upload photos, bulk import from CSV.' },
  { icon:'globe',  color:G.bl,       title:'Website Builder',      desc:'Build a stunning dealership website in minutes. Custom domain, SEO optimized.' },
  { icon:'phone',  color:'#25D366',  title:'CRM & Leads',          desc:'Capture every inquiry from WhatsApp, website, Instagram. Never miss a lead.' },
  { icon:'bars',   color:G.wa,       title:'Sales Pipeline',       desc:'Visual Kanban from Lead to Delivery. Drag-and-drop deals between stages.' },
  { icon:'pay',    color:G.ok,       title:'Payment Processing',   desc:'Accept via Paystack & Flutterwave. Cards, bank transfer, USSD, mobile money.' },
  { icon:'zap',    color:G.pu,       title:'Automation Engine',    desc:'Auto-reply leads, send follow-ups, move deals — all on autopilot.' },
];

const TESTIMONIALS = [
  { name:'Emeka Okafor',  role:'CEO, Okafor Motors Lagos',    text:'AutoSys transformed our dealership. We went from 8 cars per month to 22. The CRM alone is worth every naira.',  stars:5 },
  { name:'Fatima Aliyu',  role:'Owner, AliyuAuto Abuja',      text:'I used to lose leads constantly. Now AutoSys tracks everything. My revenue tripled in 3 months.',              stars:5 },
  { name:'Biodun Adeyemi',role:'MD, Lagos Premium Cars',      text:'The website builder is incredible. A professional site live in 30 minutes. Customers trust us more now.',       stars:5 },
];

const FAQS = [
  { q:'Is AutoSys free to start?',             a:'Yes! Our Free plan lets you list up to 5 vehicles with no credit card required.' },
  { q:'Which payment gateways are supported?', a:'Paystack (primary) and Flutterwave (fallback), supporting cards, bank transfer, USSD, and mobile money.' },
  { q:'Can I connect my own domain?',          a:'Yes — Pro and Premium plans include custom domain with automatic SSL certificate.' },
  { q:'Is my data secure?',                    a:'Enterprise-grade Row Level Security, encrypted JWTs, and daily backups. 100% isolated from other dealers.' },
  { q:'Is there a free trial for paid plans?', a:'Yes — Pro comes with a 14-day free trial. No credit card needed to start.' },
];

const TICKER_ITEMS = ['✓ Inventory Management','✓ Website Builder','✓ CRM & Leads','✓ Sales Pipeline','✓ Payment Processing','✓ AI Tools','✓ Team Management','✓ Marketing Automation','✓ WhatsApp Integration','✓ Automation Engine','✓ Blog & SEO Tools'];

/* ── Helpers ────────────────────────────────────────────────── */
const fmtDate = (d) => new Date(d).toLocaleDateString('en-NG', { month:'short', day:'numeric', year:'numeric' });

function BlogCard({ post }) {
  const catColor = DEMO_CATEGORIES.find((c) => c.slug === post.category_slug)?.color || G.g;
  const catName  = DEMO_CATEGORIES.find((c) => c.slug === post.category_slug)?.name  || post.category_slug;

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-[16px] border border-surface-4 bg-surface-2 hover:border-[rgba(200,151,58,.35)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_12px_40px_rgba(0,0,0,.5)]"
    >
      {/* Image */}
      <div className="relative overflow-hidden h-[200px] bg-surface-3">
        {post.featured_image ? (
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="note" size={32} color={G.t2} />
          </div>
        )}
        {/* Category pill */}
        <span
          className="absolute top-3 left-3 text-[10.5px] font-extrabold px-[8px] py-[3px] rounded-[6px]"
          style={{ background:`${catColor}22`, color:catColor, border:`1px solid ${catColor}44`, backdropFilter:'blur(8px)' }}
        >
          {catName}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-display text-[15px] font-bold text-text-primary leading-[1.4] mb-2 group-hover:text-[#C8973A] transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-[12.5px] text-text-secondary leading-[1.6] line-clamp-2 flex-1 mb-4">
          {post.excerpt}
        </p>
        {/* Meta */}
        <div className="flex items-center gap-2 pt-3 border-t border-surface-4">
          <div className="w-6 h-6 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-extrabold" style={{ color:G.g }}>
              {post.author_name?.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-text-primary truncate">{post.author_name}</p>
          </div>
          <div className="flex items-center gap-1 text-[10.5px] text-text-muted shrink-0">
            <Icon name="eye" size={11} color={G.t2} />
            <span>{post.read_time} min</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Main Landing Page ──────────────────────────────────────── */
export function LandingPage() {
  const navigate   = useNavigate();
  const [billing,  setBilling]  = useState('monthly');
  const [openFaq,  setOpenFaq]  = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const goAuth = (e) => { e?.preventDefault(); navigate('/auth'); };
  const featuredBlogPosts = DEMO_POSTS.filter((p) => p.featured).slice(0, 3);

  return (
    <div className="bg-surface-bg overflow-x-hidden">

      {/* ── Sticky Nav ──────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-[300] h-[68px] px-6 lg:px-10 flex items-center justify-between transition-[border-color,background] duration-300"
        style={{
          background: scrolled ? 'rgba(7,7,11,.96)' : 'rgba(7,7,11,.7)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${scrolled ? 'rgba(200,151,58,.18)' : 'rgba(200,151,58,.06)'}`,
        }}
      >
        <Logo size={28} />
        <div className="hidden md:flex gap-1">
          {[['Features','#features'],['Pricing','#pricing'],['Blog','/blog'],['FAQ','#faq']].map(([l,h]) => (
            h.startsWith('#')
              ? <Button key={l} variant="ghost" size="sm" as="a" href={h}>{l}</Button>
              : <Button key={l} variant="ghost" size="sm" as={Link} to={h}>{l}</Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={goAuth}>Log In</Button>
          <Button variant="gold"  size="sm" onClick={goAuth}>Start Free Trial</Button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-[130px] pb-20 relative grid-bg">
        <div className="gold-mesh" />
        <div className="relative max-w-[840px] animate-slide-up">
          <div
            className="inline-flex items-center gap-2 px-4 py-[5px] rounded-[20px] mb-7 text-[12.5px] font-extrabold"
            style={{ background:'rgba(200,151,58,.1)', border:'1px solid rgba(200,151,58,.22)', color:G.g }}
          >
            <Icon name="sparkle" size={14} color={G.g} />
            Nigeria's #1 Dealer Operating System · Now Global
          </div>
          <h1 className="font-display font-bold leading-[1.08] mb-5 tracking-[-0.5px]" style={{ fontSize:'clamp(34px,6vw,72px)' }}>
            Run Your Car Dealership<br />
            <span className="gold-text">Like a Pro with AutoSys</span>
          </h1>
          <p className="text-text-secondary mb-10 max-w-[580px] mx-auto leading-[1.72]" style={{ fontSize:'clamp(15px,2.2vw,19px)' }}>
            All-in-one platform to manage inventory, build your website, capture leads, automate follow-ups, and process payments — built for car dealers worldwide.
          </p>
          <div className="flex gap-4 justify-center flex-wrap mb-4">
            <Button variant="gold" size="lg" onClick={goAuth} style={{ animation:'glow 3s ease infinite' }}>
              <Icon name="zap" size={16} />Start Free Trial
            </Button>
            <Button variant="ghost" size="lg" onClick={goAuth}>
              <Icon name="eye" size={16} />Live Demo →
            </Button>
          </div>
          <p className="text-text-muted text-[12.5px]">No credit card · Free forever plan · Setup in 5 minutes</p>
        </div>

        {/* Social proof */}
        <div className="flex gap-4 mt-20 flex-wrap justify-center relative">
          {[['500+','Dealers Onboarded','🏪'],['₦2.4B','Revenue Processed','💰'],['48K+','Vehicles Sold','🚗'],['4.9/5','Customer Rating','⭐']].map(([n,l,e]) => (
            <div key={l} className="text-center px-5 py-3 rounded-[13px]"
              style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(200,151,58,.16)', backdropFilter:'blur(10px)' }}>
              <div className="text-[22px]">{e}</div>
              <div className="font-display text-[21px] font-bold" style={{ color:G.g }}>{n}</div>
              <div className="text-[11px] text-text-muted">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Ticker ──────────────────────────────────────────────── */}
      <div className="py-[13px] overflow-hidden border-y border-surface-4" style={{ background:G.s1 }}>
        <div className="flex overflow-hidden">
          <div className="ticker-track">
            {[...TICKER_ITEMS,...TICKER_ITEMS].map((t,i) => (
              <span key={i} className="text-[13px] font-bold text-text-secondary mr-[60px]">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="py-[90px] px-6 max-w-[1200px] mx-auto">
        <div className="text-center mb-[60px]">
          <div className="text-[11px] font-extrabold uppercase tracking-[2px] mb-3" style={{ color:G.g }}>PLATFORM FEATURES</div>
          <h2 className="font-display text-[clamp(26px,4vw,44px)] font-bold mb-4">Everything Your Dealership Needs</h2>
          <p className="text-text-secondary max-w-[520px] mx-auto text-[16px]">One platform. Every tool. Built specifically for car dealers who want to grow fast.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title}
              className="bg-surface-2 border border-surface-4 rounded-[16px] p-6 hover:border-[rgba(200,151,58,.3)] hover:-translate-y-[2px] transition-all duration-200 group">
              <div className="w-10 h-10 rounded-[11px] flex items-center justify-center mb-4"
                style={{ background:`${f.color}18`, border:`1px solid ${f.color}30` }}>
                <Icon name={f.icon} size={20} color={f.color} />
              </div>
              <h3 className="font-display text-[17px] font-bold mb-2 group-hover:text-gold transition-colors">{f.title}</h3>
              <p className="text-text-secondary text-[13.5px] leading-[1.65]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────── */}
      <section className="py-[80px] px-6" style={{ background:G.s1 }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-[50px]">
            <div className="text-[11px] font-extrabold uppercase tracking-[2px] mb-3" style={{ color:G.g }}>REAL DEALERS · REAL RESULTS</div>
            <h2 className="font-display text-[clamp(24px,4vw,40px)] font-bold">Trusted by 500+ Dealerships</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-surface-2 border border-surface-4 rounded-[16px] p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Icon key={i} name="star" size={14} color="#F59E0B" />
                  ))}
                </div>
                <p className="text-text-secondary text-[14px] leading-[1.7] mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-surface-4">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-extrabold"
                    style={{ background:`rgba(200,151,58,.15)`, color:G.g, border:`1px solid rgba(200,151,58,.25)` }}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold">{t.name}</p>
                    <p className="text-[11px] text-text-muted">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section id="pricing" className="py-[90px] px-6 max-w-[1100px] mx-auto">
        <div className="text-center mb-[50px]">
          <div className="text-[11px] font-extrabold uppercase tracking-[2px] mb-3" style={{ color:G.g }}>SIMPLE PRICING</div>
          <h2 className="font-display text-[clamp(26px,4vw,44px)] font-bold mb-3">Start Free. Scale When Ready.</h2>
          <p className="text-text-secondary text-[16px] mb-6">No hidden fees. Cancel any time. 14-day money-back guarantee.</p>
          <div className="inline-flex rounded-[10px] p-1 gap-1" style={{ background:G.s2, border:`1px solid ${G.s4}` }}>
            {['monthly','yearly'].map((b) => (
              <button key={b} onClick={() => setBilling(b)}
                className="px-4 py-[6px] rounded-[8px] text-[12.5px] font-extrabold capitalize transition-all"
                style={billing===b ? { background:G.g, color:G.bg } : { color:G.t1 }}>
                {b} {b==='yearly' && <span className="ml-1 text-[10px] text-green-400">-20%</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(PLANS||[]).map((plan, idx) => (
            <div key={plan.name}
              className={`rounded-[18px] p-6 border transition-all ${idx===1 ? 'border-[rgba(200,151,58,.5)] shadow-[0_0_40px_rgba(200,151,58,.12)]' : 'border-surface-4'}`}
              style={{ background: idx===1 ? 'rgba(200,151,58,.04)' : G.s2 }}>
              {idx===1 && (
                <div className="text-[10px] font-extrabold uppercase tracking-[2px] px-3 py-1 rounded-full mb-4 inline-block"
                  style={{ background:`rgba(200,151,58,.15)`, color:G.g }}>Most Popular</div>
              )}
              <h3 className="font-display text-[20px] font-bold mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="font-display text-[38px] font-bold" style={{ color:idx===1 ? G.g : G.t0 }}>
                  {billing==='yearly' ? plan.yearlyPrice : plan.monthlyPrice}
                </span>
                <span className="text-text-muted text-[13px]">/mo</span>
              </div>
              <ul className="space-y-2 mb-6">
                {(plan.features||[]).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-text-secondary">
                    <Icon name="check" size={13} color={G.ok} className="shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <Button variant={idx===1 ? 'gold' : 'ghost'} className="w-full" onClick={goAuth}>
                {plan.cta || 'Get Started'}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 🔥 FROM OUR BLOG — Key section                          */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="py-[90px] px-6" style={{ background:G.s1 }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-[48px]">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[2px] mb-3" style={{ color:G.g }}>
                INSIGHTS & GROWTH
              </div>
              <h2 className="font-display text-[clamp(26px,4vw,42px)] font-bold mb-2">
                From Our Blog
              </h2>
              <p className="text-text-secondary text-[15px] max-w-[440px]">
                Proven strategies, case studies, and expert insights to help you close more deals.
              </p>
            </div>
            <Button variant="ghost" as={Link} to="/blog" className="shrink-0">
              View All Articles →
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredBlogPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>

          {/* Email capture CTA */}
          <div className="mt-14 rounded-[20px] p-8 md:p-10 text-center border"
            style={{ background:'linear-gradient(135deg,rgba(200,151,58,.06),rgba(200,151,58,.02))', borderColor:'rgba(200,151,58,.2)' }}>
            <div className="text-[22px] mb-1">📧</div>
            <h3 className="font-display text-[22px] font-bold mb-2">Get Weekly Dealership Insights</h3>
            <p className="text-text-secondary text-[14px] mb-6 max-w-[420px] mx-auto">
              Join 2,400+ Nigerian car dealers getting our weekly tips on sales, marketing, and growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-[420px] mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-surface-2 border border-surface-4 rounded-[9px] px-4 py-2.5 text-[13.5px] text-text-primary outline-none focus:border-[rgba(200,151,58,.5)] transition-colors"
              />
              <Button variant="gold" size="md">Subscribe Free</Button>
            </div>
            <p className="text-text-muted text-[11px] mt-3">No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section id="faq" className="py-[80px] px-6 max-w-[760px] mx-auto">
        <div className="text-center mb-[50px]">
          <div className="text-[11px] font-extrabold uppercase tracking-[2px] mb-3" style={{ color:G.g }}>FAQ</div>
          <h2 className="font-display text-[clamp(24px,4vw,40px)] font-bold">Common Questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-surface-4 rounded-[14px] overflow-hidden"
              style={{ background:openFaq===i ? 'rgba(200,151,58,.04)' : G.s2, borderColor: openFaq===i ? 'rgba(200,151,58,.3)' : undefined }}>
              <button className="w-full flex items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpenFaq(openFaq===i ? null : i)}>
                <span className="font-semibold text-[14.5px] text-text-primary">{faq.q}</span>
                <Icon name={openFaq===i ? 'x' : 'plus'} size={16} color={G.g} className="shrink-0 ml-4" />
              </button>
              {openFaq===i && (
                <div className="px-5 pb-5 text-[13.5px] text-text-secondary leading-[1.7]">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <section className="py-[90px] px-6 text-center relative overflow-hidden">
        <div className="gold-mesh opacity-40" />
        <div className="relative max-w-[640px] mx-auto">
          <h2 className="font-display text-[clamp(28px,5vw,52px)] font-bold mb-4">
            Ready to Transform<br /><span className="gold-text">Your Dealership?</span>
          </h2>
          <p className="text-text-secondary text-[16px] mb-8">Join 500+ dealers already scaling with AutoSys. Your first month is completely free.</p>
          <Button variant="gold" size="lg" onClick={goAuth} style={{ fontSize:'16px', padding:'14px 36px' }}>
            <Icon name="zap" size={18} />Start Your Free Trial →
          </Button>
          <p className="text-text-muted text-[12px] mt-4">No credit card · Cancel anytime · Setup in 5 minutes</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-surface-4 py-10 px-6" style={{ background:G.s1 }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div className="max-w-[260px]">
              <Logo size={24} />
              <p className="text-text-muted text-[12.5px] mt-3 leading-[1.7]">
                The all-in-one operating system for modern car dealerships. Built for speed, scale, and growth.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-[13px]">
              {[
                ['Product',  ['Features', 'Pricing', 'Changelog', 'API Docs']],
                ['Blog',     ['Sales & CRM', 'Marketing', 'Inventory', 'Technology']],
                ['Company',  ['About', 'Careers', 'Press', 'Contact']],
                ['Legal',    ['Privacy Policy', 'Terms of Use', 'Cookie Policy', 'GDPR']],
              ].map(([title, links]) => (
                <div key={title}>
                  <p className="font-extrabold text-[11px] uppercase tracking-[1.5px] mb-3" style={{ color:G.g }}>{title}</p>
                  <ul className="space-y-2">
                    {links.map((l) => (
                      <li key={l}>
                        {l === 'Sales & CRM' || l === 'Marketing' || l === 'Inventory' || l === 'Technology' ? (
                          <Link to="/blog" className="text-text-muted hover:text-text-primary transition-colors">{l}</Link>
                        ) : (
                          <a href="#" className="text-text-muted hover:text-text-primary transition-colors">{l}</a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-surface-4 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-text-muted text-[12px]">© {new Date().getFullYear()} AutoSys. All rights reserved.</p>
            <div className="flex gap-4 text-[12px] text-text-muted">
              <Link to="/blog" className="hover:text-gold transition-colors">Blog</Link>
              <a href="#" className="hover:text-gold transition-colors">Privacy</a>
              <a href="#" className="hover:text-gold transition-colors">Terms</a>
              <a href="#" className="hover:text-gold transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
