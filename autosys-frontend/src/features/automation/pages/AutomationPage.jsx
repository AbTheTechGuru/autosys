import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/shared/utils/cn';
import { Icon } from '@/shared/components/ui/Icon';
import { Button } from '@/shared/components/ui/Button';
import { Toggle } from '@/shared/components/ui/Toggle';
import { Modal } from '@/shared/components/ui/Modal';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { automationApi } from '@/services/api/global.api';

/* ── Constants ─────────────────────────────────────────────── */
const TRIGGERS = [
  { value: 'lead.created',       label: 'New Lead Created',       icon: 'phone',    color: '#3B82F6' },
  { value: 'lead.stage_changed', label: 'Lead Stage Changed',     icon: 'bars',     color: '#8B5CF6' },
  { value: 'deal.created',       label: 'Deal Created',           icon: 'pay',      color: '#10B981' },
  { value: 'deal.moved',         label: 'Deal Stage Moved',       icon: 'bars',     color: '#F59E0B' },
  { value: 'message.received',   label: 'Message Received',       icon: 'wa',       color: '#25D366' },
  { value: 'vehicle.created',    label: 'Vehicle Listed',         icon: 'car',      color: '#C8973A' },
  { value: 'payment.success',    label: 'Payment Received',       icon: 'pay',      color: '#16A34A' },
  { value: 'task.due',           label: 'Task Due',               icon: 'activity', color: '#EF4444' },
  { value: 'schedule.time',      label: 'Scheduled Time',         icon: 'settings', color: '#6B7280' },
];

const ACTIONS = [
  { value: 'send_whatsapp',         label: 'Send WhatsApp',         icon: 'wa',       color: '#25D366' },
  { value: 'send_sms',              label: 'Send SMS',              icon: 'phone',    color: '#3B82F6' },
  { value: 'send_email',            label: 'Send Email',            icon: 'report',   color: '#6366F1' },
  { value: 'create_task',           label: 'Create Task',           icon: 'activity', color: '#F59E0B' },
  { value: 'move_deal',             label: 'Move Deal Stage',       icon: 'bars',     color: '#8B5CF6' },
  { value: 'assign_agent',          label: 'Assign Agent',          icon: 'users',    color: '#EC4899' },
  { value: 'add_note',              label: 'Add Note to Lead',      icon: 'zap',      color: '#14B8A6' },
  { value: 'create_calendar_event', label: 'Create Calendar Event', icon: 'dash',     color: '#F97316' },
  { value: 'post_social',           label: 'Post to Social Media',  icon: 'globe',    color: '#A855F7' },
  { value: 'schedule_followup',     label: 'Schedule Follow-up',    icon: 'activity', color: '#64748B' },
];

const ACTION_DEFAULTS = {
  send_whatsapp:         { message: 'Hello {{lead.name}}!' },
  send_sms:              { message: 'Hi {{lead.name}}, following up on your enquiry.' },
  send_email:            { subject: 'Message from AutoSys', body: 'Dear {{lead.name}},' },
  create_task:           { title: 'Follow up with {{lead.name}}', daysFromNow: 1, priority: 'medium' },
  move_deal:             { toStage: 'negotiation' },
  assign_agent:          { strategy: 'round_robin' },
  add_note:              { note: 'Auto-note: {{trigger}}' },
  create_calendar_event: { title: 'Meeting with {{lead.name}}', type: 'appointment' },
  post_social:           { platform: 'facebook', content: '🚗 {{vehicle.year}} {{vehicle.brand}} {{vehicle.model}}' },
  schedule_followup:     { delayHours: 48 },
};

function TriggerCard({ trigger, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 px-3 py-[10px] rounded-[10px] border transition-all duration-120',
        selected
          ? 'border-gold bg-[rgba(200,151,58,.1)] text-text-primary'
          : 'border-surface-4 bg-surface-2 text-text-secondary hover:border-surface-5 hover:bg-surface-3'
      )}
    >
      <span className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
        style={{ background: `${trigger.color}22` }}>
        <Icon name={trigger.icon} size={14} color={trigger.color} />
      </span>
      <span className="text-[12.5px] font-semibold">{trigger.label}</span>
      {selected && <Icon name="check" size={12} color="#C8973A" className="ml-auto" />}
    </button>
  );
}

function ActionChip({ action, onRemove }) {
  const a = ACTIONS.find((x) => x.value === action.type);
  if (!a) return null;
  return (
    <div className="flex items-center gap-2 bg-surface-2 border border-surface-4 rounded-[8px] px-3 py-[7px]">
      <span className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0"
        style={{ background: `${a.color}22` }}>
        <Icon name={a.icon} size={11} color={a.color} />
      </span>
      <span className="text-[12px] font-semibold text-text-primary">{a.label}</span>
      <button onClick={onRemove} className="ml-1 text-text-muted hover:text-red-400 transition-colors">
        <Icon name="x" size={10} color="currentColor" />
      </button>
    </div>
  );
}

