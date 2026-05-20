import { useState, useEffect, useCallback } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Icon }    from '@/shared/components/ui/Icon';
import { Toggle }  from '@/shared/components/ui/Toggle';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { analyticsApi } from '@/services/api/index';
import client from '@/services/api/client';
import { fmtM } from '@/shared/utils/format';
import { G } from '@/shared/utils/tokens';

const REPORT_LIST = [
  { key:'sales',     icon:'pay',   title:'Sales Revenue Report',      desc:'Monthly & YTD breakdown',              color:G.g  },
  { key:'leads',     icon:'phone', title:'Lead Conversion Report',    desc:'Source attribution, conversion rates', color:G.bl },
  { key:'inventory', icon:'car',   title:'Inventory Movement Report', desc:'Stock levels, turnover, aging',        color:G.ok },
  { key:'agents',    icon:'users', title:'Agent Performance Report',  desc:'KPIs, deal count, commission',         color:G.pu },
  { key:'website',   icon:'globe', title:'Website Analytics Report',  desc:'Traffic, bounce rate, inquiries',      color:G.wa },
  { key:'financial', icon:'chart', title:'Financial Summary',         desc:'P&L, cash flow, gateway performance',  color:G.g  },
];

export function ReportsPage() {
  const toast = useToast();

  const [kpis,      setKpis]      = useState(null);
  const [recentDl,  setRecentDl]  = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sched,     setSched]     = useState({ weekly:true, monthly:true, daily:false });
  const [schedSaving, setSchedSaving] = useState(false);
  const [generating, setGenerating]   = useState(null);
  const [period, setPeriod] = useState('30d');

  /* ── Fetch overview analytics ────────────────────────────── */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await analyticsApi.overview(period);
      setKpis(data);
    } catch { /* keep nulls */ } finally {
      setIsLoading(false);
    }

    // TODO: Connect to backend endpoint when available
    // Expected endpoint: GET /reports/history
    // Expected response: { downloads: [{ name, type, date, url }] }
    // For now, static recent downloads list
    setRecentDl([
      { name:`Sales Report — ${new Date().toLocaleDateString('en-NG',{month:'short',year:'numeric'})}`, type:'PDF', date:'Today' },
      { name:'Lead Report — Last 30d', type:'CSV', date:'Yesterday' },
    ]);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Load scheduled report preferences ──────────────────── */
  useEffect(() => {
    client.get('/settings').then(({ data }) => {
      if (data.dealer?.report_schedule) setSched(data.dealer.report_schedule);
    }).catch(() => {});
  }, []);

  /* ── Save schedule preferences ───────────────────────────── */
  const handleSaveSchedule = async () => {
    setSchedSaving(true);
    try {
      await client.put('/settings/profile', { report_schedule: sched });
      toast('Report schedule saved!');
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'danger');
    } finally {
      setSchedSaving(false);
    }
  };

  /* ── Generate report (trigger backend export) ────────────── */
  const generateReport = async (reportKey, format = 'pdf') => {
    setGenerating(reportKey);
    try {
      // TODO: Connect to backend endpoint when available
      // Expected endpoint: POST /reports/generate
      // Expected body: { type: reportKey, format: 'pdf'|'csv'|'xlsx', period }
      // Expected response: { url: string, name: string } or a file stream
      toast(`${REPORT_LIST.find((r) => r.key === reportKey)?.title} is being generated…`, 'info');
      await new Promise((r) => setTimeout(r, 1200)); // Simulate generation
      toast(`Report ready! (Download will work once the /reports endpoint is live)`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Report generation failed', 'danger');
    } finally {
      setGenerating(null);
    }
  };

  /* ── Export data (vehicles, leads, etc.) ─────────────────── */
  const exportData = async (type, format) => {
    toast(`Exporting ${type} as ${format}…`);
    try {
      // TODO: Connect to backend endpoint when available
      // Expected endpoint: GET /export/:type?format=csv
      // Expected response: file blob (CSV, Excel)
      const { data } = await client.get(`/export/${type.toLowerCase()}`, { params: { format: format.toLowerCase() } });
      // Download logic
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href  = URL.createObjectURL(blob);
      link.download = `${type}-export.json`;
      link.click();
    } catch {
      toast(`Export endpoint not available yet — data will be exportable when /export is wired up`);
    }
  };

  const kpiRows = kpis ? [
    ['YTD Revenue', fmtM(Math.round(kpis.revenue / 100)), G.g ],
    ['Units Sold',  String(kpis.deals_closed ?? 0),       G.bl],
    ['Active Leads',String(kpis.leads_total  ?? 0),       G.ok],
    ['Conv. Rate',  `${kpis.conversion_rate ?? 0}%`,      G.pu],
  ] : [
    ['YTD Revenue','—',G.g],['Units Sold','—',G.bl],['Active Leads','—',G.ok],['Conv. Rate','—',G.pu],
  ];

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Reports</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Download, schedule, and export reports</p>
        </div>
        <div className="flex gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="bg-surface-2 border border-surface-4 rounded-[8px] px-3 py-2 text-[12px] text-text-primary outline-none">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="3m">Last 3 months</option>
            <option value="12m">Last 12 months</option>
          </select>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpiRows.map(([l, v, c]) => (
          <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[5px]">{l}</div>
            {isLoading
              ? <div className="h-8 w-20 bg-surface-3 rounded animate-pulse" />
              : <div className="font-display text-[26px] font-bold" style={{ color:c }}>{v}</div>
            }
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Report list */}
        <div>
          <h3 className="font-display text-[18px] font-bold mb-4">Available Reports</h3>
          <div className="flex flex-col gap-3">
            {REPORT_LIST.map((r) => (
              <div key={r.key}
                className="bg-surface-2 border border-surface-4 rounded-[14px] px-4 py-[16px] hover:border-[rgba(200,151,58,.2)] transition-all">
                <div className="flex items-center gap-[11px]">
                  <div className="w-[36px] h-[36px] rounded-[9px] flex items-center justify-center shrink-0"
                    style={{ background:`${r.color}18` }}>
                    <Icon name={r.icon} size={16} color={r.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-[13.5px]">{r.title}</div>
                    <div className="text-[12px] text-text-secondary">{r.desc}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="xs" onClick={() => generateReport(r.key, 'pdf')}
                      disabled={generating === r.key}>
                      {generating === r.key ? <Spinner size={11} /> : <><Icon name="eye" size={11} />View</>}
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => generateReport(r.key, 'csv')}
                      disabled={generating === r.key} aria-label={`Download ${r.title}`}>
                      <Icon name="dl" size={11} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Scheduled reports */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[20px]">
            <div className="font-display text-[17px] font-bold mb-4">Scheduled Reports</div>
            {[
              ['weekly', 'Weekly Sales Digest',  'Every Monday 8AM'],
              ['monthly','Monthly Revenue',       '1st of month'],
              ['daily',  'Daily Lead Summary',    'Daily at 6PM'],
            ].map(([key, name, desc]) => (
              <div key={key} className="flex items-center gap-3 py-[11px] border-b border-surface-4 last:border-0">
                <div className="flex-1">
                  <div className="font-bold text-[13px]">{name}</div>
                  <div className="text-[11.5px] text-text-muted">{desc}</div>
                </div>
                <Toggle checked={sched[key]} onChange={(v) => setSched((s) => ({ ...s, [key]: v }))} label={`Toggle ${name}`} />
              </div>
            ))}
            <Button variant="gold" size="sm" className="w-full mt-3 justify-center" onClick={handleSaveSchedule} disabled={schedSaving}>
              {schedSaving ? <><Spinner size={12} />Saving…</> : <><Icon name="check" size={12} />Save Schedule</>}
            </Button>
          </div>

          {/* Export */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[20px]">
            <div className="font-display text-[17px] font-bold mb-4">Export Data</div>
            <div className="grid grid-cols-2 gap-2">
              {[['Inventory','CSV'],['Leads','CSV'],['Transactions','Excel'],['Analytics','PDF']].map(([d, t]) => (
                <Button key={d} variant="ghost" size="sm" className="justify-center"
                  onClick={() => exportData(d, t)}>
                  <Icon name="dl" size={12} />{d} ({t})
                </Button>
              ))}
            </div>
          </div>

          {/* Recent downloads */}
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-[20px]">
            <div className="font-display text-[17px] font-bold mb-4">Recent Downloads</div>
            {/* TODO: Connect to backend endpoint when available */}
            {/* Expected endpoint: GET /reports/history */}
            {/* Expected response: { downloads: [{ id, name, type, date, url }] } */}
            {recentDl.length === 0
              ? <p className="text-[12px] text-text-muted text-center py-3">No recent downloads</p>
              : recentDl.map((dl, i) => (
                <div key={i} className="flex justify-between items-center py-[10px] border-b border-surface-4 last:border-0">
                  <div>
                    <div className="text-[13px] font-semibold">{dl.name}</div>
                    <div className="text-[11px] text-text-muted">{dl.type} · {dl.date}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => toast('Downloading…')} aria-label={`Download ${dl.name}`}>
                    <Icon name="dl" size={12} />
                  </Button>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
