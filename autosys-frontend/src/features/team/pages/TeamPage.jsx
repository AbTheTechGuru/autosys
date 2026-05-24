import { useState, useEffect, useCallback } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { Modal }   from '@/shared/components/ui/Modal';
import { Input, Field } from '@/shared/components/ui/Input';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { fmtM }    from '@/shared/utils/format';
import { G }       from '@/shared/utils/tokens';
import { teamApi, commissionsApi } from '@/services/api';

const STATUS_COLOR = { Online:'#16A34A', Away:'#D97706', Offline:'#4E4B58', online:'#16A34A', away:'#D97706', offline:'#4E4B58' };
const TEAM_TABS = [{ key:'members',label:'Members'},{ key:'commission',label:'Commission'},{ key:'activity',label:'Activity'}];

function InviteModal({ open, onClose, onInvited }) {
  const toast = useToast();
  const [form,setSaving_] = useState({name:'',email:'',role:'agent'});
  const [saving,setSaving]= useState(false);
  const set=(k)=>(e)=>setSaving_(f=>({...f,[k]:e.target.value}));

  const handleInvite=async()=>{
    if(!form.email)return;
    setSaving(true);
    try{
      const{data}=await teamApi.inviteMember(form);
      onInvited(data.member||data);
      toast(`Invitation sent to ${form.email}!`,'ok');
      onClose();
    }catch(err){toast(err.response?.data?.message||'Failed to invite','danger');}
    finally{setSaving(false);}
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite Team Member" maxWidth={440}>
      <div className="space-y-3">
        <Field label="Full Name"><Input value={form.name} onChange={set('name')} placeholder="Chukwuemeka Obi"/></Field>
        <Field label="Email Address *"><Input type="email" value={form.email} onChange={set('email')} placeholder="agent@dealership.com"/></Field>
        <Field label="Role">
          <select value={form.role} onChange={set('role')} className="w-full bg-surface-3 border border-surface-4 rounded-[9px] px-3 py-2 text-[12.5px] text-text-primary outline-none">
            <option value="agent">Sales Agent</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </Field>
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleInvite} disabled={!form.email||saving} className="flex-1">{saving?<Spinner size={13}/>:'Send Invitation'}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function TeamPage() {
  const toast = useToast();
  const [tab,       setTab]       = useState('members');
  const [members,   setMembers]   = useState([]);
  const [commissions,setComm]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showInvite,setShowInvite]= useState(false);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const [teamRes, commRes] = await Promise.allSettled([
        teamApi.getMembers(),
        commissionsApi.getCommissions(),
      ]);
      if (teamRes.status==='fulfilled') setMembers(teamRes.value.data.members ?? teamRes.value.data ?? []);
      if (commRes.status==='fulfilled') setComm(commRes.value.data.commissions ?? commRes.value.data ?? []);
    } catch (err) { toast(err.response?.data?.message||'Failed to load team','danger'); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchTeam(); },[fetchTeam]);

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await teamApi.updateMember(memberId, { role:newRole });
      setMembers(prev=>prev.map(m=>m.id===memberId?{...m,role:newRole}:m));
      toast('Role updated','ok');
    } catch { toast('Failed to update role','danger'); }
  };

  const onlineCount = members.filter(m=>(m.status||m.presence||'offline').toLowerCase()==='online').length;

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Team & Commission</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">{loading?'Loading…':`${members.length} members · ${onlineCount} online`}</p>
        </div>
        <Button variant="gold" size="sm" onClick={()=>setShowInvite(true)}><Icon name="plus" size={13}/>Invite Member</Button>
      </div>

      <Tabs tabs={TEAM_TABS} active={tab} onChange={setTab} className="mb-5"/>

      {/* Members tab */}
      {tab==='members'&&(
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {loading&&Array(4).fill(0).map((_,i)=><div key={i} className="bg-surface-2 border border-surface-4 rounded-[14px] p-5 animate-pulse h-48"/>)}
          {!loading&&members.map(m=>(
            <div key={m.id} className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
              <div className="flex items-center gap-[11px] mb-4">
                <div className="relative shrink-0">
                  <Avatar initials={toInitials(m.name||m.full_name||'?')} size={44}/>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-2" style={{background:STATUS_COLOR[(m.status||m.presence||'offline').toLowerCase()]||G.t2}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold truncate">{m.name||m.full_name||m.email}</div>
                  <div className="text-[11.5px] text-text-muted capitalize">{m.role}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[['Leads',m.lead_count??0,G.bl],['Deals',m.deal_count??0,G.g],['Rev',m.revenue?fmtM(m.revenue/100):'—',G.ok]].map(([l,v,c])=>(
                  <div key={l} className="bg-surface-3 rounded-[8px] p-2 text-center border border-surface-4">
                    <div className="font-display text-[16px] font-bold" style={{color:c}}>{v}</div>
                    <div className="text-[9.5px] text-text-muted mt-[1px]">{l}</div>
                  </div>
                ))}
              </div>
              <select value={m.role} onChange={e=>handleRoleChange(m.id,e.target.value)} className="w-full bg-surface-3 border border-surface-4 rounded-[8px] px-2 py-1.5 text-[12px] text-text-primary outline-none">
                <option value="agent">Sales Agent</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          ))}
          {!loading&&members.length===0&&<div className="col-span-4 text-center py-10 text-text-muted bg-surface-2 border border-surface-4 rounded-[14px]"><p className="text-[14px] font-semibold">No team members yet</p><Button variant="ghost" size="sm" className="mt-2" onClick={()=>setShowInvite(true)}>Invite first member →</Button></div>}
        </div>
      )}

      {/* Commission tab */}
      {tab==='commission'&&(
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-surface-4" style={{background:G.s3}}>{['Agent','Deals','Revenue','Commission Rate','Commission Earned','Status'].map(h=><th key={h} className="text-left py-3 px-4 text-[10.5px] font-extrabold uppercase tracking-[1px] text-text-muted">{h}</th>)}</tr></thead>
            <tbody>
              {loading&&Array(3).fill(0).map((_,i)=><tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-surface-3 rounded animate-pulse"/></td></tr>)}
              {!loading&&commissions.map((c,i)=>(
                <tr key={i} className="border-b border-surface-4 last:border-0 hover:bg-surface-3">
                  <td className="py-3 px-4 font-bold">{c.agent||c.name||'—'}</td>
                  <td className="py-3 px-4">{c.deals||c.deal_count||0}</td>
                  <td className="py-3 px-4 font-extrabold" style={{color:G.ok}}>{c.revenue?fmtM(c.revenue/100):'—'}</td>
                  <td className="py-3 px-4">{c.rate||c.commission_rate||2}%</td>
                  <td className="py-3 px-4 font-extrabold" style={{color:G.g}}>{c.commission||c.earned?fmtM((c.commission||c.earned||0)/100):'—'}</td>
                  <td className="py-3 px-4"><span className="text-[11px] font-bold px-2 py-[2px] rounded-[5px]" style={{color:c.paid?G.ok:G.wa,background:`${c.paid?G.ok:G.wa}18`}}>{c.paid?'Paid':'Pending'}</span></td>
                </tr>
              ))}
              {!loading&&commissions.length===0&&<tr><td colSpan={6} className="py-8 text-center text-text-muted">No commission data yet — complete some deals first</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity tab */}
      {tab==='activity'&&(
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
          <p className="text-[13px] text-text-muted text-center py-8">Team activity feed coming soon — connect a real-time provider in Settings → Integrations</p>
        </div>
      )}

      <InviteModal open={showInvite} onClose={()=>setShowInvite(false)} onInvited={m=>setMembers(prev=>[...prev,m])}/>
    </div>
  );
}
