import { useState } from 'react';
import { Icon }    from '@/shared/components/ui/Icon';
import { Button }  from '@/shared/components/ui/Button';
import { Badge }   from '@/shared/components/ui/Badge';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { cn }      from '@/shared/utils/cn';
import { useToast } from '@/context/ToastContext';

/* ── Helpers ────────────────────────────────────────────────── */
const now = new Date();
const fmt = (d) => new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
const addDays = (n) => new Date(now.getTime() + n * 86400000);

const PRIORITY_COLORS = { low: '#6B7280', medium: '#F59E0B', high: '#EF4444', urgent: '#DC2626' };
const STATUS_COLORS   = { pending: '#F59E0B', in_progress: '#3B82F6', completed: '#16A34A', cancelled: '#6B7280' };
const TYPE_ICONS      = { appointment: '📅', test_drive: '🚗', followup: '📞', meeting: '🤝', call: '📱', other: '📌' };

/* ── Demo data ──────────────────────────────────────────────── */
const DEMO_TASKS = [
  { id: '1', title: 'Follow up with Emeka Okafor',    due_date: addDays(0), priority: 'high',   status: 'pending',     lead: { name: 'Emeka Okafor' },   type: 'followup' },
  { id: '2', title: 'Send documents to Amaka Nwosu',  due_date: addDays(0), priority: 'medium', status: 'in_progress', lead: { name: 'Amaka Nwosu' },    type: 'task' },
  { id: '3', title: 'Schedule test drive — Fatima',   due_date: addDays(1), priority: 'high',   status: 'pending',     lead: { name: 'Fatima Aliyu' },   type: 'test_drive' },
  { id: '4', title: 'Prepare commission report',      due_date: addDays(2), priority: 'low',    status: 'pending',     lead: null,                        type: 'task' },
  { id: '5', title: 'Call Biodun about Land Cruiser', due_date: addDays(3), priority: 'urgent', status: 'pending',     lead: { name: 'Biodun Adeyemi' }, type: 'call' },
  { id: '6', title: 'Review insurance for Honda CRV', due_date: addDays(-1), priority: 'medium', status: 'completed',  lead: null,                        type: 'task' },
];

