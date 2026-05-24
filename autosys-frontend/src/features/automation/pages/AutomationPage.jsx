import { useState, useEffect, useCallback } from 'react';
import { cn }      from '@/shared/utils/cn';
import { Icon }    from '@/shared/components/ui/Icon';
import { Button }  from '@/shared/components/ui/Button';
import { Toggle }  from '@/shared/components/ui/Toggle';
import { Modal }   from '@/shared/components/ui/Modal';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { automationApi } from '@/services/api';

/* ══════════════════════════════════════════════════════════════
   DOUBLED CAPACITY — Full trigger/action/condition definitions
   ══════════════════════════════════════════════════════════════ */
const TRIGGERS = [
  { value:'lead.created',        label:'New Lead Created',         icon:'phone',    color:'#3B82F6', group:'Leads'    },
  { value:'lead.updated',        label:'Lead Updated',             icon:'edit',     color:'#60A5FA', group:'Leads'    },
  { value:'lead.stage_changed',  label:'Lead Stage Changed',       icon:'bars',     color:'#8B5CF6', group:'Leads'    },
  { value:'lead.no_activity',    label:'Lead Inactive (no reply)', icon:'activity', color:'#EF4444', group:'Leads'    },
  { value:'deal.created',        label:'Deal Created',             icon:'pay',      color:'#10B981', group:'Deals'    },
  { value:'deal.moved',          label:'Deal Stage Moved',         icon:'bars',     color:'#F59E0B', group:'Deals'    },
  { value:'deal.won',            label:'Deal Closed (Won)',        icon:'check',    color:'#16A34A', group:'Deals'    },
  { value:'deal.lost',           label:'Deal Closed (Lost)',       icon:'x',        color:'#EF4444', group:'Deals'    },
  { value:'message.received',    label:'Message Received',         icon:'wa',       color:'#25D366', group:'Messages' },
  { value:'message.no_reply',    label:'No Reply After X Hours',   icon:'report',   color:'#F97316', group:'Messages' },
  { value:'vehicle.created',     label:'Vehicle Listed',           icon:'car',      color:'#C8973A', group:'Inventory'},
  { value:'vehicle.sold',        label:'Vehicle Sold',             icon:'check',    color:'#16A34A', group:'Inventory'},
  { value:'payment.success',     label:'Payment Received',         icon:'pay',      color:'#16A34A', group:'Finance'  },
  { value:'payment.failed',      label:'Payment Failed',           icon:'x',        color:'#EF4444', group:'Finance'  },
  { value:'task.due',            label:'Task Due',                 icon:'activity', color:'#EF4444', group:'Tasks'    },
  { value:'task.overdue',        label:'Task Overdue',             icon:'zap',      color:'#DC2626', group:'Tasks'    },
  { value:'calendar.event_created', label:'Calendar Event Created',icon:'dash',     color:'#6366F1', group:'Calendar' },
  { value:'schedule.time',       label:'Scheduled Time',           icon:'settings', color:'#6B7280', group:'Schedule' },
];

