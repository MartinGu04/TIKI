import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, translations, Translations } from '../i18n';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  dir: 'rtl' | 'ltr';
}

const Ctx = createContext<LangCtx>({
  lang: 'he', setLang: () => {}, t: translations.he, dir: 'rtl',
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangStored] = useLocalStorage<Lang>('tiki-lang', 'he');
  const t = translations[lang];
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  const setLang = (l: Lang) => {
    // Set synchronously so fmtDate() reads the correct locale on next render
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
    setLangStored(l);
  };

  // Also apply on mount (for initial load from localStorage)
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return <Ctx.Provider value={{ lang, setLang, t, dir }}>{children}</Ctx.Provider>;
}

export function useT(): Translations { return useContext(Ctx).t; }
export function useLang(): LangCtx { return useContext(Ctx); }
