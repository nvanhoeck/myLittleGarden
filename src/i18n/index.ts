import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import nl from './nl.json';
import aiNl from './ai/nl.json';

const resources = {
  nl: {
    translation: { ...nl, ...aiNl },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'nl',
  fallbackLng: 'nl',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