const ACTIONS = [
  { value:'send_whatsapp',          label:'Send WhatsApp',           icon:'wa',       color:'#25D366', group:'Messaging' },
  { value:'send_sms',               label:'Send SMS',                icon:'phone',    color:'#3B82F6', group:'Messaging' },
  { value:'send_email',             label:'Send Email',              icon:'report',   color:'#6366F1', group:'Messaging' },
  { value:'send_whatsapp_template', label:'Send WA Template',        icon:'wa',       color:'#128C7E', group:'Messaging' },
  { value:'create_task',            label:'Create Task',             icon:'activity', color:'#F59E0B', group:'CRM'       },
  { value:'move_deal',              label:'Move Deal Stage',         icon:'bars',     color:'#8B5CF6', group:'CRM'       },
  { value:'assign_agent',           label:'Assign Agent',            icon:'users',    color:'#EC4899', group:'CRM'       },
  { value:'add_note',               label:'Add Note to Lead',        icon:'note',     color:'#14B8A6', group:'CRM'       },
  { value:'update_lead_stage',      label:'Update Lead Stage',       icon:'edit',     color:'#60A5FA', group:'CRM'       },
  { value:'tag_lead',               label:'Tag Lead',                icon:'zap',      color:'#A78BFA', group:'CRM'       },
  { value:'create_calendar_event',  label:'Create Calendar Event',   icon:'dash',     color:'#F97316', group:'Calendar'  },
  { value:'schedule_followup',      label:'Schedule Follow-up',      icon:'activity', color:'#64748B', group:'Calendar'  },
  { value:'post_social',            label:'Post to Social Media',    icon:'globe',    color:'#A855F7', group:'Marketing' },
  { value:'add_to_campaign',        label:'Add to Campaign',         icon:'send',     color:'#EC4899', group:'Marketing' },
  { value:'remove_from_campaign',   label:'Remove from Campaign',    icon:'x',        color:'#6B7280', group:'Marketing' },
  { value:'wait_delay',             label:'Wait / Delay',            icon:'settings', color:'#94A3B8', group:'Control'   },
  { value:'stop_if',                label:'Stop If Condition Met',   icon:'x',        color:'#EF4444', group:'Control'   },
  { value:'notify_team',            label:'Notify Team Member',      icon:'users',    color:'#F59E0B', group:'Internal'  },
  { value:'webhook',                label:'Send Webhook',            icon:'zap',      color:'#6366F1', group:'Internal'  },
  { value:'update_vehicle_status',  label:'Update Vehicle Status',   icon:'car',      color:'#C8973A', group:'Inventory' },
];

const OPERATORS = [
  { value:'eq',       label:'equals'           },
  { value:'neq',      label:'not equals'       },
  { value:'contains', label:'contains'         },
  { value:'gt',       label:'greater than'     },
  { value:'lt',       label:'less than'        },
  { value:'in',       label:'is one of'        },
  { value:'not_in',   label:'is not one of'    },
  { value:'exists',   label:'exists'           },
];

const CONDITION_FIELDS = [
  { value:'lead.stage',       label:'Lead Stage'       },
  { value:'lead.source',      label:'Lead Source'      },
  { value:'lead.budget',      label:'Lead Budget'      },
  { value:'lead.assigned_to', label:'Assigned Agent'   },
  { value:'deal.stage',       label:'Deal Stage'       },
  { value:'deal.value',       label:'Deal Value'       },
  { value:'vehicle.brand',    label:'Vehicle Brand'    },
  { value:'vehicle.price',    label:'Vehicle Price'    },
  { value:'message.channel',  label:'Message Channel'  },
  { value:'time.hour',        label:'Hour of Day'      },
  { value:'time.day',         label:'Day of Week'      },
];

/* ── Default configs per action ───────────────────────────── */
const ACTION_DEFAULTS = {
  send_whatsapp:          { message:'Hello {{lead.name}}! Thanks for reaching out to {{dealer.name}}. How can we help?' },
  send_sms:               { message:'Hi {{lead.name}}, following up on your enquiry about {{lead.vehicle_interest}}.' },
  send_email:             { subject:'Message from {{dealer.name}}', body:'Dear {{lead.name}},\n\nThank you for your interest.' },
  send_whatsapp_template: { templateId:'', variables:{} },
  create_task:            { title:'Follow up with {{lead.name}}', daysFromNow:1, priority:'medium' },
  move_deal:              { toStage:'negotiation' },
  assign_agent:           { strategy:'round_robin', agentId:null },
  add_note:               { note:'Auto-note: triggered by {{trigger}}' },
  update_lead_stage:      { toStage:'contacted' },
  tag_lead:               { tag:'auto-tagged' },
  create_calendar_event:  { title:'Meeting with {{lead.name}}', type:'appointment', daysFromNow:1 },
  schedule_followup:      { delayHours:48 },
  post_social:            { platform:'facebook', content:'🚗 {{vehicle.year}} {{vehicle.brand}} {{vehicle.model}} now available! DM us to enquire.' },
  add_to_campaign:        { campaignId:null },
  remove_from_campaign:   { campaignId:null },
  wait_delay:             { hours:24, reason:'Delay before next action' },
  stop_if:                { condition:'lead.stage', operator:'eq', value:'closed_won' },
  notify_team:            { message:'{{lead.name}} triggered: {{trigger}}', channel:'whatsapp' },
  webhook:                { url:'', method:'POST', payload:{} },
  update_vehicle_status:  { status:'sold' },
};

