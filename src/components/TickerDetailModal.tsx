import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ArrowUp, ArrowDown, ArrowDownCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Holding, ChartPoint, ChartRange, PriceData, Transaction } from '../types';
import { getCurrentPrice, getChartRange } from '../services/marketData';
import { fmtPrice, fmtPct, fmt, fmtDate, currencySymbol, priceChangeColor } from '../utils/calculations';
import { formatMarketTiming } from '../utils/marketStatus';
import { usePriceFlash } from '../hooks/usePriceFlash';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { compareTransactionsAsc } from '../utils/portfolioEngine';
import { MarketStatusIcon } from './MarketStatusIcon';
import { SkeletonCard } from './ui/Skeleton';
import { useT } from '../contexts/LanguageContext';
import { Translations } from '../i18n';

interface Props {
  holding: Holding;
  onClose: () => void;
  /** Already-fetched live quote (from the same useLivePrices call Home/Portfolio already made) — avoids a duplicate fetch when available. */
  quote?: PriceData;
  /** This holding's transactions, newest first, for the "Recent activity" section. */
  transactions?: Transaction[];
  /** Quick Sell — opens the transaction form in Sell mode for this holding. Only shown when the holding has shares to sell. */
  onSell?: () => void;
}

// Ordered shortest-to-longest — laid out in each language's natural reading
// direction (no forced dir override), so Hebrew reads שבוע nearest the right
// edge through שנה at the left, and English reads 1W through 1Y left-to-right.
const RANGES: ChartRange[] = ['1w', '1mo', '3mo', '1y'];

function rangeLabel(r: ChartRange, t: Translations): string {
  return r === '1w' ? t.range1W : r === '1mo' ? t.range1M : r === '3mo' ? t.range3M : t.range1Y;
}

