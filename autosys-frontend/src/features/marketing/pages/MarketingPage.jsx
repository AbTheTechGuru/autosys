import { useState, useEffect } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Badge }   from '@/shared/components/ui/Badge';
import { Icon }    from '@/shared/components/ui/Icon';
import { Modal }   from '@/shared/components/ui/Modal';
import { Input, Select, Field, Textarea } from '@/shared/components/ui/Input';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { Toggle }  from '@/shared/components/ui/Toggle';
import { Spinner } from '@/shared/components/ui/Spinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useToast }          from '@/context/ToastContext';
import { useMarketingStore } from '@/store/marketingStore';
import { aiApi }             from '@/services/api/index';
import { validate, campaignSchema } from '@/schemas';
import { sanitizeObject }           from '@/shared/utils/sanitize';
import { G } from '@/shared/utils/tokens';
import { cn } from '@/shared/utils/cn';

const MKTG_TABS = [
  { key:'campaigns',   label:'Campaigns'   },
  { key:'templates',   label:'Templates'   },
  { key:'automations', label:'Automations' },
];

const WIZARD_STEPS = ['Details','Audience','Message','Review'];

const STATUS_COLOR = {
  Active: G.ok, Completed: G.bl, Scheduled: G.wa, Draft: G.t2,
};

const TYPE_COLOR = {
  whatsapp:'#25D366', email: G.bl, instagram:'#E1306C', sms: G.wa,
};

