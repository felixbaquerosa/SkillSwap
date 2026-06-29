import { useColorScheme } from 'react-native';
import { BRAND } from '../constants/brand';

export type Theme = {
  isDark: boolean;
  bg: string;
  bgAlt: string;
  card: string;
  cardElevated: string;
  border: string;
  text: string;
  textSub: string;
  accent: string;
  accentLight: string;
  accentText: string;
  danger: string;
  success: string;
  warning: string;
  chipBg: string;
  gradient: readonly [string, string, ...string[]];
  heroGradient: readonly [string, string, ...string[]];
};

/** Premium SkillSwap theme — polished for demos & sponsors. */
export function useTheme(): Theme {
  const isDark = useColorScheme() === 'dark';

  if (isDark) {
    return {
      isDark: true,
      bg: BRAND.bg,
      bgAlt: BRAND.surface,
      card: BRAND.card,
      cardElevated: BRAND.surfaceElevated,
      border: BRAND.border,
      text: BRAND.text,
      textSub: BRAND.muted,
      accent: BRAND.purple,
      accentLight: BRAND.purpleLight,
      accentText: BRAND.white,
      danger: BRAND.danger,
      success: BRAND.success,
      warning: BRAND.warning,
      chipBg: '#252040',
      gradient: BRAND.gradient,
      heroGradient: ['#1A1035', '#141022', BRAND.bg],
    };
  }

  return {
    isDark: false,
    bg: '#F8F7FC',
    bgAlt: '#EEEAF8',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    border: '#E4E0F0',
    text: '#12101F',
    textSub: '#6B6580',
    accent: BRAND.purpleDark,
    accentLight: BRAND.purple,
    accentText: '#FFFFFF',
    danger: '#DC2626',
    success: '#059669',
    warning: '#D97706',
    chipBg: '#F0ECFA',
    gradient: ['#6C4CE0', '#9B6DFF', '#B794FF'],
    heroGradient: ['#6C4CE0', '#8B5CF6', '#A78BFA'],
  };
}
