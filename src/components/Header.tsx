import { useState, useEffect } from 'react';
import { TrendingUp, Moon, Sun, Sparkles, Plus, LayoutDashboard, Home, LogOut } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLang, useT } from '../contexts/LanguageContext';
import type { View } from '../types/view';

interface Props {
  view: View;
  onViewChange: (v: View) => void;
  onAddAsset: () => void;
  hasAssets: boolean;
  userLabel?: string;
  userEmail?: string;
  userAvatarUrl?: string;
  onSignOut?: () => void;
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
      {/* Date reads in its natural script direction — only the hh:mm:ss below needs forced LTR */}
      <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{dateStr}</span>
      <div className="flex items-baseline gap-0.5 ltr" dir="ltr">
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--t2)' }}>{hh}:{mm}</span>
        <span className="text-[12px] font-medium tabular-nums" style={{ color: 'var(--t4)' }}>:{ss}</span>
      </div>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={
        active
          ? { background: 'var(--a)', color: '#fff' }
          : { background: 'transparent', color: 'var(--t2)' }
      }
    >
      {icon}
      {label}
    </button>
  );
}

export function Header({ view, onViewChange, onAddAsset, hasAssets, userLabel, userEmail, userAvatarUrl, onSignOut }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const t = useT();
  const initial = userLabel?.[0]?.toUpperCase() ?? '';

  const ThemeIcon = theme === 'mamish' ? Sparkles : theme === 'light' ? Moon : Sun;
  const themeIconColor = theme === 'mamish' ? 'var(--at)' : 'var(--t2)';

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl border-b"
      style={{ background: 'var(--hdr)', borderColor: 'var(--border)' }}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-14 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

        {/* Start column (RTL: right side) — brand + primary nav + primary action */}
        <div className="flex items-center gap-2.5 min-w-0 justify-self-start">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shrink-0"
            style={{ background: 'var(--a)', boxShadow: '0 4px 12px var(--a20)' }}
          >
            <TrendingUp size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <p className="text-sm font-black tracking-tight text-gradient hidden sm:block shrink-0" dir="ltr">TIKI</p>

          {hasAssets && (
            <nav
              className="hidden sm:flex items-center gap-1 p-1 rounded-xl ms-1"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <NavBtn
                active={view === 'home'}
                onClick={() => onViewChange('home')}
                icon={<Home size={13} />}
                label={t.home}
              />
              <NavBtn
                active={view === 'advanced'}
                onClick={() => onViewChange('advanced')}
                icon={<LayoutDashboard size={13} />}
                label={t.advanced}
              />
            </nav>
          )}

          {hasAssets && (
            <button
              onClick={onAddAsset}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95 shrink-0"
              style={{ background: 'var(--a)', boxShadow: '0 4px 14px var(--a20)' }}
            >
              <Plus size={13} />
              {t.addInvestment}
            </button>
          )}
        </div>

        {/* Center column — date + live clock, always at the true midpoint of the header */}
        <LiveClock />

        {/* End column (RTL: left side) — theme, language, then identity chip + sign out */}
        <div className="flex items-center gap-2 justify-self-end">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl transition-all hover:opacity-80"
            style={{
              color: themeIconColor,
              background: 'var(--card)',
              border: '1px solid var(--border)',
            }}
            title="Toggle theme"
          >
            <ThemeIcon size={15} />
          </button>

          <button
            onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            className="text-[12px] font-bold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{
              color: 'var(--t3)',
              background: 'var(--card)',
              border: '1px solid var(--border)',
            }}
            title={lang === 'he' ? 'Switch to English' : 'עבור לעברית'}
          >
            {lang === 'he' ? 'EN' : 'עב'}
          </button>

          {/* User chip + sign out — kept together, sign out unmistakably red/danger */}
          {userLabel && onSignOut && (
            <div className="flex items-center gap-1.5">
              <div
                className="flex items-center gap-1.5 ps-1 pe-1 sm:pe-2.5 py-1 rounded-full"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                title={userEmail ?? userLabel}
              >
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                    style={{ background: 'var(--a)' }}
                  >
                    {initial}
                  </div>
                )}
                <span className="hidden sm:inline text-[12px] font-medium max-w-[110px] truncate" style={{ color: 'var(--t2)' }}>
                  {userLabel}
                </span>
              </div>

              <button
                onClick={onSignOut}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80 shrink-0"
                style={{ color: 'var(--dn)', background: 'var(--dn10)', border: '1px solid rgba(239,68,68,0.4)' }}
                title={t.signOut}
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">{t.signOut}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
