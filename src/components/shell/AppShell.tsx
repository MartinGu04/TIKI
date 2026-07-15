import { ReactNode } from 'react';
import { DesktopRail } from './DesktopRail';
import { PhoneNav } from './PhoneNav';
import { ContextualHeader } from './ContextualHeader';

interface Props {
  userLabel?: string;
  userEmail?: string;
  userAvatarUrl?: string;
  children: ReactNode;
}

/**
 * Composes the persistent shell chrome: the desktop/wide-tablet rail, the
 * phone/narrow-tablet bottom nav, and the contextual header — all driven by
 * width via Tailwind's `lg:` breakpoint, not a device check (PART 5 §D).
 * `children` is the routed page content.
 */
export function AppShell({ userLabel, userEmail, userAvatarUrl, children }: Props) {
  return (
    <>
      <DesktopRail userLabel={userLabel} userEmail={userEmail} userAvatarUrl={userAvatarUrl} />
      <div className="lg:ps-20">
        <ContextualHeader userLabel={userLabel} userEmail={userEmail} userAvatarUrl={userAvatarUrl} />
        <main>{children}</main>
      </div>
      <PhoneNav />
    </>
  );
}
