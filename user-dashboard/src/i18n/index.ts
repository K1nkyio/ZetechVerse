import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import swTranslations from './locales/sw.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  sw: {
    translation: swTranslations,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['en', 'sw'],
    load: 'languageOnly',
    fallbackLng: 'en',
    debug: false,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'zv_language',
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.resolvedLanguage || 'en';
  i18n.on('languageChanged', (lng: string) => {
    document.documentElement.lang = lng;
    localStorage.setItem('zv_language', lng);
  });
}

export default i18n;
