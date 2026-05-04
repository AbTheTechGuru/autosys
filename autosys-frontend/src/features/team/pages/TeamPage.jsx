import { useState } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { Avatar, toInitials } from '@/shared/components/ui/Avatar';
import { useToast } from '@/context/ToastContext';
import { fmtM }    from '@/shared/utils/format';
import { G }       from '@/shared/utils/tokens';

const TEAM = [
  { id:1, name:'Chukwuemeka Obi', role:'Admin',       status:'Online',  leads:24, deals:12, rev:420000000, comm:8400000,  img:'CO' },
  { id:2, name:'Sarah Kingsley',  role:'Sales Agent', status:'Online',  leads:18, deals:8,  rev:285000000, comm:5700000,  img:'SK' },
  { id:3, name:'John Davies',     role:'Sales Agent', status:'Away',    leads:15, deals:6,  rev:198000000, comm:3960000,  img:'JD' },
  { id:4, name:'Mike Adesola',    role:'Sales Agent', status:'Offline', leads:5,  deals:2,  rev:65000000,  comm:1300000,  img:'MA' },
];

const STATUS_COLOR = { Online:'#16A34A', Away:'#D97706', Offline:'#4E4B58' };

const TEAM_TABS = [
  { key:'members',    label:'Members'    },
  { key:'commission', label:'Commission' },
  { key:'activity',   label:'Activity'   },
];

export function TeamPage() {
  const toast = useToast();
  const [tab, setTab] = useState('members');

  const totalComm = TEAM.reduce((s, m) => s + m.comm, 0);
  const maxRev    = TEAM[0].rev;

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Team &amp; Commission</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">
            {TEAM.length} members · {TEAM.filter((m) => m.status === 'Online').length} online
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => toast('Invitation sent!')}>
          <Icon name="plus" size={13} />Invite Member
        </Button>
      </div>

      <Tabs tabs={TEAM_TABS} active={tab} onChange={setTab} className="mb-5" />

      {/* Members */}
      {tab === 'members' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {TEAM.map((m) => (
            <div key={m.id} className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
              {/* Avatar + name + status */}
              <div className="flex items-center gap-[11px] mb-4">
                <Avatar initials={m.img} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold truncate">{m.name}</div>
                  <div className="text-[11.5px] text-text-muted">{m.role}</div>
                </div>
                <div
                  className="w-[8px] h-[8px] rounded-full shrink-0"
                  style={{
                    background: STATUS_COLOR[m.status],
                    boxShadow:  m.status === 'Online' ? `0 0 6px ${G.ok}` : 'none',
                  }}
                  aria-label={m.status}
                />
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[['Leads', m.leads, G.bl],['Deals', m.deals, G.g],['Rev', fmtM(m.rev), G.ok]].map(([l,v,c]) => (
                  <div key={l} className="bg-surface-3 border border-surface-4 rounded-[9px] px-[11px] py-3 text-center">
                    <div
                      className="font-display font-bold"
                      style={{ fontSize: l === 'Rev' ? 13 : 19, color: c }}
                    >
                      {v}
                    </div>
                    <div className="text-[10px] text-text-secondary mt-[2px]">{l}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1 justify-center">
                  <Icon name="edit" size={12} />Edit
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 justify-center">
                  <Icon name="mail" size={12} />Message
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Commission */}
      {tab === 'commission' && (
        <div className="flex flex-col gap-4">
          {/* Commission KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[['Total Paid', fmtM(totalComm), G.g],['Rate','2% of deal',G.bl],['Next Payout','Feb 1, 2025',G.ok],['Avg / Agent',fmtM(totalComm/TEAM.length),G.pu]].map(([l,v,c]) => (
              <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
                <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[5px]">{l}</div>
                <div className="font-display text-[22px] font-bold" style={{ color:c }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Breakdown table */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
            <div className="font-display text-[18px] font-bold mb-4">Commission Breakdown</div>
            {TEAM.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-[11px] border-b border-surface-4 last:border-0">
                <Avatar initials={m.img} size={34} />
                <div className="flex-1">
                  <div className="font-bold text-[13.5px]">{m.name}</div>
                  <div className="text-[12px] text-text-muted">{m.deals} deals · {fmtM(m.rev)}</div>
                </div>
                {/* Progress bar */}
                <div className="hidden sm:block h-[6px] bg-surface-5 rounded-[3px] overflow-hidden w-[120px]">
                  <div
                    className="h-full rounded-[3px] transition-[width] duration-[1s]"
                    style={{ width:`${(m.rev / maxRev) * 100}%`, background:`linear-gradient(90deg,${G.gd},${G.gl})` }}
                  />
                </div>
                <div className="sm:min-w-[88px] text-right">
                  <div className="font-extrabold text-gold text-[14px]">{fmtM(m.comm)}</div>
                  <div className="text-[10.5px] text-text-muted">commission</div>
                </div>
                <Button
                  variant="ok"
                  size="xs"
                  onClick={() => toast(`Paid ${m.name.split(' ')[0]}!`)}
                >
                  <Icon name="pay" size={11} />Pay
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      {tab === 'activity' && (
        <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[22px]">
          <div className="font-display text-[18px] font-bold mb-4">Activity Log</div>
          <div className="border border-surface-4 rounded-[12px] overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Agent','Action','Details','Time'].map((h) => (
                    <th key={h} className="text-left px-[14px] py-[9px] text-[9.5px] font-extrabold uppercase tracking-[1px] text-text-muted bg-surface-3 border-b border-surface-4 first:pl-[18px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Sarah K.',  'Deal Closed',    'Biodun A. – Lexus RX 350 – ₦42M',  '10m ago'],
                  ['John D.',   'Lead Updated',   'Amaka → Negotiation stage',          '28m ago'],
                  ['Mike A.',   'Lead Added',     'Ford Ranger inquiry',                '1h ago' ],
                  ['Sarah K.',  'Vehicle Listed', 'BMW X5 xDrive40i',                  '3h ago' ],
                  ['John D.',   'Follow-up Sent', 'WhatsApp to Emeka O.',               '4h ago' ],
                ].map(([ag, ac, dt, tm], i) => (
                  <tr key={i} className="border-b border-[rgba(33,33,46,.4)] last:border-0 hover:bg-[rgba(255,255,255,.01)]">
                    <td className="px-[18px] py-3">
                      <div className="flex items-center gap-2">
                        <Avatar initials={ag.split(' ').map((n) => n[0]).join('')} size={26} />
                        <span className="font-bold text-[13px]">{ag}</span>
                      </div>
                    </td>
                    <td className="px-[14px] py-3">
                      <span className="text-[11px] font-bold px-[7px] py-[2px] bg-surface-3 border border-surface-4 rounded-[5px] text-text-secondary">
                        {ac}
                      </span>
                    </td>
                    <td className="px-[14px] py-3 text-[12.5px] text-text-secondary">{dt}</td>
                    <td className="px-[14px] py-3 text-[11.5px] text-text-muted">{tm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
