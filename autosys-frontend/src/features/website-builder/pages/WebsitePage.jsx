import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input, Field } from '@/shared/components/ui/Input';
import { Icon }   from '@/shared/components/ui/Icon';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useSalesStore } from '@/store/salesStore';
import { fmtM } from '@/shared/utils/format';
import { G }    from '@/shared/utils/tokens';
import client from '@/services/api/client';

const DEFAULT_CONFIG = {
  hero_headline:   'Find Your Perfect Car in Lagos',
  hero_subtext:    'Premium vehicles at unbeatable prices.',
  hero_cta:        'Browse Inventory',
  meta_title:      '',
  meta_description:'',
  custom_domain:   '',
  show_prices:     true,
  theme:           'dark',
};

export function WebsitePage() {
  const toast    = useToast();
  const { dealer } = useAuth();
  const vehicles = useSalesStore((s) => s.vehicles);

  const [config,     setConfig]     = useState(DEFAULT_CONFIG);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving,   setIsSaving]   = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const subdomain = dealer?.subdomain ?? 'your-dealership';

  /* ── Load website config from backend ─────────────────── */
  const fetchConfig = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data } = await client.get('/websites/config');
      setConfig({ ...DEFAULT_CONFIG, ...data.config });
    } catch {
      // Backend not reachable — use defaults silently
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  /* ── Save config ───────────────────────────────────────── */
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await client.put('/websites/config', {
        hero_headline:    config.hero_headline,
        hero_subtext:     config.hero_subtext,
        hero_cta:         config.hero_cta,
        meta_title:       config.meta_title,
        meta_description: config.meta_description,
        custom_domain:    config.custom_domain,
        show_prices:      config.show_prices,
        theme:            config.theme,
      });
      toast('Website settings saved!');
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Publish ───────────────────────────────────────────── */
  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await handleSave(); // Save first
      await client.post('/websites/publish');
      toast('Website published! 🎉');
    } catch (err) {
      toast(err.response?.data?.message || 'Publish failed', 'danger');
    } finally {
      setIsPublishing(false);
    }
  };

  const setField = (k) => (e) =>
    setConfig((c) => ({ ...c, [k]: e.target.value }));

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Website Builder</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {subdomain}.autosys.app · <span className="text-status-ok">● Live</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm"
            onClick={() => window.open(`https://${subdomain}.autosys.app`, '_blank')}>
            <Icon name="eye" size={13} />Preview
          </Button>
          <Button variant="gold" size="sm" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? <><Spinner size={13} />Publishing…</> : <><Icon name="globe" size={13} />Publish</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Left panel: controls */}
        <div className="flex flex-col gap-4">
          {/* Hero section */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
            <div className="font-display text-[16px] font-bold mb-4">Hero Section</div>
            {[
              ['Headline', 'hero_headline', 'textarea'],
              ['Subtext',  'hero_subtext',  'textarea'],
              ['CTA Button','hero_cta',     'input'   ],
            ].map(([l, k, type]) => (
              <Field key={k} label={l} className="mb-3">
                {type === 'textarea' ? (
                  <textarea
                    className="w-full bg-surface-3 border border-surface-4 rounded-[9px] px-[13px] py-[9px] text-text-primary font-sans text-[12.5px] font-semibold outline-none focus:border-gold transition-colors placeholder:text-text-muted resize-none"
                    rows={2}
                    value={config[k] ?? ''}
                    onChange={setField(k)}
                  />
                ) : (
                  <Input value={config[k] ?? ''} onChange={setField(k)} className="text-[12.5px]" />
                )}
              </Field>
            ))}
          </div>

          {/* SEO */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
            <div className="font-display text-[16px] font-bold mb-4">SEO</div>
            <Field label="Meta Title" className="mb-3">
              <Input
                value={config.meta_title}
                onChange={setField('meta_title')}
                placeholder={`${dealer?.name ?? 'Your Dealership'} – Premium Cars`}
                className="text-[12.5px]"
              />
            </Field>
            <Field label="Meta Description" className="mb-3">
              <Input
                value={config.meta_description}
                onChange={setField('meta_description')}
                placeholder="Premium vehicles at unbeatable prices…"
                className="text-[12.5px]"
              />
            </Field>
            <Field label="Custom Domain">
              <Input
                value={config.custom_domain}
                onChange={setField('custom_domain')}
                placeholder="yourdomain.com"
                className="text-[12.5px]"
              />
            </Field>
          </div>

          {/* Performance — TODO: connect analytics */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
            <div className="font-display text-[16px] font-bold mb-3">Performance</div>
            {/* TODO: Connect to backend endpoint when available */}
            {/* Expected endpoint: GET /websites/analytics */}
            {/* Expected response: { page_views, unique_visitors, bounce_rate } */}
            {[['Page Speed','94/100',G.ok],['SEO Score','88/100',G.g],['Mobile','96/100',G.ok]].map(([l,v,c]) => (
              <div key={l} className="flex justify-between items-center py-[8px] border-b border-surface-4 last:border-0">
                <span className="text-[12.5px] text-text-secondary">{l}</span>
                <span className="font-extrabold text-[13px]" style={{ color:c }}>{v}</span>
              </div>
            ))}
            <p className="text-[10px] text-text-muted mt-2">Connect Google Analytics in Settings → Integrations for live data.</p>
          </div>

          {/* Save button */}
          <Button variant="gold" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Spinner size={13} />Saving…</> : <><Icon name="check" size={13} />Save Changes</>}
          </Button>
        </div>

        {/* Right: live preview */}
        <div>
          {/* Browser chrome */}
          <div className="bg-surface-3 rounded-[10px] px-[13px] py-[9px] mb-[10px] flex items-center gap-2 border border-surface-4">
            {['#FF5F57','#FEBC2E','#28C840'].map((c,i) => (
              <div key={i} className="w-[10px] h-[10px] rounded-full" style={{ background:c }} />
            ))}
            <div className="flex-1 bg-surface-4 rounded-[5px] px-[10px] py-[4px] text-[12px] text-text-secondary font-mono">
              {subdomain}.autosys.app
            </div>
            <Button variant="gold" size="xs" onClick={handlePublish} disabled={isPublishing}>
              <Icon name="globe" size={12} />Publish
            </Button>
          </div>

          {/* Rendered preview */}
          <div className="rounded-[12px] overflow-hidden shadow-[0_16px_60px_rgba(0,0,0,.55)]" style={{ background:'#07070B' }}>
            {/* Hero */}
            <div className="px-9 py-12 text-center" style={{ background:'linear-gradient(135deg,#07070B,#1a1a2e)' }}>
              <div className="inline-block mb-4 px-[14px] py-[4px] rounded-[20px] text-[11px] font-extrabold uppercase tracking-[2px]"
                style={{ background:'rgba(200,151,58,.22)', color:G.g }}>
                Premium Car Dealership · Lagos
              </div>
              <h2 className="font-display font-bold mb-4 leading-[1.15]" style={{ fontSize:34, color:'#F0EDE2' }}>
                {config.hero_headline || 'Find Your Perfect Car'}
              </h2>
              <p className="mb-6 max-w-[480px] mx-auto" style={{ fontSize:14, color:'#8A8680', lineHeight:1.7 }}>
                {config.hero_subtext || 'Premium vehicles at unbeatable prices.'}
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <button className="font-extrabold font-sans rounded-[9px] border-none cursor-pointer px-6 py-3"
                  style={{ background:`linear-gradient(135deg,${G.gl},${G.g})`, color:'#07070B', fontSize:13 }}>
                  {config.hero_cta || 'Browse Inventory'}
                </button>
                <button className="font-bold font-sans rounded-[9px] cursor-pointer px-6 py-3"
                  style={{ background:'transparent', color:'#F0EDE2', border:'1px solid rgba(240,237,226,.2)', fontSize:13 }}>
                  WhatsApp Us
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="py-5 px-9 flex justify-around" style={{ background:'#0E0E16' }}>
              {[['48+','Vehicles'],['500+','Customers'],['4.9★','Rating'],['10+','Years']].map(([n,l]) => (
                <div key={l} className="text-center">
                  <div className="font-display text-[22px] font-bold" style={{ color:G.g }}>{n}</div>
                  <div className="text-[11px]" style={{ color:'#8A8680' }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Vehicle grid preview */}
            <div className="px-9 py-7 grid grid-cols-3 gap-3" style={{ background:'#07070B' }}>
              {vehicles.filter((v) => v.status === 'Available').slice(0, 3).map((v) => (
                <div key={v.id} className="rounded-[11px] overflow-hidden border" style={{ background:'#0E0E16', borderColor:'#21212E' }}>
                  <div className="h-[85px] flex items-center justify-center text-[36px]"
                    style={{ background:`linear-gradient(135deg,${v.color}88,${v.color}33)` }}>
                    {v.e}
                  </div>
                  <div className="p-[11px]">
                    <div className="text-[11.5px] font-extrabold truncate" style={{ color:'#F0EDE2' }}>{v.t}</div>
                    {config.show_prices && (
                      <div className="text-[14px] font-extrabold mt-[2px]" style={{ color:G.g }}>{fmtM(v.price)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
