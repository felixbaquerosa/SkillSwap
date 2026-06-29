import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BRAND } from '../../constants/brand';

type Size = 'sm' | 'md' | 'lg' | 'hero';

const SIZES: Record<Size, { icon: number; box: number; skill: number; swap: number; gap: number }> = {
  sm: { icon: 18, box: 36, skill: 16, swap: 16, gap: 6 },
  md: { icon: 24, box: 48, skill: 20, swap: 20, gap: 8 },
  lg: { icon: 30, box: 60, skill: 26, swap: 26, gap: 10 },
  hero: { icon: 36, box: 72, skill: 32, swap: 32, gap: 12 },
};

type Props = {
  size?: Size;
  /** Show tagline under the wordmark (hero screens). */
  tagline?: string;
  style?: ViewStyle;
  light?: boolean;
};

/**
 * Crisp vector-style brand mark — scales perfectly on any screen.
 * Replaces the PNG banner on light backgrounds for a business-ready look.
 */
export function BrandMark({ size = 'md', tagline, style, light = false }: Props) {
  const s = SIZES[size];
  const textColor = light ? BRAND.white : BRAND.text;
  const subColor = light ? 'rgba(255,255,255,0.75)' : BRAND.muted;

  return (
    <View style={[styles.wrap, style]} accessibilityLabel="SkillSwap">
      <View style={[styles.row, { gap: s.gap }]}>
        <Text style={[styles.word, { fontSize: s.skill, color: textColor }]}>Skill</Text>
        <LinearGradient
          colors={[...BRAND.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.iconBox, { width: s.box, height: s.box, borderRadius: s.box * 0.28 }]}
        >
          <Ionicons name="swap-horizontal" size={s.icon} color={BRAND.white} />
        </LinearGradient>
        <Text style={[styles.word, { fontSize: s.swap, color: textColor }]}>Swap</Text>
      </View>
      {tagline ? (
        <Text style={[styles.tagline, { color: subColor, fontSize: size === 'hero' ? 15 : 13 }]}>{tagline}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { fontWeight: '800', letterSpacing: -0.5 },
  iconBox: { alignItems: 'center', justifyContent: 'center' },
  tagline: { marginTop: 10, textAlign: 'center', lineHeight: 20, fontWeight: '500', maxWidth: 280 },
});
