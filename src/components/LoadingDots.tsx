import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { BRAND } from '../constants/brand';

type Props = {
  color?: string;
  size?: number;
  gap?: number;
};

/** Paymaya-style three-dot loading indicator. */
export function LoadingDots({ color = BRAND.purpleLight, size = 10, gap = 8 }: Props) {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(640 - delay),
        ])
      );

    const a1 = bounce(d1, 0);
    const a2 = bounce(d2, 160);
    const a3 = bounce(d3, 320);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [d1, d2, d3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) }],
  });

  return (
    <View style={[styles.row, { gap }]}>
      {[d1, d2, d3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, dotStyle(dot)]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', height: 24 },
  dot: {},
});
