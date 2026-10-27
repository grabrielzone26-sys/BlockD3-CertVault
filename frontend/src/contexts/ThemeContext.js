import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { createApiClient } from '../lib/apiClient';

export const THEMES = {
  institutional: {
    id: 'institutional',
    name: 'Institutional Sapphire',
    subtitle: 'Official Registry (Default)',
    category: 'Corporate Navy Blue',
    description: 'Authoritative deep royal navy blue canvas with crisp cobalt sapphire and clean matte contrast.',
    badge: 'Default Theme',
    primary: '#2563EB',
    accent: '#38BDF8',
    amber: '#F59E0B',
    success: '#10B981',
    bg: '#0B1B3D',
    swatches: ['#2563EB', '#38BDF8', '#10B981', '#0B1B3D'],
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Web3 Neon',
    subtitle: 'Original Blockchain',
    category: 'Pitch Black & Neon',
    description: 'Full cosmic space pitch-black background with electric cyan, neon amber, and vibrant violet laser glows.',
    badge: 'Original Web3',
    primary: '#00E5FF',
    accent: '#8B5CF6',
    amber: '#FF8A2B',
    success: '#39FF88',
    bg: '#070A10',
    swatches: ['#00E5FF', '#8B5CF6', '#39FF88', '#070A10'],
  },
};

