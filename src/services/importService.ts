import { Holding, Transaction, TransactionType } from '../types';

// Hand-rolled type guards, consistent with the rest of the codebase's
// zero-schema-library convention (no zod) — sufficient for validating a
// small, fixed JSON shape without pulling in a new dependency.

function isString(v: unknown): v is string { return typeof v === 'string'; }
function isNumber(v: unknown): v is number { return typeof v === 'number' && !Number.isNaN(v); }

function isValidHolding(v: unknown): v is Holding {
  if (!v || typeof v !== 'object') return false;
  const h = v as Record<string, unknown>;
  return isString(h.id) && isString(h.ticker) && isString(h.symbol) && isString(h.name)
    && isString(h.currency) && isString(h.color) && isNumber(h.currentPrice)
    && isNumber(h.quantity) && isNumber(h.avgCost) && isNumber(h.realizedPnL);
}

const VALID_TX_TYPES: TransactionType[] = ['buy', 'sell', 'dividend'];

function isValidTransaction(v: unknown): v is Transaction {
  if (!v || typeof v !== 'object') return false;
  const tx = v as Record<string, unknown>;
  return isString(tx.id) && isString(tx.holdingId)
    && VALID_TX_TYPES.includes(tx.type as TransactionType)
    && isString(tx.date) && isNumber(tx.amount)
    && (tx.quantity === null || isNumber(tx.quantity))
    && (tx.price === null || isNumber(tx.price));
}

export interface ParsedImport { holdings: Holding[]; transactions: Transaction[] }

export class ImportValidationError extends Error {}

/** Parses and validates a TIKI JSON backup file. Throws ImportValidationError on any malformed shape. */
export async function parseImportedJSON(file: File): Promise<ParsedImport> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new ImportValidationError('invalidJson');
  }
  if (!raw || typeof raw !== 'object') throw new ImportValidationError('invalidJson');
  const data = raw as Record<string, unknown>;
  const holdings = data.holdings;
  const transactions = data.transactions;
  if (!Array.isArray(holdings) || !Array.isArray(transactions)) throw new ImportValidationError('missingFields');
  if (!holdings.every(isValidHolding) || !transactions.every(isValidTransaction)) {
    throw new ImportValidationError('malformedRows');
  }
  return { holdings, transactions };
}

export interface CSVImportRow {
  date: string; ticker: string; type: TransactionType; quantity: number | null; price: number | null; amount: number; note?: string;
}
export interface CSVImportResult { valid: CSVImportRow[]; errors: { row: number; reason: string }[] }

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { cells.push(cur); cur = ''; }
    else cur += c;
  }
  cells.push(cur);
  return cells;
}

/**
 * Parses a `date,ticker,type,quantity,price,amount,note` CSV. Only matches
 * against tickers that already exist as holdings — unmatched tickers are
 * reported as per-row errors rather than silently creating new holdings.
 * (Post-v1 TODO: resolve unmatched tickers via searchTicker() with a review
 * step before committing — deliberately out of scope for v1.)
 */
export async function parseImportedCSV(file: File, existingHoldings: Holding[]): Promise<CSVImportResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const tickerMap = new Map(existingHoldings.map((h) => [h.ticker.toUpperCase(), h]));

  const valid: CSVImportRow[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 1; i < lines.length; i++) { // skip header row
    const cells = parseCSVLine(lines[i]);
    const [date, ticker, type, quantityStr, priceStr, amountStr, note] = cells;
    const holding = tickerMap.get((ticker ?? '').toUpperCase());

    if (!holding) { errors.push({ row: i + 1, reason: 'unknownTicker' }); continue; }
    if (!VALID_TX_TYPES.includes(type as TransactionType)) { errors.push({ row: i + 1, reason: 'invalidType' }); continue; }
    const amount = parseFloat(amountStr);
    if (Number.isNaN(amount)) { errors.push({ row: i + 1, reason: 'invalidAmount' }); continue; }

    valid.push({
      date, ticker: holding.ticker, type: type as TransactionType,
      quantity: type === 'dividend' ? null : (parseFloat(quantityStr) || 0),
      price: type === 'dividend' ? null : (parseFloat(priceStr) || 0),
      amount, note: note || undefined,
    });
  }

  return { valid, errors };
}
