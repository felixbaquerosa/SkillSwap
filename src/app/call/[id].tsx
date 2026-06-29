import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { getCurrentUser } from '../../lib/auth';
import { buildCallHtml, CallMode, callModeLabel } from '../../lib/calls';
import { useTheme } from '../../lib/theme';

export default function CallScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; mode?: string; name?: string }>();
  const matchId = Number(params.id);
  const mode: CallMode = params.mode === 'video' ? 'video' : 'voice';
  const partnerName = typeof params.name === 'string' ? params.name : 'Partner';
  const displayName = getCurrentUser()?.name ?? 'SkillSwap User';

  const callHtml = useMemo(() => buildCallHtml(matchId, mode, displayName), [matchId, mode, displayName]);

  const grantWebPermissions = (request: { grant: (resources: string[]) => void; resources: string[] }) => {
    request.grant(request.resources);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.topBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>{callModeLabel(mode)}</Text>
          <Text style={[styles.sub, { color: theme.textSub }]} numberOfLines={1}>
            with {partnerName}
          </Text>
        </View>
        <Ionicons name={mode === 'voice' ? 'call' : 'videocam'} size={22} color={theme.accent} />
      </View>

      <Text style={[styles.hint, { color: theme.textSub }]}>
        Call runs inside SkillSwap — allow camera and microphone when prompted.
      </Text>

      <WebView
        source={{ html: callHtml, baseUrl: 'https://meet.jit.si' }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        originWhitelist={['https://*', 'about:*']}
        mediaCapturePermissionGrantType="grant"
        onPermissionRequest={grantWebPermissions}
        onShouldStartLoadWithRequest={(req) => {
          const url = req.url;
          return url.startsWith('about:') || url.includes('meet.jit.si') || url.startsWith('data:');
        }}
        onMessage={(event) => {
          if (event.nativeEvent.data === 'hangup') router.back();
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSub }]}>Starting call…</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 2 },
  hint: { fontSize: 11, textAlign: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  webview: { flex: 1, backgroundColor: '#141022' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#141022' },
  loadingText: { fontSize: 13 },
});
