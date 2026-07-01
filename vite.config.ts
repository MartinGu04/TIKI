import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { searchYahoo, getQuote, getHistoricalClose, getChartRange, getHistoricalDiagnostics, type ChartRange } from './api/lib/yahoo'

const VALID_CHART_RANGES: ChartRange[] = ['1w', '1mo', '3mo', '1y']

// Mirrors api/market.ts so `npm run dev` behaves the same as the deployed
// Vercel serverless function — the browser never talks to Yahoo directly.
function marketDataDevMiddleware(): Plugin {
  return {
    name: 'market-data-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/market', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        try {
          const url = new URL(req.url ?? '', 'http://localhost');
          const action = url.searchParams.get('action');

          if (action === 'search') {
            const q = url.searchParams.get('q') ?? '';
            const results = q.trim() ? await searchYahoo(q) : [];
            res.end(JSON.stringify({ results }));
            return;
          }
          if (action === 'quote') {
            const symbol = url.searchParams.get('symbol') ?? '';
            const data = await getQuote(symbol);
            res.end(JSON.stringify(data));
            return;
          }
          if (action === 'history') {
            const symbol = url.searchParams.get('symbol') ?? '';
            const date = url.searchParams.get('date') ?? '';
            const price = await getHistoricalClose(symbol, date);
            res.end(JSON.stringify({ price }));
            return;
          }
          if (action === 'chart') {
            const symbol = url.searchParams.get('symbol') ?? '';
            const range = (url.searchParams.get('range') ?? '') as ChartRange;
            if (!symbol || !VALID_CHART_RANGES.includes(range)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'symbol and a valid range (1w, 1mo, 3mo, 1y) are required' }));
              return;
            }
            const points = await getChartRange(symbol, range);
            res.end(JSON.stringify({ points }));
            return;
          }
          if (action === 'diagnose') {
            const symbol = url.searchParams.get('symbol') ?? '';
            const date = url.searchParams.get('date') ?? '';
            if (!symbol || !date) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'symbol and date are required' }));
              return;
            }
            const diagnostics = await getHistoricalDiagnostics(symbol, date);
            res.end(JSON.stringify(diagnostics));
            return;
          }
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'unknown action' }));
        } catch (e) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'market data unavailable' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), marketDataDevMiddleware()],
})
