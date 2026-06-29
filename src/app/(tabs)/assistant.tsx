import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChatInputFooter } from '../../components/ChatInputFooter';
import { ChatScreenLayout } from '../../components/ChatScreenLayout';
import { GradientHero } from '../../components/ui/GradientHero';
import { askAssistant } from '../../services/api';
import { useTheme } from '../../lib/theme';

type Bubble = { id: string; role: 'user' | 'ai'; text: string };

const SUGGESTIONS = [
  'How does SkillSwap work?',
  'How do I write a good skill profile?',
  'Tips for my first swap session',
];

export default function AssistantScreen() {
  const theme = useTheme();
  const [bubbles, setBubbles] = useState<Bubble[]>([
    { id: 'welcome', role: 'ai', text: "Hi! I'm your SkillSwap assistant. Ask me anything about trading skills, writing your profile, or finding a good match." },
  ]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiSource, setAiSource] = useState<'gemini' | 'fallback' | null>(null);
  const listRef = useRef<FlatList<Bubble>>(null);

  const send = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setText('');
    const userBubble: Bubble = { id: `u${Date.now()}`, role: 'user', text: trimmed };
    setBubbles((b) => [...b, userBubble]);
    setLoading(true);
    try {
      const res = await askAssistant(trimmed);
      setAiSource(res.ai === 'gemini' ? 'gemini' : 'fallback');
      setBubbles((b) => [...b, { id: `a${Date.now()}`, role: 'ai', text: res.reply }]);
    } catch (e) {
      setBubbles((b) => [...b, { id: `e${Date.now()}`, role: 'ai', text: e instanceof Error ? e.message : 'Something went wrong.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderItem = ({ item }: { item: Bubble }) => (
    <View style={[styles.bubbleRow, { justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start' }]}>
      {item.role === 'ai' ? (
        <LinearGradient colors={[...theme.gradient]} style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={14} color="#FFFFFF" />
        </LinearGradient>
      ) : null}
      {item.role === 'user' ? (
        <LinearGradient colors={[...theme.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.bubble, styles.userBubble]}>
          <Text style={styles.userBubbleText}>{item.text}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.aiBubble, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.bubbleText, { color: theme.text }]}>{item.text}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <GradientHero padBottom={16}>
        <Text style={styles.heroTitle}>AI Assistant</Text>
        <Text style={styles.heroSub}>
          {aiSource === 'gemini'
            ? 'Powered by Google Gemini · skill-swap expert'
            : 'SkillSwap guide · always available'}
        </Text>
      </GradientHero>

      <ChatScreenLayout
        listRef={listRef}
        data={bubbles}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        footer={
          loading ? (
            <View style={[styles.bubbleRow, { justifyContent: 'flex-start' }]}>
              <View style={[styles.aiAvatar, { backgroundColor: theme.accent }]}>
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              </View>
              <View style={[styles.bubble, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                <ActivityIndicator color={theme.accent} />
              </View>
            </View>
          ) : null
        }
        inputBar={
          <>
            {bubbles.length <= 1 ? (
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} style={[styles.suggestionChip, { backgroundColor: theme.chipBg, borderColor: theme.border }]} onPress={() => send(s)}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={theme.accent} style={{ marginRight: 8 }} />
                    <Text style={[styles.suggestionText, { color: theme.text }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <ChatInputFooter
              value={text}
              onChangeText={setText}
              onSend={() => send(text)}
              placeholder="Ask the assistant…"
              loading={loading}
              onFocus={() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)}
            />
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroTitle: { color: '#FFF', fontSize: 26, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },
  bubbleRow: { flexDirection: 'row', marginBottom: 12, gap: 8, alignItems: 'flex-end' },
  aiAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  userBubble: { borderBottomRightRadius: 4 },
  aiBubble: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userBubbleText: { color: '#FFF', fontSize: 15, lineHeight: 22 },
  suggestions: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1 },
  suggestionText: { fontSize: 14, fontWeight: '500', flex: 1 },
});
