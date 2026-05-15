import { useState } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Input, Field } from '@/shared/components/ui/Input';
import { Toggle }  from '@/shared/components/ui/Toggle';
import { Icon }    from '@/shared/components/ui/Icon';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { useToast }    from '@/context/ToastContext';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/shared/utils/cn';
import { G }  from '@/shared/utils/tokens';

const SETTING_TABS = [
  { key:'general',      label:'General',      icon:'settings' },
  { key:'notifications',label:'Notifications',icon:'bell'     },
  { key:'security',     label:'Security',     icon:'shield'   },
  { key:'integrations', label:'Integrations', icon:'link'     },
  { key:'billing',      label:'Billing',      icon:'pay'      },
  { key:'api',          label:'API',          icon:'cmd'      },
];

function SideNav({ active, onChange }) {
  return (
    <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible" aria-label="Settings sections">
      {SETTING_TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          aria-current={active === t.key ? 'page' : undefined}
          className={cn(
            'flex items-center gap-2 px-[10px] py-[8px] rounded-[8px] cursor-pointer',
            'text-[13px] font-bold transition-all border-none bg-transparent font-sans',
            'whitespace-nowrap shrink-0',
            active === t.key
              ? 'bg-[rgba(200,151,58,.09)] text-gold'
              : 'text-text-muted hover:bg-surface-3 hover:text-text-primary',
          )}
        >
          <Icon name={t.icon} size={13} color={active === t.key ? G.g : G.t2} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}

/* ── General tab ─────────────────────────────────────────────── */
function GeneralTab() {
  const toast   = useToast();
  const user    = useAuthStore((s) => s.user);
  const update  = useAuthStore((s) => s.updateUser);

  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
      <h3 className="font-display text-[19px] font-bold mb-5">Dealership Profile</h3>
      {/* Avatar */}
      <div className="flex items-center gap-4 mb-5">
        <Avatar initials={toInitials(user?.dealer?.name ?? user?.dealer ?? 'DM')} size={64} />
        <div>
          <div className="font-extrabold text-[17px]">{user?.dealer?.name ?? user?.dealer ?? 'Dangote Motors Ltd'}</div>
          <div className="text-text-secondary text-[13px] mt-[3px]">{user?.dealer?.subdomain ?? user?.subdomain ?? 'your-dealership'}.autosys.app</div>
          <Button variant="ghost" size="xs" className="mt-2">
            <Icon name="upload" size={11} />Upload Logo
          </Button>
        </div>
      </div>
      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[['Dealership Name','Dangote Motors Ltd'],['Email','admin@dangote.com'],['Phone','+234 801 234 5678'],['WhatsApp','+234 801 234 5678'],['Address','Victoria Island, Lagos'],['City','Lagos, Nigeria']].map(([l,v]) => (
          <Field key={l} label={l}>
            <Input defaultValue={v} />
          </Field>
        ))}
      </div>
      <Button variant="gold" onClick={() => toast('Settings saved!')}>
        <Icon name="check" size={13} />Save Changes
      </Button>
    </div>
  );
}

/* ── Notifications tab ───────────────────────────────────────── */
function NotificationsTab() {
  const toast = useToast();
  const [ntf, setNtf] = useState({ leads:true, payments:true, deals:true, weekly:false, wa:true, email:true });
  const rows = [
    ['leads',    'New lead notification',  'Alert when a new lead is captured'],
    ['payments', 'Payment received',       'Instant alert on payment confirmation'],
    ['deals',    'Deal stage changes',     'Notify when deal moves in pipeline'],
    ['weekly',   'Weekly digest',          'Summary every Monday at 8AM'],
    ['wa',       'WhatsApp alerts',        'Receive all alerts via WhatsApp too'],
    ['email',    'Email notifications',    'Daily digest via email'],
  ];
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
      <h3 className="font-display text-[19px] font-bold mb-5">Notification Preferences</h3>
      {rows.map(([k,l,d]) => (
        <div key={k} className="flex justify-between items-center py-[13px] border-b border-surface-4 last:border-0">
          <div>
            <div className="font-bold text-[13.5px]">{l}</div>
            <div className="text-[11.5px] text-text-muted mt-[2px]">{d}</div>
          </div>
          <Toggle checked={ntf[k]} onChange={(v) => setNtf((n) => ({ ...n, [k]:v }))} label={l} />
        </div>
      ))}
    </div>
  );
}

