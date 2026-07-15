import { NavLink, useNavigate } from 'react-router';
import { TrendingUp } from 'lucide-react';
import { PRIMARY_DESTINATIONS } from '../../navigation/config';
import { useT } from '../../contexts/LanguageContext';

interface Props {
  userLabel?: string;
  userEmail?: string;
  userAvatarUrl?: string;
}

/**
 * Slim persistent rail — desktop and wide/landscape tablet only (`lg:` and
 * up). Sits at the reading-start edge via logical `start-0`, so it renders
 * on the right in RTL (the locked "right-side rail in RTL" principle) and
 * mirrors to the left automatically in LTR.
 */
export function DesktopRail({ userLabel, userEmail, userAvatarUrl }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const initial = userLabel?.[0]?.toUpperCase() ?? '';

  return (
    <nav
      className="hidden lg:flex fixed inset-y-0 start-0 z-40 w-20 flex-col items-center py-6 border-e"
      style={{ background: 'var(--hdr)', borderColor: 'var(--border)' }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shrink-0 mb-8"
        style={{ background: 'var(--a)', boxShadow: '0 4px 12px var(--a20)' }}
      >
        <TrendingUp size={15} className="text-white" strokeWidth={2.5} />
      </div>

      <div className="flex flex-col items-center gap-2 flex-1">
        {PRIMARY_DESTINATIONS.map(({ id, route, icon: Icon }) => (
          <NavLink
            key={id}
            to={route}
            end={route === '/'}
            className="flex flex-col items-center gap-1 w-16 px-2 py-2.5 rounded-xl transition-all"
            style={({ isActive }) => ({
              color: isActive ? 'var(--a)' : 'var(--t3)',
              background: isActive ? 'var(--a10)' : 'transparent',
            })}
          >
            <Icon size={20} />
            <span className="text-[10px] font-semibold">{t[id]}</span>
          </NavLink>
        ))}
      </div>

      {userLabel && (
        <button
          onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 overflow-hidden"
          style={{ background: 'var(--a)' }}
          title={userEmail ?? userLabel}
        >
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </button>
      )}
    </nav>
  );
}
