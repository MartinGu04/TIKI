import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { searchYahoo, getQuote, getHistoricalClose } from './api/_lib/yahoo'

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
