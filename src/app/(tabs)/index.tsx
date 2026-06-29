import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppCard, SectionHeader } from '../../components/ui/AppCard';
import { GradientHero } from '../../components/ui/GradientHero';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { StatTile, UserAvatar } from '../../components/ui/UserAvatar';
import { UserRatingBadge } from '../../components/UserRatingBadge';
import { Candidate, DashboardPayload, getDashboard, getSessionReminders, SwapSession } from '../../services/api';
import { formatSessionDisplay } from '../../lib/datetime';
import { useTheme } from '../../lib/theme';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [reminders, setReminders] = useState<SwapSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [dash, reminderRes] = await Promise.all([getDashboard(), getSessionReminders().catch(() => ({ reminders: [] }))]);
      setData(dash);
      setReminders(reminderRes.reminders.slice(0, 3));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const stats = data?.stats;
  const firstName = (data?.user?.name ?? 'there').split(' ')[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['left', 'right', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.accent} />}
      >
        <GradientHero padBottom={28}>
          <Text style={styles.heroHi}>Welcome back,</Text>
          <Text style={styles.heroName}>{firstName}</Text>
          <Text style={styles.heroSub}>Your skill-swap dashboard · live stats</Text>
        </GradientHero>

        <View style={styles.body}>
          {error ? <Text style={{ color: theme.danger, marginBottom: 12 }}>{error}</Text> : null}

          <View style={styles.statsGrid}>
            <StatTile icon="ribbon-outline" label="Skills offered" value={stats?.skills_offered ?? 0} color={theme.success} />
            <StatTile icon="bulb-outline" label="Want to learn" value={stats?.skills_wanted ?? 0} color={theme.warning} />
            <StatTile icon="time-outline" label="Pending swaps" value={stats?.pending_matches ?? 0} color={theme.accent} />
            <StatTile icon="swap-horizontal" label="Active swaps" value={stats?.active_swaps ?? 0} color={theme.info} />
          </View>

          <PrimaryButton label="Manage my skills" icon="add-circle-outline" variant="outline" onPress={() => router.push('/skills')} style={{ marginTop: 8 }} />
          <PrimaryButton label="View schedule reminders" icon="alarm-outline" variant="outline" onPress={() => router.push('/schedule-reminders')} style={{ marginTop: 8 }} />

          {reminders.length > 0 ? (
            <>
              <SectionHeader title="Appointment reminders" style={{ marginTop: 24 }} />
              {reminders.map((r) => (
                <Pressable key={r.id} onPress={() => router.push('/schedule-reminders')}>
                  <AppCard style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="alarm-outline" size={20} color={theme.warning} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reminderTitle, { color: theme.text }]} numberOfLines={1}>
                          {r.reminder_label} · {r.partner_name}
                        </Text>
                        <Text style={[styles.reminderMeta, { color: theme.textSub }]}>{formatSessionDisplay(r.scheduled_at)}</Text>
                      </View>
                    </View>
                  </AppCard>
                </Pressable>
              ))}
            </>
          ) : null}

          <SectionHeader
            title="Top matches"
            action={
              <Pressable onPress={() => router.push('/(tabs)/discover')}>
                <Text style={[styles.seeAll, { color: theme.accent }]}>See all →</Text>
              </Pressable>
            }
            style={{ marginTop: 24 }}
          />

          {(data?.suggestions ?? []).length === 0 ? (
            <AppCard padding={24} elevated={false}>
              <View style={styles.emptyInner}>
                <Ionicons name="sparkles-outline" size={32} color={theme.accent} />
                <Text style={[styles.emptyText, { color: theme.textSub }]}>
                  Add skills you can teach and want to learn — AI will find your best swap partners.
                </Text>
              </View>
            </AppCard>
          ) : (
            (data?.suggestions ?? []).map((s) => <MatchPreview key={s.user_id} item={s} theme={theme} router={router} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MatchPreview({ item, theme, router }: { item: Candidate; theme: ReturnType<typeof useTheme>; router: ReturnType<typeof useRouter> }) {
  return (
    <Pressable onPress={() => router.push('/(tabs)/discover')}>
      <AppCard style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <UserAvatar name={item.name} size={50} />
          <View style={{ flex: 1 }}>
          <View style={styles.rowBetween}>
            <Text style={[styles.matchName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            {item.mutual ? (
              <View style={styles.mutualBadge}>
                <Text style={styles.mutualText}>Mutual</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.matchReason, { color: theme.textSub }]} numberOfLines={2}>{item.reason}</Text>
        </View>
        <View style={[styles.scorePill, { backgroundColor: theme.chipBg }]}>
          <UserRatingBadge
            ratingAvg={item.rating_avg ?? 0}
            ratingCount={item.rating_count ?? 0}
            backgroundColor="transparent"
            textColor="#FBBF24"
            subColor={theme.textSub}
          />
        </View>
        </View>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroHi: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500' },
  heroName: { color: '#FFF', fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 6 },
  body: { padding: 20, marginTop: -12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  seeAll: { fontSize: 14, fontWeight: '700' },
  emptyInner: { alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchName: { fontSize: 16, fontWeight: '700', flex: 1 },
  matchReason: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  mutualBadge: { backgroundColor: '#34D39922', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  mutualText: { color: '#34D399', fontSize: 11, fontWeight: '700' },
  scorePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  scoreText: { fontSize: 13, fontWeight: '800' },
  reminderTitle: { fontSize: 14, fontWeight: '700' },
  reminderMeta: { fontSize: 12, marginTop: 2 },
});