/* ── Map backend automation → UI shape ────────────────────── */
const mapAuto = (a) => ({
  id:          a.id,
  name:        a.name,
  trigger:     a.trigger,
  enabled:     a.is_active ?? a.enabled ?? false,
  run_count:   a.run_count   || 0,
  success_count: a.success_count || 0,
  fail_count:  a.fail_count  || 0,
  actions:     a.actions     || (a.action ? [{ type:a.action, config:a.config||{} }] : []),
  conditions:  a.conditions  || [],
  last_run_at: a.last_run_at || null,
  created_at:  a.created_at,
});

/* ══════════════════════════════════════════════════════════════
   UI COMPONENTS
   ══════════════════════════════════════════════════════════════ */

/* ── Action config editors ─────────────────────────────────── */
function ActionConfigEditor({ action, onChange }) {
  const cfg = action.config || {};
  const set = (k) => (e) => onChange({ ...action, config:{ ...cfg, [k]: e.target.value } });

  const textArea = (key, placeholder, rows=3) => (
    <textarea rows={rows} value={cfg[key]||''} onChange={set(key)} placeholder={placeholder}
      className="w-full bg-surface-3 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none focus:border-gold transition-colors resize-none" />
  );
  const textInput = (key, placeholder) => (
    <input value={cfg[key]||''} onChange={set(key)} placeholder={placeholder}
      className="w-full bg-surface-3 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none focus:border-gold transition-colors" />
  );
  const select = (key, options) => (
    <select value={cfg[key]||''} onChange={set(key)}
      className="w-full bg-surface-3 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none">
      {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  switch (action.type) {
    case 'send_whatsapp':
    case 'send_sms':
      return <div><p className="text-[10px] font-bold text-text-muted mb-1">Message</p>{textArea('message','Message text… use {{lead.name}}, {{dealer.name}}')}</div>;
    case 'send_email':
      return <div className="space-y-2">
        <div><p className="text-[10px] font-bold text-text-muted mb-1">Subject</p>{textInput('subject','Email subject…')}</div>
        <div><p className="text-[10px] font-bold text-text-muted mb-1">Body</p>{textArea('body','Email body… use {{lead.name}}, {{vehicle.brand}}', 4)}</div>
      </div>;
    case 'create_task':
      return <div className="space-y-2">
        <div><p className="text-[10px] font-bold text-text-muted mb-1">Task Title</p>{textInput('title','Task title…')}</div>
        <div className="grid grid-cols-2 gap-2">
          <div><p className="text-[10px] font-bold text-text-muted mb-1">Due In (days)</p>
            <input type="number" min="0" max="30" value={cfg.daysFromNow||1} onChange={set('daysFromNow')}
              className="w-full bg-surface-3 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none" /></div>
          <div><p className="text-[10px] font-bold text-text-muted mb-1">Priority</p>
            {select('priority',[['low','Low'],['medium','Medium'],['high','High'],['urgent','Urgent']])}</div>
        </div>
      </div>;
    case 'move_deal':
    case 'update_lead_stage':
      return <div><p className="text-[10px] font-bold text-text-muted mb-1">Target Stage</p>
        {select(action.type === 'move_deal' ? 'toStage' : 'toStage',[
          ['new','New'],['contacted','Contacted'],['negotiating','Negotiating'],
          ['closed_won','Closed Won'],['closed_lost','Closed Lost'],
          ['lead','Lead (Pipeline)'],['negotiation','Negotiation'],['payment','Payment'],['delivered','Delivered'],
        ])}</div>;
    case 'assign_agent':
      return <div><p className="text-[10px] font-bold text-text-muted mb-1">Assignment Strategy</p>
        {select('strategy',[['round_robin','Round Robin'],['least_busy','Least Busy'],['specific','Specific Agent']])}</div>;
    case 'wait_delay':
      return <div><p className="text-[10px] font-bold text-text-muted mb-1">Wait Duration (hours)</p>
        <input type="number" min="1" max="720" value={cfg.hours||24} onChange={set('hours')}
          className="w-full bg-surface-3 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none" /></div>;
    case 'post_social':
      return <div className="space-y-2">
        <div><p className="text-[10px] font-bold text-text-muted mb-1">Platform</p>
          {select('platform',[['facebook','Facebook'],['instagram','Instagram'],['tiktok','TikTok']])}</div>
        <div><p className="text-[10px] font-bold text-text-muted mb-1">Content</p>{textArea('content','Post content…')}</div>
      </div>;
    case 'tag_lead':
      return <div><p className="text-[10px] font-bold text-text-muted mb-1">Tag Name</p>{textInput('tag','e.g. hot-lead, vip, follow-up')}</div>;
    case 'add_note':
      return <div><p className="text-[10px] font-bold text-text-muted mb-1">Note</p>{textArea('note','Note text…', 2)}</div>;
    case 'notify_team':
      return <div><p className="text-[10px] font-bold text-text-muted mb-1">Message</p>{textArea('message','Notification message…', 2)}</div>;
    case 'webhook':
      return <div className="space-y-2">
        <div><p className="text-[10px] font-bold text-text-muted mb-1">Webhook URL</p>{textInput('url','https://…')}</div>
        <div><p className="text-[10px] font-bold text-text-muted mb-1">Method</p>
          {select('method',[['POST','POST'],['PUT','PUT'],['PATCH','PATCH']])}</div>
      </div>;
    default:
      return <p className="text-[11px] text-text-muted italic">No configuration needed</p>;
  }
}

/* ── Condition builder row ─────────────────────────────────── */
function ConditionRow({ condition, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...condition, [k]: v });
  return (
    <div className="flex gap-2 items-center flex-wrap">
      <select value={condition.field||''} onChange={(e) => set('field', e.target.value)}
        className="flex-1 min-w-[120px] bg-surface-3 border border-surface-4 rounded-[7px] px-2 py-1.5 text-[11.5px] text-text-primary outline-none">
        <option value="">Choose field…</option>
        {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
      <select value={condition.operator||'eq'} onChange={(e) => set('operator', e.target.value)}
        className="w-[110px] bg-surface-3 border border-surface-4 rounded-[7px] px-2 py-1.5 text-[11.5px] text-text-primary outline-none">
        {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <input value={condition.value||''} onChange={(e) => set('value', e.target.value)} placeholder="Value…"
        className="flex-1 min-w-[80px] bg-surface-3 border border-surface-4 rounded-[7px] px-2 py-1.5 text-[11.5px] text-text-primary outline-none focus:border-gold transition-colors" />
      <button onClick={onRemove} className="text-text-muted hover:text-red-400 transition-colors shrink-0">
        <Icon name="x" size={12} />
      </button>
    </div>
  );
}

/* ── Automation row ────────────────────────────────────────── */
function AutomationRow({ automation, onToggle, onEdit, onDelete, onDuplicate, onTestRun }) {
  const trigger    = TRIGGERS.find((t) => t.value === automation.trigger);
  const actions    = automation.actions || [];
  const [toggling, setToggling] = useState(false);
  const successRate = automation.run_count > 0
    ? Math.round((automation.success_count / automation.run_count) * 100)
    : null;

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(automation);
    setToggling(false);
  };

  return (
    <div className={cn(
      'group flex items-center gap-4 px-4 py-[13px] rounded-[12px] border transition-all',
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
          {successRate !== null && (
            <span className="text-[10px] font-bold px-[6px] py-[2px] rounded-full"
              style={{ background: successRate > 80 ? '#16A34A18' : '#EF444418', color: successRate > 80 ? '#16A34A' : '#EF4444' }}>
              {successRate}% success
            </span>
          )}
          {automation.conditions?.length > 0 && (
            <span className="text-[9.5px] font-bold text-[#6366F1] bg-[#6366F111] px-[6px] py-[1px] rounded-full">
              {automation.conditions.length} condition{automation.conditions.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-[3px] flex-wrap">
          {trigger && (
            <span className="text-[10.5px] font-semibold px-[7px] py-[2px] rounded-full"
              style={{ background:`${trigger.color}18`, color:trigger.color }}>
              When: {trigger.label}
            </span>
          )}
          <span className="text-[10px] text-text-muted">→</span>
          {actions.slice(0,3).map((a, i) => {
            const ac = ACTIONS.find((x) => x.value === a.type);
            return ac ? (
              <span key={i} className="text-[10.5px] font-semibold px-[7px] py-[2px] rounded-full"
                style={{ background:`${ac.color}18`, color:ac.color }}>
                {ac.label}
              </span>
            ) : null;
          })}
          {actions.length > 3 && <span className="text-[10px] text-text-muted">+{actions.length - 3} more</span>}
        </div>
        {automation.last_run_at && (
          <p className="text-[10px] text-text-muted mt-1">
            Last run: {new Date(automation.last_run_at).toLocaleString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
          </p>
        )}
      </div>

      {/* Controls — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onTestRun(automation)}
          className="text-[10.5px] font-bold text-[#6366F1] hover:bg-[#6366F111] px-2 py-1 rounded-[6px] transition-colors"
          title="Test Run">
          ▶ Test
        </button>
        <button onClick={() => onDuplicate(automation)}
          className="text-[10.5px] font-bold text-text-muted hover:text-text-primary px-2 py-1 rounded-[6px] hover:bg-surface-3 transition-colors"
          title="Duplicate">
          ⎘
        </button>
        <button onClick={() => onEdit(automation)}
          className="text-[10.5px] font-bold text-text-muted hover:text-text-primary px-2 py-1 rounded-[6px] hover:bg-surface-3 transition-colors">
          Edit
        </button>
        <button onClick={() => onDelete(automation.id)}
          className="text-[10.5px] font-bold text-text-muted hover:text-red-400 px-2 py-1 rounded-[6px] hover:bg-surface-3 transition-colors">
          Delete
        </button>
      </div>
      {toggling ? <Spinner size={16} /> : <Toggle checked={automation.enabled} onChange={handleToggle} />}
    </div>
  );
}

/* ── Builder Modal ─────────────────────────────────────────── */
function BuilderModal({ open, onClose, editing, onSave }) {
  const [step,       setStep]       = useState(1);
  const [name,       setName]       = useState('');
  const [trigger,    setTrigger]    = useState('');
  const [actions,    setActions]    = useState([]);
  const [conditions, setConditions] = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [openAction, setOpenAction] = useState(null); // index of expanded action config
  const toast = useToast();

  // Group triggers and actions
  const triggerGroups = [...new Set(TRIGGERS.map((t) => t.group))];
  const actionGroups  = [...new Set(ACTIONS.map((a) => a.group))];

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setTrigger(editing.trigger);
      setActions(editing.actions || []);
      setConditions(editing.conditions || []);
    } else {
      setName(''); setTrigger(''); setActions([]); setConditions([]);
    }
    setStep(1);
    setOpenAction(null);
  }, [editing, open]);

  const addAction = (type) => {
    setActions((prev) => [...prev, { type, config: ACTION_DEFAULTS[type] || {} }]);
  };

  const updateAction = (i, updated) => {
    setActions((prev) => prev.map((a, idx) => idx === i ? updated : a));
  };

  const removeAction = (i) => {
    setActions((prev) => prev.filter((_, idx) => idx !== i));
    if (openAction === i) setOpenAction(null);
  };

  const moveAction = (i, dir) => {
    const next = [...actions];
    const target = i + dir;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    setActions(next);
  };

  const addCondition  = () => setConditions((prev) => [...prev, { field:'', operator:'eq', value:'' }]);
  const updateCond    = (i, c) => setConditions((prev) => prev.map((x, idx) => idx === i ? c : x));
  const removeCond    = (i) => setConditions((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!name || !trigger || !actions.length) {
      toast('Fill in name, trigger and at least one action', 'warning');
      return;
    }
    setSaving(true);
    await onSave({ name, trigger, actions, conditions, enabled: true });
    setSaving(false);
    onClose();
  };

  if (!open) return null;

  const STEPS = ['Trigger', 'Conditions', 'Actions', 'Review'];

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Automation' : 'New Automation'} maxWidth={640}>
      {/* Step indicators */}
      <div className="flex gap-0 mb-5 border border-surface-4 rounded-[10px] overflow-hidden">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i + 1)}
            className={cn('flex-1 py-2 text-[11px] font-bold transition-colors',
              step === i + 1 ? 'bg-gold text-[#0A0812]' : 'bg-surface-2 text-text-muted hover:bg-surface-3')}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* ── Step 1: Name + Trigger ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Automation Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome New Lead"
              className="w-full bg-surface-2 border border-surface-4 rounded-[8px] px-3 py-2 text-[13px] text-text-primary outline-none focus:border-gold transition-colors" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2">When this happens…</label>
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {triggerGroups.map((group) => (
                <div key={group}>
                  <p className="text-[9.5px] font-extrabold text-text-muted uppercase tracking-widest mb-1.5 px-1">{group}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {TRIGGERS.filter((t) => t.group === group).map((t) => (
                      <button key={t.value} onClick={() => setTrigger(t.value)}
                        className={cn(
                          'w-full text-left flex items-center gap-3 px-3 py-[9px] rounded-[9px] border transition-all',
                          trigger === t.value
                            ? 'border-gold bg-[rgba(200,151,58,.1)] text-text-primary'
                            : 'border-surface-4 bg-surface-2 text-text-secondary hover:border-surface-5 hover:bg-surface-3'
                        )}>
                        <span className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0" style={{ background:`${t.color}22` }}>
                          <Icon name={t.icon} size={12} color={t.color} />
                        </span>
                        <span className="text-[12px] font-semibold">{t.label}</span>
                        {trigger === t.value && <Icon name="check" size={11} color="#C8973A" className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Button disabled={!name || !trigger} onClick={() => setStep(2)} className="w-full justify-center">
            Next: Add Conditions →
          </Button>
        </div>
      )}

      {/* ── Step 2: Conditions (IF/THEN filters) ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">IF Conditions (optional)</label>
              <button onClick={addCondition} className="text-[11px] font-bold text-gold hover:opacity-80 transition-opacity">+ Add Condition</button>
            </div>
            {conditions.length === 0
              ? <p className="text-[12px] text-text-muted italic text-center py-4 bg-surface-2 rounded-[8px]">No conditions — automation will run on every trigger</p>
              : <div className="space-y-2">
                  {conditions.map((c, i) => (
                    <ConditionRow key={i} condition={c} onChange={(updated) => updateCond(i, updated)} onRemove={() => removeCond(i)} />
                  ))}
                  <p className="text-[10.5px] text-text-muted">All conditions must match (AND logic)</p>
                </div>
            }
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">← Back</Button>
            <Button onClick={() => setStep(3)} className="flex-1">Next: Add Actions →</Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Actions ── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Current actions */}
          {actions.length > 0 && (
            <div>
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2">
                Action Chain ({actions.length} step{actions.length > 1 ? 's' : ''})
              </label>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {actions.map((a, i) => {
                  const ac = ACTIONS.find((x) => x.value === a.type);
                  return (
                    <div key={i} className="bg-surface-2 border border-surface-4 rounded-[10px] overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <span className="text-[10px] font-extrabold text-text-muted w-4">{i + 1}.</span>
                        <span className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0" style={{ background:`${ac?.color||'#aaa'}22` }}>
                          <Icon name={ac?.icon||'zap'} size={11} color={ac?.color||'#aaa'} />
                        </span>
                        <span className="text-[12px] font-semibold text-text-primary flex-1">{ac?.label || a.type}</span>
                        <div className="flex gap-1">
                          <button onClick={() => moveAction(i, -1)} disabled={i===0} className="text-text-muted hover:text-text-primary disabled:opacity-30 px-1">↑</button>
                          <button onClick={() => moveAction(i, 1)} disabled={i===actions.length-1} className="text-text-muted hover:text-text-primary disabled:opacity-30 px-1">↓</button>
                          <button onClick={() => setOpenAction(openAction === i ? null : i)} className="text-[10px] font-bold text-gold px-2">
                            {openAction === i ? '▲ Close' : '▼ Config'}
                          </button>
                          <button onClick={() => removeAction(i)} className="text-text-muted hover:text-red-400 transition-colors px-1">
                            <Icon name="x" size={11} />
                          </button>
                        </div>
                      </div>
                      {openAction === i && (
                        <div className="px-3 pb-3 border-t border-surface-4">
                          <ActionConfigEditor action={a} onChange={(updated) => updateAction(i, updated)} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add action */}
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2">Add Action</label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {actionGroups.map((group) => (
                <div key={group}>
                  <p className="text-[9.5px] font-extrabold text-text-muted uppercase tracking-widest mb-1 px-0.5">{group}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ACTIONS.filter((a) => a.group === group).map((a) => (
                      <button key={a.value} onClick={() => addAction(a.value)}
                        className="flex items-center gap-2 px-3 py-2 rounded-[8px] border border-surface-4 bg-surface-2 hover:border-surface-5 hover:bg-surface-3 transition-all text-left">
                        <span className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0" style={{ background:`${a.color}22` }}>
                          <Icon name={a.icon} size={11} color={a.color} />
                        </span>
                        <span className="text-[11px] font-semibold text-text-secondary">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">← Back</Button>
            <Button disabled={!actions.length} onClick={() => setStep(4)} className="flex-1">Review →</Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Review ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-surface-2 border border-surface-4 rounded-[12px] p-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Name</p>
              <p className="text-[14px] font-bold text-text-primary mt-0.5">{name}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Trigger</p>
              <p className="text-[13px] font-semibold text-text-primary mt-0.5">{TRIGGERS.find((t) => t.value === trigger)?.label}</p>
            </div>
            {conditions.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Conditions ({conditions.length})</p>
                {conditions.map((c, i) => (
                  <p key={i} className="text-[12px] text-text-secondary">
                    IF <span className="text-gold">{c.field}</span> {c.operator} <span className="text-gold">"{c.value}"</span>
                  </p>
                ))}
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">
                Actions ({actions.length} step{actions.length > 1 ? 's' : ''})
              </p>
              {actions.map((a, i) => {
                const ac = ACTIONS.find((x) => x.value === a.type);
                return (
                  <div key={i} className="flex items-center gap-2 text-[12px] text-text-secondary mb-1">
                    <span className="font-bold text-text-muted">{i + 1}.</span>
                    <span style={{ color: ac?.color }}>{ac?.label}</span>
                    {a.config?.message && <span className="text-text-muted truncate max-w-[200px]">"{a.config.message.slice(0, 40)}…"</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(3)} className="flex-1">← Back</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 justify-center">
              {saving ? <Spinner size={13} /> : editing ? 'Save Changes ✓' : 'Create Automation ✓'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
export function AutomationPage() {
  const toast = useToast();
  const [automations,  setAutomations]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showBuilder,  setShowBuilder]  = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [filter,       setFilter]       = useState('all');
  const [testRunning,  setTestRunning]  = useState(null);

  /* Fetch automations */
  const fetchAutomations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await automationApi.getAutomations();
      setAutomations((data.automations ?? []).map(mapAuto));
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load automations', 'danger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAutomations(); }, [fetchAutomations]);

  /* Toggle enable/disable */
  const handleToggle = async (auto) => {
    const newVal = !auto.enabled;
    setAutomations((prev) => prev.map((a) => a.id === auto.id ? { ...a, enabled: newVal } : a));
    try {
      await automationApi.toggleAutomation(auto.id, newVal);
      toast(`"${auto.name}" ${newVal ? 'enabled' : 'disabled'}`, 'ok');
    } catch {
      setAutomations((prev) => prev.map((a) => a.id === auto.id ? { ...a, enabled: !newVal } : a));
      toast('Failed to update', 'danger');
    }
  };

  /* Save (create or update) */
  const handleSave = async (formData) => {
    try {
      if (editing) {
        const { data } = await automationApi.updateAutomation(editing.id, formData);
        setAutomations((prev) => prev.map((a) => a.id === editing.id ? mapAuto(data.automation) : a));
        toast('Automation updated!', 'ok');
      } else {
        const { data } = await automationApi.createAutomation(formData);
        setAutomations((prev) => [mapAuto(data.automation), ...prev]);
        toast('Automation created!', 'ok');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save', 'danger');
      throw err;
    }
    setEditing(null);
  };

  /* Delete */
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this automation?')) return;
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    try {
      await automationApi.deleteAutomation(id);
      toast('Automation deleted', 'ok');
    } catch {
      toast('Failed to delete', 'danger');
      fetchAutomations();
    }
  };

  /* Duplicate */
  const handleDuplicate = async (auto) => {
    try {
      const { data } = await automationApi.createAutomation({
        name:       `${auto.name} (copy)`,
        trigger:    auto.trigger,
        actions:    auto.actions,
        conditions: auto.conditions,
        enabled:    false,
      });
      setAutomations((prev) => [mapAuto(data.automation), ...prev]);
      toast('Automation duplicated!', 'ok');
    } catch {
      toast('Failed to duplicate', 'danger');
    }
  };

  /* Test run */
  const handleTestRun = async (auto) => {
    setTestRunning(auto.id);
    try {
      await automationApi.testTrigger(auto.trigger, { _test: true });
      toast(`Test run fired for "${auto.name}"! Check logs.`, 'ok');
    } catch (err) {
      toast(err.response?.data?.message || 'Test run failed', 'danger');
    } finally {
      setTestRunning(null);
    }
  };

  const filtered    = filter === 'all' ? automations
    : filter === 'active' ? automations.filter((a) => a.enabled)
    : automations.filter((a) => !a.enabled);

  const activeCount  = automations.filter((a) => a.enabled).length;
  const totalRuns    = automations.reduce((s, a) => s + (a.run_count || 0), 0);
  const successRuns  = automations.reduce((s, a) => s + (a.success_count || 0), 0);
  const globalRate   = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0;

  return (
    <div className="max-w-[1100px] px-4 md:px-[22px] pt-[22px] pb-[88px] md:pb-[22px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-[10px]">
            <Icon name="zap" size={22} color="#C8973A" /> Automation Engine
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {loading ? 'Loading…' : `${activeCount} active · ${totalRuns} total runs · ${globalRate}% success rate`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchAutomations} disabled={loading}>
            {loading ? <Spinner size={12} /> : <Icon name="refresh" size={12} />}
          </Button>
          <Button onClick={() => { setEditing(null); setShowBuilder(true); }}>
            + New Automation
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label:'Total',        value: automations.length,               color:'#C8973A' },
          { label:'Active',       value: activeCount,                      color:'#16A34A' },
          { label:'Total Runs',   value: totalRuns.toLocaleString(),       color:'#3B82F6' },
          { label:'Success Rate', value: totalRuns > 0 ? `${globalRate}%` : '—', color: globalRate > 80 ? '#16A34A' : '#F59E0B' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-1 border border-surface-4 rounded-[12px] p-4 text-center">
            {loading
              ? <div className="h-7 bg-surface-3 rounded w-10 mx-auto mb-1 animate-pulse" />
              : <p className="text-[24px] font-display font-bold" style={{ color:s.color }}>{s.value}</p>
            }
            <p className="text-[11px] font-bold text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-4">
        {['all','active','inactive'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-3 py-[5px] text-[11.5px] font-bold rounded-[7px] capitalize transition-colors',
              filter === f ? 'bg-gold text-[#0A0812]' : 'text-text-muted hover:text-text-primary hover:bg-surface-3')}>
            {f}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-[70px] bg-surface-2 border border-surface-4 rounded-[12px] animate-pulse" />
          ))}
        </div>
      )}

      {/* Automation list */}
      {!loading && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-text-muted bg-surface-1 border border-surface-4 rounded-[14px]">
              <Icon name="zap" size={28} color="#4E4B58" />
              <p className="text-[13px] font-semibold mt-3">No automations yet</p>
              <p className="text-[12px] mt-1">Click "+ New Automation" to get started</p>
            </div>
          ) : (
            filtered.map((auto) => (
              <AutomationRow
                key={auto.id}
                automation={auto}
                onToggle={handleToggle}
                onEdit={(a) => { setEditing(a); setShowBuilder(true); }}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onTestRun={handleTestRun}
              />
            ))
          )}
        </div>
      )}

      {/* Variable reference */}
      <div className="mt-6 bg-surface-1 border border-surface-4 rounded-[14px] p-4">
        <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">Available Template Variables</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[
            '{{lead.name}}','{{lead.phone}}','{{lead.email}}','{{lead.stage}}',
            '{{lead.vehicle_interest}}','{{dealer.name}}','{{dealer.phone}}',
            '{{vehicle.brand}}','{{vehicle.model}}','{{vehicle.year}}','{{vehicle.price}}',
            '{{deal.stage}}','{{deal.value}}','{{payment.amount}}','{{trigger}}','{{date}}',
          ].map((v) => (
            <code key={v} className="text-[10.5px] font-mono text-gold bg-surface-2 border border-surface-4 px-2 py-1 rounded-[5px] truncate">
              {v}
            </code>
          ))}
        </div>
      </div>

      <BuilderModal
        open={showBuilder}
        onClose={() => { setShowBuilder(false); setEditing(null); }}
        editing={editing}
        onSave={handleSave}
      />
    </div>
  );
}
