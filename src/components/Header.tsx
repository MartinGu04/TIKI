import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { TrendingUp } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';

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
 * Minimal Header per product decision: branding + clock + avatar only.
 * Theme, Language, and Sign Out all live in Settings now — not here.
 */
export function Header({ userLabel, userEmail, userAvatarUrl }: Props) {
  const navigate = useNavigate();
  const initial = userLabel?.[0]?.toUpperCase() ?? '';

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl border-b"
      style={{ background: 'var(--hdr)', borderColor: 'var(--border)' }}
    >
      <div style={{ paddingTop: 'env(safe-area-inset-top)' }} />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-14 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

        <div className="flex items-center gap-2.5 min-w-0 justify-self-start">
          <div
            className="flex items-center gap-2.5 min-w-0 shrink-0 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shrink-0"
              style={{ background: 'var(--a)', boxShadow: '0 4px 12px var(--a20)' }}
            >
              <TrendingUp size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-black tracking-tight text-gradient hidden sm:block shrink-0" dir="ltr">TIKI</p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <CompactClock />
          <LiveClock />
        </div>

        <div className="flex items-center gap-2 justify-self-end">
          {userLabel && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 overflow-hidden"
              style={{ background: 'var(--a)' }}
              title={userEmail ?? userLabel}
              onClick={() => navigate('/settings')}
              role="button"
            >
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
