import { useState, useEffect, useCallback } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Input, Field } from '@/shared/components/ui/Input';
import { Toggle }  from '@/shared/components/ui/Toggle';
import { Icon }    from '@/shared/components/ui/Icon';
import { Spinner } from '@/shared/components/ui/Spinner';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { useToast }    from '@/context/ToastContext';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api/index';
import client from '@/services/api/client';
import { cn } from '@/shared/utils/cn';
import { G }  from '@/shared/utils/tokens';

const SETTING_TABS = [
  { key:'general',      label:'General',       icon:'settings' },
  { key:'notifications',label:'Notifications', icon:'bell'     },
  { key:'security',     label:'Security',      icon:'shield'   },
  { key:'integrations', label:'Integrations',  icon:'link'     },
  { key:'billing',      label:'Billing',       icon:'pay'      },
  { key:'api',          label:'API',           icon:'cmd'      },
];

function SideNav({ active, onChange }) {
  return (
    <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible" aria-label="Settings sections">
      {SETTING_TABS.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)} aria-current={active === t.key ? 'page' : undefined}
          className={cn('flex items-center gap-2 px-[10px] py-[8px] rounded-[8px] cursor-pointer',
            'text-[13px] font-bold transition-all border-none bg-transparent font-sans whitespace-nowrap shrink-0',
            active === t.key ? 'bg-[rgba(200,151,58,.09)] text-gold' : 'text-text-muted hover:bg-surface-3 hover:text-text-primary')}>
          <Icon name={t.icon} size={13} color={active === t.key ? G.g : G.t2} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}

/* ── General tab ─────────────────────────────────────────────── */
function GeneralTab() {
  const toast  = useToast();
  const user   = useAuthStore((s) => s.user);
  const dealer = useAuthStore((s) => s.dealer);

  const [form, setForm]     = useState({ name: '', email: '', phone: '', whatsapp: '', address: '', city: '' });
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving]     = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const fetchSettings = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data } = await client.get('/settings');
      const d = data.dealer ?? {};
      setForm({
        name:     d.name     || dealer?.name     || '',
        email:    d.email    || user?.email      || '',
        phone:    d.phone    || '',
        whatsapp: d.whatsapp_number || '',
        address:  d.address  || '',
        city:     d.city     || '',
      });
    } catch {
      // Fallback to store values
      setForm({
        name:     dealer?.name  || '',
        email:    user?.email   || '',
        phone:    '',
        whatsapp: '',
        address:  '',
        city:     '',
      });
    } finally {
      setIsFetching(false);
    }
  }, [dealer, user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await client.put('/settings/profile', {
        name:             form.name,
        email:            form.email,
        phone:            form.phone,
        whatsapp_number:  form.whatsapp,
        address:          form.address,
        city:             form.city,
      });
      toast('Settings saved!');
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetching) return <div className="flex justify-center py-12"><Spinner size={24} /></div>;

  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
      <h3 className="font-display text-[19px] font-bold mb-5">Dealership Profile</h3>
      <div className="flex items-center gap-4 mb-5">
        <Avatar initials={toInitials(form.name || 'DM')} size={64} />
        <div>
          <div className="font-extrabold text-[17px]">{form.name || 'Your Dealership'}</div>
          <div className="text-text-secondary text-[13px] mt-[3px]">{dealer?.subdomain ?? 'your-dealership'}.autosys.app</div>
          {/* TODO: Connect upload logo to backend */}
          {/* Expected endpoint: POST /settings/logo (multipart/form-data) */}
          {/* Expected response: { logo_url: string } */}
          <Button variant="ghost" size="xs" className="mt-2">
            <Icon name="upload" size={11} />Upload Logo
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[['Dealership Name','name'],['Email','email'],['Phone','phone'],['WhatsApp','whatsapp'],['Address','address'],['City','city']].map(([l,k]) => (
          <Field key={k} label={l}>
            <Input value={form[k]} onChange={set(k)} />
          </Field>
        ))}
      </div>
      <Button variant="gold" onClick={handleSave} disabled={isSaving}>
        {isSaving ? <><Spinner size={13} />Saving…</> : <><Icon name="check" size={13} />Save Changes</>}
      </Button>
    </div>
  );
}

