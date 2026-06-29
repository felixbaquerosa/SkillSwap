import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatInputFooter } from '../../components/ChatInputFooter';
import { ChatScreenLayout } from '../../components/ChatScreenLayout';
import { MessageStatusLabel } from '../../components/MessageStatusLabel';
import {
  archiveMatch,
  ChatMessage,
  createSession,
  deleteMatch,
  getMatches,
  getMessages,
  getMatchRating,
  getSessions,
  MatchSummary,
  sendMessage,
  submitRating,
  SwapRating,
  unarchiveMatch,
} from '../../services/api';
import { CallMode } from '../../lib/calls';
import {
  defaultSessionDatetime,
  formatSessionApi,
  formatSessionDisplay,
  parseSessionDatetime,
} from '../../lib/datetime';
import { useTheme } from '../../lib/theme';

export default function MatchChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const matchId = Number(params.id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [sessionWhen, setSessionWhen] = useState(defaultSessionDatetime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [existingSessionId, setExistingSessionId] = useState<number | null>(null);
  const [myRating, setMyRating] = useState<SwapRating | null>(null);
  const [partnerRatingAvg, setPartnerRatingAvg] = useState(0);
  const [partnerRatingCount, setPartnerRatingCount] = useState(0);
  const [ratingDraft, setRatingDraft] = useState(0);
  const [ratingSaving, setRatingSaving] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(async () => {
    try {
      const [msgRes, inboxRes, archivedRes, ratingRes, sessionRes] = await Promise.all([
        getMessages(matchId),
        getMatches(false),
        getMatches(true),
        getMatchRating(matchId).catch(() => null),
        getSessions().catch(() => ({ sessions: [] })),
      ]);
      setMessages(msgRes.messages);
      setPartnerOnline(msgRes.partner_online ?? false);
      setMatch(
        inboxRes.matches.find((m) => m.id === matchId)
          ?? archivedRes.matches.find((m) => m.id === matchId)
          ?? null
      );
      const existing = sessionRes.sessions.find((s) => s.match_id === matchId && s.status === 'scheduled');
      if (existing) {
        setExistingSessionId(existing.id);
        const parsed = parseSessionDatetime(existing.scheduled_at);
        if (parsed) setSessionWhen(parsed);
        if (existing.notes) setNotes(existing.notes);
      } else {
        setExistingSessionId(null);
      }
      if (ratingRes) {
        setMyRating(ratingRes.my_rating);
        setPartnerRatingAvg(ratingRes.partner_rating_avg);
        setPartnerRatingCount(ratingRes.partner_rating_count);
        setRatingDraft(ratingRes.my_rating?.rating ?? 0);
      }
    } catch {
      // keep previous state on transient errors
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const onSend = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setText('');
    try {
      await sendMessage(matchId, body);
      await load();
      listRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      Alert.alert('Not sent', e instanceof Error ? e.message : 'Try again.');
      setText(body);
    } finally {
      setSending(false);
    }
  };

  const onStartCall = async (mode: CallMode) => {
    try {
      await sendMessage(
        matchId,
        mode === 'voice' ? '📞 Started a voice call — tap the call button to join.' : '📹 Started a video call — tap the video button to join.'
      );
      await load();
    } catch {
      // Call can still open if the notify message fails.
    }
    router.push({
      pathname: '/call/[id]',
      params: { id: String(matchId), mode, name: match?.partner_name ?? 'Partner' },
    });
  };

  const onSubmitRating = async () => {
    if (ratingDraft < 1) {
      Alert.alert('Pick a rating', 'Select 1 to 5 stars for your swap partner.');
      return;
    }
    setRatingSaving(true);
    try {
      const res = await submitRating(matchId, ratingDraft);
      setMyRating(res.rating);
      Alert.alert('Thanks!', 'Your rating has been updated.');
      await load();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setRatingSaving(false);
    }
  };

  const onSessionDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (!selected) return;
    setSessionWhen((prev) => {
      const next = new Date(prev);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      return next;
    });
  };

  const onSessionTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!selected) return;
    setSessionWhen((prev) => {
      const next = new Date(prev);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return next;
    });
  };

  const onSchedule = async () => {
    if (sessionWhen.getTime() <= Date.now()) {
      Alert.alert('Pick a future time', 'Choose a date and time that has not passed yet.');
      return;
    }
    try {
      await createSession({
        match_id: matchId,
        scheduled_at: formatSessionApi(sessionWhen),
        notes: notes.trim() || undefined,
      });
      setShowSchedule(false);
      Alert.alert(
        existingSessionId ? 'Updated' : 'Scheduled',
        existingSessionId ? 'Your session time has been updated.' : 'Your swap session has been scheduled.'
      );
      await load();
    } catch (e) {
      Alert.alert('Could not schedule', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const onConversationMenu = () => {
    const archiveAction = match?.archived
      ? {
          text: 'Unarchive',
          onPress: async () => {
            try {
              await unarchiveMatch(matchId);
              setMatch((m) => (m ? { ...m, archived: false } : m));
              Alert.alert('Restored', 'This conversation is back in your Messages inbox.');
            } catch (e) {
              Alert.alert('Could not unarchive', e instanceof Error ? e.message : 'Try again.');
            }
          },
        }
      : {
          text: 'Archive',
          onPress: async () => {
            try {
              await archiveMatch(matchId);
              router.back();
            } catch (e) {
              Alert.alert('Could not archive', e instanceof Error ? e.message : 'Try again.');
            }
          },
        };

    Alert.alert('Conversation', 'Manage this chat', [
      archiveAction,
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Delete conversation?',
            'This removes the chat from your Messages list. Your swap request stays on record.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteMatch(matchId);
                    router.back();
                  } catch (e) {
                    Alert.alert('Could not delete', e instanceof Error ? e.message : 'Try again.');
                  }
                },
              },
            ]
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.bubbleRow, { justifyContent: item.mine ? 'flex-end' : 'flex-start' }]}>
      {item.mine ? (
        <View style={styles.mineCol}>
          <View style={[styles.bubble, { backgroundColor: theme.accent, borderBottomRightRadius: 4 }]}>
            <Text style={[styles.bubbleText, { color: '#FFFFFF' }]}>{item.body}</Text>
          </View>
          <MessageStatusLabel status={item.status} onAccent subColor={theme.textSub} />
        </View>
      ) : (
        <View style={[styles.bubble, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderBottomLeftRadius: 4 }]}>
          <Text style={[styles.bubbleText, { color: theme.text }]}>{item.body}</Text>
        </View>
      )}
    </View>
  );

  const canSchedule = match?.status === 'accepted';

  const topBar = (
    <View style={[styles.topBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
        <Ionicons name="arrow-back" size={22} color={theme.text} />
      </Pressable>
      <View style={styles.titleWrap}>
        <Text style={[styles.topTitle, { color: theme.text }]} numberOfLines={1}>
          {match?.partner_name ?? 'Swap'}
        </Text>
        {partnerOnline ? (
          <Text style={[styles.onlineText, { color: '#10B981' }]}>Online</Text>
        ) : (
          <Text style={[styles.onlineText, { color: theme.textSub }]}>Offline</Text>
        )}
      </View>
      {match && match.status !== 'declined' ? (
        <View style={styles.headerActions}>
          <Pressable onPress={() => onStartCall('voice')} style={styles.headerIconBtn} hitSlop={6}>
            <Ionicons name="call-outline" size={22} color={theme.accent} />
          </Pressable>
          <Pressable onPress={() => onStartCall('video')} style={styles.headerIconBtn} hitSlop={6}>
            <Ionicons name="videocam-outline" size={24} color={theme.accent} />
          </Pressable>
          <Pressable onPress={onConversationMenu} style={styles.headerIconBtn} hitSlop={6}>
            <Ionicons name="ellipsis-vertical" size={20} color={theme.textSub} />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={onConversationMenu} style={styles.headerIconBtn} hitSlop={6}>
          <Ionicons name="ellipsis-vertical" size={20} color={theme.textSub} />
        </Pressable>
      )}
    </View>
  );

  const subHeader = (
    <>
      {match ? (
        <View style={[styles.banner, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.bannerText, { color: theme.textSub }]} numberOfLines={1}>
            {match.status === 'pending'
              ? 'Swap pending — once accepted you can schedule a session.'
              : match.status === 'accepted'
                ? 'Swap accepted! You can schedule a session.'
                : 'This swap was declined.'}
          </Text>
          {canSchedule ? (
            <Pressable onPress={() => setShowSchedule((s) => !s)} style={[styles.scheduleBtn, { backgroundColor: theme.accent }]}>
              <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
              <Text style={styles.scheduleBtnText}>Schedule</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {showSchedule ? (
        <View style={[styles.schedulePanel, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textSub }]}>Date & time</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[styles.dateField, { backgroundColor: theme.bg, borderColor: theme.border }]}
          >
            <Text style={[styles.dateFieldText, { color: theme.text }]}>{formatSessionDisplay(formatSessionApi(sessionWhen))}</Text>
            <Ionicons name="calendar-outline" size={20} color={theme.textSub} />
          </Pressable>
          <View style={styles.pickerActions}>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[styles.pickerBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}
            >
              <Text style={[styles.pickerBtnText, { color: theme.text }]}>Change date</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              style={[styles.pickerBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}
            >
              <Text style={[styles.pickerBtnText, { color: theme.text }]}>Change time</Text>
            </Pressable>
          </View>
          {showDatePicker ? (
            <DateTimePicker
              value={sessionWhen}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={onSessionDateChange}
            />
          ) : null}
          {showTimePicker ? (
            <DateTimePicker
              value={sessionWhen}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onSessionTimeChange}
            />
          ) : null}
          {Platform.OS === 'ios' && (showDatePicker || showTimePicker) ? (
            <Pressable
              onPress={() => {
                setShowDatePicker(false);
                setShowTimePicker(false);
              }}
              style={styles.donePickerBtn}
            >
              <Text style={[styles.donePickerText, { color: theme.accent }]}>Done</Text>
            </Pressable>
          ) : null}
          <Text style={[styles.label, { color: theme.textSub }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
            placeholder="What will you cover?"
            placeholderTextColor={theme.textSub}
            value={notes}
            onChangeText={setNotes}
          />
          <Pressable style={[styles.confirmBtn, { backgroundColor: theme.accent }]} onPress={onSchedule}>
            <Text style={styles.confirmText}>{existingSessionId ? 'Update session' : 'Confirm session'}</Text>
          </Pressable>
        </View>
      ) : null}
      {match?.status === 'accepted' ? (
        <View style={[styles.ratingPanel, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textSub }]}>
            Rate {match.partner_name}
            {partnerRatingCount > 0 ? ` · ${partnerRatingAvg.toFixed(1)}★ (${partnerRatingCount})` : ''}
          </Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRatingDraft(n)} hitSlop={6}>
                <Ionicons
                  name={n <= ratingDraft ? 'star' : 'star-outline'}
                  size={28}
                  color={n <= ratingDraft ? '#FBBF24' : theme.textSub}
                />
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.confirmBtn, { backgroundColor: theme.accent, opacity: ratingSaving ? 0.7 : 1 }]}
            onPress={onSubmitRating}
            disabled={ratingSaving}
          >
            <Text style={styles.confirmText}>{myRating ? 'Update rating' : 'Submit rating'}</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        {topBar}
        {subHeader}
        <View style={styles.center}><ActivityIndicator size="large" color={theme.accent} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      {topBar}
      <ChatScreenLayout
        style={{ backgroundColor: theme.bg }}
        listRef={listRef}
        data={messages}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        header={subHeader}
        emptyComponent={
          <Text style={[styles.emptyChat, { color: theme.textSub }]}>
            Say hello and arrange your skill swap!
          </Text>
        }
        inputBar={
          <ChatInputFooter
            value={text}
            onChangeText={setText}
            onSend={onSend}
            placeholder="Type a message…"
            loading={sending}
            onFocus={() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, alignItems: 'center', marginHorizontal: 4 },
  topTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  onlineText: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  headerSpacer: { width: 88 },
  mineCol: { maxWidth: '80%', alignItems: 'flex-end' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  bannerText: { fontSize: 12, flex: 1 },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  scheduleBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  schedulePanel: { padding: 16, borderBottomWidth: 1 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateFieldText: { fontSize: 14, fontWeight: '600', flex: 1, paddingRight: 8 },
  pickerActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  pickerBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  pickerBtnText: { fontSize: 13, fontWeight: '700' },
  donePickerBtn: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
  donePickerText: { fontSize: 14, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  confirmBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  confirmText: { color: '#FFFFFF', fontWeight: '700' },
  ratingPanel: { padding: 16, borderBottomWidth: 1 },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 12, marginTop: 4 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  emptyChat: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 4 },
  headerIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
