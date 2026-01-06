// src/lib/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
    },
    detection: {
      // Orden de prioridad: localStorage > navigator > fallback
      order: ['localStorage', 'navigator'],
      // Clave en localStorage donde se guarda la preferencia
      lookupLocalStorage: 'ce_lang',
      // Si no encuentra idioma, no usa caché
      caches: ['localStorage'],
      // Solo detecta idiomas soportados
      checkWhitelist: true,
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'en', 'ca'],
    nonExplicitSupportedLngs: true,
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
    debug: import.meta.env.DEV, 
  });

export default i18n;
