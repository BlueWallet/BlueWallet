import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import loc, { saveLanguage, addLanguageChangeListener } from '../../loc';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState(loc.getLanguage());

  useEffect(() => {
    // Subscribe to language changes
    const unsubscribe = addLanguageChangeListener(newLanguage => {
      setLanguageState(newLanguage);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const setLanguage = useCallback(async (lang: string) => {
    await saveLanguage(lang);
    // saveLanguage will trigger the listener which updates the state
  }, []);

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
};

/**
 * Hook to access current language and trigger re-renders on language changes.
 * Use this in any component that displays localized text.
 *
 * @example
 * const MyComponent = () => {
 *   const { language } = useLanguage();
 *   return <Text>{loc.settings.title}</Text>;
 * };
 */
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
