import { useState, useEffect } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Badge }   from '@/shared/components/ui/Badge';
import { Icon }    from '@/shared/components/ui/Icon';
import { Modal }   from '@/shared/components/ui/Modal';
import { Input, Select, Field } from '@/shared/components/ui/Input';
import { SearchBar } from '@/shared/components/ui/Input';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { Spinner } from '@/shared/components/ui/Spinner';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { TableRowSkeleton } from '@/shared/components/ui/Skeleton';
import { useToast }   from '@/context/ToastContext';
import { useCrmStore }   from '@/store/crmStore';
import { aiApi }         from '@/services/api/index';
import { validate, leadSchema } from '@/schemas';
import { sanitizeObject }       from '@/shared/utils/sanitize';
import { fmtM }  from '@/shared/utils/format';
import { G }     from '@/shared/utils/tokens';
import { cn }    from '@/shared/utils/cn';
import { LEAD_SOURCES } from '@/shared/constants';

const STAGE_COLOR = { New: G.bl, Contacted: G.wa, Closed: G.ok };
const SCORE_COLOR = (s) => s >= 80 ? G.ok : s >= 60 ? G.wa : G.er;

const STAGE_TABS = [
  { key:'all', label:'All' },
  { key:'new', label:'New' },
  { key:'contacted', label:'Contacted' },
  { key:'closed', label:'Closed' },
];

function ScoreRing({ score }) {
  return (
    <div
      className="w-[34px] h-[34px] rounded-full flex items-center justify-center font-extrabold text-[11px] border-2"
      style={{ borderColor: SCORE_COLOR(score), color: SCORE_COLOR(score) }}
      aria-label={`Lead score: ${score}`}
    >
      {score}
    </div>
  );
}

