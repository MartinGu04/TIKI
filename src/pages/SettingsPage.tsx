import { Moon, Sun, Sparkles, LogOut, Bell, Database, Info, Globe2, TrendingUp, Mail } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLang, useT } from '../contexts/LanguageContext';

interface Props {
  userLabel?: string;
  userEmail?: string;
  userAvatarUrl?: string;
  onSignOut: () => void;
  primaryMarket: string | null;
  dividendReminder: boolean;
  monthlyReminder: boolean;
  monthlyReminderDay: number;
  onUpdateNotifications: (patch: Partial<{ dividendReminder: boolean; monthlyReminder: boolean; monthlyReminderDay: number }>) => void;
  onOpenImportExport: () => void;
  version: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl card overflow-hidden">
      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>{title}</h2>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>{children}</div>
    </div>
  );
}

function Row({ icon, label, sub, action }: { icon: React.ReactNode; label: string; sub?: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--a10)', color: 'var(--at)' }}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--t1)' }}>{label}</p>
          {sub && <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--t3)' }}>{sub}</p>}
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-11 h-6 rounded-full relative transition-colors shrink-0"
      style={{ background: checked ? 'var(--a)' : 'var(--border2)' }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow"
        style={{ transform: checked ? 'translateX(-22px)' : 'translateX(-2px)', right: 0 }}
      />
    </button>
  );
}

export function SettingsPage({
  userLabel, userEmail, userAvatarUrl, onSignOut, primaryMarket,
  dividendReminder, monthlyReminder, monthlyReminderDay, onUpdateNotifications,
  onOpenImportExport, version,
}: Props) {
  const t = useT();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const initial = userLabel?.[0]?.toUpperCase() ?? '';
  const ThemeIcon = theme === 'mamish' ? Sparkles : theme === 'light' ? Moon : Sun;
  const themeLabel = theme === 'dark' ? t.themeDark : theme === 'light' ? t.themeLight : t.themeMamish;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-28 sm:pb-16 space-y-5 animate-fade-in">
      <h1 className="text-xl font-bold" style={{ color: 'var(--t1)' }}>{t.settings}</h1>

      <Section title={t.settingsAccount}>
        <Row
          icon={userAvatarUrl
            ? <img src={userAvatarUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-xl" />
            : <span className="text-xs font-bold">{initial}</span>}
          label={userLabel ?? ''}
          sub={userEmail}
          action={null}
        />
        <Row
          icon={<LogOut size={15} />}
          label={t.signOut}
          action={
            <button
              onClick={onSignOut}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ color: 'var(--dn)', background: 'var(--dn10)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {t.signOut}
            </button>
          }
        />
      </Section>

      <Section title={t.settingsGeneral}>
        <Row
          icon={<Globe2 size={15} />}
          label={t.language}
          action={
            <button
              onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
              style={{ color: 'var(--t2)', background: 'var(--card-h)', border: '1px solid var(--border)' }}
            >
              {lang === 'he' ? 'עברית' : 'English'}
            </button>
          }
        />
        <Row
          icon={<ThemeIcon size={15} />}
          label={t.theme}
          sub={themeLabel}
          action={
            <button
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ color: 'var(--t2)', background: 'var(--card-h)', border: '1px solid var(--border)' }}
            >
              {t.toggleTheme}
            </button>
          }
        />
        <Row
          icon={<TrendingUp size={15} />}
          label={t.marketPreferences}
          sub={primaryMarket ?? t.marketPreferencesAuto}
          action={null}
        />
      </Section>

      <Section title={t.settingsNotifications}>
        <Row
          icon={<Bell size={15} />}
          label={t.dividendReminderLabel}
          sub={t.dividendReminderSub}
          action={<Toggle checked={dividendReminder} onChange={(v) => onUpdateNotifications({ dividendReminder: v })} />}
        />
        <Row
          icon={<Bell size={15} />}
          label={t.monthlyReminderLabel}
          sub={monthlyReminder ? t.monthlyReminderDaySub(monthlyReminderDay) : t.monthlyReminderSub}
          action={<Toggle checked={monthlyReminder} onChange={(v) => onUpdateNotifications({ monthlyReminder: v })} />}
        />
        {monthlyReminder && (
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{t.dayOfMonth}</span>
            <input
              type="number" min={1} max={28} value={monthlyReminderDay}
              onChange={(e) => onUpdateNotifications({ monthlyReminderDay: Math.min(28, Math.max(1, parseInt(e.target.value) || 1)) })}
              className="w-16 text-sm rounded-lg px-2 py-1 input-base text-center" dir="ltr"
            />
          </div>
        )}
      </Section>

      <Section title={t.settingsData}>
        <Row
          icon={<Database size={15} />}
          label={t.importExportTitle}
          sub={t.importExportSub}
          action={
            <button
              onClick={onOpenImportExport}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ color: 'var(--t2)', background: 'var(--card-h)', border: '1px solid var(--border)' }}
            >
              {t.openBtn}
            </button>
          }
        />
      </Section>

      <Section title={t.settingsAbout}>
        <Row icon={<Info size={15} />} label={t.versionLabel} sub={version} action={null} />
        <Row
          icon={<Mail size={15} />}
          label={t.contactLabel}
          action={
            <a href="mailto:support@tiki.app" className="text-xs font-semibold" style={{ color: 'var(--at)' }}>
              {t.contactBtn}
            </a>
          }
        />
      </Section>
    </div>
  );
}
