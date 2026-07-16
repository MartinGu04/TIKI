import { HomeSignal } from '../../utils/homeState';
import { useT } from '../../contexts/LanguageContext';
import { ReminderBanner } from '../ui/ReminderBanner';

interface Props {
  signals: HomeSignal[];
  onLogInvestment: () => void;
  onAddDividend: () => void;
  onDismissMonthly: () => void;
  onDismissDividend: () => void;
}

/** Renders only the 0-2 Signal lines and their actions. Never renders Now content. */
export function SignalsSection({ signals, onLogInvestment, onAddDividend, onDismissMonthly, onDismissDividend }: Props) {
  const t = useT();
  if (signals.length === 0) return null;

  return (
    <div className="space-y-2">
      {signals.map((signal) => (
        signal.id === 'monthlyReminder' ? (
          <ReminderBanner
            key={signal.id}
            message={t.monthlyReminderBannerMsg}
            actionLabel={t.logInvestmentBtn}
            onAction={onLogInvestment}
            onDismiss={onDismissMonthly}
          />
        ) : (
          <ReminderBanner
            key={signal.id}
            message={t.dividendReminderBannerMsg}
            actionLabel={t.addDividendBtn}
            onAction={onAddDividend}
            onDismiss={onDismissDividend}
          />
        )
      ))}
    </div>
  );
}
