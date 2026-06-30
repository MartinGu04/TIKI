import { TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/LanguageContext';

interface Props {
  onContinueLocal: () => void;
}

const GoogleIcon = () => (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden>
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#fff" fillOpacity=".9"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#fff" fillOpacity=".75"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#fff" fillOpacity=".6"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#fff" fillOpacity=".45"/>
  </svg>
);

export function LoginScreen({ onContinueLocal }: Props) {
  const { signInWithGoogle } = useAuth();
  const t = useT();

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] px-4 text-center animate-fade-in">

      {/* Ambient glow — identical to EmptyState */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, var(--a10) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 max-w-sm w-full animate-slide-up">

        {/* Icon — same soft style as EmptyState */}
        <div
          className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
          style={{ background: 'var(--a10)', border: '1px solid var(--a20)', boxShadow: '0 8px 32px var(--a10)' }}
        >
          <TrendingUp size={36} strokeWidth={1.5} style={{ color: 'var(--at)' }} />
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-black tracking-tight mb-3" style={{ color: 'var(--t1)' }}>
          {t.welcomeTitle}
        </h1>
        <p className="text-base leading-relaxed mb-2" style={{ color: 'var(--t2)' }}>
          {t.welcomeSubtitle}
        </p>
        <p className="text-sm mb-10" style={{ color: 'var(--t3)' }}>
          {t.welcomeBody}
        </p>

        {/* Feature cards — same grid as EmptyState */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {([
            [t.livePrices, t.livepricesSub],
            [t.futureProjection, t.futureProjectionSub],
            [t.ownerTracking, t.ownerTrackingSub],
          ] as [string, string][]).map(([label, sub]) => (
            <div key={label} className="card rounded-xl p-3">
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--t1)' }}>{label}</p>
              <p className="text-[10px]" style={{ color: 'var(--t3)' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col items-stretch gap-3">
          <button
            onClick={signInWithGoogle}
            className="flex items-center justify-center gap-2.5 w-full py-3.5 text-sm font-bold text-white rounded-2xl transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--a)', boxShadow: '0 8px 24px var(--a20)' }}
          >
            <GoogleIcon />
            {t.continueWithGoogle}
          </button>

          <button
            onClick={onContinueLocal}
            className="w-full py-3 text-sm font-medium rounded-2xl transition-all hover:opacity-80 card card-hover"
            style={{ color: 'var(--t2)' }}
          >
            {t.continueWithoutAccount}
          </button>
        </div>

        <p className="text-[11px] mt-6" style={{ color: 'var(--t4)' }}>
          {t.dataPrivacy}
        </p>

      </div>
    </div>
  );
}
