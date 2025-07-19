import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    // Default to dark mode
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Check localStorage first, default to dark mode
        const saved = localStorage.getItem('mangacount-theme');
        return saved ? saved === 'dark' : true; // Default to true (dark mode)
    });

    useEffect(() => {
        // Apply theme to document root
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        
        // Save to localStorage
        localStorage.setItem('mangacount-theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode(prev => !prev);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};