import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppCard } from '../../components/ui/AppCard';
import { GradientHero } from '../../components/ui/GradientHero';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { UserRatingBadge } from '../../components/UserRatingBadge';
import { Candidate, createMatch, getDiscover, getMatches } from '../../services/api';
import { useTheme } from '../../lib/theme';

export default function DiscoverScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<Candidate[]>([]);
  const [aiMode, setAiMode] = useState('fallback');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requesting, setRequesting] = useState<number | null>(null);
  /** partner user id → match id for swaps you can still chat in */
  const [chatByPartner, setChatByPartner] = useState<Record<number, number>>({});
  const [canSwap, setCanSwap] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const [discoverRes, matchesRes] = await Promise.all([getDiscover(), getMatches()]);
      setItems(discoverRes.matches);
      setAiMode(discoverRes.ai);
      setCanSwap(discoverRes.can_swap);

      const chats: Record<number, number> = {};
      for (const m of matchesRes.matches) {
        if (m.status !== 'declined') {
          chats[m.partner_id] = m.id;
        }
      }
      setChatByPartner(chats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load matches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openChat = (matchId: number) => {
    router.push(`/match/${matchId}`);
  };

  const promptAddSkills = () => {
    Alert.alert(
      'Add skills first',
      'You need at least one skill before you can request a swap. Add what you can teach or want to learn in My Skills.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'My Skills', onPress: () => router.push('/skills') },
      ]
    );
  };

  const onRequest = async (item: Candidate) => {
    if (!canSwap) {
      promptAddSkills();
      return;
    }
    const existingMatchId = chatByPartner[item.user_id];
    if (existingMatchId) {
      openChat(existingMatchId);
      return;
    }

    setRequesting(item.user_id);
    try {
      const res = await createMatch(item.user_id, item.score, item.reason);
      if (res.match) {
        setChatByPartner((prev) => ({ ...prev, [item.user_id]: res.match!.id }));
        Alert.alert('Swap requested', `Your swap request was sent to ${item.name}.`, [
          { text: 'Later', style: 'cancel' },
          { text: 'Open chat', onPress: () => openChat(res.match!.id) },
        ]);
      } else {
        Alert.alert('Swap requested', `Your swap request was sent to ${item.name}.`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Try again.';
      if (message.toLowerCase().includes('already have a swap')) {
        try {
          const matchesRes = await getMatches();
          const existing = matchesRes.matches.find((m) => m.partner_id === item.user_id && m.status !== 'declined');
          if (existing) {
            setChatByPartner((prev) => ({ ...prev, [item.user_id]: existing.id }));
            Alert.alert('Swap already sent', `You already have a swap with ${item.name}.`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open chat', onPress: () => openChat(existing.id) },
            ]);
            return;
          }
        } catch {
          // fall through to generic error
        }
      }
      Alert.alert('Could not send', message);
    } finally {
      setRequesting(null);
    }
  };

  const Chip = ({ label, tone }: { label: string; tone: 'offer' | 'want' }) => (
    <View style={[styles.chip, { backgroundColor: tone === 'offer' ? '#10B98122' : '#F59E0B22' }]}>
      <Text style={[styles.chipText, { color: tone === 'offer' ? '#10B981' : '#B45309' }]}>{label}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: Candidate }) => {
    const matchId = chatByPartner[item.user_id];
    const hasChat = matchId != null;

    return (
    <AppCard style={{ marginBottom: 14 }}>
      <View style={styles.cardHeader}>
        <UserAvatar name={item.name} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
          {item.location ? <Text style={[styles.location, { color: theme.textSub }]}>{item.location}</Text> : null}
        </View>
        <UserRatingBadge
          ratingAvg={item.rating_avg ?? 0}
          ratingCount={item.rating_count ?? 0}
          backgroundColor={theme.chipBg}
          textColor="#FBBF24"
          subColor={theme.textSub}
        />
      </View>

      <View style={[styles.reasonBox, { backgroundColor: theme.chipBg }]}>
        <Ionicons name="sparkles" size={13} color={theme.accent} />
        <Text style={[styles.reasonText, { color: theme.textSub }]}>{item.reason}</Text>
      </View>

      {item.they_offer.length > 0 ? (
        <View style={styles.skillRow}>
          <Text style={[styles.skillLabel, { color: theme.textSub }]}>Can teach you:</Text>
          <View style={styles.chips}>{item.they_offer.map((s) => <Chip key={s} label={s} tone="offer" />)}</View>
        </View>
      ) : null}
      {item.they_want.length > 0 ? (
        <View style={styles.skillRow}>
          <Text style={[styles.skillLabel, { color: theme.textSub }]}>Wants from you:</Text>
          <View style={styles.chips}>{item.they_want.map((s) => <Chip key={s} label={s} tone="want" />)}</View>
        </View>
      ) : null}

      {hasChat ? (
        <PrimaryButton
          label="Open chat"
          icon="chatbubble-outline"
          onPress={() => openChat(matchId)}
          style={{ marginTop: 16 }}
        />
      ) : (
        <PrimaryButton
          label={canSwap ? 'Request swap' : 'Add skills to swap'}
          icon={canSwap ? 'swap-horizontal' : 'add-circle-outline'}
          onPress={() => (canSwap ? onRequest(item) : promptAddSkills())}
          disabled={requesting === item.user_id}
          loading={requesting === item.user_id}
          variant={canSwap ? 'primary' : 'outline'}
          style={{ marginTop: 16 }}
        />
      )}
    </AppCard>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['left', 'right', 'bottom']}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.accent} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.user_id)}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              <GradientHero padBottom={20}>
                <Text style={styles.heroTitle}>Discover</Text>
                <Text style={styles.heroSub}>
                  {aiMode === 'gemini' ? '✦ AI-ranked swap partners' : 'Smart matching · add Gemini for AI ranking'}
                </Text>
              </GradientHero>
              {!canSwap ? (
                <Pressable
                  style={[styles.skillsBanner, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => router.push('/skills')}
                >
                  <Ionicons name="information-circle" size={22} color={theme.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.skillsBannerTitle, { color: theme.text }]}>Add skills to start swapping</Text>
                    <Text style={[styles.skillsBannerSub, { color: theme.textSub }]}>
                      Add at least one skill you can teach or want to learn, then come back to request a swap.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSub} />
                </Pressable>
              ) : null}
            </>
          }
          contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 28 }}
          ListEmptyComponent={
            <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name={error ? 'cloud-offline-outline' : 'people-outline'} size={32} color={theme.textSub} />
              <Text style={[styles.emptyText, { color: theme.textSub }]}>
                {error || 'No matches yet. Add skills you can teach and want to learn, then check back.'}
              </Text>
              {error ? (
                <Pressable style={[styles.retry, { backgroundColor: theme.accent }]} onPress={load}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  heroTitle: { color: '#FFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 16, fontWeight: '700' },
  location: { fontSize: 12, marginTop: 2 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  scoreText: { fontSize: 13, fontWeight: '800' },
  reasonBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: 12, padding: 10, marginTop: 12 },
  reasonText: { fontSize: 13, flex: 1, lineHeight: 18 },
  skillRow: { marginTop: 12 },
  skillLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  chipText: { fontSize: 12, fontWeight: '600' },
  empty: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retry: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  skillsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  skillsBannerTitle: { fontSize: 14, fontWeight: '700' },
  skillsBannerSub: { fontSize: 12, marginTop: 4, lineHeight: 17 },
});
