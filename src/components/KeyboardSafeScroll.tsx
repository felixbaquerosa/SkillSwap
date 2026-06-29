import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEvent,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScrollContextValue = {
  scrollIntoView: (view: View) => void;
};

const KeyboardScrollContext = createContext<ScrollContextValue | null>(null);

/** Scroll a wrapped input into view when focused inside KeyboardSafeScroll. */
export function useKeyboardScrollIntoView() {
  return useContext(KeyboardScrollContext);
}

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardVerticalOffset?: number;
} & Pick<ScrollViewProps, 'keyboardShouldPersistTaps' | 'showsVerticalScrollIndicator'>;

/** Scrollable screen that keeps focused inputs visible above the keyboard. */
export function KeyboardSafeScroll({
  children,
  style,
  contentContainerStyle,
  keyboardVerticalOffset,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const pendingScrollRef = useRef<View | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const performScroll = useCallback(
    (view: View) => {
      if (!scrollRef.current) return;

      const height = keyboardHeight || Math.round(Dimensions.get('window').height * 0.38);
      view.measureInWindow((_x, y, _width, fieldHeight) => {
        const windowHeight = Dimensions.get('window').height;
        const visibleBottom = windowHeight - height - 16;
        const fieldBottom = y + fieldHeight;

        if (fieldBottom > visibleBottom) {
          const delta = fieldBottom - visibleBottom + 24;
          scrollRef.current?.scrollTo({ y: scrollY.current + delta, animated: true });
        }
      });
    },
    [keyboardHeight]
  );

  useEffect(() => {
    if (keyboardHeight > 0 && pendingScrollRef.current) {
      performScroll(pendingScrollRef.current);
      pendingScrollRef.current = null;
    }
  }, [keyboardHeight, performScroll]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    };
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollIntoView = useCallback(
    (view: View) => {
      pendingScrollRef.current = view;
      performScroll(view);
    },
    [performScroll]
  );

  const bottomPad = keyboardHeight > 0 ? keyboardHeight + 24 : Math.max(insets.bottom, 24);

  return (
    <KeyboardScrollContext.Provider value={{ scrollIntoView }}>
      <KeyboardAvoidingView
        style={[styles.flex, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset ?? (Platform.OS === 'ios' ? insets.top : 0)}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[contentContainerStyle, styles.scrollContent, { paddingBottom: bottomPad }]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          onScroll={(event) => {
            scrollY.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </KeyboardScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