function formatAxisDate(dateStr: string, range: ChartRange): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (range === '1y') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Symbol kept, decimals dropped — keeps the axis column narrow (no overlap
// with the plotted line) while still showing which currency the scale is in;
// the exact value is always available in the tooltip.
function formatAxisPrice(v: number, currency: string): string {
  return `${currencySymbol(currency)}${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function TickerDetailModal({ holding, onClose, quote, transactions = [], onSell }: Props) {
  const t = useT();
  useLockBodyScroll();
  const [price, setPrice] = useState<PriceData | null>(quote ?? null);
  const [priceLoading, setPriceLoading] = useState(!quote);
  const [priceError, setPriceError] = useState(false);
  const [range, setRange] = useState<ChartRange>('1mo');
  const [chartData, setChartData] = useState<ChartPoint[] | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState(false);

  useEffect(() => {
    // Reuse the quote Home/Advanced already fetched via useLivePrices when
    // available — only self-fetch as a fallback (e.g. no App-level quote
    // resolved yet for this symbol).
    if (quote) { setPrice(quote); setPriceLoading(false); setPriceError(false); return; }
    let alive = true;
    setPriceLoading(true);
    setPriceError(false);
    getCurrentPrice(holding.symbol)
      .then((p) => { if (alive) { setPrice(p); setPriceLoading(false); } })
      .catch(() => { if (alive) { setPriceError(true); setPriceLoading(false); } });
    return () => { alive = false; };
  }, [holding.symbol, quote]);

  useEffect(() => {
    let alive = true;
    setChartLoading(true);
    setChartError(false);
    getChartRange(holding.symbol, range)
      .then((pts) => { if (alive) { setChartData(pts); setChartLoading(false); } })
      .catch(() => { if (alive) { setChartError(true); setChartLoading(false); } });
    return () => { alive = false; };
  }, [holding.symbol, range]);

  const currency = price?.currency ?? holding.currency;
  const livePrice = price?.price ?? holding.currentPrice;
  const priceFlash = usePriceFlash(livePrice);
  const exchange = price?.exchange ?? holding.exchange ?? null;

  // Today's change (independent of the selected chart range) — kept as a
  // small secondary readout since it answers a different question ("how did
  // it move today") than the range-relative change shown next to the price.
  const previousClose = price?.previousClose ?? null;
  const dailyChange = previousClose !== null ? livePrice - previousClose : null;
  const dailyChangePct = previousClose ? (dailyChange! / previousClose) * 100 : null;
  const isDailyUp = (dailyChange ?? 0) >= 0;

  // Range-relative change — the primary badge next to price, tracking
  // whichever range (1W/1M/3M/1Y) is currently selected.
  const rangeBaseline = chartData && chartData.length > 0 ? chartData[0].close : null;
  const rangeChange = rangeBaseline !== null ? livePrice - rangeBaseline : null;
  const rangeChangePct = rangeBaseline ? (rangeChange! / rangeBaseline) * 100 : null;
  const isRangeUp = (rangeChange ?? 0) >= 0;

  const holdingsValue = holding.quantity * livePrice;
  const holdingsPnl = holdingsValue - holding.quantity * holding.avgCost;

  const tooltipStyle = {
    backgroundColor: 'var(--modal)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '10px 14px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    direction: 'ltr' as const,
  };

  return createPortal(
    <div className="fixed inset-0 z-50 isolate flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[480px] sm:max-w-[520px] rounded-2xl overflow-hidden shadow-2xl animate-scale-in max-h-[92vh] flex flex-col"
        style={{ background: 'var(--modal)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="min-w-0">
            <h2 className="text-sm font-bold ticker" style={{ color: 'var(--t1)' }} dir="ltr">{holding.ticker}</h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--t3)' }}>
              {holding.name}{exchange ? ` · ${exchange}` : ''}{currency ? ` · ${currency}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl transition-all hover:opacity-70 shrink-0"
            style={{ color: 'var(--t3)', background: 'var(--input)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Current / live price — reading-direction order: small caption
              label, then the big price, then a "today" row beneath it. The
              today row's own DOM order (label, value, arrow) is left to
              mirror naturally per the page's dir, only the numeric chunk is
              forced ltr. The selected-range change lives with the range
              toggle below instead of competing here. */}
          <div>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>{t.liveMarketPrice}</p>
            {priceLoading ? (
              <div className="flex items-center gap-2 mt-1.5">
                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--at)' }} />
                <span className="text-xs" style={{ color: 'var(--t3)' }}>{t.fetchingPrice}</span>
              </div>
            ) : priceError ? (
              <p className="text-xs mt-1.5" style={{ color: 'var(--dn)' }}>{t.couldNotConnect}</p>
            ) : (
              <>
                <span
                  className={`block mt-1 text-3xl sm:text-4xl font-black tabular-nums ltr rounded-lg px-1 -mx-1 ${
                    priceFlash === 'up' ? 'animate-flash-up' : priceFlash === 'down' ? 'animate-flash-down' : ''
                  }`}
                  style={{ color: priceChangeColor(livePrice, previousClose) }}
                >
                  {fmtPrice(livePrice, currency)}
                </span>
                {dailyChange !== null && dailyChangePct !== null && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-xs" style={{ color: 'var(--t3)' }}>{t.todayChange}</span>
                    <span className="text-sm font-semibold ltr" style={{ color: isDailyUp ? 'var(--up)' : 'var(--dn)' }}>
                      {isDailyUp ? '+' : ''}{fmtPrice(dailyChange, currency)} ({fmtPct(dailyChangePct)})
                    </span>
                    {isDailyUp ? <ArrowUp size={13} className="shrink-0" style={{ color: 'var(--up)' }} />
                      : <ArrowDown size={13} className="shrink-0" style={{ color: 'var(--dn)' }} />}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Market info — status, exchange, timing. Three lines, strong
              hierarchy, no label/value table. */}
          {price?.marketStatus && (
            <div className="rounded-xl p-4 sm:p-5" style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--t1)' }}>
                <MarketStatusIcon isOpen={price.marketStatus.status === 'open'} />
                <span>{price.marketStatus.status === 'open' ? t.marketOpen : t.marketClosed}</span>
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>{price.marketStatus.exchange}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>{formatMarketTiming(price.marketStatus, t)}</p>
            </div>
          )}

          {/* Range toggle + chart — the secondary block: the selected-range
              change lives here, next to the toggle that controls it, kept
              small/muted so it reads as supporting detail, not a second
              headline next to the price above. */}
          <div className="rounded-xl p-3 sm:p-4" style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={range === r
                      ? { background: 'var(--a20)', border: '1px solid var(--a)', color: 'var(--at)' }
                      : { background: 'var(--card)', border: '1px solid var(--input-b)', color: 'var(--t2)' }
                    }
                  >
                    {rangeLabel(r, t)}
                  </button>
                ))}
              </div>
              {rangeChange !== null && rangeChangePct !== null && (
                <span className="text-xs font-semibold ltr" style={{ color: isRangeUp ? 'var(--up)' : 'var(--dn)', opacity: 0.85 }}>
                  {isRangeUp ? '+' : ''}{fmtPrice(rangeChange, currency)} ({fmtPct(rangeChangePct)})
                </span>
              )}
            </div>
            {/* Bled past the card's left padding on mobile only, so the plot
                area uses more of the narrow modal's width. */}
            <div className="-ml-3 sm:ml-0" style={{ height: 240 }}>
              {chartLoading ? (
                <SkeletonCard height="240px" />
              ) : chartError || !chartData || chartData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-xs" style={{ color: 'var(--t3)' }}>{t.couldNotFetchHistory}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                    <defs>
                      <linearGradient id="tickerChartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--a)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--a)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="date" stroke="transparent" tickFormatter={(v) => formatAxisDate(v, range)}
                      tick={{ fill: 'var(--t3)', fontSize: 12 }} tickLine={false} axisLine={false}
                      interval="preserveStartEnd" minTickGap={44} padding={{ left: 12, right: 12 }} tickMargin={10} />
                    <YAxis stroke="transparent" tick={{ fill: 'var(--t3)', fontSize: 12 }}
                      tickFormatter={(v) => formatAxisPrice(v, currency)} tickLine={false} axisLine={false}
                      width={44} domain={['auto', 'auto']} tickMargin={6} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: 'var(--t3)', fontSize: 11, marginBottom: 4 }}
                      itemStyle={{ fontSize: 12, color: 'var(--t1)' }}
                      labelFormatter={(label: string) => formatAxisDate(label, range)}
                      formatter={(value: number) => [fmtPrice(value, currency), t.currentPrice]}
                    />
                    <Area type="monotone" dataKey="close" stroke="var(--a)" strokeWidth={2}
                      fill="url(#tickerChartGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Holdings impact — this popup is only opened from a held position */}
          <div className="rounded-xl p-4 sm:p-5" style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--t3)' }}>{t.yourHolding}</p>
              {onSell && holding.quantity > 0 && (
                <button
                  onClick={() => { onSell(); onClose(); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                  style={{ color: 'var(--dn)', background: 'var(--dn10)', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <ArrowDownCircle size={13} />
                  {t.sellLabel}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--t3)' }}>{t.currentValue}</p>
                <p className="text-base sm:text-lg font-bold tabular-nums ltr" style={{ color: 'var(--t1)' }}>
                  {fmt(holdingsValue, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--t3)' }}>{t.profitLoss}</p>
                <p className="text-base sm:text-lg font-bold tabular-nums ltr" style={{ color: holdingsPnl >= 0 ? 'var(--up)' : 'var(--dn)' }}>
                  {holdingsPnl >= 0 ? '+' : ''}{fmt(holdingsPnl, currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Recent activity — this holding's own transactions, most recent first */}
          {transactions.length > 0 && (
            <div className="rounded-xl p-4 sm:p-5" style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--t3)' }}>{t.recentActivity}</p>
              <div className="space-y-2.5">
                {[...transactions]
                  .sort((a, b) => compareTransactionsAsc(b, a))
                  .slice(0, 5)
                  .map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={
                            tx.type === 'buy' ? { color: 'var(--up)', background: 'var(--up10)' }
                              : tx.type === 'sell' ? { color: 'var(--dn)', background: 'var(--dn10)' }
                              : { color: 'var(--at)', background: 'var(--a10)' }
                          }
                        >
                          {tx.type === 'buy' ? t.buyLabel : tx.type === 'sell' ? t.sellLabel : t.dividendLabel}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--t3)' }}>{fmtDate(new Date(tx.date + 'T00:00:00'))}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums ltr" style={{ color: 'var(--t1)' }}>
                        {fmtPrice(tx.amount, currency)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
