import { useState, useEffect, useCallback } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { Spinner } from '@/shared/components/ui/Spinner';
import { Input, Field, Select } from '@/shared/components/ui/Input';
import { Modal }   from '@/shared/components/ui/Modal';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { useToast } from '@/context/ToastContext';
import client from '@/services/api/client';
import { analyticsApi } from '@/services/api/index';
import { fmtM } from '@/shared/utils/format';
import { G }    from '@/shared/utils/tokens';
import { cn }   from '@/shared/utils/cn';

const TEAM_TABS   = [{ key:'members', label:'Members' }, { key:'commission', label:'Commission' }];
const STATUS_COLOR = { Online:'#16A34A', Away:'#D97706', Offline:'#4E4B58' };

function statusFromSeen(lastSeen) {
  if (!lastSeen) return 'Offline';
  const mins = (Date.now() - new Date(lastSeen)) / 60000;
  if (mins < 5)   return 'Online';
  if (mins < 60)  return 'Away';
  return 'Offline';
}

/* ── Invite modal ────────────────────────────────────────────── */
function InviteModal({ open, onClose, onInvited }) {
  const toast = useToast();
  const [form, setForm] = useState({ email:'', name:'', role:'agent' });
  const [isInviting, setIsInviting] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleInvite = async () => {
    if (!form.email || !form.name) { toast('Email and name required', 'warning'); return; }
    setIsInviting(true);
    try {
      const { data } = await client.post('/team/invite', form);
      toast(`Invitation sent to ${form.email}!`);
      onInvited(data.user ?? data);
      onClose();
      setForm({ email:'', name:'', role:'agent' });
    } catch (err) {
      toast(err.response?.data?.message || 'Invite failed', 'danger');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite Team Member" maxWidth={420}>
      <div className="flex flex-col gap-3">
        <Field label="Full Name *">
          <Input placeholder="Chukwuemeka Obi" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email *">
          <Input type="email" placeholder="member@dealership.com" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={set('role')}>
            <option value="agent">Sales Agent</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </Select>
        </Field>
        <div className="flex gap-2 mt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="gold" onClick={handleInvite} disabled={isInviting} className="flex-1">
            {isInviting ? <><Spinner size={13} />Sending…</> : <><Icon name="plus" size={13} />Invite</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export function TeamPage() {
  const toast = useToast();

  const [members,   setMembers]   = useState([]);
  const [agentKpis, setAgentKpis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab,       setTab]       = useState('members');
  const [inviteOpen, setInvite]   = useState(false);

  const fetchTeam = useCallback(async () => {
    setIsLoading(true);
    try {
      const [teamRes, kpiRes] = await Promise.allSettled([
        client.get('/team'),
        analyticsApi.agentKpis(),
      ]);

      if (teamRes.status === 'fulfilled') {
        const raw = teamRes.value.data.members ?? [];
        const mapped = raw.map((m) => ({
          id:     m.id,
          name:   m.full_name || m.name,
          role:   m.role.charAt(0).toUpperCase() + m.role.slice(1),
          status: statusFromSeen(m.last_seen_at),
          email:  m.email,
          img:    (m.full_name || m.name || 'XX').split(' ').map((n) => n[0]).join('').slice(0, 2),
          leads:  0,
          deals:  0,
          rev:    0,
          comm:   0,
        }));
        setMembers(mapped);
      }

      if (kpiRes.status === 'fulfilled') {
        setAgentKpis(kpiRes.value.data.agents ?? []);
      }
    } catch { /* keep empty — no seed data for team */ } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  // Merge agent KPIs into members
  const enriched = members.map((m) => {
    const kpi = agentKpis.find((k) => k.agent_id === m.id || k.name === m.name);
    if (!kpi) return m;
    return {
      ...m,
      leads: kpi.leads ?? 0,
      deals: kpi.deals ?? 0,
      rev:   Math.round((kpi.revenue ?? 0) / 100), // kobo → naira
      comm:  Math.round((kpi.commission ?? 0) / 100),
    };
  });

  const totalComm   = enriched.reduce((s, m) => s + m.comm, 0);
  const onlineCount = members.filter((m) => m.status === 'Online').length;
  const maxRev      = enriched.reduce((max, m) => Math.max(max, m.rev), 1);

  const removeTeamMember = async (id, name) => {
    if (!window.confirm(`Remove ${name} from the team?`)) return;
    try {
      await client.delete(`/team/${id}`);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast(`${name} removed from team`);
    } catch (err) {
      toast(err.response?.data?.message || 'Remove failed', 'danger');
    }
  };

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Team &amp; Commission</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {members.length} members · {onlineCount} online
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => setInvite(true)}>
          <Icon name="plus" size={13} />Invite Member
        </Button>
      </div>

      <Tabs tabs={TEAM_TABS} active={tab} onChange={setTab} className="mb-5" />

      {/* ── Members tab ─────────────────────────────────── */}
      {tab === 'members' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading
            ? Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-[220px] bg-surface-2 border border-surface-4 rounded-[14px] animate-pulse" />
              ))
            : enriched.length === 0
              ? (
                <div className="col-span-full text-center py-12 text-text-muted">
                  <Icon name="users" size={32} color="#4E4B58" />
                  <p className="text-[13px] font-semibold mt-3">No team members yet</p>
                  <p className="text-[12px] mt-1">Invite your first team member to get started</p>
                </div>
              )
              : enriched.map((m) => (
                <div key={m.id}
                  className="bg-surface-2 border border-surface-4 rounded-[14px] p-5 flex flex-col items-center text-center hover:border-[rgba(200,151,58,.2)] transition-all group">
                  <div className="relative mb-3">
                    <Avatar initials={m.img || toInitials(m.name)} size={52} />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface-2"
                      style={{ background: STATUS_COLOR[m.status] || '#4E4B58' }} />
                  </div>
                  <p className="font-extrabold text-[14px]">{m.name}</p>
                  <p className="text-[12px] text-text-secondary mb-1">{m.role}</p>
                  <span className="text-[10px] font-bold px-2 py-[2px] rounded-full mb-3"
                    style={{ background:`${STATUS_COLOR[m.status] || '#4E4B58'}18`, color:STATUS_COLOR[m.status] || '#6B7280' }}>
                    {m.status}
                  </span>
                  <div className="grid grid-cols-3 gap-2 w-full mb-3">
                    {[['Leads',m.leads,G.bl],['Deals',m.deals,G.g],['Rev',fmtM(m.rev),G.ok]].map(([l,v,c]) => (
                      <div key={l} className="bg-surface-3 rounded-[7px] p-[7px]">
                        <p className="font-extrabold text-[12px]" style={{ color:c }}>{v}</p>
                        <p className="text-[9.5px] text-text-muted">{l}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => removeTeamMember(m.id, m.name)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10.5px] text-text-muted hover:text-red-400 mt-1">
                    Remove
                  </button>
                </div>
              ))
          }
        </div>
      )}

      {/* ── Commission tab ──────────────────────────────── */}
      {tab === 'commission' && (
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-surface-4">
            <div className="font-display text-[18px] font-bold">Commission Summary</div>
            <div className="text-[13px] text-text-secondary">
              Total Paid: <span className="text-gold font-extrabold">{fmtM(totalComm)}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array(4).fill(0).map((_, i) => <div key={i} className="h-[70px] bg-surface-3 rounded-[10px] animate-pulse" />)}
            </div>
          ) : enriched.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p className="text-[13px]">No commission data available yet</p>
            </div>
          ) : enriched.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-[14px] border-b border-[rgba(33,33,46,.35)] last:border-0">
              <Avatar initials={m.img || toInitials(m.name)} size={36} />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-[13.5px]">{m.name}</p>
                <div className="h-[4px] bg-surface-5 rounded-[2px] mt-[6px] overflow-hidden">
                  <div className="h-full rounded-[2px] transition-[width] duration-[1s]"
                    style={{ width: maxRev > 0 ? `${(m.rev / maxRev) * 100}%` : '0%',
                      background: `linear-gradient(90deg,${G.gd},${G.gl})` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-extrabold text-[13px]">{fmtM(m.comm)}</p>
                <p className="text-[11px] text-text-muted">from {fmtM(m.rev)} rev</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <InviteModal
        open={inviteOpen}
        onClose={() => setInvite(false)}
        onInvited={(newMember) => {
          setMembers((prev) => [...prev, {
            id:     newMember.id || `local-${Date.now()}`,
            name:   newMember.full_name || newMember.name,
            role:   (newMember.role || 'agent').charAt(0).toUpperCase() + (newMember.role || 'agent').slice(1),
            status: 'Offline',
            email:  newMember.email,
            img:    toInitials(newMember.full_name || newMember.name),
            leads:0, deals:0, rev:0, comm:0,
          }]);
        }}
      />
    </div>
  );
}
