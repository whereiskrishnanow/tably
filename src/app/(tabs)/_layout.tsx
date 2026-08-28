import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CartPill } from '../../components/CartPill';
import { AppText } from '../../components/ui/AppText';
import { PressableScale } from '../../components/ui/PressableScale';
import { selectActiveOrders, useOrders } from '../../store/orders';
import { colors, fonts, shadows } from '../../theme/tokens';

const TABS: Array<{ name: string; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = [
  { name: 'index', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'menu', label: 'Menu', icon: 'book-outline', iconActive: 'book' },
  { name: 'tables', label: 'Tables', icon: 'people-outline', iconActive: 'people' },
  { name: 'orders', label: 'Orders', icon: 'receipt-outline', iconActive: 'receipt' },
];

const BAR_HEIGHT = 62;

// Minimal shape of the react-navigation tab-bar props we actually use
// (expo-router vendors bottom-tabs, so we avoid importing its internals).
interface TabBarProps {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  navigation: { navigate: (name: string) => void };
}

function TablyTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const activeOrders = useOrders(selectActiveOrders);

  return (
    <View
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
          flexDirection: 'row',
          height: BAR_HEIGHT + insets.bottom,
        },
        shadows.raised,
      ]}
    >
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        const color = focused ? colors.accent : colors.inkTertiary;
        const showBadge = tab.name === 'orders' && activeOrders.length > 0;
        return (
          <PressableScale
            key={tab.name}
            haptic
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
            onPress={() => navigation.navigate(state.routes[index].name)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: BAR_HEIGHT, gap: 3 }}
          >
            <View>
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={23} color={color} />
              {showBadge ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -6,
                    minWidth: 15,
                    height: 15,
                    borderRadius: 8,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                  }}
                >
                  <AppText style={{ fontFamily: fonts.bold, fontSize: 9, color: colors.inkInverse, lineHeight: 11 }}>
                    {activeOrders.length}
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText style={{ fontFamily: focused ? fonts.semibold : fonts.medium, fontSize: 11, color }}>{tab.label}</AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
        tabBar={(props) => <TablyTabBar {...props} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="menu" />
        <Tabs.Screen name="tables" />
        <Tabs.Screen name="orders" />
      </Tabs>
      <CartPill bottom={BAR_HEIGHT + insets.bottom + 14} />
    </>
  );
}
