import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientHero } from '../../components/ui/GradientHero';
import { InputField } from '../../components/ui/InputField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { UserAvatar } from '../../components/ui/UserAvatar';
import {
  getBiometricLabel,
  getCurrentUser,
  isBiometricHardwareAvailable,
  isBiometricLoginEnabled,
  logout,
  refreshCurrentUser,
  updateStoredUser,
} from '../../lib/auth';
import { disableBiometricLogin, getBiometricIcon, setupBiometricLogin } from '../../lib/biometric';
import { formatSessionDisplay } from '../../lib/datetime';
import { useTheme } from '../../lib/theme';
import { ApiUser, avatarUrl, getSessions, SwapSession, uploadAvatar } from '../../services/api';

export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<ApiUser | null>(() => getCurrentUser());
  const [sessions, setSessions] = useState<SwapSession[]>([]);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biometrics');
  const [bioIcon, setBioIcon] = useState<'scan-outline' | 'finger-print-outline'>('scan-outline');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioSetupOpen, setBioSetupOpen] = useState(false);
  const [bioPassword, setBioPassword] = useState('');
  const [bioSaving, setBioSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const syncBioEnabled = useCallback(async () => {
    setBioEnabled(await isBiometricLoginEnabled());
  }, []);

  const load = useCallback(async () => {
    try {
      const [sessionRes, user] = await Promise.all([getSessions(), refreshCurrentUser()]);
      setSessions(sessionRes.sessions);
      if (user) setProfile(user);
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      (async () => {
        setBioAvailable(await isBiometricHardwareAvailable());
        await syncBioEnabled();
        setBioLabel(await getBiometricLabel());
        setBioIcon(await getBiometricIcon());
      })();
    }, [load, syncBioEnabled])
  );

  const uploadPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploadingPhoto(true);
    try {
      const user = await uploadAvatar(asset.uri);
      await updateStoredUser(user);
      setProfile(user);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not update your photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to set your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadPhoto(result.assets[0]);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a profile photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadPhoto(result.assets[0]);
  };

  const onChangePhoto = () => {
    Alert.alert('Profile photo', 'Choose how to update your picture.', [
      { text: 'Choose from gallery', onPress: pickFromLibrary },
      { text: 'Take a photo', onPress: takePhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onToggleBiometric = (next: boolean) => {
    if (next) {
      setBioSetupOpen(true);
      setBioPassword('');
      void syncBioEnabled();
      return;
    }

    Alert.alert(`Disable ${bioLabel}?`, 'You will need your email and password to sign in next time.', [
      { text: 'Cancel', onPress: () => void syncBioEnabled() },
      {
        text: 'Disable',
        style: 'destructive',
        onPress: async () => {
          await disableBiometricLogin();
          setBioSetupOpen(false);
          setBioPassword('');
          await syncBioEnabled();
        },
      },
    ]);
  };

  const onConfirmBioSetup = async () => {
    if (!bioPassword.trim()) {
      Alert.alert('Password required', 'Enter your password to enable quick unlock.');
      return;
    }
    setBioSaving(true);
    try {
      const ok = await setupBiometricLogin(profile?.email ?? '', bioPassword);
      if (ok) {
        setBioSetupOpen(false);
        setBioPassword('');
        await syncBioEnabled();
      } else {
        await syncBioEnabled();
      }
    } catch (e) {
      Alert.alert('Could not enable', e instanceof Error ? e.message : 'Please try again.');
      await syncBioEnabled();
    } finally {
      setBioSaving(false);
    }
  };

  const onCancelBioSetup = async () => {
    setBioSetupOpen(false);
    setBioPassword('');
    await syncBioEnabled();
  };

  const onLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const Row = ({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) => (
    <Pressable style={[styles.row, { borderBottomColor: theme.border }]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={theme.textSub} />
      <Text style={[styles.rowText, { color: theme.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.textSub} />
    </Pressable>
  );

  const photoUri = avatarUrl(profile?.avatar);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['left', 'right', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <GradientHero padBottom={32}>
          <View style={styles.heroProfile}>
            <Pressable onPress={onChangePhoto} disabled={uploadingPhoto} style={styles.avatarWrap}>
              <UserAvatar name={profile?.name ?? '?'} uri={photoUri} size={88} />
              <View style={[styles.cameraBadge, { backgroundColor: theme.accent }]}>
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="camera" size={14} color="#FFF" />
                )}
              </View>
            </Pressable>
            <Text style={styles.heroName}>{profile?.name ?? 'Guest'}</Text>
            <Text style={styles.heroEmail}>{profile?.email ?? ''}</Text>
            {profile?.location ? <Text style={styles.heroLoc}>📍 {profile.location}</Text> : null}
            <Pressable onPress={onChangePhoto} disabled={uploadingPhoto} style={styles.changePhotoBtn}>
              <Text style={styles.changePhotoText}>{photoUri ? 'Change photo' : 'Add profile photo'}</Text>
            </Pressable>
          </View>
        </GradientHero>

        <View style={styles.body}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Upcoming sessions</Text>
          <Pressable onPress={() => router.push('/schedule-reminders')} style={{ marginBottom: 10 }}>
            <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 13 }}>View all reminders →</Text>
          </Pressable>
          {sessions.length === 0 ? (
            <Text style={[styles.muted, { color: theme.textSub }]}>No sessions scheduled yet.</Text>
          ) : (
            sessions.map((s) => (
              <View key={s.id} style={[styles.session, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="calendar" size={18} color={theme.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sessionTitle, { color: theme.text }]}>
                    {s.skill_name || 'Skill swap'} with {s.partner_name}
                  </Text>
                  <Text style={[styles.sessionMeta, { color: theme.textSub }]}>
                    {formatSessionDisplay(s.scheduled_at)} · {s.status}
                    {s.reminder_label ? ` · ${s.reminder_label}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}

          <View style={[styles.menu, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Row icon="ribbon-outline" label="My skills" onPress={() => router.push('/skills')} />
            <Row icon="sparkles-outline" label="Discover matches" onPress={() => router.push('/(tabs)/discover')} />
            <Row icon="chatbox-ellipses-outline" label="AI Assistant" onPress={() => router.push('/(tabs)/assistant')} />
          </View>

          {bioAvailable ? (
            <View style={[styles.bioCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.bioRow}>
                <Ionicons name={bioIcon} size={20} color={theme.textSub} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowText, { color: theme.text }]}>{bioLabel} sign-in</Text>
                  <Text style={[styles.bioHint, { color: theme.textSub }]}>Unlock without typing your password</Text>
                </View>
                <Switch value={bioEnabled} onValueChange={onToggleBiometric} trackColor={{ true: theme.accent }} />
              </View>

              {bioSetupOpen && !bioEnabled ? (
                <View style={[styles.bioSetup, { borderTopColor: theme.border }]}>
                  <Text style={[styles.bioSetupHint, { color: theme.textSub }]}>
                    Enter your password once, then confirm with {bioLabel.toLowerCase()}.
                  </Text>
                  <InputField
                    label="Password"
                    placeholder="Your account password"
                    secureTextEntry
                    value={bioPassword}
                    onChangeText={setBioPassword}
                  />
                  <View style={styles.bioSetupActions}>
                    <PrimaryButton
                      label={`Enable ${bioLabel}`}
                      icon={bioIcon}
                      onPress={onConfirmBioSetup}
                      loading={bioSaving}
                      style={{ flex: 1 }}
                    />
                    <PrimaryButton label="Cancel" variant="ghost" onPress={onCancelBioSetup} disabled={bioSaving} />
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          <Pressable style={[styles.logout, { borderColor: theme.danger }]} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={18} color={theme.danger} />
            <Text style={[styles.logoutText, { color: theme.danger }]}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroProfile: { alignItems: 'center' },
  avatarWrap: { marginBottom: 14 },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#141022',
  },
  heroName: { color: '#FFF', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  heroEmail: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4, textAlign: 'center' },
  heroLoc: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 6, textAlign: 'center' },
  changePhotoBtn: { marginTop: 12, paddingVertical: 6, paddingHorizontal: 12 },
  changePhotoText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700' },
  body: { padding: 20, marginTop: -8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  muted: { fontSize: 13 },
  session: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  sessionTitle: { fontSize: 14, fontWeight: '700' },
  sessionMeta: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  menu: { borderRadius: 16, borderWidth: 1, marginTop: 20, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderBottomWidth: 1 },
  rowText: { fontSize: 15, fontWeight: '600', flex: 1 },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bioCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    overflow: 'hidden',
  },
  bioSetup: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  bioSetupHint: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  bioSetupActions: { gap: 4, marginTop: 4 },
  bioHint: { fontSize: 12, marginTop: 2 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, marginTop: 24 },
  logoutText: { fontSize: 15, fontWeight: '700' },
});
