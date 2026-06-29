import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSub,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 10,
          ...Platform.select({
            ios: { shadowColor: '#6C4CE0', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
            android: { elevation: 12 },
          }),
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: tabIcon('compass', 'compass-outline') }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline') }} />
      <Tabs.Screen name="assistant" options={{ title: 'AI', tabBarIcon: tabIcon('sparkles', 'sparkles-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Profile', tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}

function tabIcon(active: keyof typeof Ionicons.glyphMap, inactive: keyof typeof Ionicons.glyphMap) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <View style={focused ? styles.activeDot : undefined}>
      <Ionicons name={focused ? active : inactive} size={23} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  activeDot: {},
});
