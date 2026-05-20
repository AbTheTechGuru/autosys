import { useEffect, useState, useCallback } from 'react';
import { Button }  from '@/shared/components/ui/Button';
import { Badge }   from '@/shared/components/ui/Badge';
import { Icon }    from '@/shared/components/ui/Icon';
import { Tabs }    from '@/shared/components/ui/Tabs';
import { Spinner } from '@/shared/components/ui/Spinner';
import { BarChart } from '@/shared/components/charts/BarChart';
import { useToast } from '@/context/ToastContext';
import client from '@/services/api/client';
import { analyticsApi } from '@/services/api/index';
import { fmtM } from '@/shared/utils/format';
import { G }    from '@/shared/utils/tokens';
import { MONTHS, REVENUE_DATA } from '@/shared/constants';
import { cn }   from '@/shared/utils/cn';

const PAY_TABS  = [{ key:'transactions', label:'Transactions' }, { key:'analytics', label:'Analytics' }];
const STATUS_COLOR = { success:'#16A34A', Success:'#16A34A', pending:'#F59E0B', Pending:'#F59E0B', failed:'#EF4444', Failed:'#EF4444' };

// kobo → naira
const fromKobo = (v) => Math.round((v || 0) / 100);

function ProgressBar({ label, pct, color, animated }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[12.5px] mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="font-extrabold">{pct}%</span>
      </div>
      <div className="h-[4px] bg-surface-5 rounded-[2px] overflow-hidden">
        <div className="h-full rounded-[2px] transition-[width] duration-[1s]"
          style={{ width: animated ? `${pct}%` : '0%', background: `linear-gradient(90deg,${color}80,${color})` }} />
      </div>
    </div>
  );
}

