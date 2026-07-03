// Shared input validation for the public market-data endpoint (api/market.ts
// and its vite.config.ts dev-middleware mirror), so both surfaces reject
// malformed input identically before it ever reaches the Yahoo client.

const MAX_QUERY_LENGTH = 64;
const MAX_SYMBOL_LENGTH = 32;

// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/;

// Covers real-world Yahoo ticker shapes: "CSPX", "CSPX.L", "BTC-USD",
// "^GSPC", "GC=F" — letters/digits plus the separators Yahoo actually uses.
const SYMBOL_RE = /^[A-Za-z0-9.\-^=_]+$/;

/** Trims and validates a search query; returns null if invalid. */
export function validateQuery(raw: string): string | null {
  const q = raw.trim();
  if (!q || q.length > MAX_QUERY_LENGTH || CONTROL_CHAR_RE.test(q)) return null;
  return q;
}

/** Trims and validates a ticker symbol; returns null if invalid. */
export function validateSymbol(raw: string): string | null {
  const symbol = raw.trim();
  if (!symbol || symbol.length > MAX_SYMBOL_LENGTH || !SYMBOL_RE.test(symbol)) return null;
  return symbol;
}
