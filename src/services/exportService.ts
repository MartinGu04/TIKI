import { Holding, Portfolio, Transaction } from '../types';

export const EXPORT_VERSION = 1;

export interface PortfolioExport {
  version: number;
  exportedAt: string;
  portfolio: Portfolio;
  holdings: Holding[];
  transactions: Transaction[];
}

function download(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportPortfolioJSON(portfolio: Portfolio, holdings: Holding[], transactions: Transaction[]) {
  const payload: PortfolioExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    portfolio, holdings, transactions,
  };
  download(JSON.stringify(payload, null, 2), `tiki-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function exportTransactionsCSV(transactions: Transaction[], holdings: Holding[]) {
  const byId = new Map(holdings.map((h) => [h.id, h]));
  const header = ['date', 'ticker', 'type', 'quantity', 'price', 'amount', 'note'];
  const rows = transactions.map((tx) => [
    tx.date,
    byId.get(tx.holdingId)?.ticker ?? '',
    tx.type,
    tx.quantity ?? '',
    tx.price ?? '',
    tx.amount,
    tx.note ?? '',
  ].map((v) => csvEscape(String(v))).join(','));
  download([header.join(','), ...rows].join('\n'), `tiki-transactions-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
}
