import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageStatusLabel } from '../../components/MessageStatusLabel';
import {
  archiveMatch,
  deleteMatch,
  getMatches,
  MatchSummary,
  respondMatch,
  unarchiveMatch,
} from '../../services/api';
import { useTheme } from '../../lib/theme';

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  accepted: '#10B981',
  declined: '#EF4444',
};

export default function MessagesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await getMatches(showArchived);
      setMatches(res.matches);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load swaps.');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    setLoading(true);
    load();
  }, [showArchived, load]);

  const respond = async (m: MatchSummary, action: 'accept' | 'decline') => {
    try {
      await respondMatch(m.id, action);
      load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const unarchive = async (item: MatchSummary) => {
    try {
      await unarchiveMatch(item.id);
      load();
      Alert.alert('Restored', `${item.partner_name} is back in your Messages inbox.`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const onLongPress = (item: MatchSummary) => {
    Alert.alert(item.partner_name, 'Manage this conversation', [
      showArchived
        ? {
            text: 'Unarchive',
            onPress: async () => {
              try {
                await unarchiveMatch(item.id);
                load();
              } catch (e) {
                Alert.alert('Error', e instanceof Error ? e.message : 'Try again.');
              }
            },
          }
        : {
            text: 'Archive',
            onPress: async () => {
              try {
                await archiveMatch(item.id);
                load();
              } catch (e) {
                Alert.alert('Error', e instanceof Error ? e.message : 'Try again.');
              }
            },
          },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete conversation?', 'This removes the chat from your list only.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteMatch(item.id);
                  load();
                } catch (e) {
                  Alert.alert('Error', e instanceof Error ? e.message : 'Try again.');
                }
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const previewText = (item: MatchSummary) => {
    if (item.last_message) {
      const prefix = item.last_message_mine ? 'You: ' : '';
      return prefix + item.last_message;
    }
    return item.is_requester ? 'You requested this swap' : 'Wants to swap with you';
  };

  const renderItem = ({ item }: { item: MatchSummary }) => {
    const incoming = !item.is_requester && item.status === 'pending';
    return (
      <Pressable
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => router.push(`/match/${item.id}`)}
        onLongPress={() => onLongPress(item)}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarText}>{item.partner_name.charAt(0).toUpperCase()}</Text>
          </View>
          {item.partner_online ? <View style={styles.onlineDot} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowBetween}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {item.partner_name}
            </Text>
            <View style={styles.metaRight}>
              {(item.unread_count ?? 0) > 0 ? (
                <View style={[styles.unreadBadge, { backgroundColor: theme.accent }]}>
                  <Text style={styles.unreadText}>{item.unread_count}</Text>
                </View>
              ) : null}
              <View style={[styles.statusChip, { backgroundColor: (STATUS_COLOR[item.status] ?? '#999') + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] ?? '#999' }]}>{item.status}</Text>
              </View>
            </View>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.sub, { color: theme.textSub, flex: 1 }]} numberOfLines={1}>
              {previewText(item)}
            </Text>
            {item.last_message_mine && item.last_message_status ? (
              <MessageStatusLabel status={item.last_message_status} subColor={theme.textSub} />
            ) : null}
          </View>

          {incoming ? (
            <View style={styles.actions}>
              <Pressable style={[styles.actBtn, { backgroundColor: '#10B981' }]} onPress={() => respond(item, 'accept')}>
                <Text style={styles.actText}>Accept</Text>
              </Pressable>
              <Pressable style={[styles.actBtn, { backgroundColor: theme.chipBg }]} onPress={() => respond(item, 'decline')}>
                <Text style={[styles.actText, { color: theme.textSub }]}>Decline</Text>
              </Pressable>
            </View>
          ) : null}

          {showArchived ? (
            <Pressable
              style={[styles.unarchiveBtn, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}
              onPress={() => unarchive(item)}
            >
              <Ionicons name="arrow-undo-outline" size={16} color={theme.accent} />
              <Text style={[styles.unarchiveText, { color: theme.accent }]}>Unarchive</Text>
            </Pressable>
          ) : null}
        </View>
        {!showArchived ? <Ionicons name="chevron-forward" size={18} color={theme.textSub} /> : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {showArchived ? 'Archived' : 'Messages'}
          </Text>
          <Pressable
            onPress={() => setShowArchived((v) => !v)}
            style={[styles.archiveToggle, { backgroundColor: theme.chipBg, borderColor: theme.border }]}
          >
            <Ionicons name={showArchived ? 'chatbubbles' : 'archive-outline'} size={16} color={theme.accent} />
            <Text style={[styles.archiveToggleText, { color: theme.text }]} numberOfLines={1}>
              {showArchived ? 'Messages' : 'Archived'}
            </Text>
          </Pressable>
        </View>
        {showArchived ? (
          <Text style={[styles.headerSub, { color: theme.textSub }]}>
            Tap Unarchive on a chat to restore it to Messages.
          </Text>
        ) : null}
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.accent} /></View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 28 }}
          ListEmptyComponent={
            <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name={error ? 'cloud-offline-outline' : 'chatbubbles-outline'} size={32} color={theme.textSub} />
              <Text style={[styles.emptyText, { color: theme.textSub }]}>
                {error ||
                  (showArchived
                    ? 'No archived conversations.'
                    : 'No swaps yet. Request a swap in Discover, then open the chat here or from Discover.')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 6,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { fontSize: 26, fontWeight: '800', flex: 1 },
  headerSub: { fontSize: 12, lineHeight: 17 },
  archiveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  archiveToggleText: { fontSize: 13, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#141022',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  sub: { fontSize: 13 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10 },
  actText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  unarchiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  unarchiveText: { fontSize: 13, fontWeight: '700' },
  empty: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
