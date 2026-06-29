import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  ratingAvg: number;
  ratingCount: number;
  backgroundColor?: string;
  textColor?: string;
  subColor?: string;
};

/** Shows a user's average star rating from swap partner reviews. */
export function UserRatingBadge({
  ratingAvg,
  ratingCount,
  backgroundColor = '#2E2850',
  textColor = '#FBBF24',
  subColor = '#9490A8',
}: Props) {
  if (ratingCount <= 0) {
    return (
      <View style={[styles.wrap, { backgroundColor }]}>
        <Ionicons name="star-outline" size={14} color={subColor} />
        <Text style={[styles.newText, { color: subColor }]}>New</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor }]}>
      <Ionicons name="star" size={14} color={textColor} />
      <Text style={[styles.avg, { color: textColor }]}>{ratingAvg.toFixed(1)}</Text>
      <Text style={[styles.count, { color: subColor }]}>({ratingCount})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  avg: { fontSize: 13, fontWeight: '800' },
  count: { fontSize: 11, fontWeight: '600' },
  newText: { fontSize: 12, fontWeight: '700' },
});
