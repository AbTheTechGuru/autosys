import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo }   from '@/shared/components/ui/Logo';
import { Button } from '@/shared/components/ui/Button';
import { Icon }   from '@/shared/components/ui/Icon';
import { G }      from '@/shared/utils/tokens';
import { PLANS }  from '@/shared/constants';

const FEATURES = [
  { icon:'car',    color:G.g,        title:'Smart Inventory',      desc:'List vehicles in seconds. Track status, upload photos, bulk import from CSV.' },
  { icon:'globe',  color:G.bl,       title:'Website Builder',      desc:'Build a stunning dealership website in minutes. Custom domain, SEO optimized.' },
  { icon:'phone',  color:'#25D366',  title:'CRM & Leads',          desc:'Capture every inquiry from WhatsApp, website, Instagram. Never miss a lead.' },
  { icon:'bars',   color:G.wa,       title:'Sales Pipeline',       desc:'Visual Kanban from Lead to Delivery. Drag-and-drop deals between stages.' },
  { icon:'pay',    color:G.ok,       title:'Payment Processing',   desc:'Accept via Paystack & Flutterwave. Cards, bank transfer, USSD, mobile money.' },
  { icon:'ai',     color:G.pu,       title:'AI-Powered Tools',     desc:'Auto-generate descriptions, smart pricing suggestions, follow-up messages.' },
];

const TESTIMONIALS = [
  { name:'Emeka Okafor',  role:'CEO, Okafor Motors Lagos',   text:'AutoSys transformed our dealership. We went from 8 cars per month to 22. The CRM alone is worth every naira.' },
  { name:'Fatima Aliyu',  role:'Owner, AliyuAuto Abuja',     text:'I used to lose leads constantly. Now AutoSys tracks everything. My revenue tripled in 3 months.' },
  { name:'Biodun Adeyemi',role:'MD, Lagos Premium Cars',     text:'The website builder is incredible. A professional site live in 30 minutes. Customers trust us more now.' },
];

const FAQS = [
  { q:'Is AutoSys free to start?',             a:'Yes! Our Free plan lets you list up to 5 vehicles with no credit card required.' },
  { q:'Which payment gateways are supported?', a:'Paystack (primary) and Flutterwave (fallback), supporting cards, bank transfer, USSD, and mobile money.' },
  { q:'Can I connect my own domain?',          a:'Yes — Pro and Premium plans include custom domain with automatic SSL certificate.' },
  { q:'Is my data secure?',                    a:'Enterprise-grade Row Level Security, encrypted JWTs, and daily backups. 100% isolated from other dealers.' },
  { q:'Is there a free trial for paid plans?', a:'Yes — Pro comes with a 14-day free trial. No credit card needed to start.' },
];

const TICKER_ITEMS = ['✓ Inventory Management','✓ Website Builder','✓ CRM & Leads','✓ Sales Pipeline','✓ Payment Processing','✓ AI Tools','✓ Team Management','✓ Marketing Automation','✓ WhatsApp Integration'];

