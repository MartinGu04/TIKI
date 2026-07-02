import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Holding, HoldingStats, PriceData } from '../types';
import { fmt, fmtPrice, fmtPct, fmtQty, toHoldingStats, priceChangeColor, priceChangeDirection } from '../utils/calculations';
import { useT, useLang } from '../contexts/LanguageContext';
import { usePriceFlash } from '../hooks/usePriceFlash';
import { TickerDetailModal } from './TickerDetailModal';
import { ConfirmSheet } from './ui/ConfirmSheet';

interface Props {
  holdings: Holding[];
  onAddTransaction: (holding: Holding) => void;
  onDeleteHolding: (id: string) => void;
  onQuickSell: (holding: Holding) => void;
  livePrices: Record<string, PriceData>;
}

type SortKey = 'value' | 'pnl' | 'ticker';
type SortDir = 'asc' | 'desc';

export function HoldingsList({ holdings, onAddTransaction, onDeleteHolding, onQuickSell, livePrices }: Props) {
  const t = useT();
  const { dir } = useLang();
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [confirmDelete, setConfirmDelete] = useState<Holding | null>(null);
  const [detailHolding, setDetailHolding] = useState<Holding | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const stats = holdings.map(toHoldingStats);

  const sorted = [...stats].sort((a, b) => {
    let av: number | string, bv: number | string;
    if (sortKey === 'value') { av = a.currentValue; bv = b.currentValue; }
    else if (sortKey === 'pnl') { av = a.unrealizedPnLPct; bv = b.unrealizedPnLPct; }
    else { av = a.ticker; bv = b.ticker; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalValue = stats.reduce((s, h) => s + h.currentValue, 0);
  const totalPnl = stats.reduce((s, h) => s + h.unrealizedPnL, 0);

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
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>{t.positions(holdings.length)}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" dir={dir}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <Th onClick={() => toggleSort('ticker')} style={{ paddingRight: '1.5rem', paddingLeft: '1rem' }}>
                <span className="flex items-center gap-1">{t.assetHeader} <SortIcon col="ticker" /></span>
              </Th>
              <Th align="left">{t.qtyHeader}</Th>
              <Th align="left">{t.avgBuyHeader}</Th>
              <Th align="left">{t.currentHeader}</Th>
              <Th align="left" onClick={() => toggleSort('value')}>
                <span className="flex items-center justify-end gap-1">{t.valueHeader} <SortIcon col="value" /></span>
              </Th>
              <Th align="left" onClick={() => toggleSort('pnl')}>
                <span className="flex items-center justify-end gap-1">{t.pnlHeader} <SortIcon col="pnl" /></span>
              </Th>
              <Th style={{ paddingRight: '1rem', paddingLeft: '1.5rem' }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => (
              <HoldingRow
                key={h.id} h={h} livePrices={livePrices}
                onOpenDetail={() => setDetailHolding(h)}
                onAddTransaction={() => onAddTransaction(h)}
                onDeleteRequest={() => setConfirmDelete(h)}
                t={t}
              />
            ))}
          </tbody>
          {holdings.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--card-h)' }}>
                <td colSpan={4} style={{ paddingRight: '1.5rem', paddingLeft: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
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
                <td style={{ paddingRight: '1rem', paddingLeft: '1.5rem' }} />
              </tr>
            </tfoot>
          )}
        </table>

        {holdings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--t3)' }}>{t.noInvestments}</p>
          </div>
        )}
      </div>

      {detailHolding && (
        <TickerDetailModal
          holding={detailHolding} onClose={() => setDetailHolding(null)} quote={livePrices[detailHolding.symbol]}
          onSell={() => onQuickSell(detailHolding)}
        />
      )}

      <ConfirmSheet
        open={!!confirmDelete}
        title={t.deleteHoldingTitle}
        body={t.deleteHoldingBody}
        confirmLabel={t.deleteBtn}
        cancelLabel={t.cancel}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) onDeleteHolding(confirmDelete.id); setConfirmDelete(null); }}
      />
    </div>
  );
}