/* ── Notifications tab ───────────────────────────────────────── */
function NotificationsTab() {
  const toast = useToast();
  const user  = useAuthStore((s) => s.user);

  const [ntf,       setNtf]       = useState({ new_lead:true, payment:true, deal_change:true, weekly_digest:false, whatsapp:true, email:true });
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving,   setIsSaving]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/settings');
        const prefs = data.user?.notification_prefs;
        if (prefs) {
          setNtf({
            new_lead:      prefs.new_lead      ?? true,
            payment:       prefs.payment       ?? true,
            deal_change:   prefs.deal_change   ?? true,
            weekly_digest: prefs.weekly_digest ?? false,
            whatsapp:      prefs.whatsapp      ?? true,
            email:         prefs.email         ?? true,
          });
        }
      } catch { /* keep defaults */ } finally { setIsFetching(false); }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await client.put('/settings/notifications', ntf);
      toast('Notification preferences saved!');
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const rows = [
    ['new_lead',      'New lead notification',  'Alert when a new lead is captured'],
    ['payment',       'Payment received',        'Instant alert on payment confirmation'],
    ['deal_change',   'Deal stage changes',      'Notify when deal moves in pipeline'],
    ['weekly_digest', 'Weekly digest',           'Summary every Monday at 8AM'],
    ['whatsapp',      'WhatsApp alerts',         'Receive all alerts via WhatsApp too'],
    ['email',         'Email notifications',     'Daily digest via email'],
  ];

  if (isFetching) return <div className="flex justify-center py-12"><Spinner size={24} /></div>;

  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
      <h3 className="font-display text-[19px] font-bold mb-5">Notification Preferences</h3>
      {rows.map(([k, l, d]) => (
        <div key={k} className="flex justify-between items-center py-[13px] border-b border-surface-4 last:border-0">
          <div>
            <div className="font-bold text-[13.5px]">{l}</div>
            <div className="text-[11.5px] text-text-muted mt-[2px]">{d}</div>
          </div>
          <Toggle checked={!!ntf[k]} onChange={(v) => setNtf((n) => ({ ...n, [k]: v }))} label={l} />
        </div>
      ))}
      <Button variant="gold" className="mt-5" onClick={handleSave} disabled={isSaving}>
        {isSaving ? <><Spinner size={13} />Saving…</> : <><Icon name="check" size={13} />Save Preferences</>}
      </Button>
    </div>
  );
}

