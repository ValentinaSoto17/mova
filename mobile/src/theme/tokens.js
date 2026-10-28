import { Platform } from 'react-native';

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

export const type = {
  display: { fontFamily: font.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  h1: { fontFamily: font.extrabold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: font.bold, fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  h3: { fontFamily: font.bold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: font.medium, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase' },
  number: { fontFamily: font.extrabold, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
};

export const shadow = (c, level = 1) =>
  Platform.select({
    web: { boxShadow: `0 ${level * 4}px ${level * 14}px ${c.mode === 'dark' ? 'rgba(0,0,0,.45)' : 'rgba(43,36,117,.08)'}` },
    default: {
      shadowColor: c.shadow,
      shadowOpacity: c.mode === 'dark' ? 0.4 : 0.08,
      shadowRadius: level * 10,
      shadowOffset: { width: 0, height: level * 4 },
      elevation: level * 2,
    },
  });

// Ancho máximo del contenido: mobile-first pero prolijo en tablet y web
export const MAX_WIDTH = 720;
