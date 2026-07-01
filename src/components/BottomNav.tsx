import { Home, LayoutDashboard, Plus } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';
import type { View } from '../types/view';

interface Props {
  view: View;
  onViewChange: (v: View) => void;
  onAddAsset: () => void;
}

export function BottomNav({ view, onViewChange, onAddAsset }: Props) {
  const t = useT();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden backdrop-blur-xl border-t"
      style={{ background: 'var(--hdr)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-around h-16 px-4">
        <NavItem
          icon={<Home size={20} />}
          label={t.home}
          active={view === 'home'}
          onClick={() => onViewChange('home')}
        />

        {/* Center FAB */}
        <button
          onClick={onAddAsset}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all active:scale-90"
          style={{ background: 'var(--a)', boxShadow: '0 4px 16px var(--a20)' }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>

        <NavItem
          icon={<LayoutDashboard size={20} />}
          label={t.advanced}
          active={view === 'advanced'}
          onClick={() => onViewChange('advanced')}
        />
      </div>
    </nav>
  );
}

function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all"
      style={{ color: active ? 'var(--a)' : 'var(--t3)' }}
    >
      {icon}
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}