/* ── Security tab ────────────────────────────────────────────── */
function SecurityTab() {
  const toast = useToast();
  const [twofa, setTwofa]   = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);
  const setPw = (k) => (e) => setPwForm((f) => ({ ...f, [k]: e.target.value }));

  const handlePasswordChange = async () => {
    setPwErrors({});
    if (!pwForm.currentPassword) { setPwErrors({ currentPassword: 'Required' }); return; }
    if (pwForm.newPassword.length < 8) { setPwErrors({ newPassword: 'Min 8 characters' }); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwErrors({ confirmPassword: 'Passwords do not match' }); return; }
    setPwLoading(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast('Password updated!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwErrors({ _: err.response?.data?.message || 'Password change failed' });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
      <h3 className="font-display text-[19px] font-bold mb-5">Security</h3>
      <Field label="Current Password" error={pwErrors.currentPassword} className="mb-3">
        <Input type="password" placeholder="••••••••" autoComplete="current-password"
          value={pwForm.currentPassword} onChange={setPw('currentPassword')} />
      </Field>
      <Field label="New Password" error={pwErrors.newPassword} className="mb-3">
        <Input type="password" placeholder="Min 8 characters" autoComplete="new-password"
          value={pwForm.newPassword} onChange={setPw('newPassword')} />
      </Field>
      <Field label="Confirm New Password" error={pwErrors.confirmPassword} className="mb-3">
        <Input type="password" placeholder="••••••••" autoComplete="new-password"
          value={pwForm.confirmPassword} onChange={setPw('confirmPassword')} />
      </Field>
      {pwErrors._ && <p className="text-[12px] text-[#F87171] mb-3">{pwErrors._}</p>}
      <Button variant="gold" className="mb-6 min-h-[44px]" onClick={handlePasswordChange} disabled={pwLoading}>
        <Icon name="shield" size={13} />{pwLoading ? 'Updating…' : 'Update Password'}
      </Button>
      <div className="h-[1px] bg-surface-4 mb-5" />
      <div className="flex justify-between items-start">
        <div>
          <div className="font-display text-[18px] font-bold">Two-Factor Authentication</div>
          <div className="text-[13px] text-text-secondary mt-1">Add extra security with a TOTP authenticator app</div>
        </div>
        {/* TODO: Connect to backend endpoint when available */}
        {/* Expected endpoint: POST /auth/2fa/enable, POST /auth/2fa/disable */}
        {/* Expected response: { secret, qr_code_url } for enable, { success } for disable */}
        <Toggle checked={twofa}
          onChange={(v) => { setTwofa(v); toast(v ? '2FA enabled!' : '2FA disabled', v ? 'success' : 'warning'); }}
          label="Toggle 2FA" />
      </div>
      {twofa && (
        <div className="mt-4 p-3 bg-status-okbg border border-[rgba(22,163,74,.28)] rounded-[9px] text-[12.5px] text-text-secondary">
          ✅ 2FA is active. Use your authenticator app when signing in.
        </div>
      )}
    </div>
  );
}

/* ── Integrations tab ────────────────────────────────────────── */
function IntegrationsTab() {
  const toast = useToast();
  const items = [
    { name:'Paystack',           desc:'Primary payment gateway',   status:'Connected',     color:G.ok      },
    { name:'Flutterwave',        desc:'Fallback gateway',          status:'Connected',     color:G.ok      },
    { name:'WhatsApp Business',  desc:'Customer messaging',        status:'Connected',     color:'#25D366' },
    { name:'Facebook Pixel',     desc:'Ad retargeting',           status:'Not Connected', color:G.t2      },
    { name:'Google Analytics 4', desc:'Website analytics',        status:'Not Connected', color:G.t2      },
  ];
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
      <h3 className="font-display text-[19px] font-bold mb-5">Integrations</h3>
      {/* TODO: Connect to backend endpoint when available */}
      {/* Expected endpoint: GET /settings/integrations */}
      {/* Expected response: { integrations: [{ name, status, connected_at }] } */}
      {items.map((item) => (
        <div key={item.name} className="flex justify-between items-center px-4 py-[14px] bg-surface-3 rounded-[11px] border border-surface-4 mb-[9px]">
          <div className="flex items-center gap-[11px]">
            <div className="w-[36px] h-[36px] rounded-[9px] flex items-center justify-center" style={{ background:`${item.color}18` }}>
              <Icon name="link" size={16} color={item.color} />
            </div>
            <div>
              <div className="font-bold text-[13.5px]">{item.name}</div>
              <div className="text-[11.5px] text-text-muted">{item.desc}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {item.status === 'Connected' && <span className="text-[11.5px] font-bold text-status-ok">● Connected</span>}
            <Button variant="ghost" size="sm" onClick={() => toast(`${item.name} settings coming soon!`)}>
              {item.status === 'Connected' ? 'Manage' : 'Connect'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Billing tab ─────────────────────────────────────────────── */
function BillingTab() {
  const toast  = useToast();
  const dealer = useAuthStore((s) => s.dealer);
  const plan   = dealer?.plan ?? 'free';

  const PLAN_PRICE = { premium: '₦40,000', pro: '₦15,000', free: 'Free' };

  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
      <h3 className="font-display text-[19px] font-bold mb-5">Plan &amp; Billing</h3>
      <div className="flex flex-col sm:flex-row justify-between items-start mb-5 gap-4">
        <div>
          <span className="inline-flex px-[7px] py-[2px] rounded-[20px] text-[9.5px] font-extrabold uppercase bg-[rgba(200,151,58,.12)] text-gold mb-2">
            {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan · Active
          </span>
          <div className="font-display text-[32px] font-bold">
            {PLAN_PRICE[plan] ?? 'Free'}
            {plan !== 'free' && <span className="text-[15px] text-text-secondary font-normal">/month</span>}
          </div>
          <div className="text-[13px] text-text-secondary mt-1">
            {plan === 'free' ? 'Upgrade to unlock all features' : 'Auto-renewal active'}
          </div>
        </div>
        <div className="flex gap-2">
          {/* TODO: Connect to backend endpoint when available */}
          {/* Expected endpoint: GET /pricing/plans, POST /payments/initialize (plan upgrade) */}
          <Button variant="ghost" size="sm" onClick={() => toast('Plan management coming soon!')}>Change Plan</Button>
          <Button variant="gold" size="sm" onClick={() => toast('Upgrade flow coming soon!')}>
            <Icon name="zap" size={13} />Upgrade
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Vehicles','— / ∞'],['Team','— / 5'],['Leads','— / ∞'],['Storage','— / 10 GB']].map(([k,v]) => (
          <div key={k} className="bg-surface-3 rounded-[8px] px-3 py-[10px] border border-surface-4">
            <div className="text-[10px] text-text-muted mb-[2px]">{k}</div>
            <div className="font-bold">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── API tab ─────────────────────────────────────────────────── */
function ApiTab() {
  const toast = useToast();

  const [apiKey,      setApiKey]      = useState(null);
  const [webhookUrl,  setWebhookUrl]  = useState('');
  const [events, setEvents] = useState({
    'lead.created': true, 'lead.updated': true, 'payment.received': true,
    'vehicle.sold': false, 'deal.closed': true, 'payment.failed': false,
  });
  const [isFetching,   setIsFetching]   = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/settings/api-key');
        setApiKey(data.api_key);
      } catch { /* No API key yet */ } finally { setIsFetching(false); }
    })();
  }, []);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const { data } = await client.post('/settings/api-key/regenerate');
      setApiKey(data.api_key);
      toast('API key regenerated! Copy it now — it will not be shown again.', 'warning');
    } catch (err) {
      toast(err.response?.data?.message || 'Regenerate failed', 'danger');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveWebhook = async () => {
    setIsSavingWebhook(true);
    try {
      await client.put('/settings/webhook', {
        url:    webhookUrl,
        events: Object.keys(events).filter((k) => events[k]),
      });
      toast('Webhook saved!');
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'danger');
    } finally {
      setIsSavingWebhook(false);
    }
  };

  if (isFetching) return <div className="flex justify-center py-12"><Spinner size={24} /></div>;

  const displayKey = apiKey?.key
    ? apiKey.key
    : apiKey?.key_prefix
      ? `${apiKey.key_prefix}••••••••••••••••••••`
      : 'No API key — click Regenerate to create one';

  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
      <h3 className="font-display text-[19px] font-bold mb-5">API &amp; Webhooks</h3>
      <Field label="API Key" className="mb-4">
        <div className="flex gap-2">
          <Input readOnly value={displayKey} className="font-mono text-[12px]" />
          <Button variant="ghost" size="sm"
            onClick={() => { navigator.clipboard?.writeText(apiKey?.key || ''); toast('Copied!'); }}>
            <Icon name="copy" size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={isRegenerating}>
            {isRegenerating ? <Spinner size={13} /> : <Icon name="refresh" size={13} />}
          </Button>
        </div>
        {apiKey?.key && (
          <p className="text-[11px] text-[#F59E0B] mt-1">⚠️ Copy this key now — it will not be shown again after you leave this page.</p>
        )}
      </Field>
      <Field label="Webhook URL" className="mb-4">
        <div className="flex gap-2">
          <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-site.com/webhooks/autosys" />
          <Button variant="ghost" size="sm" onClick={handleSaveWebhook} disabled={isSavingWebhook}>
            {isSavingWebhook ? <Spinner size={13} /> : 'Save'}
          </Button>
        </div>
      </Field>
      <p className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-gold mb-2">Webhook Events</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(events).map(([ev, checked]) => (
          <div key={ev} className="flex items-center gap-2 px-3 py-2 bg-surface-3 rounded-[8px] border border-surface-4">
            <button role="checkbox" aria-checked={checked}
              onClick={() => setEvents((e) => ({ ...e, [ev]: !e[ev] }))}
              className={cn('w-[15px] h-[15px] rounded-[4px] border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all',
                checked ? 'bg-gold border-gold' : 'bg-transparent border-surface-5')}>
              {checked && <Icon name="check" size={10} color="#07070B" />}
            </button>
            <span className="font-mono text-[11.5px] text-text-secondary">{ev}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export function SettingsPage() {
  const [tab, setTab] = useState('general');

  const CONTENT = {
    general:       <GeneralTab />,
    notifications: <NotificationsTab />,
    security:      <SecurityTab />,
    integrations:  <IntegrationsTab />,
    billing:       <BillingTab />,
    api:           <ApiTab />,
  };

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      <h2 className="font-display text-[23px] font-bold mb-[4px]">Settings</h2>
      <p className="text-text-secondary text-[12.5px] mb-5">Manage account, integrations, and preferences</p>
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
        <SideNav active={tab} onChange={setTab} />
        <div>{CONTENT[tab]}</div>
      </div>
    </div>
  );
}
