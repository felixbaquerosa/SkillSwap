import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { RADIUS } from '../../constants/brand';
import { useTheme } from '../../lib/theme';

type Props = {
  name: string;
  uri?: string | null;
  size?: number;
  style?: ViewStyle;
};

export function UserAvatar({ name, uri, size = 48, style }: Props) {
  const theme = useTheme();
  const letter = (name?.charAt(0) ?? '?').toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.avatar, styles.photo, { width: size, height: size, borderRadius: size / 2 }, style]}
      />
    );
  }

  return (
    <LinearGradient
      colors={[...theme.gradient]}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>{letter}</Text>
    </LinearGradient>
  );
}

type StatProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  color: string;
};

export function StatTile({ icon, label, value, color }: StatProps) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.textSub }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  photo: { backgroundColor: '#2A2540' },
  letter: { color: '#FFF', fontWeight: '800' },
  stat: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 4, lineHeight: 16 },
});
