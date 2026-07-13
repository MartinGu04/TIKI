import { NavLink } from 'react-router';
import { Home, Wallet, History, Settings, Plus } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';

interface Props {
  onAddTransaction: () => void;
}

export function BottomNav({ onAddTransaction }: Props) {
  const t = useT();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t"
      style={{ background: 'var(--hdr)', borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* The 4 real tabs — evenly spaced, no 5th slot for Add. A blank spacer
          the FAB's own width keeps History/Settings from drifting toward
          center once the middle "seat" isn't a nav item anymore. */}
      <div className="flex items-center justify-around max-w-[640px] mx-auto h-16 px-2">
        <NavItem to="/" end icon={<Home size={20} />} label={t.home} />
        <NavItem to="/portfolio" icon={<Wallet size={20} />} label={t.portfolio} />
        <div className="w-12 shrink-0" aria-hidden />
        <NavItem to="/history" icon={<History size={20} />} label={t.history} />
        <NavItem to="/settings" icon={<Settings size={20} />} label={t.settings} />
      </div>

      {/* Floating Add action — visually detached from the tab row (raised
          above the bar, its own shadow/size), so it reads as an action, not
          a 5th tab. */}
      <button
        onClick={onAddTransaction}
        className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all active:scale-90"
        style={{ background: 'var(--a)', boxShadow: '0 6px 20px var(--a20), 0 2px 8px rgba(0,0,0,0.25)', border: '3px solid var(--bg)' }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </nav>
  );
}

function NavItem({ to, end, icon, label }: {
  to: string; end?: boolean; icon: React.ReactNode; label: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
      style={({ isActive }) => ({ color: isActive ? 'var(--a)' : 'var(--t3)' })}
    >
      {icon}
      <span className="text-[11px] font-semibold">{label}</span>
    </NavLink>
  );
}
