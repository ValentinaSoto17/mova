import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { palette } from '../theme/colors';

const ThemeContext = createContext(null);
const KEY = 'mova.theme';

/** Modo claro / oscuro: "system" sigue al teléfono; el usuario puede forzar uno. */
export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [preference, setPreference] = useState('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setPreference(v))
      .catch(() => {});
  }, []);

  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const colors = palette[scheme];

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  const value = useMemo(
    () => ({
      colors,
      scheme,
      isDark: scheme === 'dark',
      preference,
      setPreference: (p) => {
        setPreference(p);
        AsyncStorage.setItem(KEY, p).catch(() => {});
      },
      toggle: () => {
        const next = scheme === 'dark' ? 'light' : 'dark';
        setPreference(next);
        AsyncStorage.setItem(KEY, next).catch(() => {});
      },
    }),
    [colors, scheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
