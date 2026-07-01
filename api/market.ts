// Explicit .js extension required: this project's package.json has
// "type": "module", so Vercel's Node.js runtime loads the compiled
// api/market.js as native ESM, which needs the real extension of the
// compiled output file on relative imports (unlike bundler/CJS resolution,
// which resolves extensionless specifiers automatically). TypeScript's
// NodeNext-style convention maps this .js specifier back to yahoo.ts for
// type-checking while leaving it as .js in the emitted JS.
import { searchYahoo, getQuote, getHistoricalClose } from './lib/yahoo.js';

// Gives our own error handling a safety margin below the platform's function
// timeout, so a slow/blocked Yahoo response results in a clean JSON 502 from
// us instead of Vercel force-killing the function (which surfaces to the
// client as a raw 500 with no body).
export const config = { maxDuration: 15 };

// Minimal duck-typed shape of Vercel's Node function req/res — avoids adding
// @vercel/node as a dependency just for types.
interface Req {
  query: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

function param(req: Req, key: string): string {
  const v = req?.query?.[key];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

export default async function handler(req: Req, res: Res) {
  // Everything — including header-setting and query parsing — runs inside
  // this try block. Nothing here should ever escape uncaught: an uncaught
  // exception is what turns into a raw 500 with no JSON body on Vercel.
  try {
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');

    const action = param(req, 'action');

    if (action === 'search') {
      const q = param(req, 'q');
      const results = q.trim() ? await searchYahoo(q) : [];
      res.status(200).json({ results });
      return;
    }

    if (action === 'quote') {
      const symbol = param(req, 'symbol');
      if (!symbol) { res.status(400).json({ error: 'symbol is required' }); return; }
      const data = await getQuote(symbol);
      res.status(200).json(data);
      return;
    }

    if (action === 'history') {
      const symbol = param(req, 'symbol');
      const date = param(req, 'date');
      if (!symbol || !date) { res.status(400).json({ error: 'symbol and date are required' }); return; }
      const price = await getHistoricalClose(symbol, date);
      res.status(200).json({ price });
      return;
    }

    res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    // Any failure below this point (Yahoo unreachable/blocked, malformed
    // response, timeout, etc.) still gets a proper JSON error instead of an
    // opaque platform 500.
    const message = e instanceof Error ? e.message : 'market data unavailable';
    try {
      res.status(502).json({ error: message });
    } catch {
      // Response could not be sent (e.g. already sent) — nothing more we can do.
    }
  }
}
