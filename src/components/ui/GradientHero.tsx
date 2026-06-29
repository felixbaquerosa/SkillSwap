import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';

type Props = {
  children?: ReactNode;
  /** Extra padding below safe area. */
  padBottom?: number;
  style?: ViewStyle;
};

/** Purple gradient hero band used at the top of main screens. */
export function GradientHero({ children, padBottom = 24, style }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[...theme.heroGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + 16, paddingBottom: padBottom }, style]}
    >
      <View style={styles.decor1} />
      <View style={styles.decor2} />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, overflow: 'hidden' },
  decor1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decor2: {
    position: 'absolute',
    bottom: -20,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(155,109,255,0.12)',
  },
});
