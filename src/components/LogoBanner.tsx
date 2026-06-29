import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, ViewStyle } from 'react-native';
import { BRAND } from '../constants/brand';
import { BrandMark } from './ui/BrandMark';

type Props = { style?: ViewStyle };

/** Premium logo card for auth screens. */
export function LogoBanner({ style }: Props) {
  return (
    <LinearGradient colors={[...BRAND.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.banner, style]}>
      <BrandMark size="lg" light tagline="Peer-to-peer skill exchange platform" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
});
