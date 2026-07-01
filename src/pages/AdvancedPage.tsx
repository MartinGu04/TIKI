import { Asset, PortfolioStats, PriceData } from '../types';
import { OverviewCards } from '../components/OverviewCards';
import { ProjectionChart } from '../components/ProjectionChart';
import { AllocationDonut } from '../components/AllocationDonut';
import { AssetList } from '../components/AssetList';
import { ContributionSplit } from '../components/ContributionSplit';
import { UpcomingDeposits } from '../components/UpcomingDeposits';
import { ProjectionSimulator } from '../components/ProjectionSimulator';

interface Props {
  assets: Asset[];
  stats: PortfolioStats;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
  livePrices: Record<string, PriceData>;
}

export function AdvancedPage({ assets, stats, onEdit, onDelete, livePrices }: Props) {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-6 pb-28 sm:pb-16 space-y-5 animate-fade-in">
      <OverviewCards stats={stats} assets={assets} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ProjectionChart stats={stats} />
        </div>
        <div>
          <AllocationDonut assets={assets} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <AssetList assets={assets} onEdit={onEdit} onDelete={onDelete} livePrices={livePrices} />
        </div>
        <div className="space-y-5">
          <ContributionSplit assets={assets} />
          <UpcomingDeposits assets={assets} />
          <ProjectionSimulator stats={stats} />
        </div>
      </div>
    </div>
  );
}
