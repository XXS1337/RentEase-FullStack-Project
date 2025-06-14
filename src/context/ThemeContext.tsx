// context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

// Define available themes
export type Theme = 'light' | 'dark';

// Define the context shape
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Create the theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider component to wrap the app and supply theme state
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  // On initial mount, load theme from cookies and apply class to <body>
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const initialTheme: Theme = savedTheme === 'dark' ? 'dark' : 'light';
    setTheme(initialTheme);
    document.body.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  // Toggle between light and dark theme
  const toggleTheme = () => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.body.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

// Custom hook to access theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
