import { ReactNode } from 'react';

interface CTA { label: string; onClick: () => void }

interface Props {
  icon: ReactNode;
  title: string;
  body?: string;
  cta?: CTA;
  secondaryCta?: CTA;
  variant?: 'full' | 'inline';
}

/**
 * Generic empty state: `variant="full"` preserves the original full-bleed
 * Home/onboarding look (ambient glow, large icon), `variant="inline"` is a
 * compact version for use within a page (Portfolio, History, a filtered list)
 * — both share the same visual language per docs/TIKI_VISION.md's
 * consistency mandate, rather than being two unrelated components.
 */
export function EmptyState({ icon, title, body, cta, secondaryCta, variant = 'inline' }: Props) {
  if (variant === 'full') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-fade-in">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, var(--a10) 0%, transparent 70%)' }}
          />
        </div>
        <div className="relative z-10 max-w-sm w-full animate-slide-up">
          <div
            className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
            style={{ background: 'var(--a10)', border: '1px solid var(--a20)', boxShadow: '0 8px 32px var(--a10)' }}
          >
            {icon}
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-3" style={{ color: 'var(--t1)' }}>{title}</h1>
          {body && <p className="text-sm mb-10" style={{ color: 'var(--t3)' }}>{body}</p>}
          {(cta || secondaryCta) && (
            <div className="flex flex-col items-stretch gap-3">
              {cta && (
                <button
                  onClick={cta.onClick}
                  className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-bold text-white rounded-2xl transition-all hover:opacity-90 active:scale-95 shadow-lg"
                  style={{ background: 'var(--a)', boxShadow: '0 8px 24px var(--a20)' }}
                >
                  {cta.label}
                </button>
              )}
              {secondaryCta && (
                <button
                  onClick={secondaryCta.onClick}
                  className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium rounded-2xl transition-all hover:opacity-80 card card-hover"
                  style={{ color: 'var(--t2)' }}
                >
                  {secondaryCta.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4 animate-fade-in">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--a10)', border: '1px solid var(--a20)' }}
      >
        {icon}
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{title}</p>
      {body && <p className="text-xs mt-1.5 max-w-xs" style={{ color: 'var(--t3)' }}>{body}</p>}
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-5 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--a)', boxShadow: '0 4px 14px var(--a20)' }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
