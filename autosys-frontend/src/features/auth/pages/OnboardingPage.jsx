import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo }    from '@/shared/components/ui/Logo';
import { Button }  from '@/shared/components/ui/Button';
import { Input, Field } from '@/shared/components/ui/Input';
import { Icon }    from '@/shared/components/ui/Icon';
import { useToast }  from '@/context/ToastContext';
import { useUIStore } from '@/store/uiStore';

const STEPS = [
  { key:'profile',   label:'Dealership Profile', icon:'settings', color:'#16A34A' },
  { key:'inventory', label:'Add First Vehicle',   icon:'car',      color:'#2563EB' },
  { key:'website',   label:'Build Your Website',  icon:'globe',    color:'#C8973A' },
  { key:'payment',   label:'Connect Payments',    icon:'pay',      color:'#0D9488' },
];

export function OnboardingPage() {
  const navigate          = useNavigate();
  const toast             = useToast();
  const completeStep      = useUIStore((s) => s.completeSetupStep);
  const setupSteps        = useUIStore((s) => s.setupSteps);

  const [step, setStep]   = useState(0);
  const [profile, setProfile] = useState({
    name: 'Dangote Motors Ltd',
    phone: '+234 801 234 5678',
    address: 'Victoria Island, Lagos',
    sub: 'dangote-motors',
  });

  const doneCount = Object.values(setupSteps).filter(Boolean).length;
  const pct       = (doneCount / STEPS.length) * 100;

  const advance = (stepKey, msg) => {
    completeStep(stepKey);
    toast(msg);
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const finish = () => navigate('/app/dashboard');

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center p-6">
      <div className="w-full max-w-[660px]">
        {/* Logo + heading */}
        <div className="text-center mb-[26px]">
          <div className="flex justify-center mb-5"><Logo size={30} /></div>
          <h1 className="font-display text-[25px] font-bold mb-1">Set Up Your Dealership</h1>
          <p className="text-text-secondary text-[13.5px]">
            Complete setup to unlock the full AutoSys experience
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="mb-[22px] px-[17px] py-[13px] rounded-[11px] border"
          style={{ background:'rgba(200,151,58,.07)', borderColor:'rgba(200,151,58,.18)' }}
        >
          <div className="flex justify-between mb-2">
            <span className="font-extrabold text-[13.5px]">{doneCount} of {STEPS.length} steps complete</span>
            <span className="text-gold font-extrabold">{Math.round(pct)}%</span>
          </div>
          <div className="h-[4px] bg-surface-5 rounded-[2px] overflow-hidden">
            <div
              className="h-full rounded-[2px] transition-[width] duration-500"
              style={{ width:`${pct}%`, background:'linear-gradient(90deg,#8B5E18,#E2B96A)' }}
            />
          </div>
          <div className="flex gap-1 mt-[9px]">
            {STEPS.map((s) => (
              <div
                key={s.key}
                className="h-[3px] flex-1 rounded-[2px] transition-colors duration-[400ms]"
                style={{ background: setupSteps[s.key] ? '#C8973A' : '#2B2B3C' }}
              />
            ))}
          </div>
        </div>

        {/* Step list */}
        <div className="flex flex-col gap-[9px] mb-[22px]">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className="bg-surface-2 border rounded-[14px] px-4 py-[13px] cursor-pointer text-left transition-all"
              style={{
                borderColor: step === i
                  ? 'rgba(200,151,58,.35)'
                  : setupSteps[s.key] ? 'rgba(22,163,74,.25)' : '#21212E',
                background: step === i
                  ? 'rgba(200,151,58,.05)'
                  : setupSteps[s.key] ? 'rgba(22,163,74,.03)' : undefined,
              }}
              aria-current={step === i ? 'step' : undefined}
            >
              <div className="flex items-center gap-[11px]">
                <div
                  className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background:`${s.color}18` }}
                >
                  <Icon name={s.icon} size={17} color={s.color} />
                </div>
                <div className="flex-1">
                  <div className="font-extrabold text-[14px]">{s.label}</div>
                  <div className="text-[12px] text-text-secondary mt-[1px]">
                    {setupSteps[s.key] ? '✓ Complete' : 'Click to set up'}
                  </div>
                </div>
                {setupSteps[s.key] ? (
                  <div className="w-[22px] h-[22px] rounded-full bg-status-ok flex items-center justify-center">
                    <Icon name="check" size={12} color="#fff" />
                  </div>
                ) : (
                  <div className="w-[22px] h-[22px] rounded-full border-2 border-surface-5 flex items-center justify-center text-[11px] font-extrabold text-text-muted">
                    {i + 1}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Step content card */}
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
          {step === 0 && (
            <>
              <h2 className="font-display text-[18px] font-bold mb-4">Dealership Profile</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[['Name','name','Dangote Motors Ltd'],['Phone','phone','+234 801 234 5678'],['Address','address','Victoria Island, Lagos']].map(([l,k,p]) => (
                  <Field key={k} label={l}>
                    <Input placeholder={p} value={profile[k]} onChange={(e) => setProfile((f) => ({ ...f, [k]: e.target.value }))} />
                  </Field>
                ))}
              </div>
              <Field label="Free Subdomain" className="mt-3">
                <div className="flex">
                  <Input
                    className="rounded-r-none"
                    value={profile.sub}
                    onChange={(e) => setProfile((f) => ({ ...f, sub: e.target.value }))}
                  />
                  <div className="bg-surface-4 border border-l-0 border-surface-4 px-[13px] rounded-r-[9px] flex items-center text-[13px] text-text-secondary whitespace-nowrap">
                    .autosys.app
                  </div>
                </div>
              </Field>
              <Button variant="gold" className="mt-4" onClick={() => advance('profile', 'Profile saved!')}>
                <Icon name="check" size={13} /> Save &amp; Continue
              </Button>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-display text-[18px] font-bold mb-4">Add Your First Vehicle</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[['Brand','Toyota'],['Model','Camry'],['Year','2022'],['Price (₦)','18500000']].map(([l,p]) => (
                  <Field key={l} label={l}><Input placeholder={p} /></Field>
                ))}
              </div>
              <div
                className="mt-3 border-2 border-dashed border-surface-4 rounded-[11px] p-6 text-center cursor-pointer hover:border-gold hover:bg-[rgba(200,151,58,.04)] transition-all"
                role="button"
                tabIndex={0}
                aria-label="Upload vehicle photos"
              >
                <Icon name="img" size={20} color="#4E4B58" style={{ margin:'0 auto 7px' }} />
                <div className="text-[13px] text-text-secondary">Upload vehicle photos</div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="gold" onClick={() => advance('inventory', 'Vehicle listed!')}>
                  <Icon name="car" size={13} /> List Vehicle
                </Button>
                <Button variant="ghost" onClick={() => { advance('inventory', 'Skipped'); }}>Skip for now</Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display text-[18px] font-bold mb-2">Your Website is Ready</h2>
              <p className="text-text-secondary text-[13.5px] mb-4">Auto-generated from your inventory. Customize below.</p>
              <div className="bg-surface-3 rounded-[9px] px-[13px] py-[9px] flex justify-between items-center mb-3 border border-surface-4">
                <span className="font-mono text-[13px] text-gold">{profile.sub || 'my-dealership'}.autosys.app</span>
                <Button variant="ghost" size="xs" onClick={() => toast('Copied!')}><Icon name="copy" size={11} />Copy</Button>
              </div>
              {[['Hero Headline','Find Your Perfect Car in Lagos'],['CTA Button','Browse Inventory']].map(([l,v]) => (
                <Field key={l} label={l} className="mb-3"><Input defaultValue={v} /></Field>
              ))}
              <div className="flex gap-2 mt-4">
                <Button variant="gold" onClick={() => advance('website', 'Website published! 🎉')}>
                  <Icon name="globe" size={13} /> Publish
                </Button>
                <Button variant="ghost" onClick={() => advance('website', 'Skipped')}>Skip</Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-display text-[18px] font-bold mb-4">Connect Payment Gateway</h2>
              {[{ n:'Paystack', d:'Cards, USSD, bank transfer, mobile money', c:'#16A34A', rec:true },{ n:'Flutterwave', d:'Mobile money, POS, additional channels', c:'#2563EB' }].map((gw) => (
                <div key={gw.n} className="flex gap-[11px] items-center px-[14px] py-3 bg-surface-3 rounded-[10px] border border-surface-4 mb-[9px]">
                  <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center" style={{ background:`${gw.c}18` }}>
                    <Icon name="pay" size={15} color={gw.c} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-[14px] flex items-center gap-2">
                      {gw.n}
                      {gw.rec && <span className="text-[9px] font-extrabold text-[#4ADE80] bg-[rgba(22,163,74,.12)] px-2 py-[2px] rounded-[20px]">Recommended</span>}
                    </div>
                    <div className="text-[12px] text-text-muted">{gw.d}</div>
                  </div>
                  <Button variant="ghost" size="sm">Connect</Button>
                </div>
              ))}
              <Field label="Paystack Secret Key" className="mb-4">
                <Input type="password" placeholder="sk_live_••••••••••••••••" />
              </Field>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="gold" onClick={() => { advance('payment', 'Connected! Going live 🚀'); setTimeout(finish, 600); }}>
                  <Icon name="check" size={13} /> Connect &amp; Go Live 🚀
                </Button>
                <Button variant="ghost" onClick={finish}>Skip — Go to Dashboard</Button>
              </div>
            </>
          )}
        </div>

        {/* All done */}
        {doneCount === STEPS.length && (
          <div
            className="mt-4 px-[18px] py-[13px] rounded-[11px] border text-center"
            style={{ background:'rgba(22,163,74,.12)', borderColor:'rgba(22,163,74,.28)' }}
          >
            <div className="font-extrabold text-[15px] text-status-ok">🎉 Setup complete! Your dealership is live.</div>
            <Button variant="gold" className="mt-[10px]" onClick={finish}>Go to Dashboard →</Button>
          </div>
        )}
      </div>
    </div>
  );
}
