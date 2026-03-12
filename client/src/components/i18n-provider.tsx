import { useState, useCallback, useEffect } from "react";
import { I18nContext, translations, type Language } from "@/lib/i18n";

const langToHtmlLang: Record<Language, string> = {
  zh: "zh-CN",
  en: "en",
  ja: "ja",
  ko: "ko",
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("cosmic-language") as Language;
    if (saved && ["zh", "en", "ja", "ko"].includes(saved)) {
      return saved;
    }
    return "en";
  });

  useEffect(() => {
    document.documentElement.lang = langToHtmlLang[language];
  }, [language]);

  const handleSetLanguage = useCallback((lang: Language) => {
    localStorage.setItem("cosmic-language", lang);
    setLanguage(lang);
  }, []);

  const t = useCallback(
    (key: keyof typeof translations.en) => {
      return translations[language][key] || translations.en[key] || key;
    },
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}
