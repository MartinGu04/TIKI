import type { Lang } from '../i18n';

/** Time-of-day greeting word, e.g. "Good morning" / "בוקר טוב". */
export function greetingWord(lang: Lang): string {
  const h = new Date().getHours();
  if (lang === 'he') {
    if (h >= 5 && h < 12) return 'בוקר טוב';
    if (h >= 12 && h < 17) return 'אחר הצהריים';
    if (h >= 17 && h < 22) return 'ערב טוב';
    return 'לילה טוב';
  }
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 22) return 'Good evening';
  return 'Good night';
}
