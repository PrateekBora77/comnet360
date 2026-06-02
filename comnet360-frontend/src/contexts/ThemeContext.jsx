import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext(null);

// Always light — dark mode removed.
export function ThemeProvider({ children }) {
  useEffect(() => {
    // Ensure the dark class is NEVER present on <html>
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark: false, toggle: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
