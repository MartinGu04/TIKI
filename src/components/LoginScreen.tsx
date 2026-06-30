import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/LanguageContext';

interface Props {
  onContinueLocal: () => void;
}

export function LoginScreen({ onContinueLocal }: Props) {
  const { signInWithGoogle } = useAuth();
  const t = useT();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 animate-fade-in"
      style={{ background: 'var(--bg)' }}
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--a)', boxShadow: '0 8px 32px var(--a20)' }}
        >
          <span className="text-2xl font-black text-white">T</span>
        </div>
        <h1 className="text-3xl font-black text-gradient">TIKI</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t3)' }}>{t.loginSubtitle}</p>
      </div>

      {/* Sign-in card */}
      <div
        className="w-full max-w-sm rounded-3xl card p-8 space-y-4"
        style={{ boxShadow: 'var(--cshadow)' }}
      >
        {/* Google button */}
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--a)', color: '#fff' }}
        >
          {/* Google "G" icon (inline SVG — no external dependency) */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#fff" fillOpacity=".9"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#fff" fillOpacity=".75"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#fff" fillOpacity=".6"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#fff" fillOpacity=".45"/>
          </svg>
          {t.continueWithGoogle}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--t4)' }}>{t.orText}</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Local / demo mode */}
        <button
          onClick={onContinueLocal}
          className="w-full py-3 rounded-2xl text-sm font-medium transition-all hover:opacity-70"
          style={{ color: 'var(--t3)' }}
        >
          {t.continueWithoutAccount}
        </button>
      </div>

      <p className="mt-6 text-xs text-center max-w-xs" style={{ color: 'var(--t4)' }}>
        {t.dataPrivacy}
      </p>
    </div>
  );
}
