import React, { createContext, useContext, useState, useEffect } from 'react';

// Define supported language types
type Language = 'en' | 'ro';

// Define the shape of the language context
type LanguageContextType = {
  language: Language; // The currently selected language
  toggleLanguage: () => void; // Function to switch between languages
};

// Create the context with undefined to enforce usage within provider
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Context provider component for managing language state
export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en'); // Default to English

  // Load saved language from localStorage on first mount
  useEffect(() => {
    const storedLang = localStorage.getItem('language') as Language;
    if (storedLang === 'en' || storedLang === 'ro') {
      setLanguage(storedLang);
    }
  }, []);

  // Switch between English and Romanian and persist choice
  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ro' : 'en';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  // Provide language state and toggle function to consumers
  return <LanguageContext.Provider value={{ language, toggleLanguage }}>{children}</LanguageContext.Provider>;
};

// Custom hook to access the LanguageContext in child components
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
