import { useState } from 'react';
import { Icon }    from '@/shared/components/ui/Icon';
import { Button }  from '@/shared/components/ui/Button';
import { cn }      from '@/shared/utils/cn';
import { useGlobalStore, COUNTRY_CONFIG } from '@/store/globalStore';
import { useToast } from '@/context/ToastContext';

/* ════════════════════════════════════════════════════════════
   COUNTRY SWITCHER — compact dropdown for the Topbar/Sidebar
   ══════════════════════════════════════════════════════════*/
export function CountrySwitcher({ compact = false }) {
  const [open, setOpen]          = useState(false);
  const { countryCode, flag, setCountry, currency, symbol } = useGlobalStore();
  const toast = useToast();

  const countries = Object.entries(COUNTRY_CONFIG).map(([code, c]) => ({ code, ...c }));

  const handleSelect = (code) => {
    setCountry(code);
    setOpen(false);
    const c = COUNTRY_CONFIG[code];
    toast(`Switched to ${c.name} · ${c.currency}`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 rounded-[8px] border border-surface-4 bg-surface-2 px-2.5 py-[6px] transition-colors hover:border-surface-5',
          open && 'border-gold bg-[rgba(200,151,58,.08)]'
        )}>
        <span className="text-[15px] leading-none">{flag}</span>
        {!compact && (
          <>
            <span className="text-[11.5px] font-bold text-text-primary">{countryCode}</span>
            <span className="text-[10.5px] text-text-muted font-semibold">{currency}</span>
          </>
        )}
        <Icon name="settings" size={10} color="#4E4B58" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[299]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+6px)] z-[300] w-[220px] bg-surface-1 border border-surface-4 rounded-[12px] shadow-xl overflow-hidden">
            <p className="text-[9.5px] font-extrabold text-text-muted uppercase tracking-widest px-3 pt-3 pb-1.5">
              Select Country
            </p>
            <div className="max-h-[280px] overflow-y-auto pb-1.5">
              {countries.map((c) => (
                <button
                  key={c.code}
                  onClick={() => handleSelect(c.code)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-[8px] text-left hover:bg-surface-2 transition-colors',
                    countryCode === c.code && 'bg-[rgba(200,151,58,.08)]'
                  )}>
                  <span className="text-[18px] leading-none">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-text-primary">{c.name}</p>
                    <p className="text-[10px] text-text-muted">{c.currency} · {c.symbol}</p>
                  </div>
                  {countryCode === c.code && (
                    <span className="text-gold text-[11px] font-bold shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   GLOBAL SETTINGS PAGE — full country/currency/payment config
   ══════════════════════════════════════════════════════════*/
const PAYMENT_PROVIDERS = {
  NG: ['paystack', 'flutterwave'],
  GH: ['flutterwave', 'paystack'],
  KE: ['mpesa', 'flutterwave'],
  ZA: ['payfast', 'flutterwave'],
  US: ['stripe', 'paypal'],
  CA: ['stripe', 'paypal'],
  GB: ['stripe', 'paypal'],
  AE: ['stripe', 'telr'],
  IN: ['razorpay', 'stripe'],
  EG: ['stripe', 'flutterwave'],
  BR: ['stripe', 'pagseguro'],
};

const TIMEZONES = [
  'Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Johannesburg',
  'Africa/Cairo', 'Asia/Dubai', 'America/New_York', 'America/Los_Angeles',
  'America/Toronto', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris',
  'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney',
];

export function GlobalSettingsPage() {
  const toast = useToast();
  const { countryCode, currency, symbol, flag, countryName, timezone, setCountry } = useGlobalStore();

  const [form, setForm] = useState({
    country:         countryCode,
    currency,
    timezone,
    paymentProvider: PAYMENT_PROVIDERS[countryCode]?.[0] || 'stripe',
    phonePrefix:     COUNTRY_CONFIG[countryCode]?.phonePrefix || '+1',
    language:        'en',
  });

  const [saved, setSaved] = useState(false);

  const availableProviders = PAYMENT_PROVIDERS[form.country] || ['stripe'];

  const handleCountryChange = (code) => {
    const config = COUNTRY_CONFIG[code];
    if (!config) return;
    setForm((prev) => ({
      ...prev,
      country:         code,
      currency:        config.currency,
      timezone:        config.timezone,
      paymentProvider: PAYMENT_PROVIDERS[code]?.[0] || 'stripe',
      phonePrefix:     config.phonePrefix,
    }));
  };

  const handleSave = async () => {
    setCountry(form.country);
    setSaved(true);
    toast('Global settings saved!');
    setTimeout(() => setSaved(false), 2000);
  };

  const countries = Object.entries(COUNTRY_CONFIG).map(([code, c]) => ({ code, ...c }));

  return (
    <div className="max-w-[680px] space-y-6">
      <div>
        <h3 className="text-[16px] font-bold text-text-primary mb-0.5">Global Settings</h3>
        <p className="text-[12.5px] text-text-secondary">
          Configure country, currency, payment provider, and localization for your dealership.
        </p>
      </div>

      {/* Current config summary */}
      <div className="bg-[rgba(200,151,58,.06)] border border-[rgba(200,151,58,.2)] rounded-[12px] p-4 flex items-center gap-4">
        <span className="text-[32px]">{COUNTRY_CONFIG[form.country]?.flag || '🌍'}</span>
        <div>
          <p className="text-[14px] font-bold text-text-primary">
            {COUNTRY_CONFIG[form.country]?.name || 'Unknown'}
          </p>
          <p className="text-[12px] text-text-secondary">
            {form.currency} · {COUNTRY_CONFIG[form.country]?.symbol} · {form.timezone}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[11px] font-bold text-gold uppercase tracking-wider">Payment</p>
          <p className="text-[12.5px] font-semibold text-text-primary capitalize">{form.paymentProvider}</p>
        </div>
      </div>

      {/* Country selector */}
      <Section title="Country & Region">
        <div>
          <Label>Country</Label>
          <select
            value={form.country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full bg-surface-2 border border-surface-4 rounded-[8px] px-3 py-2.5 text-[12.5px] text-text-primary outline-none focus:border-gold transition-colors">
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.currency})</option>
            ))}
          </select>
        </div>

        <Row>
          <div>
            <Label>Currency</Label>
            <input value={form.currency} readOnly
              className="w-full bg-surface-3 border border-surface-4 rounded-[8px] px-3 py-2.5 text-[12.5px] text-text-muted cursor-not-allowed" />
          </div>
          <div>
            <Label>Phone Prefix</Label>
            <input value={form.phonePrefix} readOnly
              className="w-full bg-surface-3 border border-surface-4 rounded-[8px] px-3 py-2.5 text-[12.5px] text-text-muted cursor-not-allowed" />
          </div>
        </Row>

        <div>
          <Label>Timezone</Label>
          <select value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            className="w-full bg-surface-2 border border-surface-4 rounded-[8px] px-3 py-2.5 text-[12.5px] text-text-primary outline-none focus:border-gold transition-colors">
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
      </Section>

      {/* Payment providers */}
      <Section title="Payment Provider">
        <p className="text-[11.5px] text-text-muted mb-2">
          Available providers for <strong>{COUNTRY_CONFIG[form.country]?.name}</strong>:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {availableProviders.map((provider) => (
            <button
              key={provider}
              onClick={() => setForm((f) => ({ ...f, paymentProvider: provider }))}
              className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-[10px] border font-semibold text-[12.5px] capitalize transition-all',
                form.paymentProvider === provider
                  ? 'border-gold bg-[rgba(200,151,58,.1)] text-gold'
                  : 'border-surface-4 bg-surface-2 text-text-secondary hover:border-surface-5'
              )}>
              <span className="text-[16px]">
                {provider === 'paystack' ? '💳' : provider === 'stripe' ? '⚡' : provider === 'flutterwave' ? '🦋' :
                  provider === 'mpesa' ? '📱' : provider === 'razorpay' ? '🇮🇳' : '💰'}
              </span>
              {provider}
              {form.paymentProvider === provider && <span className="ml-auto text-[11px]">✓</span>}
            </button>
          ))}
        </div>

        {/* API key hint */}
        <div className="mt-3 bg-surface-2 border border-surface-4 rounded-[9px] px-3 py-2.5">
          <p className="text-[11px] text-text-muted">
            <span className="font-bold text-gold">ENV KEY NEEDED: </span>
            {form.paymentProvider === 'paystack'    && 'PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET'}
            {form.paymentProvider === 'stripe'      && 'STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET'}
            {form.paymentProvider === 'flutterwave' && 'FLUTTERWAVE_SECRET_KEY, FLUTTERWAVE_WEBHOOK_SECRET'}
            {form.paymentProvider === 'mpesa'       && 'MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE'}
            {form.paymentProvider === 'razorpay'    && 'RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET'}
          </p>
        </div>
      </Section>

      {/* Language */}
      <Section title="Language & Localization">
        <div>
          <Label>Interface Language</Label>
          <select value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
            className="w-full bg-surface-2 border border-surface-4 rounded-[8px] px-3 py-2.5 text-[12.5px] text-text-primary outline-none focus:border-gold transition-colors">
            <option value="en">🇬🇧 English</option>
            <option value="fr">🇫🇷 French (coming soon)</option>
            <option value="es">🇪🇸 Spanish (coming soon)</option>
            <option value="ar">🇸🇦 Arabic (coming soon)</option>
            <option value="pt">🇧🇷 Portuguese (coming soon)</option>
          </select>
        </div>
        <p className="text-[11px] text-text-muted">
          Phone numbers stored in international format ({form.phonePrefix}…). Currency formatted for {COUNTRY_CONFIG[form.country]?.locale}.
        </p>
      </Section>

      <Button onClick={handleSave} className="w-full">
        {saved ? '✓ Saved!' : 'Save Global Settings'}
      </Button>
    </div>
  );
}

/* ── Shared layout helpers ───────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div className="bg-surface-1 border border-surface-4 rounded-[14px] p-5 space-y-4">
      <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <p className="text-[11px] font-bold text-text-muted mb-1.5">{children}</p>;
}

function Row({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
