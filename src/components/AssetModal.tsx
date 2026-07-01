import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Loader2, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';
import { Asset, Owner, FrequencyConfig, FrequencyType, SearchResult } from '../types';
import { searchTicker, getCurrentPrice, getHistoricalPrice } from '../services/marketData';
import { fmtPrice } from '../utils/calculations';
import { useT } from '../contexts/LanguageContext';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#10b981', '#14b8a6', '#06b6d4', '#3b82f6',
];

const INPUT_CLS = 'w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none transition-all text-right input-base';

// Native type="number" inputs still let the keyboard through "e"/"+"/"-",
// which aren't valid for a plain positive amount — block just those keys.
function blockInvalidNumberKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') e.preventDefault();
}

interface Props {
  mode: 'add' | 'edit';
  asset: Asset | null;
  onSave: (asset: Asset) => Promise<void>;
  onClose: () => void;
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function todayStr() { return new Date().toISOString().split('T')[0]; }

// ─── Step 1 ───────────────────────────────────────────────────────────────────

interface S1 {
  query: string; results: SearchResult[]; selected: SearchResult | null;
  currentPrice: number | null; currency: string;
  loading: boolean; priceLoading: boolean; error: string | null;
}

const MANUAL_TYPE = 'MANUAL';
const MANUAL_CURRENCIES = ['USD', 'GBP', 'EUR', 'ILS'];

function Step1({ state: s, setState, onNext, t }: {
  state: S1; setState: React.Dispatch<React.SetStateAction<S1>>;
  onNext: () => void; t: ReturnType<typeof useT>;
}) {
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const [manualMode, setManualMode] = useState(false);
  const [manualTicker, setManualTicker] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPriceStr, setManualPriceStr] = useState('');
  const [manualCurrency, setManualCurrency] = useState('USD');

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setState((p) => ({ ...p, results: [], error: null })); return; }
    setState((p) => ({ ...p, loading: true, error: null }));
    try {
      const results = await searchTicker(q);
      setState((p) => ({ ...p, results, loading: false }));
    } catch {
      setState((p) => ({ ...p, results: [], loading: false, error: t.couldNotConnect }));
    }
  }, [setState, t]);

  const onQuery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setState((p) => ({ ...p, query: q, selected: null, currentPrice: null }));
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => runSearch(q), 450);
  };

  const select = async (r: SearchResult) => {
    setState((p) => ({ ...p, selected: r, query: r.ticker, results: [], priceLoading: true, error: null }));
    try {
      const pd = await getCurrentPrice(r.symbol);
      setState((p) => ({ ...p, currentPrice: pd.price, currency: pd.currency, priceLoading: false }));
    } catch {
      setState((p) => ({ ...p, priceLoading: false, error: t.couldNotConnect }));
    }
  };

  const submitManual = () => {
    const price = parseFloat(manualPriceStr);
    if (!manualTicker.trim() || !(price > 0)) return;
    const ticker = manualTicker.trim().toUpperCase();
    const manual: SearchResult = {
      symbol: ticker, ticker, name: manualName.trim() || ticker,
      exchange: t.manualEntry, type: MANUAL_TYPE, currency: manualCurrency,
    };
    setState((p) => ({
      ...p, selected: manual, query: ticker, results: [],
      currentPrice: price, currency: manualCurrency, priceLoading: false, error: null,
    }));
  };

  if (manualMode) {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.tickerSymbol}</label>
          <input type="text" value={manualTicker} onChange={(e) => setManualTicker(e.target.value)}
            placeholder="CSPX" className={INPUT_CLS + ' ticker uppercase'} dir="ltr" />
        </div>
        <div>
          <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.name}</label>
          <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)}
            placeholder={t.assetNamePlaceholder} className={INPUT_CLS} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.currentPrice}</label>
            <input type="number" min={0} step="any" value={manualPriceStr}
              onChange={(e) => setManualPriceStr(e.target.value)} onKeyDown={blockInvalidNumberKey}
              placeholder="0.00" className={INPUT_CLS} dir="ltr" />
          </div>
          <div>
            <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.currencyLabel}</label>
            <select value={manualCurrency} onChange={(e) => setManualCurrency(e.target.value)}
              className={INPUT_CLS + ' cursor-pointer'} dir="ltr">
              {MANUAL_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {s.selected?.type === MANUAL_TYPE && (
          <div className="flex items-center gap-1">
            <CheckCircle2 size={12} style={{ color: 'var(--up)' }} />
            <span className="text-[12px]" style={{ color: 'var(--up)' }}>{t.manualEntryReady}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <BackBtn onClick={() => setManualMode(false)} label={t.backBtn} />
          <button onClick={() => { submitManual(); onNext(); }}
            disabled={!manualTicker.trim() || !(parseFloat(manualPriceStr) > 0)}
            className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-30"
            style={{ background: 'var(--a)' }}>
            {t.continueBtn}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.tickerSymbol}</label>
        <div className="relative">
          <input type="text" value={s.query} onChange={onQuery} placeholder="CSPX, AAPL, BTC-USD…"
            autoFocus className={INPUT_CLS + ' pr-10 ticker uppercase'} dir="ltr" />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--t3)' }}>
            {s.loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          </div>
        </div>
      </div>

      {s.results.length > 0 && (
        <div className="rounded-xl overflow-hidden shadow-2xl" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          {s.results.map((r) => (
            <button key={r.symbol} onClick={() => select(r)}
              className="w-full flex items-center justify-between px-4 py-3 text-right transition-colors"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--a10)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="text-right min-w-0">
                <p className="text-xs truncate" style={{ color: 'var(--t2)' }}>{r.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>{r.exchange} · {r.type}</p>
              </div>
              <div className="shrink-0 mr-3">
                <p className="text-sm font-bold ticker" style={{ color: 'var(--t1)' }} dir="ltr">{r.ticker}</p>
                <p className="text-[11px] ticker text-left" style={{ color: 'var(--t3)' }} dir="ltr">{r.symbol}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {s.selected && (
        <div className="rounded-xl p-4" style={{ background: 'var(--a10)', border: '1px solid var(--a20)' }}>
          <div className="flex items-start justify-between">
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--t2)' }}>{s.selected.name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>{s.selected.exchange}</p>
            </div>
            <div className="text-left shrink-0 mr-3">
              <p className="text-sm font-bold ticker" style={{ color: 'var(--t1)' }} dir="ltr">{s.selected.ticker}</p>
              {s.priceLoading && (
                <div className="flex items-center gap-1 mt-1">
                  <Loader2 size={11} className="animate-spin" style={{ color: 'var(--at)' }} />
                  <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{t.fetchingPrice}</span>
                </div>
              )}
              {s.currentPrice !== null && !s.priceLoading && (
                <p className="text-sm font-semibold mt-0.5 ltr" style={{ color: 'var(--t1)' }}>
                  {fmtPrice(s.currentPrice, s.currency)}
                </p>
              )}
            </div>
          </div>
          {s.currentPrice !== null && (
            <div className="flex items-center gap-1 mt-2">
              <CheckCircle2 size={12} style={{ color: 'var(--up)' }} />
              <span className="text-[12px]" style={{ color: 'var(--up)' }}>{t.priceReceived}</span>
            </div>
          )}
        </div>
      )}

      {s.error && <ErrorBox msg={s.error} />}

      <button onClick={onNext} disabled={!s.selected || s.priceLoading || s.currentPrice === null}
        className="w-full py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-30"
        style={{ background: 'var(--a)' }}>
        {t.continueBtn}
      </button>

      <button onClick={() => setManualMode(true)}
        className="w-full text-center text-xs font-medium transition-opacity hover:opacity-70"
        style={{ color: 'var(--t3)' }}>
        {t.enterManually}
      </button>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

interface S2 {
  purchaseDate: string; method: 'amount' | 'units';
  amountStr: string; unitsStr: string;
  historicalPrice: number | null; calcQty: number | null; calcAvgBuy: number | null;
  loading: boolean; error: string | null;
}

function Step2({ step1, state: s, setState, onNext, onBack, t }: {
  step1: S1; state: S2; setState: React.Dispatch<React.SetStateAction<S2>>;
  onNext: () => void; onBack: () => void; t: ReturnType<typeof useT>;
}) {
  const fetchHist = useCallback(async (date: string) => {
    if (!step1.selected || !date) return;
    if (step1.selected.type === MANUAL_TYPE) {
      // No market data source for manually-entered assets — use the
      // manually-entered price as the purchase-date price too.
      setState((p) => ({ ...p, loading: false, error: null, historicalPrice: step1.currentPrice }));
      return;
    }
    setState((p) => ({ ...p, loading: true, error: null, historicalPrice: null, calcQty: null, calcAvgBuy: null }));
    try {
      const price = await getHistoricalPrice(step1.selected.symbol, new Date(date));
      setState((p) => ({ ...p, historicalPrice: price, loading: false }));
    } catch {
      setState((p) => ({ ...p, loading: false, error: t.couldNotFetchHistory, historicalPrice: step1.currentPrice }));
    }
  }, [step1, setState, t]);

  useEffect(() => { if (s.purchaseDate) fetchHist(s.purchaseDate); }, [s.purchaseDate, fetchHist]);

  useEffect(() => {
    if (!s.historicalPrice) return;
    if (s.method === 'amount' && s.amountStr) {
      const amt = parseFloat(s.amountStr);
      if (amt > 0) setState((p) => ({ ...p, calcQty: amt / s.historicalPrice!, calcAvgBuy: s.historicalPrice }));
    }
    if (s.method === 'units' && s.unitsStr) {
      const units = parseFloat(s.unitsStr);
      if (units > 0) setState((p) => ({ ...p, calcQty: units, calcAvgBuy: s.historicalPrice }));
    }
  }, [s.method, s.amountStr, s.unitsStr, s.historicalPrice, setState]);

  const currency = step1.currency || 'USD';
  const canProceed = !!s.purchaseDate && s.calcQty !== null && s.calcQty > 0;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.purchaseDate}</label>
        <input type="date" value={s.purchaseDate} max={todayStr()}
          onChange={(e) => setState((p) => ({ ...p, purchaseDate: e.target.value }))}
          className={INPUT_CLS + ' text-left'} />
      </div>

      <div>
        <label className="text-[12px] font-medium block mb-2 text-right" style={{ color: 'var(--t3)' }}>{t.howDidYouInvest}</label>
        <div className="grid grid-cols-2 gap-2">
          {(['amount', 'units'] as const).map((m) => (
            <button key={m} onClick={() => setState((p) => ({ ...p, method: m, calcQty: null, calcAvgBuy: null, amountStr: '', unitsStr: '' }))}
              className="py-2.5 rounded-xl text-sm font-medium transition-all"
              style={s.method === m
                ? { background: 'var(--a20)', border: '1px solid var(--a)', color: 'var(--at)' }
                : { background: 'var(--input)', border: '1px solid var(--input-b)', color: 'var(--t2)' }
              }>
              {m === 'amount' ? t.amountMethod : t.unitsMethod}
            </button>
          ))}
        </div>
      </div>

      {s.method === 'amount' ? (
        <div>
          <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.investedAmount}</label>
          <div className="relative">
            <input type="number" min={0} step="any" value={s.amountStr}
              onChange={(e) => setState((p) => ({ ...p, amountStr: e.target.value }))} onKeyDown={blockInvalidNumberKey}
              placeholder="0.00" className={INPUT_CLS + ' pl-8'} dir="ltr" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--t3)' }}>
              {currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'ILS' ? '₪' : '$'}
            </span>
          </div>
        </div>
      ) : (
        <div>
          <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.unitsPurchased}</label>
          <input type="number" min={0} step="any" value={s.unitsStr}
            onChange={(e) => setState((p) => ({ ...p, unitsStr: e.target.value }))} onKeyDown={blockInvalidNumberKey}
            placeholder="0" className={INPUT_CLS} dir="ltr" />
        </div>
      )}

      {s.purchaseDate && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
          <Row label={t.historyPrice}>
            {s.loading ? <Loader2 size={12} className="animate-spin" style={{ color: 'var(--at)' }} />
              : s.historicalPrice ? <span className="ltr font-semibold" style={{ color: 'var(--t1)' }}>{fmtPrice(s.historicalPrice, currency)}</span>
              : <span style={{ color: 'var(--t3)' }}>—</span>}
          </Row>
          {s.calcQty !== null && (
            <Row label={t.calculatedQty}>
              <span className="ltr font-semibold" style={{ color: 'var(--t1)' }}>{s.calcQty.toFixed(4)}</span>
            </Row>
          )}
          {s.calcAvgBuy !== null && (
            <Row label={t.calculatedAvgBuy}>
              <span className="ltr font-semibold" style={{ color: 'var(--up)' }}>{fmtPrice(s.calcAvgBuy, currency)}</span>
            </Row>
          )}
          {/* Units mode derives the invested amount from qty x price — surface it
              back so the user sees it computed, never has to type it themselves. */}
          {s.method === 'units' && s.calcQty !== null && s.calcAvgBuy !== null && (
            <Row label={t.calculatedInvestedAmount}>
              <span className="ltr font-semibold" style={{ color: 'var(--t1)' }}>{fmtPrice(s.calcQty * s.calcAvgBuy, currency)}</span>
            </Row>
          )}
        </div>
      )}

      {s.error && <ErrorBox msg={s.error} />}

      <div className="flex gap-2 pt-1">
        <BackBtn onClick={onBack} label={t.backBtn} />
        <button onClick={onNext} disabled={!canProceed}
          className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-30"
          style={{ background: 'var(--a)' }}>
          {t.continueBtn}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

interface S3 {
  owner: Owner; frequency: FrequencyConfig;
  contributionStr: string; color: string; everyXStr: string;
}

function Step3({ state: s, setState, step2Method, step2AmountStr, onBack, onSubmit, loading, t }: {
  state: S3; setState: React.Dispatch<React.SetStateAction<S3>>;
  step2Method: 'amount' | 'units'; step2AmountStr: string;
  onBack: () => void; onSubmit: () => void; loading: boolean; t: ReturnType<typeof useT>;
}) {
  const ownerOpts: { value: Owner; label: string }[] = [
    { value: 'me', label: t.me }, { value: 'partner', label: t.partner }, { value: 'shared', label: t.shared },
  ];

  const freqs = [
    { value: 'one-time', label: t.freqOneTime }, { value: 'monthly', label: t.freqMonthly },
    { value: 'quarterly', label: t.freqQuarterly }, { value: 'semi-annually', label: t.freqSemiAnnually },
    { value: 'yearly', label: t.freqYearly }, { value: 'weekly', label: t.freqWeekly },
    { value: 'daily', label: t.freqDaily }, { value: 'every-x-months', label: t.freqEveryX },
  ] as const;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium block mb-2 text-right" style={{ color: 'var(--t3)' }}>{t.whoIsOwner}</label>
        <div className="grid grid-cols-3 gap-2">
          {ownerOpts.map((o) => (
            <button key={o.value} onClick={() => setState((p) => ({ ...p, owner: o.value }))}
              className="py-2 rounded-xl text-sm font-medium transition-all"
              style={s.owner === o.value
                ? { background: 'var(--a20)', border: '1px solid var(--a)', color: 'var(--at)' }
                : { background: 'var(--input)', border: '1px solid var(--input-b)', color: 'var(--t2)' }
              }>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.frequencyLabel}</label>
        <select value={s.frequency.type}
          onChange={(e) => setState((p) => ({ ...p, frequency: { ...p.frequency, type: e.target.value as FrequencyType } }))}
          className={INPUT_CLS + ' cursor-pointer'}>
          {freqs.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        {s.frequency.type === 'every-x-months' && (
          <input type="number" min={2} max={24} value={s.everyXStr} placeholder={t.numMonths}
            onChange={(e) => { const v = e.target.value; setState((p) => ({ ...p, everyXStr: v, frequency: { ...p.frequency, everyXMonths: parseInt(v) || 2 } })); }}
            onKeyDown={blockInvalidNumberKey}
            className={INPUT_CLS + ' mt-2'} dir="ltr" />
        )}
        {s.frequency.type === 'monthly' && (
          <div className="mt-2">
            <label className="text-[11px] block mb-1" style={{ color: 'var(--t3)' }}>{t.dayOfMonth}</label>
            <input type="number" min={1} max={28} value={s.frequency.dayOfMonth ?? 1}
              onChange={(e) => setState((p) => ({ ...p, frequency: { ...p.frequency, dayOfMonth: parseInt(e.target.value) || 1 } }))}
              onKeyDown={blockInvalidNumberKey}
              className={INPUT_CLS} dir="ltr" />
          </div>
        )}
      </div>

      {/* Contribution amount — only shown for units method; amount method reuses Step 2 value */}
      {s.frequency.type !== 'one-time' && step2Method === 'units' && (
        <div>
          <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.contributionAmount}</label>
          <div className="relative">
            <input type="number" min={0} step="any" value={s.contributionStr}
              onChange={(e) => setState((p) => ({ ...p, contributionStr: e.target.value }))} onKeyDown={blockInvalidNumberKey}
              placeholder="0" className={INPUT_CLS + ' pl-7'} dir="ltr" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--t3)' }}>$</span>
          </div>
        </div>
      )}

      <div>
        <label className="text-[12px] font-medium block mb-2 text-right" style={{ color: 'var(--t3)' }}>{t.colorAccent}</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button key={color} type="button" onClick={() => setState((p) => ({ ...p, color }))}
              className="w-7 h-7 rounded-full transition-all duration-150 hover:scale-110"
              style={{
                backgroundColor: color,
                outline: s.color === color ? `2px solid ${color}` : '2px solid transparent',
                outlineOffset: '2px', opacity: s.color === color ? 1 : 0.5,
                transform: s.color === color ? 'scale(1.15)' : undefined,
              }} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <BackBtn onClick={onBack} label={t.backBtn} />
        <button onClick={onSubmit} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90"
          style={{ background: 'var(--a)', boxShadow: '0 4px 14px var(--a20)' }}>
          {loading && <Loader2 size={14} className="animate-spin" />}
          {t.addToInvestments}
        </button>
      </div>
    </div>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditForm({ asset, onSave, onClose, t }: {
  asset: Asset; onSave: (a: Asset) => void; onClose: () => void; t: ReturnType<typeof useT>;
}) {
  const [form, setForm] = useState({
    name: asset.name, avgBuyPrice: String(asset.avgBuyPrice),
    quantity: String(asset.quantity), currentPrice: String(asset.currentPrice),
    contributionStr: String(asset.monthlyContribution),
    frequency: asset.frequency, owner: asset.owner, color: asset.color,
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const freqs = [
    { value: 'one-time', label: t.freqOneTime }, { value: 'monthly', label: t.freqMonthly },
    { value: 'quarterly', label: t.freqQuarterly }, { value: 'semi-annually', label: t.freqSemiAnnually },
    { value: 'yearly', label: t.freqYearly }, { value: 'weekly', label: t.freqWeekly },
    { value: 'daily', label: t.freqDaily }, { value: 'every-x-months', label: t.freqEveryX },
  ] as const;

  const ownerOpts: { value: Owner; label: string }[] = [
    { value: 'me', label: t.me }, { value: 'partner', label: t.partner }, { value: 'shared', label: t.shared },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--t3)' }}>{t.name}</label>
        <input type="text" value={form.name} onChange={set('name')} className={INPUT_CLS} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--t3)' }}>{t.avgBuy}</label>
          <input type="number" min={0} step="any" value={form.avgBuyPrice} onChange={set('avgBuyPrice')} onKeyDown={blockInvalidNumberKey} className={INPUT_CLS} dir="ltr" />
        </div>
        <div>
          <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--t3)' }}>{t.qty}</label>
          <input type="number" min={0} step="any" value={form.quantity} onChange={set('quantity')} onKeyDown={blockInvalidNumberKey} className={INPUT_CLS} dir="ltr" />
        </div>
        <div>
          <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--t3)' }}>{t.currentPrice}</label>
          <input type="number" min={0} step="any" value={form.currentPrice} onChange={set('currentPrice')} onKeyDown={blockInvalidNumberKey} className={INPUT_CLS} dir="ltr" />
        </div>
      </div>
      <div>
        <label className="text-[12px] font-medium block mb-2" style={{ color: 'var(--t3)' }}>{t.whoIsOwner}</label>
        <div className="grid grid-cols-3 gap-2">
          {ownerOpts.map((o) => (
            <button key={o.value} onClick={() => setForm((f) => ({ ...f, owner: o.value }))}
              className="py-2 rounded-xl text-sm font-medium transition-all"
              style={form.owner === o.value
                ? { background: 'var(--a20)', border: '1px solid var(--a)', color: 'var(--at)' }
                : { background: 'var(--input)', border: '1px solid var(--input-b)', color: 'var(--t2)' }
              }>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--t3)' }}>{t.frequencyLabel}</label>
        <select value={form.frequency.type}
          onChange={(e) => setForm((f) => ({ ...f, frequency: { ...f.frequency, type: e.target.value as FrequencyType } }))}
          className={INPUT_CLS + ' cursor-pointer'}>
          {freqs.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      {form.frequency.type !== 'one-time' && (
        <div>
          <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--t3)' }}>{t.contributionAmount}</label>
          <input type="number" min={0} step="any" value={form.contributionStr} onChange={set('contributionStr')} onKeyDown={blockInvalidNumberKey} className={INPUT_CLS} dir="ltr" />
        </div>
      )}
      <div>
        <label className="text-[12px] font-medium block mb-2" style={{ color: 'var(--t3)' }}>{t.colorAccent}</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button key={color} type="button" onClick={() => setForm((f) => ({ ...f, color }))}
              className="w-7 h-7 rounded-full transition-all hover:scale-110"
              style={{ backgroundColor: color, outline: form.color === color ? `2px solid ${color}` : '2px solid transparent', outlineOffset: '2px', opacity: form.color === color ? 1 : 0.5 }} />
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={onClose} className="px-4 py-2.5 text-sm rounded-xl transition-all hover:opacity-70"
          style={{ color: 'var(--t2)' }}>{t.cancel}</button>
        <button
          onClick={() => onSave({
            ...asset, name: form.name,
            avgBuyPrice: parseFloat(form.avgBuyPrice) || 0,
            quantity: parseFloat(form.quantity) || 0,
            currentPrice: parseFloat(form.currentPrice) || 0,
            monthlyContribution: parseFloat(form.contributionStr) || 0,
            frequency: form.frequency, owner: form.owner, color: form.color,
          })}
          className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90"
          style={{ background: 'var(--a)' }}>
          {t.saveChanges}
        </button>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function AssetModal({ mode, asset, onSave, onClose }: Props) {
  const t = useT();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [s1, setS1] = useState<S1>({
    query: '', results: [], selected: null,
    currentPrice: null, currency: 'USD', loading: false, priceLoading: false, error: null,
  });
  const [s2, setS2] = useState<S2>({
    purchaseDate: todayStr(), method: 'amount', amountStr: '', unitsStr: '',
    historicalPrice: null, calcQty: null, calcAvgBuy: null, loading: false, error: null,
  });
  const [s3, setS3] = useState<S3>({
    owner: 'me', contributionStr: '', frequency: { type: 'monthly', dayOfMonth: 1 },
    color: PRESET_COLORS[0], everyXStr: '2',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!s1.selected) return;
    setSubmitting(true);
    const isRecurring = s3.frequency.type !== 'one-time';
    const newAsset: Asset = {
      id: genId(), ticker: s1.selected.ticker, symbol: s1.selected.symbol,
      name: s1.selected.name, owner: s3.owner, exchange: s1.selected.exchange,
      avgBuyPrice: s2.calcAvgBuy ?? s1.currentPrice ?? 0,
      quantity: s2.calcQty ?? 0,
      currentPrice: s1.currentPrice ?? s2.historicalPrice ?? 0,
      currency: s1.currency,
      monthlyContribution: isRecurring
        ? (s2.method === 'amount' ? parseFloat(s2.amountStr) || 0 : parseFloat(s3.contributionStr) || 0)
        : 0,
      // startDate anchors recurring catch-up (see recurringEngine.ts) — it's
      // the purchase date, so deposits are only counted from here onward.
      frequency: isRecurring ? { ...s3.frequency, startDate: s2.purchaseDate } : s3.frequency,
      color: s3.color, lastPriceUpdate: Date.now(),
    };
    await onSave(newAsset);
    setSubmitting(false);
  };

  const stepLabels = [t.findAsset, t.purchaseDetails, t.investmentSetup];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[480px] rounded-2xl overflow-hidden shadow-2xl animate-scale-in max-h-[90vh] flex flex-col"
        style={{ background: 'var(--modal)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--t1)' }}>
              {mode === 'edit' && asset ? t.editInvestment(asset.ticker) : t.addNewInvestment}
            </h2>
            {mode === 'add' && (
              <div className="flex items-center gap-2 mt-1.5">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                      style={step === n ? { background: 'var(--a)', color: '#fff' }
                        : step > n ? { background: 'var(--up)', color: '#fff' }
                        : { background: 'var(--border2)', color: 'var(--t3)' }}>
                      {step > n ? '✓' : n}
                    </div>
                    <span className="text-[11px]" style={{ color: step === n ? 'var(--t2)' : 'var(--t4)' }}>
                      {stepLabels[n - 1]}
                    </span>
                    {n < 3 && <div className="w-3 h-px" style={{ background: 'var(--border)' }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl transition-all hover:opacity-70"
            style={{ color: 'var(--t3)', background: 'var(--input)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {mode === 'edit' && asset ? (
            <EditForm asset={asset} onSave={onSave} onClose={onClose} t={t} />
          ) : step === 1 ? (
            <Step1 state={s1} setState={setS1} onNext={() => setStep(2)} t={t} />
          ) : step === 2 ? (
            <Step2 step1={s1} state={s2} setState={setS2} onNext={() => setStep(3)} onBack={() => setStep(1)} t={t} />
          ) : (
            <Step3 state={s3} setState={setS3} step2Method={s2.method} step2AmountStr={s2.amountStr} onBack={() => setStep(2)} onSubmit={handleSubmit} loading={submitting} t={t} />
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{label}</span>
      <span className="text-[12px]">{children}</span>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
      <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
      <p className="text-xs" style={{ color: '#fcd34d' }}>{msg}</p>
    </div>
  );
}

function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 px-4 py-2.5 text-sm rounded-xl transition-all hover:opacity-70"
      style={{ color: 'var(--t2)', background: 'var(--input)', border: '1px solid var(--border)' }}>
      <ChevronLeft size={15} />
      {label}
    </button>
  );
}
