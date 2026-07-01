import { TrendingUp, Plus, Sparkles } from 'lucide-react';
import { useT, useLang } from '../contexts/LanguageContext';
import { greetingWord } from '../utils/greeting';

interface Props {
  onAddAsset: () => void;
  onLoadDemo: () => void;
  userLabel?: string;
}

export function EmptyState({ onAddAsset, onLoadDemo, userLabel }: Props) {
  const t = useT();
  const { lang } = useLang();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-fade-in">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, var(--a10) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-sm w-full animate-slide-up">
        {/* Icon */}
        <div
          className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
          style={{ background: 'var(--a10)', border: '1px solid var(--a20)', boxShadow: '0 8px 32px var(--a10)' }}
        >
          <TrendingUp size={36} strokeWidth={1.5} style={{ color: 'var(--at)' }} />
        </div>

        {/* Headline — personalized greeting once signed in, generic welcome otherwise */}
        <h1 className="text-3xl font-black tracking-tight mb-3" style={{ color: 'var(--t1)' }}>
          {userLabel ? `${greetingWord(lang)}, ${userLabel} 👋` : t.welcomeTitle}
        </h1>
        <p className="text-base leading-relaxed mb-2" style={{ color: 'var(--t2)' }}>
          {t.welcomeSubtitle}
        </p>
        <p className="text-sm mb-10" style={{ color: 'var(--t3)' }}>
          {t.welcomeBody}
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {([
            [t.livePrices, t.livepricesSub],
            [t.futureProjection, t.futureProjectionSub],
            [t.ownerTracking, t.ownerTrackingSub],
          ] as [string, string][]).map(([label, sub]) => (
            <div key={label} className="card rounded-xl p-3">
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--t1)' }}>{label}</p>
              <p className="text-[11px]" style={{ color: 'var(--t3)' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col items-stretch gap-3">
          <button
            onClick={onAddAsset}
            className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-bold text-white rounded-2xl transition-all hover:opacity-90 active:scale-95 shadow-lg"
            style={{ background: 'var(--a)', boxShadow: '0 8px 24px var(--a20)' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            {t.letsBegin}
          </button>

          <button
            onClick={onLoadDemo}
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium rounded-2xl transition-all hover:opacity-80 card card-hover"
            style={{ color: 'var(--t2)' }}
          >
            <Sparkles size={14} style={{ color: '#f59e0b' }} />
            {t.loadDemo}
          </button>
        </div>

        <p className="text-[12px] mt-6" style={{ color: 'var(--t4)' }}>
          {t.dataPrivacy}
        </p>
      </div>
    </div>
  );
}
