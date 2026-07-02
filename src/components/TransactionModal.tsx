import { useState, useRef, useCallback } from 'react';
import { X, Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Holding, SearchResult, Transaction, TransactionType } from '../types';
import { searchTicker, getCurrentPrice } from '../services/marketData';
import { fmtPrice, fmtQty } from '../utils/calculations';
import { validateSell } from '../utils/portfolioEngine';
import { useT } from '../contexts/LanguageContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#10b981', '#14b8a6', '#06b6d4', '#3b82f6',
];

const INPUT_CLS = 'w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none transition-all text-right input-base';
const MANUAL_TYPE = 'MANUAL';
const MANUAL_CURRENCIES = ['USD', 'GBP', 'EUR', 'ILS'];

function blockInvalidNumberKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') e.preventDefault();
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function nextColor(holdings: Holding[]) { return PRESET_COLORS[holdings.length % PRESET_COLORS.length]; }

export interface NewHoldingInput {
  ticker: string; symbol: string; name: string; currency: string; color: string;
  currentPrice: number; exchange?: string;
}

export interface TransactionSaveResult {
  mode: 'add' | 'edit';
  transaction: Omit<Transaction, 'id'> & { id?: string };
  newHolding?: NewHoldingInput;
}

// Returned by onSave so the modal can show a specific inline error and stay
// open (e.g. a sell rejected by the data layer) instead of always closing —
// closing on every call would swallow the "you can't sell more than you own"
// case the data layer is responsible for enforcing.
export type SaveOutcome = { ok: true } | { ok: false; reason: 'insufficientShares' | 'error' };

type Mode = 'add' | 'edit';

interface Props {
  mode: Mode;
  holdings: Holding[];
  /** Required for `edit` — the transaction being edited. */
  transaction?: Transaction | null;
  /** Pre-selects a holding (and skips the search step) — used for onboarding's first Buy, or "Add Transaction"/"Add Dividend" launched from a specific holding row. */
  preselectedHolding?: Holding | null;
  /** Preselects the transaction type in `add` mode (e.g. 'dividend' when launched from a dividend-specific entry point). */
  initialType?: TransactionType;
  onSave: (result: TransactionSaveResult) => Promise<SaveOutcome>;
  onClose: () => void;
}

// ─── Step 1: find asset ───────────────────────────────────────────────────────

interface S1State {
  query: string; results: SearchResult[]; selected: SearchResult | null;
  currentPrice: number | null; currency: string;
  loading: boolean; priceLoading: boolean; error: string | null;
}

function FindAssetStep({ state: s, setState, holdings, onNext, t }: {
  state: S1State; setState: React.Dispatch<React.SetStateAction<S1State>>;
  holdings: Holding[]; onNext: () => void; t: ReturnType<typeof useT>;
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

  const existingHolding = s.selected ? holdings.find((h) => h.symbol === s.selected!.symbol) : undefined;

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
          <button onClick={() => setManualMode(false)}
            className="px-4 py-2.5 text-sm rounded-xl transition-all hover:opacity-70"
            style={{ color: 'var(--t2)', background: 'var(--input)', border: '1px solid var(--border)' }}>
            {t.backBtn}
          </button>
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
          <input type="text" value={s.query} onChange={onQuery} placeholder="CSPX, AAPL, VOO…"
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
              {existingHolding && (
                <p className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--at)' }}>{t.alreadyHeld}</p>
              )}
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

// ─── Step 2: transaction details ─────────────────────────────────────────────

type InputMode = 'amount' | 'shares';

interface S2State {
  txType: TransactionType; inputMode: InputMode;
  date: string; amountStr: string; quantityStr: string; priceStr: string; note: string;
}

function TypeSelector({ txType, existingHolding, onChange, t }: {
  txType: TransactionType; existingHolding?: Holding; onChange: (ty: TransactionType) => void; t: ReturnType<typeof useT>;
}) {
  const canSell = !!existingHolding && existingHolding.quantity > 0;
  const canDividend = !!existingHolding;

  const options: { value: TransactionType; label: string; enabled: boolean }[] = [
    { value: 'buy', label: t.buyLabel, enabled: true },
    { value: 'sell', label: t.sellLabel, enabled: canSell },
    { value: 'dividend', label: t.dividendLabel, enabled: canDividend },
  ];

  return (
    <div>
      <label className="text-[12px] font-medium block mb-2 text-right" style={{ color: 'var(--t3)' }}>{t.transactionTypeLabel}</label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            disabled={!o.enabled}
            onClick={() => onChange(o.value)}
            title={!o.enabled ? t.needsExistingHolding : undefined}
            className="py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={txType === o.value && o.enabled
              ? { background: 'var(--a20)', border: '1px solid var(--a)', color: 'var(--at)' }
              : { background: 'var(--input)', border: '1px solid var(--input-b)', color: 'var(--t2)' }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      {!canSell && !canDividend && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--t4)' }}>{t.needsExistingHolding}</p>
      )}
    </div>
  );
}

