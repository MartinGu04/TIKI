import { NavLink } from 'react-router';
import { PRIMARY_DESTINATIONS } from '../../navigation/config';
import { useT } from '../../contexts/LanguageContext';

/**
 * Bottom navigation — phone and narrow/portrait tablet only (below `lg:`).
 * Lists only today's real primary destinations (Home, Portfolio). It is
 * deliberately not padded to look like a full 4-item bar, and carries no
 * floating add-transaction FAB — that action is Portfolio's own contextual
 * affordance now, not shell-wide chrome (PART 5 §A/§A.2).
 */
export function PhoneNav() {
  const t = useT();

  return (
    <nav
      className="lg:hidden fixed bottom-0 start-0 end-0 z-40 backdrop-blur-xl border-t"
      style={{ background: 'var(--hdr)', borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around max-w-[640px] mx-auto h-16 px-2">
        {PRIMARY_DESTINATIONS.map(({ id, route, icon: Icon }) => (
          <NavLink
            key={id}
            to={route}
            end={route === '/'}
            className="flex flex-col items-center gap-1 px-8 py-1.5 rounded-xl transition-all"
            style={({ isActive }) => ({ color: isActive ? 'var(--a)' : 'var(--t3)' })}
          >
            <Icon size={20} />
            <span className="text-[11px] font-semibold">{t[id]}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
