import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Holding, PortfolioStats, PriceData, Transaction } from '../types';
import { OverviewCards } from '../components/OverviewCards';
import { ProjectionChart } from '../components/ProjectionChart';
import { AllocationDonut } from '../components/AllocationDonut';
import { HoldingsList } from '../components/HoldingsList';
import { ProjectionSimulator } from '../components/ProjectionSimulator';
import { EmptyState } from '../components/ui/EmptyState';
import { useT } from '../contexts/LanguageContext';

interface Props {
  holdings: Holding[];
  transactions: Transaction[];
  stats: PortfolioStats;
  onAddTransaction: (holding?: Holding) => void;
  onDeleteHolding: (id: string) => void;
  onQuickSell: (holding: Holding) => void;
  livePrices: Record<string, PriceData>;
  pricesLastUpdated: number | null;
  pricesRefreshing: boolean;
  onRefreshPrices: () => void;
}

export function PortfolioPage({
  holdings, transactions, stats, onAddTransaction, onDeleteHolding, onQuickSell, livePrices,
  pricesLastUpdated, pricesRefreshing, onRefreshPrices,
}: Props) {
  const t = useT();
  const [query, setQuery] = useState('');

  if (holdings.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-6 pb-28 sm:pb-16">
        <EmptyState
          variant="inline"
          icon={<Search size={22} style={{ color: 'var(--at)' }} />}
          title={t.noInvestmentsYetTitle}
          body={t.noInvestmentsYetBody}
          cta={{ label: t.addFirst, onClick: () => onAddTransaction() }}
        />
      </div>
    );
  }

  const filtered = query.trim()
    ? holdings.filter((h) =>
        h.ticker.toLowerCase().includes(query.toLowerCase()) || h.name.toLowerCase().includes(query.toLowerCase()))
    : holdings;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-6 pb-28 sm:pb-16 space-y-5 animate-fade-in">
      <OverviewCards stats={stats} holdings={holdings} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ProjectionChart stats={stats} />
        </div>
        <div>
          <AllocationDonut holdings={holdings} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchHoldingsPlaceholder}
                className="w-full text-sm rounded-xl pl-10 pr-4 py-2.5 input-base"
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t3)' }} />
            </div>
            <button
              onClick={() => onAddTransaction()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 shrink-0"
              style={{ background: 'var(--a)', boxShadow: '0 4px 14px var(--a20)' }}
            >
              <Plus size={14} />
              {t.addTransactionTitle}
            </button>
          </div>
          <HoldingsList
            holdings={filtered}
            transactions={transactions}
            onAddTransaction={onAddTransaction}
            onDeleteHolding={onDeleteHolding}
            onQuickSell={onQuickSell}
            livePrices={livePrices}
            searchQuery={query}
            onClearSearch={() => setQuery('')}
            pricesLastUpdated={pricesLastUpdated}
            pricesRefreshing={pricesRefreshing}
            onRefreshPrices={onRefreshPrices}
          />
        </div>
        <div className="space-y-5">
          <ProjectionSimulator stats={stats} />
        </div>
      </div>
    </div>
  );
}
