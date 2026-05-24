import { useState, useEffect, useCallback } from 'react';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Toggle }  from '@/shared/components/ui/Toggle';
import { Spinner } from '@/shared/components/ui/Spinner';
import { Input, Field } from '@/shared/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import { useAuthStore } from '@/store/authStore';
import { settingsApi, websiteApi } from '@/services/api';
import { G } from '@/shared/utils/tokens';

const TABS = [
  { key:'profile',       label:'Profile'       },
  { key:'notifications', label:'Notifications' },
  { key:'billing',       label:'Billing'       },
  { key:'integrations',  label:'Integrations'  },
  { key:'api',           label:'API & Webhooks' },
];

/* ── Profile Tab ─────────────────────────────────────────────── */
function ProfileTab() {
  const toast  = useToast();
  const user   = useAuthStore(s=>s.user);
  const dealer = useAuthStore(s=>s.dealer);
  const [form, setForm]   = useState({ name:'', email:'', phone:'', dealershipName:'', address:'' });
  const [saving,setSaving]= useState(false);

  useEffect(()=>{
    if(user) setForm({
      name:           user.name||user.full_name||'',
      email:          user.email||'',
      phone:          user.phone||'',
      dealershipName: dealer?.name||'',
      address:        dealer?.address||'',
    });
  },[user,dealer]);

  const set=(k)=>(e)=>setForm(f=>({...f,[k]:e.target.value}));

  const handleSave=async()=>{
    setSaving(true);
    try{
      await settingsApi.updateProfile(form);
      toast('Profile updated!','ok');
    }catch(err){ toast(err.response?.data?.message||'Failed to save','danger'); }
    finally{ setSaving(false); }
  };

  return (
    <div className="max-w-[560px] space-y-4">
      <div className="bg-surface-3 border border-surface-4 rounded-[14px] p-5 flex items-center gap-4">
        <div className="w-[64px] h-[64px] rounded-full bg-surface-4 flex items-center justify-center font-display text-[22px] font-bold" style={{background:`linear-gradient(135deg,${G.g},${G.gd})`}}>
          {(form.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-[15px]">{form.name||'Your Name'}</p>
          <p className="text-[12px] text-text-muted">{form.email}</p>
          <p className="text-[11px] text-text-muted capitalize mt-0.5">{user?.role||'owner'}</p>
        </div>
      </div>

      <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5 space-y-4">
        <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest">Personal Info</p>
        <Field label="Full Name"><Input value={form.name} onChange={set('name')} placeholder="Your full name"/></Field>
        <Field label="Email Address"><Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com"/></Field>
        <Field label="Phone Number"><Input value={form.phone} onChange={set('phone')} placeholder="+2348012345678"/></Field>
      </div>

      <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5 space-y-4">
        <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest">Dealership Info</p>
        <Field label="Dealership Name"><Input value={form.dealershipName} onChange={set('dealershipName')} placeholder="Your Dealership Ltd"/></Field>
        <Field label="Address"><Input value={form.address} onChange={set('address')} placeholder="123 Lagos Street, Ikeja"/></Field>
      </div>

      <Button variant="gold" onClick={handleSave} disabled={saving} className="w-full justify-center">
        {saving?<><Spinner size={13}/>Saving…</>:<><Icon name="check" size={13}/>Save Changes</>}
      </Button>
    </div>
  );
}

/* ── Notifications Tab ───────────────────────────────────────── */
function NotificationsTab() {
  const toast = useToast();
  const [prefs, setPrefs] = useState({
    new_lead:true, deal_won:true, payment:true, low_stock:false,
    whatsapp:true, email:true, sms:false,
    weekly_report:true, daily_digest:false,
  });
  const [saving,setSaving]=useState(false);

  const toggle=(k)=>setPrefs(p=>({...p,[k]:!p[k]}));

  const save=async()=>{
    setSaving(true);
    try{
      await settingsApi.updateNotifications(prefs);
      toast('Notification preferences saved!','ok');
    }catch(err){ toast(err.response?.data?.message||'Failed','danger'); }
    finally{ setSaving(false); }
  };

  const Section=({title,items})=>(
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5 mb-4">
      <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">{title}</p>
      {items.map(([key,label,desc])=>(
        <div key={key} className="flex items-center justify-between py-[11px] border-b border-surface-4 last:border-0">
          <div><p className="text-[13px] font-semibold">{label}</p>{desc&&<p className="text-[11px] text-text-muted mt-[2px]">{desc}</p>}</div>
          <Toggle checked={prefs[key]} onChange={()=>toggle(key)}/>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-[560px]">
      <Section title="Alerts" items={[
        ['new_lead','New Lead','Notify when a new lead is created'],
        ['deal_won','Deal Won','Notify when a deal is closed'],
        ['payment','Payment Received','Notify on successful payment'],
        ['low_stock','Low Inventory Alert','When available vehicles drop below 5'],
      ]}/>
      <Section title="Channels" items={[
        ['whatsapp','WhatsApp Notifications','Push to your WhatsApp number'],
        ['email','Email Notifications','Send to your registered email'],
        ['sms','SMS Alerts','Send critical alerts via SMS'],
      ]}/>
      <Section title="Reports" items={[
        ['weekly_report','Weekly Summary','Auto-send every Monday morning'],
        ['daily_digest','Daily Digest','Morning briefing at 8:00 AM'],
      ]}/>
      <Button variant="gold" onClick={save} disabled={saving} className="w-full justify-center">
        {saving?<><Spinner size={13}/>Saving…</>:<><Icon name="check" size={13}/>Save Preferences</>}
      </Button>
    </div>
  );
}

/* ── Billing Tab ─────────────────────────────────────────────── */
function BillingTab() {
  const toast  = useToast();
  const dealer = useAuthStore(s=>s.dealer);
  const user   = useAuthStore(s=>s.user);
  const [loading,setLoading]=useState(false);

  const PLANS=[
    { key:'free',    name:'Free',    price:0,       features:['50 Leads/mo','10 Vehicles','Basic Analytics','WhatsApp Inbox'],                                     color:G.t2 },
    { key:'pro',     name:'Pro',     price:25000,   features:['Unlimited Leads','100 Vehicles','Full Analytics','All Channels','AI Assistant','Website Builder'],  color:G.bl },
    { key:'premium', name:'Premium', price:60000,   features:['Everything in Pro','AI Departments','Priority Support','Custom Domain','Team Unlimited','API Access'], color:G.g  },
  ];

  const handleUpgrade=async(plan)=>{
    setLoading(true);
    try{
      // Initialize Paystack payment
      const{data}=await import('@/services/api').then(m=>m.globalPaymentApi.initialize({plan,email:user?.email,amount:PLANS.find(p=>p.key===plan)?.price*100}));
      if(data?.authorization_url) window.open(data.authorization_url,'_blank');
      else toast('Payment initialized — check your email','ok');
    }catch(err){ toast(err.response?.data?.message||'Failed to initialize payment','danger'); }
    finally{ setLoading(false); }
  };

  return (
    <div className="max-w-[700px]">
      <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5 mb-5">
        <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-2">Current Plan</p>
        <div className="flex items-center gap-4">
          <div>
            <p className="font-display text-[26px] font-bold capitalize" style={{color:G.g}}>{dealer?.plan||'Free'}</p>
            {dealer?.trial_ends_at&&<p className="text-[12px] text-text-muted">Trial ends {new Date(dealer.trial_ends_at).toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map(plan=>{
          const isCurrent=dealer?.plan===plan.key;
          return (
            <div key={plan.key} className="bg-surface-2 border rounded-[14px] p-5 flex flex-col" style={{borderColor:isCurrent?`${plan.color}44`:'rgba(46,46,64,.5)'}}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-[18px] font-bold">{plan.name}</h3>
                {isCurrent&&<span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full" style={{background:`${plan.color}18`,color:plan.color}}>Current</span>}
              </div>
              <p className="font-display text-[22px] font-bold mb-1" style={{color:plan.color}}>{plan.price===0?'Free':`₦${plan.price.toLocaleString()}`}{plan.price>0&&<span className="text-[13px] text-text-muted font-normal">/mo</span>}</p>
              <ul className="text-[11.5px] text-text-secondary space-y-1 mb-4 flex-1">
                {plan.features.map(f=><li key={f} className="flex items-center gap-1.5"><Icon name="check" size={10} color={plan.color}/>{f}</li>)}
              </ul>
              {!isCurrent&&plan.price>0&&(
                <Button variant="ghost" size="sm" className="w-full justify-center" onClick={()=>handleUpgrade(plan.key)} disabled={loading}>
                  {loading?<Spinner size={12}/>:`Upgrade to ${plan.name}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Integrations Tab ────────────────────────────────────────── */
function IntegrationsTab() {
  const toast=useToast();
  const [connected,setConnected]=useState({paystack:true,flutterwave:false,twilio:false,sendgrid:false,facebook:true,instagram:true,tiktok:false,google:false});
  const toggle=(k)=>{ setConnected(c=>({...c,[k]:!c[k]})); toast(connected[k]?`${k} disconnected`:`${k} connected`,'ok'); };

  const INTEGRATIONS=[
    { key:'paystack',    label:'Paystack',    icon:'💳', desc:'Accept Nigerian payments',      group:'Payments' },
    { key:'flutterwave', label:'Flutterwave', icon:'💸', desc:'Alternative payment gateway',   group:'Payments' },
    { key:'twilio',      label:'Twilio',      icon:'📱', desc:'SMS & WhatsApp messaging',      group:'Messaging' },
    { key:'sendgrid',    label:'SendGrid',    icon:'📧', desc:'Transactional emails',          group:'Messaging' },
    { key:'facebook',    label:'Facebook',    icon:'📘', desc:'Post to Facebook page',         group:'Social' },
    { key:'instagram',   label:'Instagram',   icon:'📸', desc:'Post to Instagram business',    group:'Social' },
    { key:'tiktok',      label:'TikTok',      icon:'🎵', desc:'Post to TikTok business',       group:'Social' },
    { key:'google',      label:'Google Ads',  icon:'🎯', desc:'Google Ads integration',        group:'Marketing' },
  ];
  const groups=[...new Set(INTEGRATIONS.map(i=>i.group))];

  return (
    <div className="max-w-[600px] space-y-4">
      {groups.map(group=>(
        <div key={group} className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
          <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">{group}</p>
          {INTEGRATIONS.filter(i=>i.group===group).map(int=>(
            <div key={int.key} className="flex items-center gap-3 py-[11px] border-b border-surface-4 last:border-0">
              <span className="text-[22px] shrink-0">{int.icon}</span>
              <div className="flex-1 min-w-0"><p className="text-[13px] font-bold">{int.label}</p><p className="text-[11.5px] text-text-muted">{int.desc}</p></div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold" style={{color:connected[int.key]?G.ok:G.t2}}>{connected[int.key]?'Connected':'Not connected'}</span>
                <Button variant="ghost" size="xs" onClick={()=>toggle(int.key)}>{connected[int.key]?'Disconnect':'Connect'}</Button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── API Tab ─────────────────────────────────────────────────── */
function ApiTab() {
  const toast=useToast();
  const [apiKey,setApiKey]=useState('');
  const [loading,setLoading]=useState(true);
  const [regen,  setRegen]  =useState(false);
  const [webhook,setWebhook]=useState({url:'',secret:''});

  useEffect(()=>{
    settingsApi.getApiKey()
      .then(({data})=>setApiKey(data.api_key||data.key||''))
      .catch(()=>setApiKey('sk_autosys_•••••••••••••••••••••••'))
      .finally(()=>setLoading(false));
  },[]);

  const regenerate=async()=>{
    setRegen(true);
    try{
      const{data}=await settingsApi.regenerateApiKey();
      setApiKey(data.api_key||data.key||'');
      toast('API key regenerated!','ok');
    }catch{ toast('Failed to regenerate','danger'); }
    finally{ setRegen(false); }
  };

  const saveWebhook=async()=>{
    try{
      await settingsApi.updateWebhook(webhook);
      toast('Webhook saved!','ok');
    }catch{ toast('Failed to save webhook','danger'); }
  };

  return (
    <div className="max-w-[560px] space-y-4">
      <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
        <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">API Key</p>
        {loading?<div className="h-10 bg-surface-3 rounded animate-pulse"/>:(
          <div className="flex gap-2">
            <code className="flex-1 bg-surface-3 border border-surface-4 rounded-[8px] px-3 py-2 text-[11.5px] font-mono text-text-secondary truncate">{apiKey}</code>
            <Button variant="ghost" size="sm" onClick={()=>{navigator.clipboard?.writeText(apiKey);toast('Copied!','ok');}}>Copy</Button>
            <Button variant="danger" size="sm" onClick={regenerate} disabled={regen}>{regen?<Spinner size={12}/>:'Regen'}</Button>
          </div>
        )}
        <p className="text-[10.5px] text-text-muted mt-2">Keep this secret. Never share publicly.</p>
      </div>

      <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
        <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">Webhook</p>
        <Field label="Endpoint URL" className="mb-3">
          <Input value={webhook.url} onChange={e=>setWebhook(w=>({...w,url:e.target.value}))} placeholder="https://yourdomain.com/webhook"/>
        </Field>
        <Field label="Signing Secret">
          <Input value={webhook.secret} onChange={e=>setWebhook(w=>({...w,secret:e.target.value}))} placeholder="whsec_…"/>
        </Field>
        <Button variant="gold" size="sm" className="mt-4 w-full justify-center" onClick={saveWebhook}>Save Webhook</Button>
      </div>

      <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
        <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-2">API Base URL</p>
        <code className="text-[12px] font-mono text-gold">https://autosys-backend.onrender.com/api/v1</code>
        <p className="text-[11px] text-text-muted mt-2">Docs: <a href="https://docs.autosys.ng" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">docs.autosys.ng</a></p>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export function SettingsPage() {
  const [tab,setTab]=useState('profile');
  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      <h2 className="font-display text-[23px] font-bold mb-[4px]">Settings</h2>
      <p className="text-text-secondary text-[12.5px] mb-5">Manage your account, integrations, and preferences</p>
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
        <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} className={`px-3 py-[8px] rounded-[9px] text-[12.5px] font-semibold text-left transition-colors whitespace-nowrap ${tab===t.key?'bg-surface-3 text-text-primary font-bold border border-surface-4':'text-text-secondary hover:bg-surface-2'}`}>{t.label}</button>
          ))}
        </div>
        <div>
          {tab==='profile'       && <ProfileTab/>}
          {tab==='notifications' && <NotificationsTab/>}
          {tab==='billing'       && <BillingTab/>}
          {tab==='integrations'  && <IntegrationsTab/>}
          {tab==='api'           && <ApiTab/>}
        </div>
      </div>
    </div>
  );
}
