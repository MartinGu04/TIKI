import { searchYahoo, getQuote, getHistoricalClose } from './_lib/yahoo';

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
  const v = req.query[key];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');

  try {
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
    res.status(502).json({ error: e instanceof Error ? e.message : 'market data unavailable' });
  }
}
