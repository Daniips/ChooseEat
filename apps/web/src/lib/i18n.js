// src/lib/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
    },
    lng: 'es',
    fallbackLng: 'en',
    supportedLngs: ['es','en','cat'],
    nonExplicitSupportedLngs: true,
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
    debug: import.meta.env.DEV, 
  });

export default i18n;
