import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardSafeScroll } from '../components/KeyboardSafeScroll';
import { disableSkill, enableSkill, getMySkills, updateSkill, UserSkill, addSkill } from '../services/api';
import { useTheme } from '../lib/theme';

const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

type SkillMessage = { type: 'success' | 'info'; text: string };

export default function SkillsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [offers, setOffers] = useState<UserSkill[]>([]);
  const [wants, setWants] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<'offer' | 'want'>('offer');
  const [level, setLevel] = useState('intermediate');
  const [message, setMessage] = useState<SkillMessage | null>(null);

  const [editTarget, setEditTarget] = useState<UserSkill | null>(null);
  const [editLevel, setEditLevel] = useState('intermediate');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [message]);

  const load = useCallback(async () => {
    try {
      const res = await getMySkills();
      setOffers(res.offers);
      setWants(res.wants);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load skills.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Skill needed', 'Enter a skill name.');
      return;
    }

    const existing = type === 'offer' ? offers : wants;
    const alreadyAdded = existing.some((s) => s.name.toLowerCase() === trimmed.toLowerCase() && s.is_active);
    if (alreadyAdded) {
      setMessage({ type: 'info', text: 'You already added this skill.' });
      return;
    }

    setSaving(true);
    try {
      await addSkill({ name: trimmed, type, level });
      setName('');
      await load();
      setMessage({ type: 'success', text: 'Your skill has been added successfully!' });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not add skill.');
    } finally {
      setSaving(false);
    }
  };

  const onDisable = (skill: UserSkill) => {
    Alert.alert('Disable skill', `Disable "${skill.name}"? It will be hidden from matching but not deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disable',
        onPress: async () => {
          try {
            await disableSkill(skill.id);
            await load();
            setMessage({ type: 'info', text: 'Skill disabled. You can enable it again anytime.' });
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not disable skill.');
          }
        },
      },
    ]);
  };

  const onEnable = async (id: number) => {
    try {
      await enableSkill(id);
      await load();
      setMessage({ type: 'success', text: 'Skill enabled again.' });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not enable skill.');
    }
  };

  const openEdit = (skill: UserSkill) => {
    setEditTarget(skill);
    setEditLevel(skill.level);
    setEditDescription(skill.description);
  };

  const onSaveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await updateSkill(editTarget.id, { level: editLevel, description: editDescription.trim() || undefined });
      setEditTarget(null);
      await load();
      setMessage({ type: 'success', text: 'Skill updated successfully.' });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update skill.');
    } finally {
      setEditSaving(false);
    }
  };

  const SkillList = ({
    title,
    data,
    tone,
  }: {
    title: string;
    data: UserSkill[];
    tone: 'offer' | 'want';
  }) => {
    const active = data.filter((s) => s.is_active);
    const disabled = data.filter((s) => !s.is_active);

    const row = (s: UserSkill, inactive: boolean) => (
      <View
        key={s.id}
        style={[
          styles.skillRow,
          { backgroundColor: theme.card, borderColor: theme.border, opacity: inactive ? 0.75 : 1 },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: tone === 'offer' ? '#10B981' : '#F59E0B' }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.skillName, { color: theme.text }]}>
            {s.name}{inactive ? ' (disabled)' : ''}
          </Text>
          <Text style={[styles.skillMeta, { color: theme.textSub }]}>{s.category} · {s.level}</Text>
          {s.description ? <Text style={[styles.skillDesc, { color: theme.textSub }]}>{s.description}</Text> : null}
        </View>
        {inactive ? (
          <Pressable onPress={() => onEnable(s.id)} hitSlop={10}>
            <Ionicons name="refresh-outline" size={20} color={theme.accent} />
          </Pressable>
        ) : (
          <View style={styles.rowActions}>
            <Pressable onPress={() => openEdit(s)} hitSlop={10}>
              <Ionicons name="create-outline" size={20} color={theme.accent} />
            </Pressable>
            <Pressable onPress={() => onDisable(s)} hitSlop={10}>
              <Ionicons name="eye-off-outline" size={20} color={theme.warning} />
            </Pressable>
          </View>
        )}
      </View>
    );

    return (
      <View style={{ marginTop: 22 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {active.length === 0 && disabled.length === 0 ? (
          <Text style={[styles.muted, { color: theme.textSub }]}>None yet.</Text>
        ) : null}
        {active.map((s) => row(s, false))}
        {disabled.length > 0 ? (
          <>
            <Text style={[styles.disabledLabel, { color: theme.textSub }]}>Disabled skills</Text>
            {disabled.map((s) => row(s, true))}
          </>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Skills</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardSafeScroll style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={[styles.addCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.addTitle, { color: theme.text }]}>Add a skill</Text>
          <View style={styles.toggleRow}>
            {(['offer', 'want'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[
                  styles.toggle,
                  { borderColor: theme.border },
                  type === t && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
              >
                <Text style={[styles.toggleText, { color: type === t ? '#FFFFFF' : theme.textSub }]}>
                  {t === 'offer' ? 'I can teach' : 'I want to learn'}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
            placeholder="e.g. Guitar, Python Programming"
            placeholderTextColor={theme.textSub}
            value={name}
            onChangeText={setName}
          />
          <Text style={[styles.label, { color: theme.textSub }]}>Level</Text>
          <View style={styles.levelRow}>
            {LEVELS.map((l) => (
              <Pressable
                key={l}
                onPress={() => setLevel(l)}
                style={[styles.levelChip, { borderColor: theme.border }, level === l && { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}
              >
                <Text style={[styles.levelText, { color: level === l ? theme.accent : theme.textSub }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.addBtn, { backgroundColor: theme.accent, opacity: saving ? 0.7 : 1 }]} onPress={onAdd} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.addBtnText}>Add skill</Text>}
          </Pressable>
          {message ? (
            <View style={[styles.feedback, message.type === 'success' ? styles.feedbackSuccess : styles.feedbackInfo]}>
              <Ionicons name={message.type === 'success' ? 'checkmark-circle' : 'information-circle'} size={18} color={message.type === 'success' ? '#059669' : '#D97706'} />
              <Text style={[styles.feedbackText, { color: message.type === 'success' ? '#065F46' : '#92400E' }]}>{message.text}</Text>
            </View>
          ) : null}
        </View>
        <SkillList title="Skills I can teach" data={offers} tone="offer" />
        <SkillList title="Skills I want to learn" data={wants} tone="want" />
      </KeyboardSafeScroll>

      <Modal visible={editTarget !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit skill</Text>
            <Text style={[styles.modalName, { color: theme.textSub }]}>{editTarget?.name}</Text>
            <Text style={[styles.label, { color: theme.textSub }]}>Level</Text>
            <View style={styles.levelRow}>
              {LEVELS.map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setEditLevel(l)}
                  style={[styles.levelChip, { borderColor: theme.border }, editLevel === l && { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}
                >
                  <Text style={[styles.levelText, { color: editLevel === l ? theme.accent : theme.textSub }]}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { color: theme.textSub }]}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
              placeholder="Short note about your skill"
              placeholderTextColor={theme.textSub}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { borderColor: theme.border }]} onPress={() => setEditTarget(null)}>
                <Text style={{ color: theme.textSub, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: theme.accent }]} onPress={onSaveEdit} disabled={editSaving}>
                {editSaving ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '700' }}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  content: { padding: 20, paddingBottom: 40 },
  addCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  addTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  toggle: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  toggleText: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 48 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 8 },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  levelText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  addBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 18 },
  addBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14, borderWidth: 1 },
  feedbackSuccess: { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' },
  feedbackInfo: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
  feedbackText: { fontSize: 14, fontWeight: '600', flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  disabledLabel: { fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  muted: { fontSize: 13 },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  skillName: { fontSize: 15, fontWeight: '700' },
  skillMeta: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  skillDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  rowActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalName: { fontSize: 14, marginTop: 4, marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBtn: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 13, alignItems: 'center' },
});
