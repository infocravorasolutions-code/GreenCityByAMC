import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../locales';

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    const loadLang = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('@app_language');
        if (storedLang) {
          setLanguageState(storedLang);
        }
      } catch (e) {
        console.error('Failed to load language', e);
      }
    };
    loadLang();
  }, []);

  const setLanguage = async (lang: string) => {
    try {
      await AsyncStorage.setItem('@app_language', lang);
      setLanguageState(lang);
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  const t = (key: string, fallback?: string) => {
    const dictionary = translations[language] || translations['en'];
    return dictionary[key] || translations['en'][key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
