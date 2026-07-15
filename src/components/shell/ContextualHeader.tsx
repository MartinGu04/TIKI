import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useT, useLang } from '../../contexts/LanguageContext';
import { getDestinationByRoute } from '../../navigation/config';

interface Props {
  userLabel?: string;
  userEmail?: string;
  userAvatarUrl?: string;
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  const { lang } = useLang();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const dateStr = now.toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  return (
    <div className="hidden sm:flex flex-col items-center">
      <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{dateStr}</span>
      <div className="flex items-baseline gap-0.5 ltr" dir="ltr">
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--t2)' }}>{hh}:{mm}</span>
        <span className="text-[12px] font-medium tabular-nums" style={{ color: 'var(--t4)' }}>:{ss}</span>
      </div>
    </div>
  );
}

// Compact mobile-only equivalent — one subtle line, minute precision.
function CompactClock() {
  const [now, setNow] = useState(new Date());
  const { lang } = useLang();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const dateStr = now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  return (
    <div className="sm:hidden flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
      <span style={{ color: 'var(--t3)' }}>{dateStr}</span>
      <span style={{ color: 'var(--t4)' }}>·</span>
      <span className="ltr tabular-nums" dir="ltr" style={{ color: 'var(--t2)' }}>{hh}:{mm}</span>
    </div>
  );
}

/**
 * Shell-level contextual header: carries the current destination's title,
 * resolved against the single navigation registry (`navigation/config.ts`)
 * rather than a hand-listed pathname check — so History/Settings resolve
 * consistently with Home/Portfolio, and any future registry addition (e.g.
 * Monitoring, Decisions) resolves automatically with no further edit here.
 * Only primary destinations actually display a title in this slice (Home,
 * Portfolio) — History/Settings already render their own page title, so
 * showing one here too would duplicate it; that's a display choice, not a
 * limitation of the lookup itself. An unmatched route resolves to no title,
 * never a silent fallback to Home.
 *
 * On Portfolio the header also carries its secondary link to History. On
 * phone/narrow-tablet widths it also carries the clock and the avatar entry
 * point to Settings — on desktop those two move to the rail (avatar) or are
 * dropped (clock; the rail is icon-only and ambient time is available
 * elsewhere on that form factor).
 */
export function ContextualHeader({ userLabel, userEmail, userAvatarUrl }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const destination = getDestinationByRoute(pathname);
  const isPrimary = destination?.placement === 'primary';
  const title = isPrimary && destination ? t[destination.id] : null;
  const initial = userLabel?.[0]?.toUpperCase() ?? '';

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl border-b"
      style={{ background: 'var(--hdr)', borderColor: 'var(--border)' }}
    >
      <div style={{ paddingTop: 'env(safe-area-inset-top)' }} />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {title && (
            <p className="text-sm font-bold truncate" style={{ color: 'var(--t1)' }}>{title}</p>
          )}
          {destination?.id === 'portfolio' && (
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--t3)' }}
            >
              {t.history}
            </button>
          )}
        </div>

        <div className="lg:hidden flex items-center gap-3 shrink-0">
          <div className="flex items-center">
            <CompactClock />
            <LiveClock />
          </div>
          {userLabel && (
            <button
              onClick={() => navigate('/settings')}
              className="w-11 h-11 flex items-center justify-center shrink-0"
              title={userEmail ?? userLabel}
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white overflow-hidden"
                style={{ background: 'var(--a)' }}
              >
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
