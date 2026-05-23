import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import zhCN from './zh-CN';
import enUS from './en-US';

const initialLanguage =
  typeof window !== 'undefined' ? window.localStorage.getItem('i18nextLng') ?? 'zh-CN' : 'zh-CN';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en-US': { translation: enUS },
    },
    lng: initialLanguage,
    fallbackLng: 'zh-CN',
    supportedLngs: ['zh-CN', 'en-US'],
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