const DEMO_EVENTS = [
  { id: 'e1', title: 'Test drive — Emeka', type: 'test_drive', start_time: addDays(0).setHours(10, 0), end_time: addDays(0).setHours(11, 0), lead: { name: 'Emeka Okafor' }, status: 'confirmed' },
  { id: 'e2', title: 'Finance meeting', type: 'meeting', start_time: addDays(0).setHours(14, 30), end_time: addDays(0).setHours(15, 30), lead: null, status: 'confirmed' },
  { id: 'e3', title: 'Call with Fatima', type: 'call', start_time: addDays(1).setHours(9, 0), end_time: addDays(1).setHours(9, 30), lead: { name: 'Fatima Aliyu' }, status: 'tentative' },
  { id: 'e4', title: 'Vehicle viewing — Biodun', type: 'appointment', start_time: addDays(2).setHours(11, 0), end_time: addDays(2).setHours(12, 0), lead: { name: 'Biodun Adeyemi' }, status: 'confirmed' },
  { id: 'e5', title: 'Quarterly review', type: 'meeting', start_time: addDays(4).setHours(13, 0), end_time: addDays(4).setHours(15, 0), lead: null, status: 'confirmed' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ── Mini Calendar ──────────────────────────────────────────── */
function MiniCalendar({ selectedDate, onChange }) {
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const startDay    = new Date(month.getFullYear(), month.getMonth(), 1).getDay();

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) =>
    d && month.getMonth() === now.getMonth() && month.getFullYear() === now.getFullYear() && d === now.getDate();

  const isSelected = (d) =>
    d && selectedDate &&
    selectedDate.getDate() === d &&
    selectedDate.getMonth() === month.getMonth() &&
    selectedDate.getFullYear() === month.getFullYear();

  return (
    <div className="bg-surface-1 border border-surface-4 rounded-[14px] p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="text-text-muted hover:text-text-primary transition-colors px-2 py-1">‹</button>
        <p className="text-[12.5px] font-bold text-text-primary">
          {month.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
        </p>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="text-text-muted hover:text-text-primary transition-colors px-2 py-1">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((d) => (
          <p key={d} className="text-[9px] font-extrabold text-text-muted text-center py-0.5">{d}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => (
          <button key={i}
            onClick={() => d && onChange(new Date(month.getFullYear(), month.getMonth(), d))}
            disabled={!d}
            className={cn(
              'h-7 w-full rounded-[6px] text-[11px] font-bold transition-colors',
              !d ? '' :
              isSelected(d) ? 'bg-gold text-[#0A0812]' :
              isToday(d)    ? 'bg-[rgba(200,151,58,.15)] text-gold border border-gold/40' :
              'text-text-secondary hover:bg-surface-3'
            )}>
            {d || ''}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Task Row ───────────────────────────────────────────────── */
function TaskRow({ task, onComplete }) {
  const isOverdue = new Date(task.due_date) < now && task.status !== 'completed';

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-[10px] border transition-all group',
      task.status === 'completed'
        ? 'bg-surface-2 border-surface-3 opacity-55'
        : isOverdue
          ? 'bg-[rgba(239,68,68,.05)] border-[rgba(239,68,68,.2)]'
          : 'bg-surface-1 border-surface-4 hover:border-surface-5'
    )}>
      <button onClick={() => onComplete(task.id)}
        className={cn(
          'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          task.status === 'completed' ? 'bg-status-ok border-status-ok' : 'border-surface-5 hover:border-gold'
        )}>
        {task.status === 'completed' && <span className="text-white text-[8px]">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-[12.5px] font-semibold', task.status === 'completed' ? 'line-through text-text-muted' : 'text-text-primary')}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-[3px] flex-wrap">
          {task.lead && (
            <span className="text-[10.5px] text-text-muted">{task.lead.name}</span>
          )}
          <span className={cn('text-[9.5px] font-bold px-[5px] py-[1.5px] rounded-full')}
            style={{ background: `${PRIORITY_COLORS[task.priority]}18`, color: PRIORITY_COLORS[task.priority] }}>
            {task.priority}
          </span>
          <span className={cn('text-[9.5px] font-bold', isOverdue ? 'text-red-400' : 'text-text-muted')}>
            {isOverdue ? '⚠️ Overdue · ' : ''}{fmt(task.due_date)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Event Card ─────────────────────────────────────────────── */
function EventCard({ event }) {
  const emoji = TYPE_ICONS[event.type] || '📌';
  return (
    <div className={cn(
      'flex gap-3 p-3 rounded-[10px] border bg-surface-1 border-surface-4',
      event.status === 'tentative' && 'border-dashed opacity-80'
    )}>
      <div className="flex flex-col items-center justify-start text-center w-10 shrink-0 pt-0.5">
        <span className="text-[16px]">{emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-bold text-text-primary">{event.title}</p>
        <p className="text-[10.5px] text-text-muted mt-[2px]">
          {fmtTime(event.start_time)} – {fmtTime(event.end_time)}
        </p>
        {event.lead && (
          <p className="text-[10.5px] text-text-muted mt-[1px]">👤 {event.lead.name}</p>
        )}
        {event.status === 'tentative' && (
          <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/10 px-[5px] py-[1.5px] rounded-full mt-1 inline-block">
            Tentative
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Add Task Modal (inline) ────────────────────────────────── */
function QuickAddTask({ onAdd, onClose }) {
  const [title, setTitle]       = useState('');
  const [due, setDue]           = useState('');
  const [priority, setPriority] = useState('medium');

  const save = () => {
    if (!title || !due) return;
    onAdd({ id: String(Date.now()), title, due_date: new Date(due), priority, status: 'pending', lead: null, type: 'task' });
    onClose();
  };

  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[12px] p-4 space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title…"
        className="w-full bg-surface-1 border border-surface-4 rounded-[8px] px-3 py-2 text-[12.5px] text-text-primary outline-none focus:border-gold transition-colors" />
      <div className="flex gap-2">
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
          className="flex-1 bg-surface-1 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none focus:border-gold transition-colors" />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}
          className="bg-surface-1 border border-surface-4 rounded-[8px] px-2 py-2 text-[12px] text-text-primary outline-none">
          {['low', 'medium', 'high', 'urgent'].map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onClose} className="flex-1 text-[12px]">Cancel</Button>
        <Button onClick={save} disabled={!title || !due} className="flex-1 text-[12px]">Add Task</Button>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export function CalendarPage() {
  const toast = useToast();
  const [tasks, setTasks]           = useState(DEMO_TASKS);
  const [events]                    = useState(DEMO_EVENTS);
  const [selectedDate, setDate]     = useState(now);
  const [tab, setTab]               = useState('tasks');
  const [showQuickAdd, setQuickAdd] = useState(false);

  const completeTask = (id) => {
    setTasks((prev) => prev.map((t) =>
      t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
    ));
    toast('Task updated!');
  };

  const addTask = (task) => {
    setTasks((prev) => [...prev, task]);
    toast('Task created!');
  };

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const overdueTasks = tasks.filter((t) => new Date(t.due_date) < now && t.status !== 'completed');
  const todayEvents  = events.filter((e) => {
    const d = new Date(e.start_time);
    return d.toDateString() === selectedDate.toDateString();
  });

  return (
    <div className="max-w-[1200px] px-4 md:px-[22px] pt-[22px] pb-[88px] md:pb-[22px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-[10px]">
            <span className="text-xl">📅</span> Calendar & Tasks
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {pendingTasks.length} pending · {overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'No overdue tasks'}
          </p>
        </div>
        <Button onClick={() => setQuickAdd(true)}>+ Add Task</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Tasks',    value: tasks.length,             color: '#C8973A' },
          { label: 'Pending',        value: pendingTasks.length,      color: '#F59E0B' },
          { label: 'Overdue',        value: overdueTasks.length,      color: '#EF4444' },
          { label: "Today's Events", value: todayEvents.length,       color: '#3B82F6' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-1 border border-surface-4 rounded-[12px] p-4 text-center">
            <p className="text-[24px] font-display font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] font-bold text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Calendar + Events */}
        <div className="w-full lg:w-[280px] space-y-4 shrink-0">
          <MiniCalendar selectedDate={selectedDate} onChange={setDate} />

          {/* Today's events */}
          <div className="bg-surface-1 border border-surface-4 rounded-[14px] p-4">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">
              {selectedDate.toDateString() === now.toDateString() ? "Today's Events" : fmt(selectedDate)}
            </p>
            {todayEvents.length === 0 ? (
              <p className="text-[12px] text-text-muted text-center py-3">No events scheduled</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            )}
            <button className="w-full mt-3 text-[11px] font-bold text-gold hover:text-gold/80 transition-colors py-1">
              + Add Event
            </button>
          </div>
        </div>

        {/* Right: Tasks */}
        <div className="flex-1">
          {/* Tab bar */}
          <div className="flex gap-1.5 mb-4">
            {['tasks', 'all_events'].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('px-4 py-[6px] text-[11.5px] font-bold rounded-[8px] capitalize transition-colors',
                  tab === t ? 'bg-gold text-[#0A0812]' : 'bg-surface-2 text-text-muted hover:bg-surface-3')}>
                {t === 'tasks' ? `Tasks (${pendingTasks.length})` : `All Events (${events.length})`}
              </button>
            ))}
          </div>

          {/* Quick add */}
          {showQuickAdd && (
            <div className="mb-4">
              <QuickAddTask onAdd={addTask} onClose={() => setQuickAdd(false)} />
            </div>
          )}

          {/* Task list */}
          {tab === 'tasks' && (
            <div className="space-y-2">
              {/* Overdue */}
              {overdueTasks.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest px-1 mb-2">
                    Overdue ({overdueTasks.length})
                  </p>
                  {overdueTasks.map((t) => <TaskRow key={t.id} task={t} onComplete={completeTask} />)}
                </div>
              )}

              {/* Pending */}
              <div>
                <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest px-1 mb-2 mt-4">
                  Upcoming
                </p>
                {tasks.filter((t) => new Date(t.due_date) >= now && t.status !== 'completed').map((t) => (
                  <TaskRow key={t.id} task={t} onComplete={completeTask} />
                ))}
              </div>

              {/* Completed */}
              <div>
                <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest px-1 mb-2 mt-4">
                  Completed
                </p>
                {tasks.filter((t) => t.status === 'completed').map((t) => (
                  <TaskRow key={t.id} task={t} onComplete={completeTask} />
                ))}
              </div>
            </div>
          )}

          {/* All events */}
          {tab === 'all_events' && (
            <div className="space-y-2">
              {events.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
