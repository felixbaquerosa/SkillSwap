import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSessionReminders, SwapSession } from '../services/api';
import { formatSessionDisplay } from '../lib/datetime';
import { useTheme } from '../lib/theme';

export default function ScheduleRemindersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [reminders, setReminders] = useState<SwapSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await getSessionReminders();
      setReminders(res.reminders);
    } catch {
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const badgeColor = (label?: string) => {
    if (label === 'Starting soon' || label === 'Today') return '#EF4444';
    if (label === 'Tomorrow') return '#F59E0B';
    return theme.accent;
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Schedule Reminders</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.accent} /></View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="notifications-off-outline" size={32} color={theme.textSub} />
              <Text style={[styles.emptyText, { color: theme.textSub }]}>
                No upcoming appointments. Schedule a session from an accepted swap chat.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => router.push(`/match/${item.match_id}`)}
            >
              <View style={[styles.badge, { backgroundColor: badgeColor(item.reminder_label) + '22' }]}>
                <Ionicons name="alarm-outline" size={16} color={badgeColor(item.reminder_label)} />
                <Text style={[styles.badgeText, { color: badgeColor(item.reminder_label) }]}>
                  {item.reminder_label ?? 'Upcoming'}
                </Text>
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                {item.skill_name || 'Skill swap'} with {item.partner_name}
              </Text>
              <Text style={[styles.meta, { color: theme.textSub }]}>{formatSessionDisplay(item.scheduled_at)}</Text>
              {item.notes ? <Text style={[styles.notes, { color: theme.textSub }]}>{item.notes}</Text> : null}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 44 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 6 },
  notes: { fontSize: 12, marginTop: 8, lineHeight: 18 },
  empty: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
