import { useState, useEffect } from 'react';
import { getTranslation, getTranslations } from '../locales';

export const useTranslation = (language = 'English') => {
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [translations, setTranslations] = useState(getTranslations(language));

  useEffect(() => {
    setCurrentLanguage(language);
    setTranslations(getTranslations(language));
  }, [language]);

  const t = (key) => {
    return getTranslation(key, currentLanguage);
  };

  const changeLanguage = (newLanguage) => {
    setCurrentLanguage(newLanguage);
    setTranslations(getTranslations(newLanguage));
    // Store language preference in localStorage
    localStorage.setItem('selectedLanguage', newLanguage);
  };

  return {
    t,
    currentLanguage,
    translations,
    changeLanguage
  };
};

export default useTranslation;