function HoldingRow({ h, livePrices, onOpenDetail, onAddTransaction, onDeleteRequest, t }: {
  h: HoldingStats; livePrices: Record<string, PriceData>;
  onOpenDetail: () => void; onAddTransaction: () => void; onDeleteRequest: () => void;
  t: ReturnType<typeof useT>;
}) {
  const isPos = h.unrealizedPnL >= 0;
  // Per-row so each holding's flash is independent — a hook can't be called
  // conditionally inside the parent's .map(), so this lives in its own component.
  const priceFlash = usePriceFlash(h.currentPrice);

  return (
    <tr
      className="group transition-colors"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <td style={{ paddingRight: '1.5rem', paddingLeft: '1rem', paddingTop: '1rem', paddingBottom: '1rem' }}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenDetail}>
          <div className="w-1 h-9 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
          <div>
            <p className="text-sm font-bold ticker" style={{ color: 'var(--t1)' }}>{h.ticker}</p>
            <p className="text-[12px] mt-0.5 max-w-[130px] truncate" style={{ color: 'var(--t3)' }}>{h.name}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <span className="text-sm font-medium tabular-nums ltr" style={{ color: 'var(--t2)' }}>{fmtQty(h.quantity)}</span>
      </td>
      <td className="px-4 py-4 text-right">
        <span className="text-sm font-semibold tabular-nums ltr" style={{ color: 'var(--t2)' }}>{fmtPrice(h.avgCost, h.currency)}</span>
      </td>
      <td className="px-4 py-4 text-right">
        {(() => {
          const direction = priceChangeDirection(h.currentPrice, livePrices[h.symbol]?.previousClose);
          const color = priceChangeColor(h.currentPrice, livePrices[h.symbol]?.previousClose);
          return (
            <span className="inline-flex items-center gap-0.5 justify-end">
              {direction === 'up' && <ArrowUp size={11} className="shrink-0" style={{ color }} />}
              {direction === 'down' && <ArrowDown size={11} className="shrink-0" style={{ color }} />}
              <span
                className={`inline-block overflow-hidden align-middle rounded px-1 -mx-1 ${
                  priceFlash === 'up' ? 'animate-flash-up' : priceFlash === 'down' ? 'animate-flash-down' : ''
                }`}
                style={{ height: '1.15em', lineHeight: '1.15em' }}
              >
                <span
                  key={h.currentPrice}
                  className={`inline-block text-sm font-semibold tabular-nums ltr ${
                    priceFlash === 'up' ? 'animate-roll-up' : priceFlash === 'down' ? 'animate-roll-down' : ''
                  }`}
                  style={{ color }}
                >
                  {fmtPrice(h.currentPrice, h.currency)}
                </span>
              </span>
            </span>
          );
        })()}
      </td>
      <td className="px-4 py-4 text-right">
        <span className="text-base font-bold tabular-nums ltr" style={{ color: 'var(--t1)' }}>{fmt(h.currentValue, h.currency)}</span>
      </td>
      <td className="px-4 py-4 text-right">
        <p className="text-xs font-bold tabular-nums ltr" style={{ color: isPos ? 'var(--up)' : 'var(--dn)' }}>
          {isPos ? '+' : ''}{fmt(h.unrealizedPnL, h.currency)}
        </p>
        <p className="text-[11px] tabular-nums ltr" style={{ color: isPos ? 'var(--up)' : 'var(--dn)', opacity: 0.7 }}>
          {fmtPct(h.unrealizedPnLPct)}
        </p>
      </td>
      <td style={{ paddingRight: '1rem', paddingLeft: '1.5rem', paddingTop: '1rem', paddingBottom: '1rem' }}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onAddTransaction}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--at)'; e.currentTarget.style.background = 'var(--a10)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent'; }}
            title={t.addTransactionTitle}
          >
            <Plus size={13} />
          </button>
          <button
            onClick={onDeleteRequest}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--dn)'; e.currentTarget.style.background = 'var(--dn10)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
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
