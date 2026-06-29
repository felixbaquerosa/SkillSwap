/** SkillSwap brand & design tokens — sponsor-ready visual identity. */
export const BRAND = {
  bg: '#0A0814',
  surface: '#141022',
  surfaceElevated: '#1C1830',
  card: '#1E1A32',
  border: '#2E2850',
  purple: '#9B6DFF',
  purpleDark: '#6C4CE0',
  purpleLight: '#C4B5FD',
  purpleGlow: '#9B6DFF33',
  gradient: ['#6C4CE0', '#9B6DFF', '#B794FF'] as const,
  gradientDark: ['#0A0814', '#141022', '#1A1530'] as const,
  success: '#34D399',
  warning: '#FBBF24',
  info: '#60A5FA',
  danger: '#F87171',
  white: '#FFFFFF',
  muted: '#9490A8',
  text: '#F4F2FF',
};

export const SHADOW = {
  card: {
    shadowColor: '#6C4CE0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};
