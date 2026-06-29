import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardSafeScroll } from '../../components/KeyboardSafeScroll';
import { LoadingSplash } from '../../components/LoadingSplash';
import { LogoBanner } from '../../components/LogoBanner';
import { AppCard } from '../../components/ui/AppCard';
import { InputField } from '../../components/ui/InputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { RADIUS } from '../../constants/brand';
import {
  formatBirthdateApi,
  formatBirthdateDisplay,
  isAtLeastMinAge,
  maxBirthdateForMinAge,
} from '../../lib/age';
import { register } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const maxBirthdate = maxBirthdateForMinAge();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [birthdate, setBirthdate] = useState(maxBirthdate);
  const [showBirthdatePicker, setShowBirthdatePicker] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onBirthdateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowBirthdatePicker(false);
    }
    if (selected) {
      setBirthdate(selected);
    }
  };

  const onSubmit = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (!isAtLeastMinAge(birthdate)) {
      setError('You must be at least 18 years old to join SkillSwap.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, formatBirthdateApi(birthdate), location.trim() || undefined);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <LoadingSplash message="Creating account…" />
        </View>
      ) : null}
      <KeyboardSafeScroll style={styles.scroll} contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>

        <LogoBanner style={{ marginBottom: 20 }} />

        <AppCard padding={22}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Join SkillSwap</Text>
          <Text style={[styles.formSub, { color: theme.textSub }]}>Start trading skills with your community.</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <InputField label="Full name" placeholder="Felix Baquerosa" value={name} onChangeText={setName} />
          <InputField
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: theme.textSub }]}>Date of birth</Text>
            <Pressable
              onPress={() => setShowBirthdatePicker(true)}
              style={[
                styles.dateField,
                {
                  backgroundColor: theme.isDark ? theme.bgAlt : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.dateText, { color: theme.text }]}>{formatBirthdateDisplay(birthdate)}</Text>
              <Ionicons name="calendar-outline" size={20} color={theme.textSub} />
            </Pressable>
          </View>

          {showBirthdatePicker ? (
            <DateTimePicker
              value={birthdate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={maxBirthdate}
              minimumDate={new Date(1920, 0, 1)}
              onChange={onBirthdateChange}
            />
          ) : null}

          {Platform.OS === 'ios' && showBirthdatePicker ? (
            <PrimaryButton label="Done" variant="ghost" onPress={() => setShowBirthdatePicker(false)} />
          ) : null}

          <InputField label="Location" placeholder="Cebu City" value={location} onChangeText={setLocation} />
          <InputField
            label="Password"
            placeholder="At least 8 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <PrimaryButton label="Create account" icon="person-add-outline" onPress={onSubmit} loading={loading} style={{ marginTop: 20 }} />
          <PrimaryButton label="Already have an account? Sign in" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
        </AppCard>
      </KeyboardSafeScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  content: { padding: 20, paddingBottom: 40 },
  back: { width: 44, height: 44, justifyContent: 'center', marginBottom: 4 },
  formTitle: { fontSize: 22, fontWeight: '800' },
  formSub: { fontSize: 14, marginTop: 6, marginBottom: 20, lineHeight: 20 },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: '#B91C1C', fontSize: 13 },
  fieldWrap: { marginBottom: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  dateField: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: { fontSize: 15 },
});