function AutomationRow({ automation, onToggle, onEdit, onDelete, isToggling }) {
  const trigger = TRIGGERS.find((t) => t.value === automation.trigger);
  const actions = automation.actions || [];
  return (
    <div className={cn(
      'group flex items-center gap-4 px-4 py-[13px] rounded-[12px] border transition-all duration-120',
      automation.enabled
        ? 'bg-surface-1 border-surface-4 hover:border-surface-5'
        : 'bg-surface-2 border-surface-3 opacity-60'
    )}>
      <span className={cn('w-2 h-2 rounded-full shrink-0 mt-0.5',
        automation.enabled ? 'bg-status-ok shadow-[0_0_6px_#16A34A]' : 'bg-surface-5')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-bold text-text-primary">{automation.name}</p>
          {automation.run_count > 0 && (
            <span className="text-[10px] font-bold text-text-muted bg-surface-3 px-[6px] py-[2px] rounded-full">
              {automation.run_count} runs
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-[3px] flex-wrap">
          {trigger && (
            <span className="text-[10.5px] font-semibold px-[7px] py-[2px] rounded-full"
              style={{ background: `${trigger.color}18`, color: trigger.color }}>
              When: {trigger.label}
            </span>
          )}
          <span className="text-[10px] text-text-muted">→</span>
          {actions.slice(0, 2).map((a, i) => {
            const ac = ACTIONS.find((x) => x.value === a.type);
            return ac ? (
              <span key={i} className="text-[10.5px] font-semibold px-[7px] py-[2px] rounded-full"
                style={{ background: `${ac.color}18`, color: ac.color }}>
                {ac.label}
              </span>
            ) : null;
          })}
          {actions.length > 2 && <span className="text-[10px] text-text-muted">+{actions.length - 2} more</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(automation)}
          className="text-[11px] font-bold text-text-muted hover:text-text-primary px-2 py-1 rounded-[6px] hover:bg-surface-3 transition-colors">Edit</button>
        <button onClick={() => onDelete(automation.id)}
          className="text-[11px] font-bold text-text-muted hover:text-red-400 px-2 py-1 rounded-[6px] hover:bg-surface-3 transition-colors">Delete</button>
      </div>
      {isToggling ? <Spinner size={16} /> : (
        <Toggle checked={automation.enabled} onChange={() => onToggle(automation)} />
      )}
    </div>
  );
}

function BuilderModal({ open, onClose, editing, onSave, isSaving }) {
  const [name, setName]       = useState('');
  const [trigger, setTrigger] = useState('');
  const [actions, setActions] = useState([]);
  const [step, setStep]       = useState(1);

  useEffect(() => {
    if (editing) { setName(editing.name); setTrigger(editing.trigger); setActions(editing.actions || []); setStep(1); }
    else { setName(''); setTrigger(''); setActions([]); setStep(1); }
  }, [editing, open]);

  const addAction = (type) => setActions((p) => [...p, { type, config: ACTION_DEFAULTS[type] || {} }]);

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Automation' : 'New Automation'} size="lg">
      <div className="flex gap-0 mb-5 border border-surface-4 rounded-[10px] overflow-hidden">
        {['Trigger', 'Actions', 'Review'].map((s, i) => (
          <button key={s} onClick={() => setStep(i + 1)}
            className={cn('flex-1 py-2 text-[11.5px] font-bold transition-colors',
              step === i + 1 ? 'bg-gold text-[#0A0812]' : 'bg-surface-2 text-text-muted hover:bg-surface-3')}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Automation Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome New Lead"
              className="w-full bg-surface-2 border border-surface-4 rounded-[8px] px-3 py-2 text-[13px] text-text-primary outline-none focus:border-gold transition-colors" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2">When this happens…</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TRIGGERS.map((t) => <TriggerCard key={t.value} trigger={t} selected={trigger === t.value} onClick={() => setTrigger(t.value)} />)}
            </div>
          </div>
          <Button disabled={!name || !trigger} onClick={() => setStep(2)} className="w-full">Next: Add Actions →</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2">Current Actions</label>
            {actions.length === 0
              ? <p className="text-[12px] text-text-muted italic text-center py-4">No actions yet. Add one below.</p>
              : <div className="flex flex-wrap gap-2 mb-3">{actions.map((a, i) => <ActionChip key={i} action={a} onRemove={() => setActions(actions.filter((_, j) => j !== i))} />)}</div>}
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2">Add Action</label>
            <div className="grid grid-cols-2 gap-2">
              {ACTIONS.map((a) => (
                <button key={a.value} onClick={() => addAction(a.value)}
                  className="flex items-center gap-2 px-3 py-2 rounded-[9px] border border-surface-4 bg-surface-2 hover:border-surface-5 hover:bg-surface-3 transition-all text-left">
                  <span className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0" style={{ background: `${a.color}22` }}>
                    <Icon name={a.icon} size={12} color={a.color} />
                  </span>
                  <span className="text-[11.5px] font-semibold text-text-secondary">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">← Back</Button>
            <Button disabled={!actions.length} onClick={() => setStep(3)} className="flex-1">Review →</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-surface-2 border border-surface-4 rounded-[12px] p-4 space-y-3">
            <div><p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Name</p><p className="text-[14px] font-bold text-text-primary mt-0.5">{name}</p></div>
            <div><p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Trigger</p><p className="text-[13px] font-semibold text-text-primary mt-0.5">{TRIGGERS.find((t) => t.value === trigger)?.label}</p></div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Actions</p>
              <div className="space-y-1.5">
                {actions.map((a, i) => { const ac = ACTIONS.find((x) => x.value === a.type); return (<div key={i} className="flex items-center gap-2 text-[12px] text-text-secondary"><span className="font-bold text-text-muted">{i + 1}.</span><span style={{ color: ac?.color }}>{ac?.label}</span></div>); })}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">← Back</Button>
            <Button onClick={() => onSave({ name, trigger, actions, conditions: [], enabled: true })} disabled={isSaving} className="flex-1">
              {isSaving ? <><Spinner size={13} />Saving…</> : (editing ? 'Save Changes ✓' : 'Create Automation ✓')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AutomationPage() {
  const toast = useToast();
  const [automations, setAutomations] = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [togglingId,  setTogglingId]  = useState(null);
  const [isSaving,    setIsSaving]    = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [filter,      setFilter]      = useState('all');

  const fetchAutomations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await automationApi.list();
      setAutomations(data.automations ?? []);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load automations', 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAutomations(); }, [fetchAutomations]);

  const handleToggle = async (auto) => {
    setTogglingId(auto.id);
    setAutomations((prev) => prev.map((a) => a.id === auto.id ? { ...a, enabled: !a.enabled } : a));
    try {
      await automationApi.toggle(auto.id, !auto.enabled);
      toast(`"${auto.name}" ${auto.enabled ? 'disabled' : 'enabled'}`);
    } catch (err) {
      setAutomations((prev) => prev.map((a) => a.id === auto.id ? { ...a, enabled: auto.enabled } : a));
      toast(err.response?.data?.message || 'Toggle failed', 'danger');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id) => {
    const prev = [...automations];
    setAutomations((a) => a.filter((x) => x.id !== id));
    try {
      await automationApi.delete(id);
      toast('Automation deleted');
    } catch (err) {
      setAutomations(prev);
      toast(err.response?.data?.message || 'Delete failed', 'danger');
    }
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (editing) {
        const { data } = await automationApi.update(editing.id, formData);
        setAutomations((prev) => prev.map((a) => a.id === editing.id ? data.automation : a));
        toast('Automation updated!');
      } else {
        const { data } = await automationApi.create(formData);
        setAutomations((prev) => [data.automation, ...prev]);
        toast('Automation created!');
      }
      setShowBuilder(false);
      setEditing(null);
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const filtered    = filter === 'all' ? automations : filter === 'active' ? automations.filter((a) => a.enabled) : automations.filter((a) => !a.enabled);
  const activeCount = automations.filter((a) => a.enabled).length;
  const totalRuns   = automations.reduce((s, a) => s + (a.run_count || 0), 0);

  return (
    <div className="max-w-[1100px] px-4 md:px-[22px] pt-[22px] pb-[88px] md:pb-[22px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-[10px]">
            <Icon name="zap" size={22} color="#C8973A" /> Automation Engine
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {activeCount} active automations · {totalRuns} total runs
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setShowBuilder(true); }}>+ New Automation</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',      value: automations.length,               color: '#C8973A' },
          { label: 'Active',     value: activeCount,                      color: '#16A34A' },
          { label: 'Inactive',   value: automations.length - activeCount, color: '#6B7280' },
          { label: 'Total Runs', value: totalRuns,                        color: '#3B82F6' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-1 border border-surface-4 rounded-[12px] p-4 text-center">
            <p className="text-[24px] font-display font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] font-bold text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mb-4">
        {['all', 'active', 'inactive'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-3 py-[5px] text-[11.5px] font-bold rounded-[7px] capitalize transition-colors',
              filter === f ? 'bg-gold text-[#0A0812]' : 'text-text-muted hover:text-text-primary hover:bg-surface-3')}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-[72px] bg-surface-2 border border-surface-4 rounded-[12px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Icon name="zap" size={28} color="#4E4B58" />
              <p className="text-[13px] font-semibold mt-3">No automations yet</p>
              <p className="text-[12px] mt-1">Click "New Automation" to get started</p>
            </div>
          ) : (
            filtered.map((auto) => (
              <AutomationRow key={auto.id} automation={auto}
                onToggle={handleToggle} onEdit={(a) => { setEditing(a); setShowBuilder(true); }}
                onDelete={handleDelete} isToggling={togglingId === auto.id} />
            ))
          )}
        </div>
      )}

      <BuilderModal open={showBuilder} onClose={() => { setShowBuilder(false); setEditing(null); }}
        editing={editing} onSave={handleSave} isSaving={isSaving} />
    </div>
  );
}