function LeadDetail({ lead, onClose }) {
  const toast       = useToast();
  const updateStage = useCrmStore((s) => s.updateStage);
  const addNote     = useCrmStore((s) => s.addNote);
  const removeLead  = useCrmStore((s) => s.removeLead);

  const [aiLoad, setAiLoad]     = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [note, setNote]         = useState('');
  const [deleting, setDeleting] = useState(false);

  const generateFollowUp = async () => {
    setAiLoad(true);
    try {
      const { data } = await aiApi.followup(lead.id);
      setFollowUp(data.text);
    } catch (err) {
      toast(err.message || 'AI unavailable', 'danger');
    }
    setAiLoad(false);
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    await addNote(lead.id, note);
    setNote('');
    toast('Note saved!', 'ok');
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await removeLead(lead.id);
      toast('Lead deleted', 'ok');
      onClose();
    } catch (err) {
      toast('Failed to delete lead', 'danger');
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-[17px] py-[14px] border-b border-surface-4 shrink-0">
        <span className="font-display text-[17px] font-bold">Lead Detail</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={handleDelete} disabled={deleting} aria-label="Delete lead">
            {deleting ? <Spinner size={12} /> : <Icon name="trash" size={13} color="#F87171" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <Icon name="x" size={13} />
          </Button>
        </div>
      </div>

      <div className="px-[17px] py-[14px] border-b border-surface-4">
        <div className="flex items-center gap-[11px] mb-3">
          <Avatar initials={toInitials(lead.name)} size={42} />
          <div>
            <div className="font-extrabold text-[15px]">{lead.name}</div>
            <Badge>{lead.stage}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[7px]">
          {[['Phone',lead.phone],['Email',lead.email],['Car',lead.vehicle_interest||lead.car],['Budget',fmtM(lead.budget)],['Source',lead.source||lead.src],['Agent',lead.agent]].map(([k,v]) => (
            <div key={k} className="bg-surface-3 rounded-[7px] px-[9px] py-[7px] border border-surface-4">
              <div className="text-[9.5px] text-text-muted uppercase tracking-[.8px] mb-[1px]">{k}</div>
              <div className="text-[12.5px] font-extrabold truncate">{v || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-[17px] py-3 border-b border-surface-4">
        <p className="text-[10px] text-text-muted font-extrabold uppercase tracking-[1px] mb-2">Update Stage</p>
        <div className="flex gap-[5px]">
          {['New','Contacted','Closed'].map((s) => (
            <button
              key={s}
              onClick={() => { updateStage(lead.id, s); toast(`Stage → ${s}`); }}
              className={cn(
                'flex-1 text-[11px] font-extrabold py-[5px] rounded-[7px] border cursor-pointer transition-all',
                lead.stage === s ? 'text-surface-bg' : 'bg-transparent text-text-secondary hover:bg-surface-3',
              )}
              style={lead.stage === s ? { background: STAGE_COLOR[s], borderColor: STAGE_COLOR[s] } : { borderColor:'#21212E' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="px-[17px] py-3 border-b border-surface-4">
        <p className="text-[10px] text-text-muted font-extrabold uppercase tracking-[1px] mb-2">AI Follow-up</p>
        <Button variant="ghost" size="sm" className="w-full justify-center mb-2" onClick={generateFollowUp} disabled={aiLoad}>
          {aiLoad ? <><Spinner size={12} />Generating…</> : <><Icon name="ai" size={12} color={G.pu} />Generate with AI</>}
        </Button>
        {followUp && (
          <>
            <div className="bg-surface-3 rounded-[8px] p-[11px] text-[12.5px] leading-[1.6] border border-surface-4 mb-2">
              {followUp}
            </div>
            <div className="flex gap-[5px]">
              <Button variant="ok" size="xs" className="flex-1 justify-center" onClick={() => toast('WhatsApp opened!')}>
                <Icon name="wa" size={11} />Send
              </Button>
              <Button variant="ghost" size="xs" onClick={() => { navigator.clipboard?.writeText(followUp); toast('Copied!'); }}>
                <Icon name="copy" size={11} />
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="px-[17px] py-3 border-b border-surface-4">
        <p className="text-[10px] text-text-muted font-extrabold uppercase tracking-[1px] mb-2">Add Note</p>
        <div className="flex gap-[6px]">
          <input
            className="flex-1 bg-surface-3 border border-surface-4 rounded-[9px] px-[10px] py-[7px] text-text-primary font-sans text-[12.5px] font-semibold outline-none focus:border-gold transition-colors placeholder:text-text-muted"
            placeholder="Type a note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
          />
          <Button variant="gold" size="xs" onClick={handleAddNote}><Icon name="send" size={12} /></Button>
        </div>
      </div>

      <div className="px-[17px] py-3 flex-1">
        <p className="text-[10px] text-text-muted font-extrabold uppercase tracking-[1px] mb-3">Timeline</p>
        {(lead.tl ?? []).map((entry, i) => (
          <div key={i} className="flex gap-3 pb-[10px] border-b border-[rgba(33,33,46,.32)] last:border-0 mb-[10px]">
            <div className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0 border" style={{ background:`${entry.c}18`, borderColor:`${entry.c}24` }}>
              <Icon name={entry.i ?? 'info'} size={12} color={entry.c} />
            </div>
            <div className="flex-1 pt-[3px]">
              <div className="text-[12.5px] font-extrabold">{entry.a}</div>
              <div className="text-[11.5px] text-text-secondary mt-[1px]">{entry.n}</div>
              <div className="text-[10.5px] text-text-muted mt-[2px]">{entry.t}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddLeadModal({ open, onClose }) {
  const toast   = useToast();
  const addLead = useCrmStore((s) => s.addLead);
  const [form, setForm]     = useState({ name:'', phone:'', email:'', vehicle_interest:'', budget:'', source:'website', stage:'new' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAdd = async () => {
    setErrors({});
    const { data, errors: errs } = validate(leadSchema, sanitizeObject(form));
    if (errs) { setErrors(errs); return; }
    setSaving(true);
    try {
      await addLead(data);
      toast('Lead added!', 'ok');
      onClose();
      setForm({ name:'', phone:'', email:'', vehicle_interest:'', budget:'', source:'website', stage:'new' });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add lead', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Lead">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {[['Full Name *','name','Emeka Okafor'],['Phone *','phone','08012345678'],['Email','email','email@gmail.com'],['Car of Interest','vehicle_interest','Toyota Camry']].map(([l,k,p]) => (
            <Field key={k} label={l} error={errors[k]}>
              <Input placeholder={p} value={form[k]} onChange={set(k)} aria-invalid={!!errors[k]} />
            </Field>
          ))}
          <Field label="Budget (₦)" error={errors.budget}>
            <Input type="number" placeholder="25000000" value={form.budget} onChange={set('budget')} />
          </Field>
          <Field label="Source">
            <Select value={form.source} onChange={set('source')}>
              <option value="website">Website</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="referral">Referral</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="walkin">Walk-in</option>
                    <option value="phone">Phone</option>
                    <option value="other">Other</option>
            </Select>
          </Field>
        </div>
        <div className="flex gap-2 justify-end mt-1">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="gold" onClick={handleAdd} disabled={saving}>
            {saving ? <><Spinner size={13} />Saving…</> : <><Icon name="plus" size={13} />Add Lead</>}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CrmPage() {
  const toast          = useToast();
  const leads          = useCrmStore((s) => s.leads);
  const filter         = useCrmStore((s) => s.filter);
  const searchQuery    = useCrmStore((s) => s.searchQuery);
  const isLoading      = useCrmStore((s) => s.isLoading);
  const setFilter      = useCrmStore((s) => s.setFilter);
  const setSearch      = useCrmStore((s) => s.setSearch);
  const selectedLead   = useCrmStore((s) => s.selectedLead);
  const selectLead     = useCrmStore((s) => s.selectLead);
  const deselectLead   = useCrmStore((s) => s.deselectLead);
  const getFiltered    = useCrmStore((s) => s.getFilteredLeads);
  const fetchLeads     = useCrmStore((s) => s.fetchLeads);

  const [addOpen, setAddOpen] = useState(false);
  const filtered = getFiltered();

  // Fetch real data on mount
  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const counts = {
    all:       leads.length,
    new:       leads.filter((l) => l.stage === 'New').length,
    contacted: leads.filter((l) => l.stage === 'Contacted').length,
    closed:    leads.filter((l) => l.stage === 'Closed').length,
  };

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">CRM &amp; Leads</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">{leads.length} total · {counts.new} new today</p>
        </div>
        <Button variant="gold" size="sm" onClick={() => setAddOpen(true)}>
          <Icon name="plus" size={13} />Add Lead
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[['all','All',G.g],['new','New',G.bl],['contacted','Contacted',G.wa],['closed','Closed',G.ok]].map(([k,label,c]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn('bg-surface-2 border rounded-[14px] p-[18px] text-left cursor-pointer transition-all hover:-translate-y-[2px]', filter === k ? '' : 'border-surface-4')}
            style={filter === k ? { borderColor:c, background:`${c}08` } : {}}
            aria-pressed={filter === k}
          >
            <div className="font-display text-[24px] font-bold" style={{ color:c }}>{counts[k]}</div>
            <div className="text-[11.5px] text-text-secondary font-bold">{label}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center">
        <SearchBar placeholder="Search leads…" value={searchQuery} onChange={(e) => setSearch(e.target.value)} className="w-full sm:max-w-[280px]" />
        <Tabs tabs={STAGE_TABS} active={filter} onChange={setFilter} />
      </div>

      <div className={cn('grid gap-4 mb-6', selectedLead ? 'grid-cols-1 xl:grid-cols-[1fr_355px]' : 'grid-cols-1')}>
        <div>
          {filtered.length === 0 && !isLoading ? (
            <EmptyState icon="phone" title="No leads found" desc="Add your first lead or adjust filters." action={() => setAddOpen(true)} actionLabel="Add Lead" />
          ) : ( 
            <>
          /* ── Mobile lead cards ─── */
            <div className="flex flex-col gap-3 md:hidden">
              {isLoading
                ? Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-surface-2 border border-surface-4 rounded-[12px] p-4 animate-pulse">
                      <div className="h-5 bg-surface-5 rounded w-1/2 mb-2" />
                      <div className="h-4 bg-surface-4 rounded w-3/4" />
                    </div>
                  ))
                : filtered.map((lead) => (
                    <button
                      key={lead.id}
                      className={cn(
                        "bg-surface-2 border rounded-[12px] p-4 text-left w-full transition-colors",
                        selectedLead?.id === lead.id ? "border-gold" : "border-surface-4 hover:border-[rgba(200,151,58,.2)]"
                      )}
                      onClick={() => selectLead(selectedLead?.id === lead.id ? null : lead)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-extrabold text-[14px]">{lead.name}</div>
                        <Badge>{lead.stage}</Badge>
                      </div>
                      <div className="text-[12.5px] text-text-secondary mb-1">{lead.phone}</div>
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] text-text-muted">{lead.car || lead.vehicle_interest || '—'}</span>
                        <span className="text-gold font-extrabold text-[13px]">{fmtM(lead.budget)}</span>
                      </div>
                    </button>
                  ))
              }
            </div>

                        <div className="hidden md:block border border-surface-4 rounded-[12px] overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Lead','Contact','Car','Budget','Score','Source','Stage','Actions'].map((h) => (
                      <th key={h} className="text-left px-[14px] py-[9px] text-[9.5px] font-extrabold uppercase tracking-[1px] text-text-muted bg-surface-3 border-b border-surface-4 first:pl-[18px] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array(5).fill(0).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
                    : filtered.map((lead) => (
                      <tr key={lead.id} className={cn('border-b border-[rgba(33,33,46,.4)] last:border-0 cursor-pointer hover:bg-[rgba(255,255,255,.01)]', selectedLead?.id === lead.id && 'bg-[rgba(200,151,58,.03)]')} onClick={() => selectLead(selectedLead?.id === lead.id ? null : lead)}>
                        <td className="px-[18px] py-3">
                          <div className="flex items-center gap-2">
                            <Avatar initials={toInitials(lead.name)} size={30} />
                            <div><div className="font-extrabold text-[13px]">{lead.name}</div><div className="text-[11px] text-text-muted">{lead.date}</div></div>
                          </div>
                        </td>
                        <td className="px-[14px] py-3"><div className="text-[12.5px]">{lead.phone}</div><div className="text-[11.5px] text-text-secondary">{lead.email}</div></td>
                        <td className="px-[14px] py-3 text-[13px]">{lead.car}</td>
                        <td className="px-[14px] py-3 text-gold font-extrabold">{fmtM(lead.budget)}</td>
                        <td className="px-[14px] py-3"><ScoreRing score={lead.score} /></td>
                        <td className="px-[14px] py-3"><span className="text-[11px] font-bold px-[7px] py-[2px] bg-surface-3 border border-surface-4 rounded-[5px] text-text-secondary">{lead.source || lead.src || '—'}</span></td>
                        <td className="px-[14px] py-3"><Badge>{lead.stage}</Badge></td>
                        <td className="px-[14px] py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="xs" aria-label="WhatsApp"><Icon name="wa" size={11} color="#25D366" /></Button>
                            <Button variant="ghost" size="xs" onClick={() => selectLead(lead)} aria-label="View"><Icon name="eye" size={11} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>

        {selectedLead && (
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] overflow-hidden sticky top-[68px] max-h-[calc(100vh-88px)]">
            <LeadDetail lead={selectedLead} onClose={deselectLead} />
          </div>
        )}
      </div>

      <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}