export function LandingPage() {
  const navigate   = useNavigate();
  const [billing,  setBilling]  = useState('monthly');
  const [openFaq,  setOpenFaq]  = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const goAuth = () => navigate('/auth');

  return (
    <div className="bg-surface-bg overflow-x-hidden">
      {/* Sticky nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-[300] h-[68px] px-6 lg:px-10 flex items-center justify-between transition-[border-color] duration-300"
        style={{ background:'rgba(7,7,11,.9)', backdropFilter:'blur(18px)', borderBottom:`1px solid ${scrolled ? 'rgba(200,151,58,.12)' : 'rgba(200,151,58,.06)'}` }}
      >
        <Logo size={28} />
        <div className="hidden md:flex gap-1">
          {['Features','Pricing','How It Works','FAQ'].map((l) => (
            <Button key={l} variant="ghost" size="sm">{l}</Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={goAuth}>Log In</Button>
          <Button variant="gold"  size="sm" onClick={goAuth}>Start Free Trial</Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-[130px] pb-20 relative grid-bg">
        <div className="gold-mesh" />
        <div className="relative max-w-[820px] animate-slide-up">
          <div
            className="inline-flex items-center gap-2 px-4 py-[5px] rounded-[20px] mb-7 text-[12.5px] font-extrabold"
            style={{ background:'rgba(200,151,58,.1)', border:'1px solid rgba(200,151,58,.22)', color:G.g }}
          >
            <Icon name="sparkle" size={14} color={G.g} />
            Nigeria&apos;s #1 Dealer Operating System
          </div>
          <h1 className="font-display font-bold leading-[1.08] mb-5 tracking-[-0.5px]" style={{ fontSize:'clamp(34px,6vw,72px)' }}>
            Run Your Car Dealership<br />
            <span className="gold-text">Like a Pro with AutoSys</span>
          </h1>
          <p className="text-text-secondary mb-10 max-w-[560px] mx-auto leading-[1.72]" style={{ fontSize:'clamp(15px,2.2vw,19px)' }}>
            All-in-one platform to manage inventory, build your website, capture leads, and process payments — built for Nigerian car dealers.
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

        {/* Social proof numbers */}
        <div className="flex gap-4 mt-20 flex-wrap justify-center relative">
          {[['500+','Dealers Onboarded','🏪'],['₦2.4B','Revenue Processed','💰'],['48K+','Vehicles Sold','🚗'],['4.9/5','Customer Rating','⭐']].map(([n,l,e]) => (
            <div
              key={l}
              className="text-center px-5 py-3 rounded-[13px]"
              style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(200,151,58,.16)', backdropFilter:'blur(10px)' }}
            >
              <div className="text-[22px]">{e}</div>
              <div className="font-display text-[21px] font-bold" style={{ color:G.g }}>{n}</div>
              <div className="text-[11px] text-text-muted">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Ticker */}
      <div className="py-[13px] overflow-hidden border-y border-surface-4" style={{ background:G.s1 }}>
        <div className="flex overflow-hidden">
          <div className="ticker-track">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
              <span key={i} className="text-[13px] font-bold text-text-secondary mr-[60px]">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="py-20 px-6" style={{ background:G.s1 }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase mb-3" style={{ color:G.g }}>Everything You Need</div>
            <h2 className="font-display font-bold" style={{ fontSize:'clamp(26px,4vw,46px)' }}>
              Dominate Your <span className="gold-text">Local Market</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-surface-2 border border-surface-4 rounded-[16px] p-[22px] transition-all duration-300 hover:border-[rgba(200,151,58,.3)] hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,.4)]"
              >
                <div className="w-[44px] h-[44px] rounded-[11px] flex items-center justify-center mb-4 border" style={{ background:`${f.color}18`, borderColor:`${f.color}28` }}>
                  <Icon name={f.icon} size={20} color={f.color} />
                </div>
                <h3 className="font-display text-[18px] font-bold mb-2">{f.title}</h3>
                <p className="text-[13.5px] text-text-secondary leading-[1.65]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-12">
            <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase mb-3" style={{ color:G.g }}>Social Proof</div>
            <h2 className="font-display font-bold" style={{ fontSize:'clamp(26px,4vw,44px)' }}>
              Trusted by <span className="gold-text">500+ Dealers</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px] hover:border-[rgba(200,151,58,.2)] transition-all">
                <div className="flex gap-[3px] mb-3">
                  {Array(5).fill(0).map((_,j) => (
                    <svg key={j} width={13} height={13} viewBox="0 0 24 24" fill={G.g} stroke={G.g} strokeWidth="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                </div>
                <p className="text-text-secondary leading-[1.72] text-[13.5px] mb-4">"{t.text}"</p>
                <div className="flex items-center gap-[9px]">
                  <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center font-extrabold text-[11px]" style={{ background:`linear-gradient(135deg,${G.gd},${G.g})`, color:G.bg }}>
                    {t.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-extrabold text-[13.5px]">{t.name}</div>
                    <div className="text-[11.5px] text-text-muted">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6" style={{ background:G.s1 }}>
        <div className="max-w-[1060px] mx-auto">
          <div className="text-center mb-12">
            <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase mb-3" style={{ color:G.g }}>Pricing</div>
            <h2 className="font-display font-bold mb-5" style={{ fontSize:'clamp(26px,4vw,44px)' }}>
              Simple, <span className="gold-text">Transparent</span> Pricing
            </h2>
            <div className="inline-flex bg-surface-3 rounded-[10px] p-[3px] gap-[2px]">
              {['monthly','yearly'].map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className="px-[13px] py-[6px] rounded-[7px] text-[12.5px] font-bold cursor-pointer border-none font-sans capitalize transition-all"
                  style={{
                    background: billing === b ? G.s2 : 'transparent',
                    color:      billing === b ? G.t0 : G.t1,
                    boxShadow:  billing === b ? '0 1px 4px rgba(0,0,0,.32)' : 'none',
                  }}
                >
                  {b}{b === 'yearly' && <span className="ml-1 text-status-ok text-[10.5px]">−20%</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4 flex-wrap justify-center">
            {Object.entries(PLANS).map(([name, plan]) => {
              const isFeatured = name === 'Pro';
              const price = billing === 'yearly' ? Math.round(plan.price * 0.8) : plan.price;
              return (
                <div
                  key={name}
                  className="flex-1 min-w-[200px] max-w-[330px] rounded-[18px] p-6 border relative transition-all duration-[280ms] hover:-translate-y-1 hover:shadow-[0_18px_52px_rgba(0,0,0,.4)]"
                  style={{
                    background:  isFeatured ? 'linear-gradient(160deg,rgba(200,151,58,.07) 0%,#13131C 55%)' : G.s2,
                    borderColor: isFeatured ? 'rgba(200,151,58,.38)' : G.s4,
                  }}
                >
                  {isFeatured && (
                    <div className="absolute -top-[11px] left-1/2 -translate-x-1/2 text-[9.5px] font-black tracking-[1.5px] px-[14px] py-[3px] rounded-[20px] whitespace-nowrap" style={{ background:`linear-gradient(135deg,${G.g},${G.gd})`, color:G.bg }}>
                      MOST POPULAR
                    </div>
                  )}
                  <div className="font-extrabold text-[12px] uppercase tracking-[1px] mb-2" style={{ color:plan.color }}>
                    {name}
                  </div>
                  <div className="font-display text-[33px] font-bold mb-1">
                    {price === 0 ? 'Free' : `₦${price.toLocaleString()}`}
                    {price > 0 && <span className="text-[14px] text-text-secondary">/mo</span>}
                  </div>
                  <div className="h-[1px] bg-surface-4 my-4" />
                  <div className="flex flex-col gap-[9px] mb-6">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-[13px]">
                        <Icon name="check" size={14} color={plan.color} style={{ flexShrink:0, marginTop:1 }} />
                        {f}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant={isFeatured ? 'gold' : 'ghost'}
                    className="w-full justify-center"
                    onClick={goAuth}
                  >
                    {price === 0 ? 'Get Started' : isFeatured ? 'Start Free Trial' : 'Contact Sales'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-[700px] mx-auto">
          <div className="text-center mb-12">
            <div className="text-[11px] font-extrabold tracking-[2.5px] uppercase mb-3" style={{ color:G.g }}>FAQ</div>
            <h2 className="font-display font-bold" style={{ fontSize:'clamp(24px,3.5vw,40px)' }}>
              Frequently Asked Questions
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {FAQS.map((f, i) => (
              <div
                key={i}
                className="border rounded-[11px] overflow-hidden transition-[border-color] duration-[180ms]"
                style={{ borderColor: openFaq === i ? 'rgba(200,151,58,.28)' : G.s4 }}
              >
                <button
                  className="w-full flex justify-between items-center px-[18px] py-[14px] cursor-pointer bg-transparent border-none text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span className="font-extrabold text-[14px] text-text-primary">{f.q}</span>
                  <Icon
                    name="chev"
                    size={15}
                    color={G.t2}
                    style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition:'transform .2s', flexShrink:0 }}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-[18px] pb-[14px] text-[13.5px] text-text-secondary leading-[1.72]">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center relative grid-bg">
        <div className="gold-mesh" />
        <div className="relative max-w-[680px] mx-auto">
          <h2 className="font-display font-bold leading-[1.1] mb-4" style={{ fontSize:'clamp(28px,5vw,58px)' }}>
            Start Selling More Cars <span className="gold-text">Today</span>
          </h2>
          <p className="text-text-secondary text-[17px] mb-9 leading-[1.6]">
            Join 500+ Nigerian dealers already growing with AutoSys
          </p>
          <Button variant="gold" size="lg" onClick={goAuth} style={{ animation:'glow 3s ease infinite' }}>
            <Icon name="zap" size={16} />Get Started Free
          </Button>
          <p className="mt-4 text-[12.5px] text-text-muted">
            No credit card · Cancel anytime · Nigerian servers 🇳🇬
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-9 border-t border-surface-4 text-center" style={{ background:G.s1 }}>
        <div className="flex justify-center"><Logo size={22} /></div>
        <p className="mt-4 text-[12.5px] text-text-muted">
          © 2025 AutoSys Dealer OS. Built for Nigerian car dealers.
        </p>
        <div className="mt-3 flex gap-[18px] justify-center">
          {['Privacy','Terms','Support','Contact'].map((l) => (
            <a key={l} href="#" className="text-[12.5px] text-text-muted no-underline hover:text-text-primary transition-colors">{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