const THEME_VARIABLES = {
  institutional: {
    '--cyan': '#38BDF8',
    '--amber': '#F59E0B',
    '--violet': '#6366F1',
    '--gold': '#FBBF24',
    '--green': '#10B981',
    '--magenta': '#818CF8',
    '--bg-primary': '#07122A',
    '--bg-secondary': '#0B1B3D',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#CBD5E1',
    '--text-tertiary': '#94A3B8',
    '--border-color': 'rgba(56, 189, 248, 0.28)',
    '--border-amber': 'rgba(245, 158, 11, 0.35)',
    '--border-violet': 'rgba(99, 102, 241, 0.3)',
    '--card-bg': 'rgba(13, 29, 66, 0.90)',
    '--accent-1': '#2563EB',
    '--accent-2': '#38BDF8',
    '--accent-3': '#6366F1',
    '--shadow-color': 'rgba(2, 6, 23, 0.7)',
    '--glow-color': 'rgba(37, 99, 235, 0.28)',
    '--ring-color': 'rgba(56, 189, 248, 0.38)',
    '--panel-glass': 'rgba(13, 29, 66, 0.85)',
    '--panel-border': 'rgba(56, 189, 248, 0.25)',
    '--btn-primary-bg': '#2563EB',
    '--btn-primary-text': '#FFFFFF',
    '--btn-primary-hover': '#1D4ED8',
    '--btn-primary-glow': '0 4px 18px rgba(37, 99, 235, 0.4)',
    '--topbar-line': 'linear-gradient(to right, transparent, rgba(37, 99, 235, 0.85), rgba(56, 189, 248, 0.85))',
    '--body-radial-1': 'rgba(37, 99, 235, 0.22)',
    '--body-radial-2': 'rgba(56, 189, 248, 0.16)',
    '--body-radial-3': 'rgba(99, 102, 241, 0.12)',
    '--body-base': 'rgba(7, 18, 42, 0.98)',
  },
  cyber: {
    '--cyan': '#38BDF8',
    '--amber': '#F59E0B',
    '--violet': '#6366F1',
    '--gold': '#FBBF24',
    '--green': '#10B981',
    '--magenta': '#818CF8',
    '--bg-primary': '#07122A',
    '--bg-secondary': '#0B1B3D',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#CBD5E1',
    '--text-tertiary': '#94A3B8',
    '--border-color': 'rgba(56, 189, 248, 0.22)',
    '--border-amber': 'rgba(245, 158, 11, 0.25)',
    '--border-violet': 'rgba(99, 102, 241, 0.25)',
    '--card-bg': 'rgba(13, 29, 66, 0.90)',
    '--accent-1': '#2563EB',
    '--accent-2': '#38BDF8',
    '--accent-3': '#6366F1',
    '--shadow-color': 'rgba(2, 6, 23, 0.7)',
    '--glow-color': 'rgba(37, 99, 235, 0.25)',
    '--ring-color': 'rgba(56, 189, 248, 0.35)',
    '--panel-glass': 'rgba(13, 29, 66, 0.85)',
    '--panel-border': 'rgba(56, 189, 248, 0.2)',
    '--btn-primary-bg': '#2563EB',
    '--btn-primary-text': '#FFFFFF',
    '--btn-primary-hover': '#1D4ED8',
    '--btn-primary-glow': '0 4px 18px rgba(37, 99, 235, 0.35)',
    '--topbar-line': 'linear-gradient(to right, transparent, rgba(37, 99, 235, 0.85), rgba(56, 189, 248, 0.85))',
    '--body-radial-1': 'rgba(37, 99, 235, 0.08)',
    '--body-radial-2': 'rgba(56, 189, 248, 0.06)',
    '--body-radial-3': 'rgba(99, 102, 241, 0.05)',
    '--body-base': 'rgba(7, 18, 42, 0.98)',
  },
};

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Normalize theme keys with 'institutional' as the primary default
const normalizeTheme = (rawTheme) => {
  if (!rawTheme) return 'institutional';
  if (THEMES[rawTheme]) return rawTheme;
  return 'institutional';
};

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState('institutional');
  const [textSize, setTextSize] = useState(100);

  // Initialize theme from user settings or localStorage
  useEffect(() => {
    const initializeTheme = () => {
      let initialTheme = 'institutional';
      let initialTextSize = 100;

      // 1. Check local storage on this browser first (explicit device choice)
      const savedTheme = localStorage.getItem('blockd3_theme') || localStorage.getItem('theme');
      if (savedTheme) {
        initialTheme = normalizeTheme(savedTheme);
      } else if (user?.settings?.theme) {
        // 2. Fall back to user settings from backend
        initialTheme = normalizeTheme(user.settings.theme);
      }

      if (user?.settings?.textSize) {
        initialTextSize = user.settings.textSize;
      } else {
        const savedTextSize = localStorage.getItem('textSize');
        if (savedTextSize) {
          initialTextSize = parseInt(savedTextSize, 10);
        }
      }

      setTheme(initialTheme);
      setTextSize(initialTextSize);
    };

    initializeTheme();
  }, [user]);

  // Apply theme attributes & CSS custom properties to document
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const body = document.body;

      const activeKey = normalizeTheme(theme);

      // Clean up previous theme classes
      Object.keys(THEMES).forEach((key) => {
        root.classList.remove(`theme-${key}`);
        body.classList.remove(`theme-${key}`);
      });
      root.classList.remove('theme-executive', 'light');
      body.classList.remove('theme-executive', 'light');

      // Set data-theme and theme class
      root.setAttribute('data-theme', activeKey);
      body.setAttribute('data-theme', activeKey);
      root.classList.add(`theme-${activeKey}`);
      body.classList.add(`theme-${activeKey}`);

      root.classList.add('dark');
      body.classList.add('dark');

      // Apply CSS variables for the active theme
      const variables = THEME_VARIABLES[activeKey] || THEME_VARIABLES.institutional;
      Object.entries(variables).forEach(([prop, val]) => {
        root.style.setProperty(prop, val);
      });

      // Save to localStorage for persistence across reloads
      localStorage.setItem('blockd3_theme', activeKey);
      localStorage.setItem('theme', activeKey);
    };

    applyTheme();
  }, [theme]);

  // Apply text size scale
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--text-scale', `${textSize / 100}`);
    localStorage.setItem('textSize', textSize.toString());
  }, [textSize]);

  const updateTheme = async (newTheme) => {
    const normalized = normalizeTheme(newTheme);
    setTheme(normalized);
    localStorage.setItem('blockd3_theme', normalized);
    localStorage.setItem('theme', normalized);

    // Persist chosen theme to user profile in database
    if (user && user._id) {
      try {
        const apiClient = createApiClient();
        await apiClient.put('/api/users/settings', {
          settings: { theme: normalized }
        });
      } catch (err) {
        console.warn('Theme profile sync warning:', err.message);
      }
    }
  };

  const updateTextSize = (newSize) => {
    setTextSize(newSize);
  };

  const activeThemeMeta = useMemo(() => THEMES[theme] || THEMES.institutional, [theme]);

  const value = {
    theme,
    activeThemeMeta,
    themes: THEMES,
    textSize,
    updateTheme,
    updateTextSize,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