function DetailsStep({
  step1, existingHolding, state: s, setState, onBack, onSubmit, submitting, submitError, t,
}: {
  step1: S1State; existingHolding?: Holding; state: S2State; setState: React.Dispatch<React.SetStateAction<S2State>>;
  onBack: () => void; onSubmit: () => void; submitting: boolean; submitError: string | null; t: ReturnType<typeof useT>;
}) {
  const currency = step1.currency || existingHolding?.currency || 'USD';
  const isDividend = s.txType === 'dividend';

  const price = parseFloat(s.priceStr) || 0;
  const enteredAmount = parseFloat(s.amountStr) || 0;
  const enteredQuantity = parseFloat(s.quantityStr) || 0;

  const quantity = isDividend ? 0 : s.inputMode === 'amount' ? (price > 0 ? enteredAmount / price : 0) : enteredQuantity;
  const amount = isDividend ? enteredAmount : s.inputMode === 'shares' ? enteredQuantity * price : enteredAmount;

  // Only validate once the user has actually entered a quantity/amount —
  // validateSell(holding, 0) is "invalid" by definition (nothing entered
  // yet), which must not surface as "you can't sell more than you own"
  // before they've typed anything.
  const sellCheck = s.txType === 'sell' && existingHolding && quantity > 0
    ? validateSell(existingHolding, quantity) : { ok: true };
  // Sell/Dividend both require an existing holding — the TypeSelector disables
  // those buttons without one, but this guards submission too (e.g. if the
  // modal was opened with `initialType="dividend"` and the user then searches
  // a brand-new, not-yet-held ticker in Step 1).
  const requiresHolding = (s.txType === 'sell' || s.txType === 'dividend') && !existingHolding;

  const canSubmit = isDividend
    ? !!s.date && amount > 0 && !requiresHolding
    : !!s.date && price > 0 && quantity > 0 && amount > 0 && sellCheck.ok && !requiresHolding;

  const setType = (ty: TransactionType) => setState((p) => ({ ...p, txType: ty }));

  return (
    <div className="space-y-4">
      <TypeSelector txType={s.txType} existingHolding={existingHolding} onChange={setType} t={t} />

      <div>
        <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.transactionDate}</label>
        <input type="date" value={s.date} max={todayStr()}
          onChange={(e) => setState((p) => ({ ...p, date: e.target.value }))}
          className={INPUT_CLS + ' text-left'} />
      </div>

      {isDividend ? (
        <div>
          <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.dividendAmount}</label>
          <input type="number" min={0} step="any" value={s.amountStr}
            onChange={(e) => setState((p) => ({ ...p, amountStr: e.target.value }))} onKeyDown={blockInvalidNumberKey}
            placeholder="0.00" className={INPUT_CLS} dir="ltr" autoFocus />
        </div>
      ) : (
        <>
          {/* Input mode: which of {invested amount, shares} the user types directly — avoids making the user do share-count math by hand. */}
          <div className="grid grid-cols-2 gap-2">
            {(['amount', 'shares'] as const).map((m) => (
              <button key={m} onClick={() => setState((p) => ({ ...p, inputMode: m }))}
                className="py-2.5 rounded-xl text-sm font-medium transition-all"
                style={s.inputMode === m
                  ? { background: 'var(--a20)', border: '1px solid var(--a)', color: 'var(--at)' }
                  : { background: 'var(--input)', border: '1px solid var(--input-b)', color: 'var(--t2)' }
                }>
                {m === 'amount' ? t.investedAmountMode : t.boughtSharesMode}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {s.inputMode === 'amount' ? (
              <div>
                <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>
                  {s.txType === 'sell' ? t.receivedAmount : t.investedAmount}
                </label>
                <input type="number" min={0} step="any" value={s.amountStr}
                  onChange={(e) => setState((p) => ({ ...p, amountStr: e.target.value }))} onKeyDown={blockInvalidNumberKey}
                  placeholder="0.00" className={INPUT_CLS} dir="ltr" autoFocus />
              </div>
            ) : (
              <div>
                <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.qty}</label>
                <input type="number" min={0} step="any" value={s.quantityStr}
                  onChange={(e) => setState((p) => ({ ...p, quantityStr: e.target.value }))} onKeyDown={blockInvalidNumberKey}
                  placeholder="0" className={INPUT_CLS} dir="ltr" autoFocus />
              </div>
            )}
            <div>
              <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.pricePerShare}</label>
              <input type="number" min={0} step="any" value={s.priceStr}
                onChange={(e) => setState((p) => ({ ...p, priceStr: e.target.value }))} onKeyDown={blockInvalidNumberKey}
                placeholder="0.00" className={INPUT_CLS} dir="ltr" />
            </div>
          </div>

          {/* Whichever field isn't directly entered is shown here, computed automatically. */}
          {price > 0 && (enteredAmount > 0 || enteredQuantity > 0) && (
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: 'var(--t3)' }}>
                  {s.inputMode === 'amount' ? t.calculatedQty : t.totalAmount}
                </span>
                <span className="text-[13px] font-semibold ltr" style={{ color: 'var(--t1)' }}>
                  {s.inputMode === 'amount' ? fmtQty(quantity) : fmtPrice(amount, currency)}
                </span>
              </div>
            </div>
          )}

          {existingHolding && s.txType === 'sell' && (
            <div className="flex items-center justify-between">
              <p className="text-[11px]" style={{ color: 'var(--t3)' }}>
                {t.sharesAvailable(existingHolding.quantity)}
              </p>
              <button
                onClick={() => setState((p) => (
                  p.inputMode === 'shares'
                    ? { ...p, quantityStr: String(existingHolding.quantity) }
                    : { ...p, amountStr: String(existingHolding.quantity * price) }
                ))}
                className="text-[11px] font-bold transition-opacity hover:opacity-70"
                style={{ color: 'var(--at)' }}
              >
                {t.maxBtn}
              </button>
            </div>
          )}
          {!sellCheck.ok && <ErrorBox msg={t.insufficientShares} />}
        </>
      )}

      {submitError && <ErrorBox msg={submitError} />}

      <div>
        <label className="text-[12px] font-medium block mb-1.5 text-right" style={{ color: 'var(--t3)' }}>{t.noteOptional}</label>
        <input type="text" value={s.note} onChange={(e) => setState((p) => ({ ...p, note: e.target.value }))}
          className={INPUT_CLS} />
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onBack} className="px-4 py-2.5 text-sm rounded-xl transition-all hover:opacity-70"
          style={{ color: 'var(--t2)', background: 'var(--input)', border: '1px solid var(--border)' }}>
          {t.backBtn}
        </button>
        <button onClick={onSubmit} disabled={!canSubmit || submitting}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-30"
          style={{ background: 'var(--a)', boxShadow: '0 4px 14px var(--a20)' }}>
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {s.txType === 'sell' ? t.confirmSell : s.txType === 'dividend' ? t.addDividendBtn : t.confirmBuy}
        </button>
      </div>
    </div>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditForm({ transaction, holding, onSave, onClose, submitting, submitError, t }: {
  transaction: Transaction; holding?: Holding;
  onSave: (result: TransactionSaveResult) => void; onClose: () => void; submitting: boolean; submitError: string | null; t: ReturnType<typeof useT>;
}) {
  const [date, setDate] = useState(transaction.date);
  const [quantityStr, setQuantityStr] = useState(transaction.quantity !== null ? String(transaction.quantity) : '');
  const [priceStr, setPriceStr] = useState(transaction.price !== null ? String(transaction.price) : '');
  const [amountStr, setAmountStr] = useState(String(transaction.amount));
  const [note, setNote] = useState(transaction.note ?? '');

  const isDividend = transaction.type === 'dividend';
  const currency = holding?.currency ?? 'USD';

  const handleSave = () => {
    const quantity = isDividend ? null : parseFloat(quantityStr) || 0;
    const price = isDividend ? null : parseFloat(priceStr) || 0;
    const amount = isDividend ? (parseFloat(amountStr) || 0) : (quantity ?? 0) * (price ?? 0);
    onSave({
      mode: 'edit',
      transaction: { ...transaction, date, quantity, price, amount, note: note || undefined },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--t3)' }}>{t.transactionDate}</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLS + ' text-left'} />
      </div>
      {isDividend ? (
        <div>
          <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--t3)' }}>{t.dividendAmount}</label>
          <input type="number" min={0} step="any" value={amountStr} onChange={(e) => setAmountStr(e.target.value)}
            onKeyDown={blockInvalidNumberKey} className={INPUT_CLS} dir="ltr" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--t3)' }}>{t.qty}</label>
            <input type="number" min={0} step="any" value={quantityStr} onChange={(e) => setQuantityStr(e.target.value)}
              onKeyDown={blockInvalidNumberKey} className={INPUT_CLS} dir="ltr" />
          </div>
          <div>
            <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--t3)' }}>{t.pricePerShare}</label>
            <input type="number" min={0} step="any" value={priceStr} onChange={(e) => setPriceStr(e.target.value)}
              onKeyDown={blockInvalidNumberKey} className={INPUT_CLS} dir="ltr" />
          </div>
        </div>
      )}
      {!isDividend && parseFloat(quantityStr) > 0 && parseFloat(priceStr) > 0 && (
        <div className="rounded-xl p-3" style={{ background: 'var(--input)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{t.totalAmount}</span>
            <span className="text-[13px] font-semibold ltr" style={{ color: 'var(--t1)' }}>
              {fmtPrice((parseFloat(quantityStr) || 0) * (parseFloat(priceStr) || 0), currency)}
            </span>
          </div>
        </div>
      )}
      {transaction.type === 'sell' && holding && (
        <p className="text-[11px]" style={{ color: 'var(--t3)' }}>{t.sharesAvailable(holding.quantity)}</p>
      )}
      {submitError && <ErrorBox msg={submitError} />}
      <div>
        <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--t3)' }}>{t.noteOptional}</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={INPUT_CLS} />
      </div>
      <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={onClose} className="px-4 py-2.5 text-sm rounded-xl transition-all hover:opacity-70" style={{ color: 'var(--t2)' }}>
          {t.cancel}
        </button>
        <button onClick={handleSave} disabled={submitting}
          className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90"
          style={{ background: 'var(--a)' }}>
          {t.saveChanges}
        </button>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function TransactionModal({ mode, holdings, transaction, preselectedHolding, initialType, onSave, onClose }: Props) {
  const t = useT();
  useLockBodyScroll();
  const [step, setStep] = useState<1 | 2>(preselectedHolding ? 2 : 1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [s1, setS1] = useState<S1State>(() => {
    if (preselectedHolding) {
      return {
        query: preselectedHolding.ticker,
        results: [],
        selected: {
          symbol: preselectedHolding.symbol, ticker: preselectedHolding.ticker, name: preselectedHolding.name,
          exchange: preselectedHolding.exchange ?? '', type: '', currency: preselectedHolding.currency,
        },
        currentPrice: preselectedHolding.currentPrice, currency: preselectedHolding.currency,
        loading: false, priceLoading: false, error: null,
      };
    }
    return { query: '', results: [], selected: null, currentPrice: null, currency: 'USD', loading: false, priceLoading: false, error: null };
  });
  const [s2, setS2] = useState<S2State>({
    txType: initialType ?? 'buy', inputMode: 'amount', date: todayStr(), amountStr: '', quantityStr: '',
    priceStr: preselectedHolding ? String(preselectedHolding.currentPrice) : '', note: '',
  });

  const existingHolding = s1.selected ? holdings.find((h) => h.symbol === s1.selected!.symbol) : undefined;

  const applyOutcome = (outcome: SaveOutcome) => {
    setSubmitting(false);
    if (!outcome.ok) {
      setSubmitError(outcome.reason === 'insufficientShares' ? t.insufficientShares : t.genericSaveError);
    }
  };

  const handleSubmit = async () => {
    if (!s1.selected) return;
    // Defense in depth: Sell/Dividend both require an existing holding — the
    // DetailsStep's submit button is already disabled in this case, but this
    // guard keeps it true even if that ever changes.
    if ((s2.txType === 'sell' || s2.txType === 'dividend') && !existingHolding) return;
    setSubmitError(null);
    setSubmitting(true);
    const isDividend = s2.txType === 'dividend';
    const price = isDividend ? null : (parseFloat(s2.priceStr) || 0);
    const enteredAmount = parseFloat(s2.amountStr) || 0;
    const enteredQuantity = parseFloat(s2.quantityStr) || 0;
    const quantity = isDividend ? null
      : s2.inputMode === 'amount' ? (price ? enteredAmount / price : 0) : enteredQuantity;
    const amount = isDividend ? enteredAmount
      : s2.inputMode === 'shares' ? enteredQuantity * (price ?? 0) : enteredAmount;

    const result: TransactionSaveResult = {
      mode: 'add',
      transaction: {
        holdingId: existingHolding?.id ?? '', type: s2.txType, date: s2.date,
        quantity, price, amount, note: s2.note || undefined,
      },
      newHolding: existingHolding ? undefined : {
        ticker: s1.selected.ticker, symbol: s1.selected.symbol, name: s1.selected.name,
        currency: s1.currency, color: nextColor(holdings), currentPrice: s1.currentPrice ?? price ?? 0,
        exchange: s1.selected.exchange,
      },
    };
    applyOutcome(await onSave(result));
  };

  const handleSubmitEdit = async (result: TransactionSaveResult) => {
    setSubmitError(null);
    setSubmitting(true);
    applyOutcome(await onSave(result));
  };

  const editedHolding = mode === 'edit' && transaction ? holdings.find((h) => h.id === transaction.holdingId) : undefined;
  const title = mode === 'edit'
    ? (editedHolding ? t.editTransactionFor(editedHolding.ticker) : t.editTransaction)
    : t.addTransactionTitle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[480px] rounded-2xl overflow-hidden shadow-2xl animate-scale-in max-h-[90vh] flex flex-col"
        style={{ background: 'var(--modal)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--t1)' }}>
            {title}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl transition-all hover:opacity-70"
            style={{ color: 'var(--t3)', background: 'var(--input)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {mode === 'edit' && transaction ? (
            <EditForm
              transaction={transaction}
              holding={holdings.find((h) => h.id === transaction.holdingId)}
              onSave={handleSubmitEdit} onClose={onClose} submitting={submitting} submitError={submitError} t={t}
            />
          ) : step === 1 ? (
            <FindAssetStep
              state={s1} setState={setS1} holdings={holdings}
              onNext={() => {
                // Carry the selected asset's live/current price into Step 2 —
                // without this, priceStr stayed at its initial empty value for
                // every flow except the preselected-holding case, forcing a
                // manual price entry even in "Invested Amount" mode.
                const existing = holdings.find((h) => h.symbol === s1.selected?.symbol);
                const prefillPrice = s1.currentPrice ?? existing?.currentPrice ?? null;
                if (prefillPrice != null) setS2((p) => ({ ...p, priceStr: String(prefillPrice) }));
                setStep(2);
              }}
              t={t}
            />
          ) : (
            <DetailsStep
              step1={s1} existingHolding={existingHolding} state={s2} setState={setS2}
              onBack={() => setStep(1)} onSubmit={handleSubmit} submitting={submitting} submitError={submitError} t={t}
            />
          )}
        </div>
      </div>
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

export { genId };