export function PaymentsPage() {
  const toast = useToast();
  const [tab,        setTab]        = useState('transactions');
  const [txns,       setTxns]       = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [revenueData, setRevData]   = useState(REVENUE_DATA);
  const [revenueLabels, setRevLabels] = useState(MONTHS);
  const [isLoading,  setIsLoading]  = useState(true);
  const [anim,       setAnim]       = useState(false);
  const [page,       setPage]       = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PER_PAGE = 20;

  useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t); }, []);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txnRes, sumRes, revRes] = await Promise.allSettled([
        client.get('/payments', { params: { page, limit: PER_PAGE } }),
        client.get('/payments/summary'),
        analyticsApi.revenue('30d'),
      ]);

      if (txnRes.status === 'fulfilled') {
        const data  = txnRes.value.data;
        const total = parseInt(txnRes.value.headers?.['x-total-count'] || data.total || 0);
        const mapped = (data.transactions ?? []).map((t) => ({
          id:     t.reference || t.id,
          c:      t.metadata?.customer_name || t.email?.split('@')[0] || 'Customer',
          car:    t.metadata?.vehicle || '—',
          amt:    fromKobo(t.amount),
          gw:     t.gateway?.charAt(0).toUpperCase() + t.gateway?.slice(1) || 'Paystack',
          method: t.channel || t.metadata?.method || 'Transfer',
          status: t.status?.charAt(0).toUpperCase() + t.status?.slice(1) || 'Pending',
          d:      new Date(t.created_at).toLocaleDateString('en-NG', { month:'short', day:'numeric' }),
        }));
        setTxns(mapped);
        setTotalCount(total);
      }

      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value.data);
      }

      if (revRes.status === 'fulfilled') {
        const monthly = revRes.value.data.monthly ?? {};
        const entries = Object.entries(monthly).sort(([a],[b]) => a.localeCompare(b)).slice(-12);
        if (entries.length > 0) {
          setRevLabels(entries.map(([k]) => k.slice(5)));
          setRevData(entries.map(([,v]) => Math.round(fromKobo(v) / 1000000)));
        }
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load payments', 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [page, toast]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const totalRevenue  = summary ? fromKobo(summary.total_revenue)    : 0;
  const monthRevenue  = summary ? fromKobo(summary.this_month)       : 0;
  const pendingAmount = summary ? fromKobo(summary.pending)          : 0;
  const txnCount      = summary?.count ?? txns.length;

  const paystackPct    = txns.length ? Math.round((txns.filter((t) => t.gw === 'Paystack').length / txns.length) * 100) : 65;
  const flutterwavePct = txns.length ? Math.round((txns.filter((t) => t.gw === 'Flutterwave').length / txns.length) * 100) : 28;
  const successRate    = txns.length ? Math.round((txns.filter((t) => t.status === 'Success').length / txns.length) * 100) : 94;

  return (
    <div className="max-w-[1500px] px-4 md:px-[22px] pt-[22px] pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[23px] font-bold">Payments</h2>
          <p className="text-text-secondary text-[12.5px] mt-[3px]">Paystack · Flutterwave · Live mode</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { fetchTransactions(); toast('Refreshed!'); }}>
          <Icon name="refresh" size={13} />Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {isLoading ? Array(4).fill(0).map((_, i) => (
          <div key={i} className="h-[90px] bg-surface-2 border border-surface-4 rounded-[14px] animate-pulse" />
        )) : [
          ['Total Revenue',  fmtM(totalRevenue),  G.g  ],
          ['This Month',     fmtM(monthRevenue),  G.bl ],
          ['Pending',        fmtM(pendingAmount), G.wa ],
          ['Transactions',   String(txnCount),    G.ok ],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-surface-2 border border-surface-4 rounded-[14px] p-[18px]">
            <div className="text-[10.5px] text-text-secondary font-extrabold uppercase tracking-[1px] mb-[5px]">{l}</div>
            <div className="font-display text-[22px] font-bold" style={{ color:c }}>{v}</div>
          </div>
        ))}
      </div>

      <Tabs tabs={PAY_TABS} active={tab} onChange={setTab} className="mb-5" />

      {/* ── Transactions tab ─────────────────────────────── */}
      {tab === 'transactions' && (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden mb-6">
            {isLoading ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-[90px] bg-surface-2 border border-surface-4 rounded-[12px] animate-pulse" />
            )) : txns.map((t) => (
              <div key={t.id} className="bg-surface-2 border border-surface-4 rounded-[12px] p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-[13px]">{t.c}</p>
                    <p className="text-[11.5px] text-text-muted">{t.car}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{ background:`${STATUS_COLOR[t.status] ?? '#6B7280'}18`, color:STATUS_COLOR[t.status] ?? '#6B7280' }}>
                    {t.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-display text-[17px] font-bold text-gold">{fmtM(t.amt)}</span>
                  <div className="text-[11px] text-text-muted text-right">
                    <p>{t.gw}</p><p>{t.d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block border border-surface-4 rounded-[12px] overflow-x-auto mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Ref','Customer','Vehicle','Amount','Gateway','Method','Status','Date'].map((h) => (
                    <th key={h} className="text-left px-[14px] py-[9px] text-[9.5px] font-extrabold uppercase tracking-[1px] text-text-muted bg-surface-3 border-b border-surface-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-surface-4">
                    {Array(8).fill(0).map((_, j) => (
                      <td key={j} className="px-[14px] py-3">
                        <div className="h-4 bg-surface-3 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                )) : txns.map((t) => (
                  <tr key={t.id} className="border-b border-[rgba(33,33,46,.4)] last:border-0 hover:bg-[rgba(255,255,255,.01)]">
                    <td className="px-[14px] py-3 font-mono text-[11px] text-text-muted">{t.id}</td>
                    <td className="px-[14px] py-3 font-semibold">{t.c}</td>
                    <td className="px-[14px] py-3 text-text-secondary">{t.car}</td>
                    <td className="px-[14px] py-3 text-gold font-extrabold">{fmtM(t.amt)}</td>
                    <td className="px-[14px] py-3 text-text-secondary">{t.gw}</td>
                    <td className="px-[14px] py-3 text-text-secondary">{t.method}</td>
                    <td className="px-[14px] py-3">
                      <span className="text-[10px] font-bold px-[7px] py-[3px] rounded-full"
                        style={{ background:`${STATUS_COLOR[t.status] ?? '#6B7280'}18`, color:STATUS_COLOR[t.status] ?? '#6B7280' }}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-[14px] py-3 text-text-muted text-[12px]">{t.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCount > PER_PAGE && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-[12px] text-text-muted">
                Showing {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
                <Button variant="ghost" size="sm" disabled={page * PER_PAGE >= totalCount} onClick={() => setPage((p) => p + 1)}>Next →</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Analytics tab ────────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-surface-2 border border-surface-4 rounded-[14px] p-5">
            <div className="flex justify-between items-center mb-4">
              <div className="font-display text-[18px] font-bold">Revenue Trend</div>
              <div className="text-[13px] text-text-secondary">
                Total: <span className="text-gold font-extrabold">{fmtM(totalRevenue)}</span>
              </div>
            </div>
            <BarChart data={revenueData} labels={revenueLabels} height={160} />
          </div>
          <div className="bg-surface-2 border border-surface-4 rounded-[14px] p-5">
            <div className="font-display text-[18px] font-bold mb-5">Gateway Split</div>
            <ProgressBar label="Paystack"    pct={paystackPct}    color={G.g}  animated={anim} />
            <ProgressBar label="Flutterwave" pct={flutterwavePct} color={G.bl} animated={anim} />
            <ProgressBar label="Success Rate" pct={successRate}    color={G.ok} animated={anim} />
          </div>
        </div>
      )}
    </div>
  );
}
