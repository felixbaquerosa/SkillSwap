import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../lib/theme';

type Status = 'idle' | 'verifying' | 'verified';

type Props = {
  onVerifiedChange: (verified: boolean) => void;
};

/** Cloudflare-style "Verify you are human" check before sign-in. */
export function HumanVerification({ onVerifiedChange }: Props) {
  const theme = useTheme();
  const [status, setStatus] = useState<Status>('idle');

  const handlePress = () => {
    if (status !== 'idle') return;
    setStatus('verifying');
    setTimeout(() => {
      setStatus('verified');
      onVerifiedChange(true);
    }, 1600);
  };

  const label =
    status === 'verifying' ? 'Verifying…' : status === 'verified' ? 'Success!' : 'Verify you are human';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <View style={styles.left}>
        <Pressable
          style={[
            styles.checkbox,
            { borderColor: status === 'verified' ? theme.success : theme.textSub },
          ]}
          onPress={handlePress}
          disabled={status !== 'idle'}
        >
          {status === 'verifying' ? <ActivityIndicator size="small" color={theme.accent} /> : null}
          {status === 'verified' ? <Ionicons name="checkmark" size={18} color={theme.success} /> : null}
        </Pressable>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      </View>

      <View style={styles.right}>
        <Ionicons name="cloud-outline" size={20} color={theme.accent} />
        <Text style={[styles.brand, { color: theme.textSub }]}>
          SkillSwap{'\n'}Security
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  brand: { fontSize: 9, fontWeight: '700', marginLeft: 6, lineHeight: 11, textAlign: 'right' },
});
