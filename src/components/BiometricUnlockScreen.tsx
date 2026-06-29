import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BRAND } from '../constants/brand';
import { getBiometricIcon, getBiometricLabel } from '../lib/biometric';
import { unlockSessionWithBiometric } from '../lib/auth';

type Props = {
  onUnlocked: () => void;
  onUsePassword: () => void;
};

/** Full-screen unlock with a visible Face ID / fingerprint button (iOS & Android). */
export function BiometricUnlockScreen({ onUnlocked, onUsePassword }: Props) {
  const [label, setLabel] = useState('Face ID');
  const [icon, setIcon] = useState<'scan-outline' | 'finger-print-outline'>('scan-outline');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const autoPrompted = useRef(false);

  useEffect(() => {
    (async () => {
      setLabel(await getBiometricLabel());
      setIcon(await getBiometricIcon());
    })();
  }, []);

  const tryUnlock = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      const ok = await unlockSessionWithBiometric();
      if (ok) {
        onUnlocked();
      } else {
        const currentLabel = await getBiometricLabel();
        setError(`${currentLabel} was cancelled. Tap the button to try again.`);
      }
    } catch {
      setError('Unlock failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [onUnlocked]);

  useEffect(() => {
    if (autoPrompted.current) return;
    autoPrompted.current = true;
    tryUnlock();
  }, [tryUnlock]);

  return (
    <LinearGradient colors={[...BRAND.gradientDark]} style={styles.container}>
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />

      <View style={styles.content}>
        <LinearGradient colors={[...BRAND.gradient]} style={styles.iconRing}>
          <Ionicons name={icon} size={48} color="#FFFFFF" />
        </LinearGradient>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.sub}>Unlock SkillSwap to continue</Text>

        <Pressable
          style={[styles.unlockBtn, busy && styles.unlockBtnBusy]}
          onPress={tryUnlock}
          disabled={busy}
        >
          <LinearGradient colors={[...BRAND.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.unlockGradient}>
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name={icon} size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.unlockText}>Unlock with {label}</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={onUsePassword} style={styles.passwordLink} disabled={busy}>
          <Text style={styles.passwordText}>Sign in with password instead</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgOrb1: {
    position: 'absolute',
    top: '15%',
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#6C4CE022',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: '20%',
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#9B6DFF18',
  },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: { color: '#FFF', fontSize: 26, fontWeight: '800', marginBottom: 8 },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 15, marginBottom: 36, textAlign: 'center' },
  unlockBtn: { width: '100%', maxWidth: 320, borderRadius: 16, overflow: 'hidden' },
  unlockBtnBusy: { opacity: 0.85 },
  unlockGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  unlockText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  error: { color: '#FCA5A5', fontSize: 13, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  passwordLink: { marginTop: 24, paddingVertical: 10 },
  passwordText: { color: BRAND.purpleLight, fontSize: 14, fontWeight: '700' },
});