/* ── Security tab ────────────────────────────────────────────── */
function SecurityTab() {
  const toast = useToast();
  const [twofa, setTwofa] = useState(false);
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
      const { authApi } = await import('@/services/api/index');
      await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast('Password updated!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwErrors({ _: err.message });
    }
    setPwLoading(false);
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
        <Toggle
          checked={twofa}
          onChange={(v) => { setTwofa(v); toast(v ? '2FA enabled!' : '2FA disabled', v ? 'success' : 'warning'); }}
          label="Toggle 2FA"
        />
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
    { name:'Paystack',         desc:'Primary payment gateway',   status:'Connected',     color:G.ok  },
    { name:'Flutterwave',      desc:'Fallback gateway',          status:'Connected',     color:G.ok  },
    { name:'WhatsApp Business',desc:'Customer messaging',        status:'Connected',     color:'#25D366' },
    { name:'Facebook Pixel',   desc:'Ad retargeting',           status:'Not Connected', color:G.t2  },
    { name:'Google Analytics 4',desc:'Website analytics',       status:'Not Connected', color:G.t2  },
  ];
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
      <h3 className="font-display text-[19px] font-bold mb-5">Integrations</h3>
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
            {item.status === 'Connected' && (
              <span className="text-[11.5px] font-bold text-status-ok">● Connected</span>
            )}
            <Button variant="ghost" size="sm" onClick={() => toast(`${item.name} settings!`)}>
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
  const toast = useToast();
  // FIX: user was referenced without being fetched — caused "user is not defined" crash
  const user  = useAuthStore((s) => s.user);
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
      <h3 className="font-display text-[19px] font-bold mb-5">Plan &amp; Billing</h3>
      <div className="flex flex-col sm:flex-row justify-between items-start mb-5 gap-4">
        <div>
          <span className="inline-flex px-[7px] py-[2px] rounded-[20px] text-[9.5px] font-extrabold uppercase bg-[rgba(200,151,58,.12)] text-gold mb-2">
            {(user?.dealer?.plan ?? 'free').charAt(0).toUpperCase() + (user?.dealer?.plan ?? 'free').slice(1)} Plan · Active
          </span>
          <div className="font-display text-[32px] font-bold">
            {user?.dealer?.plan === 'premium' ? '₦40,000' : user?.dealer?.plan === 'pro' ? '₦15,000' : 'Free'}
            {user?.dealer?.plan !== 'free' && <span className="text-[15px] text-text-secondary font-normal">/month</span>}
          </div>
          <div className="text-[13px] text-text-secondary mt-1">
            {user?.dealer?.plan === 'free' ? 'Upgrade to unlock all features' : 'Auto-renewal on'}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">Change Plan</Button>
          <Button variant="gold" size="sm"><Icon name="zap" size={13} />Upgrade</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Vehicles','48 / ∞'],['Team','4 / 5'],['Leads','127 / ∞'],['Storage','2.1 / 10 GB']].map(([k,v]) => (
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
  const [events, setEvents] = useState({ 'lead.created':true, 'lead.updated':true, 'payment.received':true, 'vehicle.sold':false, 'deal.closed':true, 'payment.failed':false });
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
      <h3 className="font-display text-[19px] font-bold mb-5">API &amp; Webhooks</h3>
      <Field label="API Key" className="mb-4">
        <div className="flex gap-2">
          <Input readOnly value="sk_live_••••••••••••••••••••••••" className="font-mono text-[12px]" />
          <Button variant="ghost" size="sm" onClick={() => toast('Copied!')}><Icon name="copy" size={13} /></Button>
          <Button variant="ghost" size="sm" onClick={() => toast('Regenerated!', 'warning')}><Icon name="refresh" size={13} /></Button>
        </div>
      </Field>
      <Field label="Webhook URL" className="mb-4">
        <div className="flex gap-2">
          <Input defaultValue="https://your-site.com/webhooks/autosys" />
          <Button variant="ghost" size="sm" onClick={() => toast('Saved!')}>Save</Button>
        </div>
      </Field>
      <p className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-gold mb-2">Webhook Events</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(events).map(([ev, checked]) => (
          <div key={ev} className="flex items-center gap-2 px-3 py-2 bg-surface-3 rounded-[8px] border border-surface-4">
            <button
              role="checkbox"
              aria-checked={checked}
              onClick={() => setEvents((e) => ({ ...e, [ev]: !e[ev] }))}
              className={cn(
                'w-[15px] h-[15px] rounded-[4px] border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all',
                checked ? 'bg-gold border-gold' : 'bg-transparent border-surface-5',
              )}
            >
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