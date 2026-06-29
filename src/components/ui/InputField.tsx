import { useRef } from 'react';
import { NativeSyntheticEvent, Platform, StyleSheet, Text, TextInput, TextInputFocusEventData, TextInputProps, View } from 'react-native';
import { RADIUS } from '../../constants/brand';
import { useKeyboardScrollIntoView } from '../KeyboardSafeScroll';
import { useTheme } from '../../lib/theme';

type Props = TextInputProps & {
  label: string;
};

export function InputField({ label, style, onFocus, ...rest }: Props) {
  const theme = useTheme();
  const wrapRef = useRef<View>(null);
  const scrollIntoView = useKeyboardScrollIntoView()?.scrollIntoView;

  const handleFocus = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
    onFocus?.(event);
    if (wrapRef.current && scrollIntoView) {
      setTimeout(() => scrollIntoView(wrapRef.current as View), Platform.OS === 'android' ? 80 : 40);
    }
  };

  return (
    <View ref={wrapRef} style={styles.wrap} collapsable={false}>
      <Text style={[styles.label, { color: theme.textSub }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.isDark ? theme.bgAlt : theme.card,
            borderColor: theme.border,
            color: theme.text,
          },
          style,
        ]}
        placeholderTextColor={theme.textSub}
        onFocus={handleFocus}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
});
