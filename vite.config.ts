import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { searchYahoo, getQuote, getHistoricalClose, getChartRange, type ChartRange } from './api/lib/yahoo'
import { validateQuery, validateSymbol } from './api/lib/validate'

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
            const q = validateQuery(url.searchParams.get('q') ?? '');
            if (!q) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'invalid request' }));
              return;
            }
            const results = await searchYahoo(q);
            res.end(JSON.stringify({ results }));
            return;
          }
          if (action === 'quote') {
            const symbol = validateSymbol(url.searchParams.get('symbol') ?? '');
            if (!symbol) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'invalid request' }));
              return;
            }
            const data = await getQuote(symbol);
            res.end(JSON.stringify(data));
            return;
          }
          if (action === 'history') {
            const symbol = validateSymbol(url.searchParams.get('symbol') ?? '');
            const date = url.searchParams.get('date') ?? '';
            if (!symbol || !date) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'invalid request' }));
              return;
            }
            const price = await getHistoricalClose(symbol, date);
            res.end(JSON.stringify({ price }));
            return;
          }
          if (action === 'chart') {
            const symbol = validateSymbol(url.searchParams.get('symbol') ?? '');
            const range = (url.searchParams.get('range') ?? '') as ChartRange;
            if (!symbol || !VALID_CHART_RANGES.includes(range)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'invalid request' }));
              return;
            }
            const points = await getChartRange(symbol, range);
            res.end(JSON.stringify({ points }));
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