/* ── Campaign Wizard ───────────────────────────────────────── */
function CampaignWizard({ open, onClose, initialForm = {} }) {
  const toast       = useToast();
  const addCampaign = useMarketingStore((s) => s.addCampaign);
  const launchCampaign = useMarketingStore((s) => s.launchCampaign);

  const [step,    setStep]   = useState(0);
  const [aiLoad,  setAiLoad] = useState(false);
  const [saving,  setSaving] = useState(false);
  const [form,    setForm]   = useState({
    name:'', type:'whatsapp', audience:'all', msg:'',
    schedule:'Now', ...initialForm,
  });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: typeof e === 'string' ? e : e.target.value }));

  // Reset when modal opens
  useEffect(() => {
    if (open) { setStep(0); setErrors({}); setForm({ name:'', type:'whatsapp', audience:'all', msg:'', schedule:'Now', ...initialForm }); }
  }, [open]);

  const generateMsg = async () => {
    setAiLoad(true);
    try {
      const { data } = await aiApi.campaignMessage({ name: form.name, type: form.type, audience: form.audience });
      setForm((f) => ({ ...f, msg: data.text }));
    } catch {
      setForm((f) => ({ ...f, msg: '🚗 Huge deals this month! Premium vehicles at unbeatable prices. Visit us — limited slots available!' }));
    }
    setAiLoad(false);
  };

  const handleLaunch = async () => {
    const { data, errors: errs } = validate(campaignSchema, sanitizeObject(form));
    if (errs) { setErrors(errs); return; }
    setSaving(true);
    try {
      // Create campaign first, then launch it
      const saved = await addCampaign(data);
      if (saved?.id && !String(saved.id).startsWith('temp')) {
        await launchCampaign(saved.id);
        toast('Campaign launched! 🚀', 'ok');
      } else {
        toast('Campaign saved as draft', 'ok');
      }
      onClose();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to launch campaign', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const AUDIENCE_REACH = { all: 127, new_leads: 43, contacted: 34, customers: 50 };

  return (
    <Modal open={open} onClose={onClose} title="New Campaign" maxWidth={560}>
      {/* Step indicators */}
      <div className="flex gap-1 mb-5">
        {WIZARD_STEPS.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[12px] font-extrabold"
              style={{ background: step >= i ? G.g : G.s4, color: step >= i ? G.bg : G.t2 }}
            >
              {step > i ? <Icon name="check" size={13} color={G.bg} /> : i + 1}
            </div>
            <div className="text-[10px] font-bold" style={{ color: step >= i ? G.g : G.t2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Step 0: Details */}
      {step === 0 && (
        <div className="flex flex-col gap-3">
          <Field label="Campaign Name *" error={errors.name}>
            <Input placeholder="January Flash Sale" value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Channel *">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[['whatsapp','#25D366','wa','WhatsApp'],['email',G.bl,'mail','Email'],
                ['instagram','#E1306C','img','Instagram'],['sms',G.wa,'send','SMS']
              ].map(([type, color, icon, label]) => (
                <button
                  key={type}
                  onClick={() => set('type')(type)}
                  className={cn(
                    'flex flex-col items-center gap-[5px] px-2 py-[11px] rounded-[9px] border cursor-pointer transition-all font-sans',
                    form.type === type ? 'text-[13px] font-bold' : 'border-surface-4 bg-transparent text-text-secondary hover:bg-surface-3',
                  )}
                  style={form.type === type ? { borderColor:color, background:`${color}14`, color } : {}}
                >
                  <Icon name={icon} size={17} color={form.type === type ? color : G.t2} />
                  <span className="text-[10.5px]">{label}</span>
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* Step 1: Audience */}
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <Field label="Target Audience *">
            <Select value={form.audience} onChange={set('audience')}>
              <option value="all">All Leads</option>
              <option value="new_leads">New Leads Only</option>
              <option value="contacted">Contacted Leads</option>
              <option value="customers">Customers (Closed)</option>
            </Select>
          </Field>
          <div className="bg-surface-3 rounded-[10px] p-4 border border-surface-4">
            <div className="text-[12.5px] text-text-secondary mb-2">Estimated reach:</div>
            <div className="font-display text-[28px] font-bold" style={{ color:G.g }}>
              ~{AUDIENCE_REACH[form.audience] || 0}
            </div>
            <div className="text-[12px] text-text-muted">contacts</div>
          </div>
        </div>
      )}

      {/* Step 2: Message */}
      {step === 2 && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-gold">Message Content *</span>
            <Button variant="ghost" size="xs" onClick={generateMsg} disabled={aiLoad}>
              {aiLoad ? <><Spinner size={11} />…</> : <><Icon name="ai" size={11} color={G.pu} />AI Write</>}
            </Button>
          </div>
          <Textarea
            rows={5}
            placeholder="Type or generate with AI…"
            value={form.msg}
            onChange={set('msg')}
          />
          {errors.msg && <p className="text-[11.5px] text-[#F87171]">{errors.msg}</p>}
          <div className="text-[11.5px] text-text-muted">{form.msg.length} characters</div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div>
          <div className="font-display text-[18px] font-bold mb-4">Campaign Summary</div>
          {[
            ['Name',     form.name || 'Untitled'],
            ['Channel',  form.type],
            ['Audience', form.audience],
            ['Message',  form.msg.slice(0,80) + (form.msg.length > 80 ? '…' : '')],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-[10px] border-b border-surface-4 last:border-0 text-[13px]">
              <span className="text-text-secondary min-w-[100px]">{k}</span>
              <span className="font-semibold text-right max-w-[300px]">{v || '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-5">
        <Button variant="ghost" onClick={() => step === 0 ? onClose() : setStep((s) => s - 1)}>
          {step === 0 ? 'Cancel' : '← Back'}
        </Button>
        <Button
          variant="gold"
          disabled={saving}
          onClick={() => step === WIZARD_STEPS.length - 1 ? handleLaunch() : setStep((s) => s + 1)}
        >
          {step === WIZARD_STEPS.length - 1
            ? saving ? <><Spinner size={13} />Launching…</> : <><Icon name="send" size={14} />Launch Campaign</>
            : 'Continue →'}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Campaign card ─────────────────────────────────────────── */
function CampaignCard({ c, onLaunch, onDelete }) {
  const [launching, setLaunching] = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const toast = useToast();

  const handleLaunch = async (e) => {
    e.stopPropagation();
    setLaunching(true);
    try {
      await onLaunch(c.id);
      toast('Campaign launched! 🚀', 'ok');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to launch', 'danger');
    } finally {
      setLaunching(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    setDeleting(true);
    try {
      await onDelete(c.id);
      toast('Campaign deleted', 'ok');
    } catch {
      toast('Failed to delete', 'danger');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-4 hover:border-[rgba(200,151,58,.2)] transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <div className="font-extrabold text-[14px]">{c.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[10.5px] font-bold px-[7px] py-[2px] rounded-full"
              style={{ background:`${TYPE_COLOR[c.rawType] || G.t2}18`, color: TYPE_COLOR[c.rawType] || G.t2 }}
            >
              {c.type}
            </span>
            <span className="text-[11px] text-text-muted">{c.date}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{c.status}</Badge>
          {c.status === 'Draft' && (
            <Button variant="gold" size="xs" onClick={handleLaunch} disabled={launching}>
              {launching ? <Spinner size={11} /> : <Icon name="send" size={11} />}
            </Button>
          )}
          <Button variant="danger" size="xs" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Spinner size={11} /> : <Icon name="trash" size={11} />}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[['Sent', c.sent, G.t1],['Opens', c.opens, G.bl],['Clicks', c.clicks, G.g]].map(([l, v, col]) => (
          <div key={l} className="bg-surface-3 border border-surface-4 rounded-[9px] p-[11px] text-center">
            <div className="font-display text-[18px] font-bold" style={{ color:col }}>{v.toLocaleString()}</div>
            <div className="text-[10px] text-text-secondary mt-[2px]">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export function MarketingPage() {
  const toast            = useToast();
  const campaigns        = useMarketingStore((s) => s.campaigns);
  const templates        = useMarketingStore((s) => s.templates);
  const automations      = useMarketingStore((s) => s.automations);
  const isLoading        = useMarketingStore((s) => s.isLoading);
  const templatesLoading = useMarketingStore((s) => s.templatesLoading);
  const getTotalStats    = useMarketingStore((s) => s.getTotalStats);
  const fetchCampaigns   = useMarketingStore((s) => s.fetchCampaigns);
  const fetchTemplates   = useMarketingStore((s) => s.fetchTemplates);
  const fetchAutomations = useMarketingStore((s) => s.fetchAutomations);
  const launchCampaign   = useMarketingStore((s) => s.launchCampaign);
  const removeCampaign   = useMarketingStore((s) => s.removeCampaign);
  const toggleAutomation = useMarketingStore((s) => s.toggleAutomation);

  const [tab,      setTab]      = useState('campaigns');
  const [wizOpen,  setWizOpen]  = useState(false);
  const [initForm, setInitForm] = useState({});

  // Fetch data when tabs are opened
  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);
  useEffect(() => { if (tab === 'templates')   fetchTemplates();   }, [tab]);
  useEffect(() => { if (tab === 'automations') fetchAutomations(); }, [tab]);

  const stats = getTotalStats();

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Marketing</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Campaigns, automations, and lead capture</p>
        </div>
        <Button variant="gold" size="sm" onClick={() => { setInitForm({}); setWizOpen(true); }}>
          <Icon name="plus" size={13} />New Campaign
        </Button>
      </div>

      <Tabs tabs={MKTG_TABS} active={tab} onChange={setTab} className="mb-5" />

      {/* ── Campaigns tab ──────────────────────────────────── */}
      {tab === 'campaigns' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              ['Sent',        stats.sent.toLocaleString(),  G.bl],
              ['Opens',       stats.opens.toLocaleString(), G.g ],
              ['Click Rate',  stats.sent > 0 ? `${Math.round((stats.clicks/stats.sent)*100)}%` : '0%', G.ok],
              ['Unsubscribes',stats.unsubs,                 G.er],
            ].map(([l, v, c]) => (
              <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
                <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[5px]">{l}</div>
                <div className="font-display text-[26px] font-bold" style={{ color:c }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col gap-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-surface-2 border border-surface-4 rounded-[14px] p-4 animate-pulse">
                  <div className="h-4 bg-surface-3 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-surface-3 rounded w-1/5 mb-4" />
                  <div className="grid grid-cols-3 gap-3">
                    {[0,1,2].map((j) => <div key={j} className="h-14 bg-surface-3 rounded-[9px]" />)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!isLoading && campaigns.length === 0 && (
            <EmptyState
              icon="send"
              title="No campaigns yet"
              desc="Launch your first campaign to reach your leads."
              action={() => setWizOpen(true)}
              actionLabel="New Campaign"
            />
          )}

          {/* Campaign list */}
          {!isLoading && campaigns.length > 0 && (
            <div className="flex flex-col gap-3">
              {campaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  c={c}
                  onLaunch={launchCampaign}
                  onDelete={removeCampaign}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Templates tab ──────────────────────────────────── */}
      {tab === 'templates' && (
        <>
          {templatesLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px] animate-pulse">
                  <div className="h-4 bg-surface-3 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-surface-3 rounded w-full mb-1" />
                  <div className="h-3 bg-surface-3 rounded w-3/4 mb-4" />
                  <div className="h-8 bg-surface-3 rounded" />
                </div>
              ))}
            </div>
          )}
          {!templatesLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => {
                const color = TYPE_COLOR[t.type] || G.t2;
                return (
                  <div
                    key={t.id}
                    className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px] flex flex-col hover:border-[rgba(200,151,58,.2)] transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-extrabold text-[13.5px]">{t.name}</div>
                      <span
                        className="px-[7px] py-[2px] rounded-[20px] text-[9.5px] font-extrabold uppercase"
                        style={{ background:`${color}18`, color }}
                      >
                        {t.type}
                      </span>
                    </div>
                    <div className="text-[12.5px] text-text-secondary leading-[1.55] flex-1 mb-4">{t.description}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-center w-full"
                      onClick={() => {
                        setInitForm({ type: t.type, name: t.name });
                        setWizOpen(true);
                      }}
                    >
                      Use Template
                    </Button>
                  </div>
                );
              })}
              {templates.length === 0 && (
                <div className="col-span-full text-center py-10 text-text-muted">
                  No templates found
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Automations tab ────────────────────────────────── */}
      {tab === 'automations' && (
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
          <div className="font-display text-[18px] font-bold mb-5">Automation Rules</div>
          {automations.length === 0 && (
            <p className="text-text-muted text-[13px] mb-4">No automations set up yet.</p>
          )}
          {automations.map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-[13px] border-b border-surface-4 last:border-0">
              <Toggle
                checked={a.enabled}
                onChange={() => toggleAutomation(a.id)}
                label={`Toggle: ${a.trigger}`}
              />
              <div className="flex-1">
                <div className="font-bold text-[13.5px]">
                  When: <span className="text-text-secondary font-normal">{a.trigger}</span>
                </div>
                <div className="text-[12px] text-text-muted mt-[2px]">→ {a.action}</div>
              </div>
            </div>
          ))}
          <Button
            variant="gold"
            size="sm"
            className="mt-4"
            onClick={() => toast('Automation builder coming soon!', 'info')}
          >
            <Icon name="plus" size={12} />Add Automation
          </Button>
        </div>
      )}

      <CampaignWizard open={wizOpen} onClose={() => setWizOpen(false)} initialForm={initForm} />
    </div>
  );
}