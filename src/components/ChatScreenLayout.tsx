import { ReactNode, RefObject } from 'react';
import { FlatList, KeyboardAvoidingView, ListRenderItem, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props<T> = {
  listRef?: RefObject<FlatList<T> | null>;
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: ListRenderItem<T>;
  header?: ReactNode;
  footer?: ReactNode;
  emptyComponent?: ReactNode;
  inputBar: ReactNode;
  style?: ViewStyle;
};

/** Chat layout: scrollable messages with a keyboard-safe input pinned at the bottom. */
export function ChatScreenLayout<T>({
  listRef,
  data,
  keyExtractor,
  renderItem,
  header,
  footer,
  emptyComponent,
  inputBar,
  style,
}: Props<T>) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, style]}>
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <FlatList
          ref={listRef}
          style={styles.flex}
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef?.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={emptyComponent}
          ListFooterComponent={footer}
        />
        {inputBar}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },
});
