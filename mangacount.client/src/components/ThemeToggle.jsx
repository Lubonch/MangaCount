import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <button 
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        >
            <span className="theme-icon">
                {isDarkMode ? '☀️' : '🌙'}
            </span>
            <span className="theme-text">
                {isDarkMode ? 'Light' : 'Dark'}
            </span>
        </button>
    );
};

export default ThemeToggle;