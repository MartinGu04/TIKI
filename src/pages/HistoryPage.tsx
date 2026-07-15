import { useMemo, useState } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import { Holding, Transaction, TransactionType } from '../types';
import { TransactionRow } from '../components/TransactionRow';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { EmptyState } from '../components/ui/EmptyState';
import { useT } from '../contexts/LanguageContext';
import { fmtDayHeader } from '../utils/calculations';
import { compareTransactionsAsc } from '../utils/portfolioEngine';

interface Props {
  transactions: Transaction[];
  holdings: Holding[];
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onAddTransaction: () => void;
  onAddDividend: () => void;
}

type Filter = 'all' | TransactionType;

export function HistoryPage({ transactions, holdings, onEditTransaction, onDeleteTransaction, onAddTransaction, onAddDividend }: Props) {
  const t = useT();
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmTx, setConfirmTx] = useState<Transaction | null>(null);

  const holdingsById = useMemo(() => new Map(holdings.map((h) => [h.id, h])), [holdings]);

  const filtered = filter === 'all' ? transactions : transactions.filter((tx) => tx.type === filter);
  const sorted = [...filtered].sort((a, b) => compareTransactionsAsc(b, a));

  // Grouped by the exact calendar day (not month) — "1 July", "2 July", ...
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of sorted) {
      if (!map.has(tx.date)) map.set(tx.date, []);
      map.get(tx.date)!.push(tx);
    }
    return [...map.entries()];
  }, [sorted]);

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: t.filterAll },
    { key: 'buy', label: t.filterBuy },
    { key: 'sell', label: t.filterSell },
    { key: 'dividend', label: t.filterDividend },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-28 lg:pb-16 space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold" style={{ color: 'var(--t1)' }}>{t.historyTitle}</h1>

      <div className="flex items-center gap-2 flex-wrap">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={filter === c.key
              ? { background: 'var(--a20)', border: '1px solid var(--a)', color: 'var(--at)' }
              : { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--t2)' }
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          variant="inline"
          icon={<HistoryIcon size={22} style={{ color: 'var(--at)' }} />}
          title={filter === 'dividend' ? t.noDividendsYet : t.noTransactionsYet}
          body={filter === 'dividend' ? t.noDividendsYetBody : t.noTransactionsYetBody}
          cta={filter === 'dividend'
            ? { label: t.addDividendBtn, onClick: onAddDividend }
            : { label: t.addTransactionTitle, onClick: onAddTransaction }}
        />
      ) : (
        <div className="space-y-6">
          {groups.map(([key, txs]) => (
            <div key={key}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--t3)' }}>
                {fmtDayHeader(new Date(key + 'T00:00:00'))}
              </p>
              <div className="space-y-2">
                {txs.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    holding={holdingsById.get(tx.holdingId)}
                    onEdit={() => onEditTransaction(tx)}
                    onDelete={() => setConfirmTx(tx)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmSheet
        open={!!confirmTx}
        title={t.deleteTransactionTitle}
        body={t.deleteTransactionBody}
        confirmLabel={t.deleteBtn}
        cancelLabel={t.cancel}
        onCancel={() => setConfirmTx(null)}
        onConfirm={() => { if (confirmTx) onDeleteTransaction(confirmTx); setConfirmTx(null); }}
      />
    </div>
  );
}
