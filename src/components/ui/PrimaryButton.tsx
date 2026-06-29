import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { RADIUS } from '../../constants/brand';
import { useTheme } from '../../lib/theme';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, loading, disabled, icon, variant = 'primary', style }: Props) {
  const theme = useTheme();
  const dim = loading || disabled;

  if (variant === 'outline') {
    return (
      <Pressable
        style={[styles.outline, { borderColor: theme.accent, opacity: dim ? 0.6 : 1 }, style]}
        onPress={onPress}
        disabled={dim}
      >
        {icon ? <Ionicons name={icon} size={18} color={theme.accent} style={{ marginRight: 8 }} /> : null}
        <Text style={[styles.outlineText, { color: theme.accent }]}>{label}</Text>
      </Pressable>
    );
  }

  if (variant === 'ghost') {
    return (
      <Pressable style={[styles.ghost, style]} onPress={onPress} disabled={dim}>
        <Text style={[styles.ghostText, { color: theme.accent }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={dim} style={[{ opacity: dim ? 0.7 : 1 }, style]}>
      <LinearGradient colors={[...theme.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primary}>
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={20} color="#FFF" style={{ marginRight: 8 }} /> : null}
            <Text style={styles.primaryText}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  outline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  outlineText: { fontSize: 15, fontWeight: '700' },
  ghost: { alignItems: 'center', paddingVertical: 10 },
  ghostText: { fontSize: 14, fontWeight: '700' },
});
