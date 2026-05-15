import { useState, useEffect, useCallback } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Input, Field } from '@/shared/components/ui/Input';
import { Icon }    from '@/shared/components/ui/Icon';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useSalesStore } from '@/store/salesStore';
import { websiteApi } from '@/services/api';
import { fmtM }   from '@/shared/utils/format';
import { G }      from '@/shared/utils/tokens';
import { useAuthStore } from '@/store/authStore';

const DEFAULT_CONFIG = {
  hero_headline:    'Find Your Perfect Car',
  hero_subtext:     'Premium vehicles at unbeatable prices.',
  hero_cta:         'Browse Inventory',
  meta_title:       '',
  meta_description: '',
  custom_domain:    '',
  show_prices:      true,
  theme:            'dark',
  whatsapp_number:  '',
};

/* ── Subsection wrapper ────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4">
      <div className="font-display text-[15px] font-bold mb-4">{title}</div>
      {children}
    </div>
  );
}

/* ── Live preview ──────────────────────────────────────────── */
function LivePreview({ config, vehicles, dealer }) {
  const subdomain = dealer?.subdomain || 'your-dealership';
  const available = vehicles.filter((v) => v.status === 'Available').slice(0, 3);

  return (
    <div>
      {/* Browser chrome */}
      <div className="bg-surface-3 rounded-[10px] px-[13px] py-[9px] mb-[10px] flex items-center gap-2 border border-surface-4">
        {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => (
          <div key={i} className="w-[10px] h-[10px] rounded-full" style={{ background:c }} />
        ))}
        <div className="flex-1 bg-surface-4 rounded-[5px] px-[10px] py-[4px] text-[12px] text-text-secondary font-mono truncate">
          {config.custom_domain || `${subdomain}.autosys.app`}
        </div>
        {config.is_published && (
          <span className="text-[10px] font-bold text-green-400 flex items-center gap-1">
            <span className="w-[6px] h-[6px] rounded-full bg-green-400 inline-block" />Live
          </span>
        )}
      </div>

      {/* Rendered site preview */}
      <div className="rounded-[12px] overflow-hidden shadow-[0_16px_60px_rgba(0,0,0,.55)]" style={{ background:'#07070B' }}>
        {/* Hero */}
        <div className="px-9 py-12 text-center" style={{ background:'linear-gradient(135deg,#07070B,#1a1a2e)' }}>
          <div
            className="inline-block mb-4 px-[14px] py-[4px] rounded-[20px] text-[11px] font-extrabold uppercase tracking-[2px]"
            style={{ background:'rgba(200,151,58,.22)', color:G.g }}
          >
            Premium Car Dealership
          </div>
          <h2 className="font-display font-bold mb-4 leading-[1.15]" style={{ fontSize:28, color:'#F0EDE2' }}>
            {config.hero_headline || DEFAULT_CONFIG.hero_headline}
          </h2>
          <p className="mb-6 max-w-[480px] mx-auto" style={{ fontSize:13, color:'#8A8680', lineHeight:1.7 }}>
            {config.hero_subtext || DEFAULT_CONFIG.hero_subtext}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              className="font-extrabold font-sans rounded-[9px] border-none cursor-pointer px-5 py-2.5"
              style={{ background:`linear-gradient(135deg,${G.gl},${G.g})`, color:'#07070B', fontSize:12 }}
            >
              {config.hero_cta || DEFAULT_CONFIG.hero_cta}
            </button>
            {config.whatsapp_number && (
              <button
                className="font-bold font-sans rounded-[9px] cursor-pointer px-5 py-2.5"
                style={{ background:'#25D36622', color:'#25D366', border:'1px solid #25D36644', fontSize:12 }}
              >
                💬 WhatsApp Us
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="py-4 px-9 flex justify-around" style={{ background:'#0E0E16' }}>
          {[['48+','Vehicles'],['500+','Customers'],['4.9★','Rating'],['10+','Years']].map(([n,l]) => (
            <div key={l} className="text-center">
              <div className="font-display text-[18px] font-bold" style={{ color:G.g }}>{n}</div>
              <div className="text-[10px]" style={{ color:'#8A8680' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Inventory preview */}
        <div className="px-6 py-6" style={{ background:'#07070B' }}>
          <p className="text-[11px] font-extrabold uppercase tracking-[2px] mb-4" style={{ color:G.g }}>
            Available Vehicles
          </p>
          {available.length === 0 ? (
            <div className="text-center py-6 text-[12px]" style={{ color:'#8A8680' }}>
              No vehicles yet — add some from Inventory
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {available.map((v) => (
                <div key={v.id} className="rounded-[10px] overflow-hidden border" style={{ background:'#0E0E16', borderColor:'#21212E' }}>
                  <div
                    className="h-[72px] flex items-center justify-center text-[30px]"
                    style={{ background:`linear-gradient(135deg,${v.color}88,${v.color}33)` }}
                  >
                    {v.e}
                  </div>
                  <div className="p-[9px]">
                    <div className="text-[10.5px] font-extrabold truncate" style={{ color:'#F0EDE2' }}>{v.t}</div>
                    {config.show_prices && (
                      <div className="text-[12px] font-extrabold mt-[2px]" style={{ color:G.g }}>{fmtM(v.price)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer strip */}
        <div className="px-6 py-4 text-center text-[10px]" style={{ background:'#0E0E16', color:'#4a4a5a' }}>
          © {new Date().getFullYear()} {dealer?.name || 'Your Dealership'} · Powered by AutoSys
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export function WebsitePage() {
  const toast    = useToast();
  const vehicles = useSalesStore((s) => s.vehicles);
  const dealer   = useAuthStore((s) => s.dealer);

  const [config,     setConfig]     = useState(DEFAULT_CONFIG);
  const [saved,      setSaved]      = useState(DEFAULT_CONFIG);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [analytics,  setAnalytics]  = useState(null);
  const [dirty,      setDirty]      = useState(false);

  /* Fetch saved config on mount */
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, analyticsRes] = await Promise.allSettled([
        websiteApi.getConfig(),
        websiteApi.getAnalytics(),
      ]);
      if (cfgRes.status === 'fulfilled') {
        const c = cfgRes.value.data?.config ?? DEFAULT_CONFIG;
        setConfig(c);
        setSaved(c);
      }
      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data);
      }
    } catch (err) {
      toast('Could not load website config', 'danger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  /* Update a field */
  const setField = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setConfig((c) => ({ ...c, [k]: val }));
    setDirty(true);
  };

  /* Save config */
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await websiteApi.saveConfig({
        hero_headline:    config.hero_headline,
        hero_subtext:     config.hero_subtext,
        hero_cta:         config.hero_cta,
        meta_title:       config.meta_title,
        meta_description: config.meta_description,
        custom_domain:    config.custom_domain,
        show_prices:      config.show_prices,
        whatsapp_number:  config.whatsapp_number,
        theme:            config.theme,
      });
      const updated = data?.config ?? config;
      setConfig(updated);
      setSaved(updated);
      setDirty(false);
      toast('Settings saved!', 'ok');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save', 'danger');
    } finally {
      setSaving(false);
    }
  };

  /* Publish */
  const handlePublish = async () => {
    // Save first if there are unsaved changes
    if (dirty) await handleSave();
    setPublishing(true);
    try {
      const { data } = await websiteApi.publish();
      setConfig((c) => ({ ...c, is_published: true }));
      toast(`Published! 🎉 Live at ${data.subdomain}.autosys.app`, 'ok');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to publish', 'danger');
    } finally {
      setPublishing(false);
    }
  };

  const subdomain = dealer?.subdomain || 'your-dealership';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Website Builder</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px] flex items-center gap-2">
            <span className="font-mono">{config.custom_domain || `${subdomain}.autosys.app`}</span>
            {config.is_published
              ? <span className="text-green-400 font-bold">● Live</span>
              : <span className="text-text-muted font-bold">● Draft</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size={12} /> : <Icon name="check" size={13} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          )}
          <Button
            variant="gold"
            size="sm"
            onClick={handlePublish}
            disabled={publishing || saving}
          >
            {publishing ? <Spinner size={12} /> : <Icon name="globe" size={13} />}
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Left: controls */}
        <div className="flex flex-col gap-4">

          {/* Hero Section */}
          <Section title="Hero Section">
            <Field label="Headline" className="mb-3">
              <textarea
                className="w-full bg-surface-3 border border-surface-4 rounded-[9px] px-[13px] py-[9px] text-text-primary text-[12.5px] font-semibold outline-none focus:border-gold transition-colors resize-none"
                rows={2}
                value={config.hero_headline}
                onChange={setField('hero_headline')}
                placeholder="Find Your Perfect Car"
              />
            </Field>
            <Field label="Subtext" className="mb-3">
              <textarea
                className="w-full bg-surface-3 border border-surface-4 rounded-[9px] px-[13px] py-[9px] text-text-primary text-[12.5px] font-semibold outline-none focus:border-gold transition-colors resize-none"
                rows={2}
                value={config.hero_subtext}
                onChange={setField('hero_subtext')}
                placeholder="Premium vehicles at unbeatable prices."
              />
            </Field>
            <Field label="CTA Button Text" className="mb-3">
              <Input
                value={config.hero_cta}
                onChange={setField('hero_cta')}
                placeholder="Browse Inventory"
              />
            </Field>
            <Field label="WhatsApp Number">
              <Input
                value={config.whatsapp_number || ''}
                onChange={setField('whatsapp_number')}
                placeholder="+2348012345678"
              />
            </Field>
          </Section>

          {/* Display Options */}
          <Section title="Display Options">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[13px] text-text-secondary">Show vehicle prices</span>
              <input
                type="checkbox"
                checked={!!config.show_prices}
                onChange={setField('show_prices')}
                className="w-4 h-4 accent-yellow-500"
              />
            </label>
          </Section>

          {/* SEO */}
          <Section title="SEO">
            <Field label="Meta Title" className="mb-3">
              <Input
                value={config.meta_title || ''}
                onChange={setField('meta_title')}
                placeholder={`${dealer?.name || 'Your Dealership'} – Premium Cars`}
              />
            </Field>
            <Field label="Meta Description">
              <textarea
                className="w-full bg-surface-3 border border-surface-4 rounded-[9px] px-[13px] py-[9px] text-text-primary text-[12.5px] font-semibold outline-none focus:border-gold transition-colors resize-none"
                rows={2}
                value={config.meta_description || ''}
                onChange={setField('meta_description')}
                placeholder="Browse our premium vehicle inventory…"
              />
            </Field>
          </Section>

          {/* Custom Domain */}
          <Section title="Domain">
            <Field label="Custom Domain">
              <Input
                value={config.custom_domain || ''}
                onChange={setField('custom_domain')}
                placeholder="yourdomain.com"
              />
            </Field>
            <p className="text-[10.5px] text-text-muted mt-2">
              Or use your free subdomain:<br />
              <span className="font-mono text-gold">{subdomain}.autosys.app</span>
            </p>
          </Section>

          {/* Analytics */}
          <Section title="Website Analytics">
            {analytics ? (
              <>
                {[
                  ['Page Views',        analytics.page_views       ?? 0],
                  ['Unique Visitors',   analytics.unique_visitors  ?? 0],
                  ['Lead Conversions',  analytics.lead_conversions ?? 0],
                  ['Bounce Rate',       analytics.bounce_rate ? `${analytics.bounce_rate}%` : '—'],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between items-center py-[8px] border-b border-surface-4 last:border-0">
                    <span className="text-[12.5px] text-text-secondary">{l}</span>
                    <span className="font-extrabold text-[13px]" style={{ color:G.g }}>{v}</span>
                  </div>
                ))}
                {analytics.note && (
                  <p className="text-[10.5px] text-text-muted mt-2">{analytics.note}</p>
                )}
              </>
            ) : (
              <p className="text-[12px] text-text-muted">Connect an analytics provider in Settings → Integrations</p>
            )}
          </Section>
        </div>

        {/* Right: live preview */}
        <LivePreview config={config} vehicles={vehicles} dealer={dealer} />
      </div>
    </div>
  );
}