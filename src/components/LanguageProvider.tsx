"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, translations, TranslationKey } from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  // Load saved language on mount
  useEffect(() => {
    const saved = localStorage.getItem('hf-lang') as Language | null;
    if (saved && ['en', 'si', 'ta'].includes(saved)) setLanguage(saved);
  }, []);

  function handleSetLanguage(lang: Language) {
    setLanguage(lang);
    localStorage.setItem('hf-lang', lang);
  }

  const t = (key: TranslationKey): string =>
    translations[language][key] ?? translations.en[key] ?? key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
