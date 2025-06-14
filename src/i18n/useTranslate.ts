import { useLanguage } from '../context/LanguageContext';
import { translations } from './translations';

// Custom hook to access translated text based on current language
export const useTranslate = () => {
  const { language } = useLanguage(); // Get the currently selected language from context

  /**
   * Translation function: returns the translated value for a given key.
   * If a `vars` object is provided, it replaces {{placeholders}} with actual values.
   *
   * @param key - The translation key
   * @param vars - Optional object for dynamic values (e.g., { count: 5 })
   * @returns Translated string with placeholders replaced
   */
  const t = (key: string, vars?: Record<string, string | number>): string => {
    let value = translations[language]?.[key];

    // If translation is missing, log warning and return the key
    if (!value) {
      console.warn(`Missing translation for key: "${key}" in "${language}"`);
      return key;
    }

    // If variables are provided, replace placeholders in the form {{key}} with actual values
    if (vars) {
      Object.entries(vars).forEach(([placeholder, replacement]) => {
        value = value.replace(new RegExp(`{{\\s*${placeholder}\\s*}}`, 'g'), String(replacement));
      });
    }

    return value;
  };

  // Return the translation function to be used inside components
  return t;
};
