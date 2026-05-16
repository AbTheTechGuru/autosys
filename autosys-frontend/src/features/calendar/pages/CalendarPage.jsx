import { useState, useEffect, useCallback } from 'react';
import { Icon }    from '@/shared/components/ui/Icon';
import { Button }  from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { cn }      from '@/shared/utils/cn';
import { useToast } from '@/context/ToastContext';
import { calendarApi } from '@/services/api';

/* ── Constants ─────────────────────────────────────────────── */
const now = new Date();
const WEEKDAYS        = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const PRIORITY_COLORS = { low:'#6B7280', medium:'#F59E0B', high:'#EF4444', urgent:'#DC2626' };
const TYPE_ICONS      = { appointment:'📅', test_drive:'🚗', followup:'📞', meeting:'🤝', call:'📱', task:'✅', other:'📌' };

/* ── Formatters ────────────────────────────────────────────── */
const fmt     = (d) => new Date(d).toLocaleDateString('en-NG', { month:'short', day:'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-NG', { hour:'2-digit', minute:'2-digit' });

/* ── Mappers ───────────────────────────────────────────────── */
const mapTask = (t) => ({
  id:       t.id,
  title:    t.title,
  due_date: new Date(t.due_date),
  priority: t.priority || 'medium',
  status:   t.status   || 'pending',
  type:     t.type     || 'task',
  lead:     t.leads    ? { name: t.leads.name, id: t.leads.id } : null,
});

const mapEvent = (e) => ({
  id:         e.id,
  title:      e.title,
  type:       e.type || 'appointment',
  start_time: new Date(e.start_time),
  end_time:   new Date(e.end_time),
  status:     e.status || 'confirmed',
  location:   e.location || '',
  lead:       e.leads ? { name: e.leads.name, id: e.leads.id } : null,
});

/* ── Mini Calendar ─────────────────────────────────────────── */
function MiniCalendar({ selectedDate, onChange, eventDates = [] }) {
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const startDay    = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday    = (d) => d && month.getMonth() === now.getMonth() && month.getFullYear() === now.getFullYear() && d === now.getDate();
  const isSelected = (d) => d && selectedDate && selectedDate.getDate() === d && selectedDate.getMonth() === month.getMonth() && selectedDate.getFullYear() === month.getFullYear();
  const hasEvent   = (d) => d && eventDates.some((ed) => ed.getDate() === d && ed.getMonth() === month.getMonth() && ed.getFullYear() === month.getFullYear());

  return (
    <div className="bg-surface-1 border border-surface-4 rounded-[14px] p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="text-text-muted hover:text-text-primary px-2 py-1 transition-colors">‹</button>
        <p className="text-[12.5px] font-bold">{month.toLocaleDateString('en-NG', { month:'long', year:'numeric' })}</p>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="text-text-muted hover:text-text-primary px-2 py-1 transition-colors">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((d) => <p key={d} className="text-[9px] font-extrabold text-text-muted text-center py-0.5">{d}</p>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => (
          <button key={i} onClick={() => d && onChange(new Date(month.getFullYear(), month.getMonth(), d))} disabled={!d}
            className={cn(
              'h-7 w-full rounded-[6px] text-[11px] font-bold transition-colors relative',
              !d ? '' :
              isSelected(d) ? 'bg-gold text-[#0A0812]' :
              isToday(d)    ? 'bg-[rgba(200,151,58,.15)] text-gold border border-gold/40' :
              'text-text-secondary hover:bg-surface-3'
            )}>
            {d || ''}
            {hasEvent(d) && !isSelected(d) && (
              <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Task Row ──────────────────────────────────────────────── */
function TaskRow({ task, onToggle, onDelete }) {
  const isOverdue = task.due_date < now && task.status !== 'completed';
  const [acting, setActing] = useState(false);

  const handleToggle = async () => {
    setActing(true);
    await onToggle(task);
    setActing(false);
  };

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-[10px] border transition-all group',
      task.status === 'completed' ? 'bg-surface-2 border-surface-3 opacity-55' :
      isOverdue ? 'bg-[rgba(239,68,68,.05)] border-[rgba(239,68,68,.2)]' :
      'bg-surface-1 border-surface-4 hover:border-surface-5'
    )}>
      <button onClick={handleToggle} disabled={acting}
        className={cn(
          'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          task.status === 'completed' ? 'bg-status-ok border-status-ok' : 'border-surface-5 hover:border-gold'
        )}>
        {acting
          ? <span className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
          : task.status === 'completed' ? <span className="text-white text-[8px]">✓</span> : null}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-[12.5px] font-semibold', task.status === 'completed' ? 'line-through text-text-muted' : 'text-text-primary')}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-[3px] flex-wrap">
          {task.lead && <span className="text-[10.5px] text-text-muted">{task.lead.name}</span>}
          <span className="text-[9.5px] font-bold px-[5px] py-[1.5px] rounded-full"
            style={{ background:`${PRIORITY_COLORS[task.priority]}18`, color:PRIORITY_COLORS[task.priority] }}>
            {task.priority}
          </span>
          <span className={cn('text-[9.5px] font-bold', isOverdue ? 'text-red-400' : 'text-text-muted')}>
            {isOverdue ? '⚠️ Overdue · ' : ''}{fmt(task.due_date)}
          </span>
        </div>
      </div>
      <button onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all ml-1 shrink-0">
        <Icon name="x" size={12} />
      </button>
    </div>
  );
}

/* ── Event Card ────────────────────────────────────────────── */
function EventCard({ event, onDelete }) {
  return (
    <div className={cn(
      'flex gap-3 p-3 rounded-[10px] border bg-surface-1 group',
      event.status === 'tentative' ? 'border-dashed border-surface-4 opacity-80' : 'border-surface-4'
    )}>
      <span className="text-[18px] shrink-0 pt-0.5">{TYPE_ICONS[event.type] || '📌'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-bold text-text-primary">{event.title}</p>
        <p className="text-[10.5px] text-text-muted mt-[2px]">{fmtTime(event.start_time)} – {fmtTime(event.end_time)}</p>
        {event.lead     && <p className="text-[10.5px] text-text-muted mt-[1px]">👤 {event.lead.name}</p>}
        {event.location && <p className="text-[10.5px] text-text-muted mt-[1px]">📍 {event.location}</p>}
        {event.status === 'tentative' && (
          <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/10 px-[5px] py-[1.5px] rounded-full mt-1 inline-block">Tentative</span>
        )}
      </div>
      {onDelete && (
        <button onClick={() => onDelete(event.id)}
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all shrink-0">
          <Icon name="x" size={12} />
        </button>
      )}
    </div>
  );
}

/* ── Quick Add Task ────────────────────────────────────────── */
function QuickAddTask({ onAdd, onClose }) {
  const [title, setTitle]       = useState('');
  const [due, setDue]           = useState('');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving]     = useState(false);

  const save = async () => {
    if (!title || !due) return;
    setSaving(true);
    await onAdd({ title, dueDate: new Date(due).toISOString(), priority, type:'task' });
    setSaving(false);
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
          {['low','medium','high','urgent'].map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onClose} className="flex-1 text-[12px]">Cancel</Button>
        <Button onClick={save} disabled={!title || !due || saving} className="flex-1 text-[12px]">
          {saving ? <Spinner size={12} /> : 'Add Task'}
        </Button>
      </div>
    </div>
  );
}

/* ── Quick Add Event ───────────────────────────────────────── */
function QuickAddEvent({ onAdd, onClose }) {
  const [form, setForm]     = useState({ title:'', startTime:'', endTime:'', type:'appointment', location:'' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.title || !form.startTime) return;
    setSaving(true);
    await onAdd({
      title:     form.title,
      startTime: new Date(form.startTime).toISOString(),
      endTime:   form.endTime
        ? new Date(form.endTime).toISOString()
        : new Date(new Date(form.startTime).getTime() + 3600000).toISOString(),
      type:     form.type,
      location: form.location,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="bg-surface-2 border border-surface-4 rounded-[12px] p-4 space-y-3">
      <input value={form.title} onChange={set('title')} placeholder="Event title…"
        className="w-full bg-surface-1 border border-surface-4 rounded-[8px] px-3 py-2 text-[12.5px] text-text-primary outline-none focus:border-gold transition-colors" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] font-bold text-text-muted mb-1">Start time</p>
          <input type="datetime-local" value={form.startTime} onChange={set('startTime')}
            className="w-full bg-surface-1 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none focus:border-gold transition-colors" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-text-muted mb-1">End time</p>
          <input type="datetime-local" value={form.endTime} onChange={set('endTime')}
            className="w-full bg-surface-1 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none focus:border-gold transition-colors" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={form.type} onChange={set('type')}
          className="bg-surface-1 border border-surface-4 rounded-[8px] px-2 py-2 text-[12px] text-text-primary outline-none">
          {['appointment','test_drive','followup','meeting','call','other'].map((t) => (
            <option key={t} value={t}>{t.replace('_',' ')}</option>
          ))}
        </select>
        <input value={form.location} onChange={set('location')} placeholder="Location (optional)"
          className="bg-surface-1 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none focus:border-gold transition-colors" />
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onClose} className="flex-1 text-[12px]">Cancel</Button>
        <Button onClick={save} disabled={!form.title || !form.startTime || saving} className="flex-1 text-[12px]">
          {saving ? <Spinner size={12} /> : 'Add Event'}
        </Button>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export function CalendarPage() {
  const toast = useToast();

  const [tasks,        setTasks]        = useState([]);
  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedDate, setDate]         = useState(now);
  const [tab,          setTab]          = useState('tasks');
  const [showAddTask,  setShowAddTask]  = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);

  /* Fetch data */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const to   = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();
      const [tasksRes, eventsRes] = await Promise.all([
        calendarApi.getTasks(),
        calendarApi.getEvents({ from, to }),
      ]);
      setTasks((tasksRes.data?.tasks   ?? []).map(mapTask));
      setEvents((eventsRes.data?.events ?? []).map(mapEvent));
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load calendar', 'danger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Add task */
  const handleAddTask = async (form) => {
    try {
      const { data } = await calendarApi.createTask(form);
      setTasks((prev) => [...prev, mapTask(data.task)]);
      toast('Task created!', 'ok');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create task', 'danger');
    }
  };

  /* Toggle task */
  const handleToggleTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await calendarApi.updateTask(task.id, { status: newStatus });
      toast(newStatus === 'completed' ? 'Task completed! ✓' : 'Task reopened', 'ok');
    } catch {
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: task.status } : t));
      toast('Failed to update task', 'danger');
    }
  };

  /* Delete task */
  const handleDeleteTask = async (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await calendarApi.deleteTask(id);
      toast('Task deleted', 'ok');
    } catch {
      toast('Failed to delete task', 'danger');
      fetchData();
    }
  };

  /* Add event */
  const handleAddEvent = async (form) => {
    try {
      const { data } = await calendarApi.createEvent(form);
      setEvents((prev) => [...prev, mapEvent(data.event)]);
      toast('Event created!', 'ok');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create event', 'danger');
    }
  };

  /* Delete event */
  const handleDeleteEvent = async (id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await calendarApi.deleteEvent(id);
      toast('Event deleted', 'ok');
    } catch {
      toast('Failed to delete event', 'danger');
      fetchData();
    }
  };

  /* Derived */
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const overdueTasks = tasks.filter((t) => t.due_date < now && t.status !== 'completed');
  const todayEvents  = events.filter((e) => new Date(e.start_time).toDateString() === selectedDate.toDateString());
  const eventDates   = events.map((e) => new Date(e.start_time));

  return (
    <div className="max-w-[1200px] px-4 md:px-[22px] pt-[22px] pb-[88px] md:pb-[22px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-[23px] font-bold flex items-center gap-[10px]">
            <span className="text-xl">📅</span> Calendar & Tasks
          </h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {loading ? 'Loading…' : `${pendingTasks.length} pending · ${overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'No overdue tasks'}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowAddEvent(true)}>+ Event</Button>
          <Button size="sm" onClick={() => setShowAddTask(true)}>+ Task</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label:'Total Tasks',    value: tasks.length,        color:'#C8973A' },
          { label:'Pending',        value: pendingTasks.length, color:'#F59E0B' },
          { label:'Overdue',        value: overdueTasks.length, color:'#EF4444' },
          { label:"Today's Events", value: todayEvents.length,  color:'#3B82F6' },
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

      <div className="flex flex-col lg:flex-row gap-4">

        {/* Left: Mini calendar + today's events */}
        <div className="w-full lg:w-[280px] space-y-4 shrink-0">
          <MiniCalendar selectedDate={selectedDate} onChange={setDate} eventDates={eventDates} />

          <div className="bg-surface-1 border border-surface-4 rounded-[14px] p-4">
            <p className="text-[11px] font-extrabold text-text-muted uppercase tracking-widest mb-3">
              {selectedDate.toDateString() === now.toDateString() ? "Today's Events" : fmt(selectedDate)}
            </p>
            {loading
              ? <div className="space-y-2">{Array(2).fill(0).map((_, i) => <div key={i} className="h-14 bg-surface-3 rounded-[8px] animate-pulse" />)}</div>
              : todayEvents.length === 0
                ? <p className="text-[12px] text-text-muted text-center py-3">No events scheduled</p>
                : <div className="space-y-2">{todayEvents.map((e) => <EventCard key={e.id} event={e} onDelete={handleDeleteEvent} />)}</div>
            }
            <button onClick={() => setShowAddEvent(true)} className="w-full mt-3 text-[11px] font-bold text-gold hover:text-gold/80 transition-colors py-1">
              + Add Event
            </button>
          </div>
        </div>

        {/* Right: Tasks + all events */}
        <div className="flex-1">
          {/* Tabs */}
          <div className="flex gap-1.5 mb-4">
            {[
              { key:'tasks',      label:`Tasks (${pendingTasks.length})` },
              { key:'all_events', label:`All Events (${events.length})`  },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn(
                  'px-4 py-[6px] text-[11.5px] font-bold rounded-[8px] transition-colors',
                  tab === t.key ? 'bg-gold text-[#0A0812]' : 'bg-surface-2 text-text-muted hover:bg-surface-3'
                )}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Quick add forms */}
          {showAddTask  && <div className="mb-4"><QuickAddTask  onAdd={handleAddTask}  onClose={() => setShowAddTask(false)}  /></div>}
          {showAddEvent && <div className="mb-4"><QuickAddEvent onAdd={handleAddEvent} onClose={() => setShowAddEvent(false)} /></div>}

          {/* Skeleton */}
          {loading && (
            <div className="space-y-2">
              {Array(4).fill(0).map((_, i) => <div key={i} className="h-14 bg-surface-2 border border-surface-4 rounded-[10px] animate-pulse" />)}
            </div>
          )}

          {/* Tasks tab */}
          {!loading && tab === 'tasks' && (
            <div className="space-y-2">
              {overdueTasks.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest px-1 mb-2">Overdue ({overdueTasks.length})</p>
                  {overdueTasks.map((t) => <TaskRow key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteTask} />)}
                </div>
              )}
              {tasks.filter((t) => t.due_date >= now && t.status !== 'completed').length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest px-1 mb-2 mt-2">Upcoming</p>
                  {tasks.filter((t) => t.due_date >= now && t.status !== 'completed').map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
                  ))}
                </div>
              )}
              {tasks.filter((t) => t.status === 'completed').length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest px-1 mb-2 mt-4">Completed</p>
                  {tasks.filter((t) => t.status === 'completed').map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
                  ))}
                </div>
              )}
              {tasks.length === 0 && (
                <div className="text-center py-10 text-text-muted bg-surface-1 border border-surface-4 rounded-[14px]">
                  <span className="text-[36px]">✅</span>
                  <p className="text-[13px] font-semibold mt-2">No tasks yet</p>
                  <p className="text-[12px] mt-1">Click "+ Task" to add your first task</p>
                </div>
              )}
            </div>
          )}

          {/* All events tab */}
          {!loading && tab === 'all_events' && (
            <div className="space-y-2">
              {events.length === 0 && (
                <div className="text-center py-10 text-text-muted bg-surface-1 border border-surface-4 rounded-[14px]">
                  <span className="text-[36px]">📅</span>
                  <p className="text-[13px] font-semibold mt-2">No events yet</p>
                  <p className="text-[12px] mt-1">Click "+ Event" to schedule your first event</p>
                </div>
              )}
              {events.map((e) => <EventCard key={e.id} event={e} onDelete={handleDeleteEvent} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
