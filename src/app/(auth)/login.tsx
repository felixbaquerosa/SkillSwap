import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardSafeScroll } from '../../components/KeyboardSafeScroll';
import { HumanVerification } from '../../components/HumanVerification';
import { LoadingSplash } from '../../components/LoadingSplash';
import { LogoBanner } from '../../components/LogoBanner';
import { AppCard } from '../../components/ui/AppCard';
import { InputField } from '../../components/ui/InputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { login } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const onSubmit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (!verified) {
      setError('Please complete the "Verify you are human" check.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <LoadingSplash message="Signing in…" />
        </View>
      ) : null}
      <KeyboardSafeScroll contentContainerStyle={styles.content}>
        <LogoBanner style={{ marginBottom: 24 }} />

        <AppCard padding={22}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Welcome back</Text>
          <Text style={[styles.formSub, { color: theme.textSub }]}>
            Sign in to discover skill partners and schedule swaps.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <InputField label="Email" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <InputField label="Password" placeholder="Your password" secureTextEntry value={password} onChangeText={setPassword} />

          <HumanVerification onVerifiedChange={setVerified} />

          <PrimaryButton label="Sign in" icon="log-in-outline" onPress={onSubmit} loading={loading} style={{ marginTop: 20 }} />

          <PrimaryButton label="Create an account" variant="ghost" onPress={() => router.push('/(auth)/register')} style={{ marginTop: 8 }} />
        </AppCard>
      </KeyboardSafeScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  formTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  formSub: { fontSize: 14, marginTop: 6, marginBottom: 20, lineHeight: 20 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: '#B91C1C', fontSize: 13 },
});
