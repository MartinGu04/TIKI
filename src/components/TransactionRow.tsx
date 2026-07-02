import { Pencil, Trash2 } from 'lucide-react';
import { Holding, Transaction } from '../types';
import { fmt, fmtPrice, fmtTime, fmtQty } from '../utils/calculations';
import { useT } from '../contexts/LanguageContext';

interface Props {
  transaction: Transaction;
  holding?: Holding;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransactionRow({ transaction: tx, holding, onEdit, onDelete }: Props) {
  const t = useT();
  const currency = holding?.currency ?? 'USD';

  const badgeStyle = tx.type === 'buy'
    ? { color: 'var(--up)', background: 'var(--up10)' }
    : tx.type === 'sell'
      ? { color: 'var(--dn)', background: 'var(--dn10)' }
      : { color: 'var(--at)', background: 'var(--a10)' };
  const badgeLabel = tx.type === 'buy' ? t.buyLabel : tx.type === 'sell' ? t.sellLabel : t.dividendLabel;

  return (
    <div className="group flex items-center gap-3 px-4 py-3 rounded-2xl card card-hover transition-colors">
      <div className="w-1 h-9 rounded-full shrink-0" style={{ backgroundColor: holding?.color ?? 'var(--t4)' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={badgeStyle}>{badgeLabel}</span>
          <span className="text-sm font-bold ticker truncate" style={{ color: 'var(--t1)' }}>{holding?.ticker ?? '—'}</span>
        </div>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--t3)' }}>
          {tx.createdAt && <span className="ltr tabular-nums" dir="ltr">{fmtTime(tx.createdAt)}</span>}
          {tx.type !== 'dividend' && tx.quantity != null && tx.price != null && (
            <> · {fmtQty(tx.quantity)} @ {fmtPrice(tx.price, currency)}</>
          )}
          {tx.note && <> · {tx.note}</>}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums ltr" style={{ color: 'var(--t1)' }}>{fmt(tx.amount, currency)}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--at)'; e.currentTarget.style.background = 'var(--a10)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--dn)'; e.currentTarget.style.background = 'var(--dn10)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
