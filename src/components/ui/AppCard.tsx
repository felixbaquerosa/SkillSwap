import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SHADOW, RADIUS } from '../../constants/brand';
import { useTheme } from '../../lib/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padding?: number;
};

export function AppCard({ children, style, elevated = true, padding = 16 }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          padding,
        },
        elevated ? SHADOW.card : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

type SectionProps = { title: string; action?: ReactNode; style?: ViewStyle };

export function SectionHeader({ title, action, style }: SectionProps) {
  const theme = useTheme();
  return (
    <View style={[styles.section, style]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
});
