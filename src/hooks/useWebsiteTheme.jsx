import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import systemConfigService from '../services/systemConfigService';
import { DEFAULT_THEME_CONFIG, getThemePreset, normalizeThemeConfig } from '../theme/themePresets';

const STORAGE_KEY = 'candlet-website-theme';
const WebsiteThemeContext = createContext(null);

const readCachedConfig = () => {
  try {
    return normalizeThemeConfig(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return DEFAULT_THEME_CONFIG;
  }
};

const setPaletteVariables = (root, prefix, presetId) => {
  const { colors } = getThemePreset(presetId);
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--${prefix}-${key}`, value);
  });
};

export function WebsiteThemeProvider({ children }) {
  const [config, setConfig] = useState(readCachedConfig);
  const [savingTheme, setSavingTheme] = useState(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    setPaletteVariables(root, 'admin-theme', config.adminPreset);
    setPaletteVariables(root, 'shop-theme', config.shopPreset);
    root.dataset.adminTheme = config.adminPreset;
    root.dataset.shopTheme = config.shopPreset;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    let active = true;
    systemConfigService.getConfig('website_theme')
      .then((response) => {
        if (active && response?.data?.value) setConfig(normalizeThemeConfig(response.data.value));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const applyPreset = useCallback(async (presetId, scope) => {
    const nextConfig = normalizeThemeConfig({
      adminPreset: scope === 'shop' ? config.adminPreset : presetId,
      shopPreset: scope === 'admin' ? config.shopPreset : presetId,
    });
    setSavingTheme(true);
    try {
      await systemConfigService.updateConfig('website_theme', nextConfig);
      setConfig(nextConfig);
      return nextConfig;
    } finally {
      setSavingTheme(false);
    }
  }, [config]);

  const value = useMemo(() => ({ config, applyPreset, savingTheme }), [config, applyPreset, savingTheme]);
  return <WebsiteThemeContext.Provider value={value}>{children}</WebsiteThemeContext.Provider>;
}

export const useWebsiteTheme = () => {
  const context = useContext(WebsiteThemeContext);
  if (!context) throw new Error('useWebsiteTheme must be used inside WebsiteThemeProvider');
  return context;
};
