import { useState, useEffect } from 'react';
import { X, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Asset, ChartPoint, ChartRange, PriceData } from '../types';
import { getCurrentPrice, getChartRange } from '../services/marketData';
import { fmtPrice, fmtPct, fmt, currencySymbol } from '../utils/calculations';
import { formatMarketTiming } from '../utils/marketStatus';
import { usePriceFlash } from '../hooks/usePriceFlash';
import { MarketStatusIcon } from './MarketStatusIcon';
import { useT } from '../contexts/LanguageContext';
import { Translations } from '../i18n';

interface Props {
  asset: Asset;
  onClose: () => void;
  /** Already-fetched live quote (from the same useLivePrices call Home/Advanced already made) — avoids a duplicate fetch when available. */
  quote?: PriceData;
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

export function TickerDetailModal({ asset, onClose, quote }: Props) {
  const t = useT();
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
    getCurrentPrice(asset.symbol)
      .then((p) => { if (alive) { setPrice(p); setPriceLoading(false); } })
      .catch(() => { if (alive) { setPriceError(true); setPriceLoading(false); } });
    return () => { alive = false; };
  }, [asset.symbol, quote]);

  useEffect(() => {
    let alive = true;
    setChartLoading(true);
    setChartError(false);
    getChartRange(asset.symbol, range)
      .then((pts) => { if (alive) { setChartData(pts); setChartLoading(false); } })
      .catch(() => { if (alive) { setChartError(true); setChartLoading(false); } });
    return () => { alive = false; };
  }, [asset.symbol, range]);

  const currency = price?.currency ?? asset.currency;
  const livePrice = price?.price ?? asset.currentPrice;
  const priceFlash = usePriceFlash(livePrice);
  const exchange = price?.exchange ?? asset.exchange ?? null;

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

  const holdingsValue = asset.quantity * livePrice;
  const holdingsPnl = holdingsValue - asset.quantity * asset.avgBuyPrice;

  const tooltipStyle = {
    backgroundColor: 'var(--modal)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '10px 14px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    direction: 'ltr' as const,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[480px] sm:max-w-[520px] rounded-2xl overflow-hidden shadow-2xl animate-scale-in max-h-[92vh] flex flex-col"
        style={{ background: 'var(--modal)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="min-w-0">
            <h2 className="text-sm font-bold ticker" style={{ color: 'var(--t1)' }} dir="ltr">{asset.ticker}</h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--t3)' }}>
              {asset.name}{exchange ? ` · ${exchange}` : ''}{currency ? ` · ${currency}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl transition-all hover:opacity-70 shrink-0"
            style={{ color: 'var(--t3)', background: 'var(--input)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Current / live price */}
          <div>
            {priceLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--at)' }} />
                <span className="text-xs" style={{ color: 'var(--t3)' }}>{t.fetchingPrice}</span>
              </div>
            ) : priceError ? (
              <p className="text-xs" style={{ color: 'var(--dn)' }}>{t.couldNotConnect}</p>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`text-3xl sm:text-4xl font-black tabular-nums ltr rounded-lg px-1 -mx-1 ${
                    priceFlash === 'up' ? 'animate-flash-up' : priceFlash === 'down' ? 'animate-flash-down' : ''
                  }`}
                  style={{ color: 'var(--t1)' }}
                >
                  {fmtPrice(livePrice, currency)}
                </span>
                {rangeChange !== null && rangeChangePct !== null && (
                  <span
                    className="flex items-center gap-1.5 flex-wrap text-sm font-semibold"
                    style={{ color: isRangeUp ? 'var(--up)' : 'var(--dn)' }}
                  >
                    {isRangeUp ? <TrendingUp size={14} className="shrink-0" /> : <TrendingDown size={14} className="shrink-0" />}
                    <span className="ltr">
                      {isRangeUp ? '+' : ''}{fmtPrice(rangeChange, currency)} ({fmtPct(rangeChangePct)})
                    </span>
                    <span className="opacity-70 font-medium">{rangeLabel(range, t)}</span>
                  </span>
                )}
              </div>
            )}
            {dailyChange !== null && dailyChangePct !== null && (
              <div className="flex items-center justify-between gap-3 mt-2.5">
                <span className="text-xs font-semibold" style={{ color: 'var(--t3)' }}>{t.todayChange}</span>
                <span className="flex items-center gap-1 text-xs font-semibold ltr" style={{ color: isDailyUp ? 'var(--up)' : 'var(--dn)' }}>
                  {isDailyUp ? '+' : ''}{fmtPrice(dailyChange, currency)} ({fmtPct(dailyChangePct)})
                </span>
              </div>
            )}
            <p className="text-xs mt-1.5" style={{ color: 'var(--t3)' }}>{t.liveMarketPrice}</p>
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

          {/* Range toggle + chart */}
          <div className="rounded-xl p-3 sm:p-4" style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
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
            <div style={{ height: 240 }}>
              {chartLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin" style={{ color: 'var(--at)' }} />
                </div>
              ) : chartError || !chartData || chartData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-xs" style={{ color: 'var(--t3)' }}>{t.couldNotFetchHistory}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
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
                      width={52} domain={['auto', 'auto']} tickMargin={8} />
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
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--t3)' }}>{t.yourHolding}</p>
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
        </div>
      </div>
    </div>
  );
}
