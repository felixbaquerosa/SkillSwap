import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { MessageStatus } from '../services/api';

type Props = {
  status?: MessageStatus | null;
  /** Use light text on purple bubbles. */
  onAccent?: boolean;
  subColor?: string;
};

const LABELS: Record<MessageStatus, string> = {
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
};

/** Messenger-style delivery status for outgoing messages. */
export function MessageStatusLabel({ status, onAccent, subColor = '#9490A8' }: Props) {
  if (!status) return null;

  const color = onAccent ? 'rgba(255,255,255,0.75)' : subColor;
  const iconColor = onAccent ? 'rgba(255,255,255,0.9)' : subColor;

  return (
    <View style={styles.wrap}>
      <Ionicons
        name={status === 'sent' ? 'checkmark' : 'checkmark-done'}
        size={13}
        color={status === 'read' ? '#60A5FA' : iconColor}
      />
      {status === 'read' ? (
        <Ionicons name="checkmark-done" size={13} color="#60A5FA" style={styles.secondCheck} />
      ) : null}
      <Text style={[styles.label, { color }]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4, alignSelf: 'flex-end' },
  secondCheck: { marginLeft: -10 },
  label: { fontSize: 11, fontWeight: '600', marginLeft: 2 },
});
