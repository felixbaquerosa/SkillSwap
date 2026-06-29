import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND } from '../constants/brand';
import { LoadingDots } from './LoadingDots';

type Props = {
  message?: string;
  showMessage?: boolean;
};

function SplashLogo() {
  const scale = useRef(new Animated.Value(0.92)).current;
  const glow = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.92, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.6, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [scale, glow]);

  return (
    <Animated.View style={[styles.logoWrap, { transform: [{ scale }] }]}>
      <Animated.View style={[styles.glowOrb, { opacity: glow }]} />
      <LinearGradient colors={[...BRAND.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBox}>
        <Ionicons name="swap-horizontal" size={44} color="#FFFFFF" />
      </LinearGradient>
      <View style={styles.wordRow}>
        <Text style={styles.skill}>Skill</Text>
        <Text style={styles.swap}>Swap</Text>
      </View>
      <Text style={styles.tagline}>Peer-to-peer skill exchange</Text>
    </Animated.View>
  );
}

export function LoadingSplash({ message = 'Loading', showMessage = true }: Props) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fade]);

  return (
    <LinearGradient colors={[...BRAND.gradientDark]} style={styles.container}>
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      <Animated.View style={{ opacity: fade, alignItems: 'center' }}>
        <SplashLogo />

        <View style={styles.loader}>
          <LoadingDots color={BRAND.purpleLight} size={11} gap={10} />
          {showMessage ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  bgOrb1: {
    position: 'absolute',
    top: '18%',
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#6C4CE022',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: '22%',
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#9B6DFF18',
  },
  logoWrap: { alignItems: 'center' },
  glowOrb: {
    position: 'absolute',
    top: 8,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: BRAND.purpleGlow,
  },
  iconBox: {
    width: 108,
    height: 108,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9B6DFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  wordRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, gap: 6 },
  skill: { fontSize: 34, fontWeight: '800', color: BRAND.white, letterSpacing: -0.8 },
  swap: { fontSize: 34, fontWeight: '800', color: BRAND.purpleLight, letterSpacing: -0.8 },
  tagline: { marginTop: 8, fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.65)' },
  loader: { marginTop: 36, alignItems: 'center', gap: 14 },
  message: { fontSize: 13, fontWeight: '600', color: 'rgba(196,181,253,0.85)', letterSpacing: 0.3 },
});
