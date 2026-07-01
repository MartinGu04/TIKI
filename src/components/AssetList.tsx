import { useState } from 'react';
import { Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Asset } from '../types';
import { fmt, fmtPrice, fmtPct, frequencyLabel } from '../utils/calculations';
import { useT, useLang } from '../contexts/LanguageContext';
import { TickerDetailModal } from './TickerDetailModal';

interface Props {
  assets: Asset[];
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
}

type SortKey = 'value' | 'pnl' | 'ticker';
type SortDir = 'asc' | 'desc';

export function AssetList({ assets, onEdit, onDelete }: Props) {
  const t = useT();
  const { dir } = useLang();
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  const ownerLabel: Record<string, string> = {
    me: t.me, partner: t.partner, shared: t.shared,
  };
  const ownerStyle: Record<string, { color: string; background: string; border: string }> = {
    me:      { color: 'var(--at)',   background: 'var(--a10)',   border: '1px solid var(--a20)' },
    partner: { color: '#a78bfa',     background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.20)' },
    shared:  { color: 'var(--up)',   background: 'var(--up10)',  border: '1px solid rgba(16,185,129,0.20)' },
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...assets].sort((a, b) => {
    let av: number | string, bv: number | string;
    if (sortKey === 'value') { av = a.currentPrice * a.quantity; bv = b.currentPrice * b.quantity; }
    else if (sortKey === 'pnl') { av = ((a.currentPrice - a.avgBuyPrice) / (a.avgBuyPrice || 1)) * 100; bv = ((b.currentPrice - b.avgBuyPrice) / (b.avgBuyPrice || 1)) * 100; }
    else { av = a.ticker; bv = b.ticker; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalValue = assets.reduce((s, a) => s + a.currentPrice * a.quantity, 0);
  const totalPnl = assets.reduce((s, a) => s + (a.currentPrice - a.avgBuyPrice) * a.quantity, 0);
  const totalMonthly = assets.filter((a) => a.frequency.type !== 'one-time').reduce((s, a) => s + a.monthlyContribution, 0);

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col
      ? sortDir === 'desc'
        ? <ChevronDown size={11} style={{ color: 'var(--at)' }} />
        : <ChevronUp size={11} style={{ color: 'var(--at)' }} />
      : null;

  return (
    <div className="rounded-2xl card overflow-hidden">
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{t.myInvestments}</h2>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>{t.positions(assets.length)}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" dir={dir}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <Th onClick={() => toggleSort('ticker')} style={{ paddingRight: '1.5rem', paddingLeft: '1rem' }}>
                <span className="flex items-center gap-1">{t.assetHeader} <SortIcon col="ticker" /></span>
              </Th>
              <Th>{t.ownerHeader}</Th>
              <Th align="left">{t.qtyHeader}</Th>
              <Th align="left">{t.avgBuyHeader}</Th>
              <Th align="left">{t.currentHeader}</Th>
              <Th align="left" onClick={() => toggleSort('value')}>
                <span className="flex items-center justify-end gap-1">{t.valueHeader} <SortIcon col="value" /></span>
              </Th>
              <Th align="left" onClick={() => toggleSort('pnl')}>
                <span className="flex items-center justify-end gap-1">{t.pnlHeader} <SortIcon col="pnl" /></span>
              </Th>
              <Th align="left">{t.monthlyHeader}</Th>
              <Th style={{ paddingRight: '1rem', paddingLeft: '1.5rem' }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((asset) => {
              const value = asset.currentPrice * asset.quantity;
              const invested = asset.avgBuyPrice * asset.quantity;
              const pnl = value - invested;
              const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
              const isPos = pnl >= 0;
              const isDel = confirmDelete === asset.id;

              return (
                <tr
                  key={asset.id}
                  className="group transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ paddingRight: '1.5rem', paddingLeft: '1rem', paddingTop: '1rem', paddingBottom: '1rem' }}>
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setDetailAsset(asset)}
                    >
                      <div className="w-1 h-9 rounded-full shrink-0" style={{ backgroundColor: asset.color }} />
                      <div>
                        <p className="text-sm font-bold ticker" style={{ color: 'var(--t1)' }}>{asset.ticker}</p>
                        <p className="text-[12px] mt-0.5 max-w-[130px] truncate" style={{ color: 'var(--t3)' }}>{asset.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={ownerStyle[asset.owner]}>
                      {ownerLabel[asset.owner]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-xs tabular-nums ltr" style={{ color: 'var(--t2)' }}>{asset.quantity}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-xs tabular-nums ltr" style={{ color: 'var(--t3)' }}>{fmtPrice(asset.avgBuyPrice, asset.currency)}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-xs font-medium tabular-nums ltr" style={{ color: 'var(--t1)' }}>{fmtPrice(asset.currentPrice, asset.currency)}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-bold tabular-nums ltr" style={{ color: 'var(--t1)' }}>{fmt(value, asset.currency)}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <p className="text-xs font-bold tabular-nums ltr" style={{ color: isPos ? 'var(--up)' : 'var(--dn)' }}>
                      {isPos ? '+' : ''}{fmt(pnl, asset.currency)}
                    </p>
                    <p className="text-[11px] tabular-nums ltr" style={{ color: isPos ? 'var(--up)' : 'var(--dn)', opacity: 0.7 }}>
                      {fmtPct(pnlPct)}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {asset.frequency.type !== 'one-time' && asset.monthlyContribution > 0 ? (
                      <div>
                        <p className="text-xs tabular-nums ltr" style={{ color: 'var(--t2)' }}>
                          {fmt(asset.monthlyContribution, asset.currency)}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>{frequencyLabel(asset.frequency)}</p>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--t4)' }}>—</span>
                    )}
                  </td>
                  <td style={{ paddingRight: '1rem', paddingLeft: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem' }}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isDel ? (
                        <>
                          <button
                            onClick={() => { onDelete(asset.id); setConfirmDelete(null); }}
                            className="text-[11px] px-2 py-1 rounded-lg transition-all"
                            style={{ background: 'var(--dn10)', color: 'var(--dn)', border: '1px solid rgba(239,68,68,0.3)' }}
                          >
                            {t.confirm}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-[11px] px-2 py-1 rounded-lg transition-all"
                            style={{ background: 'var(--card-h)', color: 'var(--t3)', border: '1px solid var(--border)' }}
                          >
                            {t.cancel}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onEdit(asset)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--t3)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--at)'; e.currentTarget.style.background = 'var(--a10)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(asset.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--t3)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--dn)'; e.currentTarget.style.background = 'var(--dn10)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {assets.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--card-h)' }}>
                <td colSpan={5} style={{ paddingRight: '1.5rem', paddingLeft: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
                  <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>{t.portfolioTotal}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-bold tabular-nums ltr" style={{ color: 'var(--t1)' }}>{fmt(totalValue)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-bold tabular-nums ltr" style={{ color: totalPnl >= 0 ? 'var(--up)' : 'var(--dn)' }}>
                    {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-bold tabular-nums ltr" style={{ color: 'var(--at)' }}>
                    {fmt(totalMonthly)}{t.perMonth}
                  </span>
                </td>
                <td style={{ paddingRight: '1rem', paddingLeft: '1.5rem' }} />
              </tr>
            </tfoot>
          )}
        </table>

        {assets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--t3)' }}>{t.noInvestments}</p>
          </div>
        )}
      </div>

      {detailAsset && (
        <TickerDetailModal asset={detailAsset} onClose={() => setDetailAsset(null)} />
      )}
    </div>
  );
}

function Th({
  children, onClick, align = 'right', style,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  align?: 'left' | 'right';
  style?: React.CSSProperties;
}) {
  return (
    <th
      className={`py-3 px-4 text-[11px] font-semibold uppercase tracking-widest ${onClick ? 'cursor-pointer select-none' : ''}`}
      style={{ textAlign: align, color: 'var(--t3)', ...style }}
      onClick={onClick}
    >
      {children}
    </th>
  );
}
