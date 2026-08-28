import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows, spacing } from '../../theme/tokens';
import type { ActiveTable, MenuItem } from '../../domain/types';
import { categories, getItem, menuItems } from '../../data/menu';
import { restaurant, session } from '../../data/seed';
import { selectPopularity, selectTablesByRecency, useTables } from '../../store/tables';
import { selectUnreadCount, useNotifications } from '../../store/notifications';
import { FoodCard } from '../../components/FoodCard';
import { FoodRow } from '../../components/FoodRow';
import { TableCard } from '../../components/TableCard';
import { AppText } from '../../components/ui/AppText';
import { Chip } from '../../components/ui/Chip';
import { PressableScale } from '../../components/ui/PressableScale';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Skeleton } from '../../components/ui/Skeleton';

const JUST_ORDERED_WINDOW_MS = 15_000;

const greetingForHour = (hour: number): string => {
  if (hour < 5) return 'Late night cravings? 👋';
  if (hour < 12) return 'Good morning 👋';
  if (hour < 17) return 'Good afternoon 👋';
  return 'Good evening 👋';
};

interface RankedItem {
  item: MenuItem;
  count: number;
}

/** Small pulsing accent dot for the live ticker. */
function LiveDot() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 850, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.accent,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.2] }) }],
      }}
    />
  );
}

/** Skeleton pass shown for a beat on first mount so the layout never pops in from blank. */
function HomeSkeleton() {
  return (
    <View style={{ gap: spacing.xl, paddingTop: spacing.md }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Skeleton height={50} borderRadius={radius.pill} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg }}>
        {['a', 'b', 'c', 'd'].map((k) => (
          <Skeleton key={k} width={96} height={38} borderRadius={radius.pill} />
        ))}
      </View>
      <View style={{ gap: spacing.sm }}>
        <View style={{ paddingHorizontal: spacing.lg, gap: 8 }}>
          <Skeleton width={190} height={22} />
          <Skeleton width={150} height={14} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          <Skeleton width={172} height={208} borderRadius={radius.lg} />
          <Skeleton width={172} height={208} borderRadius={radius.lg} />
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <View style={{ paddingHorizontal: spacing.lg, gap: 8 }}>
          <Skeleton width={230} height={22} />
          <Skeleton width={160} height={14} />
        </View>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Skeleton height={36} borderRadius={radius.pill} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          <Skeleton width={252} height={150} borderRadius={radius.lg} />
          <Skeleton width={252} height={150} borderRadius={radius.lg} />
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const unreadCount = useNotifications(selectUnreadCount);
  const tablesByRecency = useTables(selectTablesByRecency);
  const popularity = useTables(selectPopularity);
  const ticker = useTables((s) => s.ticker);
  const recentlyUpdated = useTables((s) => s.recentlyUpdated);

  // Brief skeleton pass on first mount so loading states are demonstrated.
  const [ready, setReady] = useState(false);
  const contentFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    Animated.timing(contentFade, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [ready, contentFade]);

  // Gentle clock so "just ordered" flashes actually clear after their 15s window.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  // "Popular right now": ranked by cross-table popularity, then bestseller flag.
  const popular = useMemo<RankedItem[]>(
    () =>
      menuItems
        .filter((m) => m.available)
        .map((item) => ({ item, count: popularity.get(item.id) ?? 0 }))
        .sort((a, b) => b.count - a.count || Number(b.item.bestseller) - Number(a.item.bestseller))
        .slice(0, 6),
    [popularity],
  );

  // "Recommended for you": fresh picks not already featured above.
  const recommended = useMemo<RankedItem[]>(() => {
    const featured = new Set(popular.map((p) => p.item.id));
    return menuItems
      .filter((m) => m.available && !featured.has(m.id))
      .map((item) => ({ item, count: popularity.get(item.id) ?? 0 }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          Number(Boolean(b.item.chefSpecial)) - Number(Boolean(a.item.chefSpecial)) ||
          Number(b.item.bestseller) - Number(a.item.bestseller),
      )
      .slice(0, 4);
  }, [popular, popularity]);

  // Live ticker: newest entry, falling back to the freshest seed activity so it is never blank.
  const liveTick = useMemo(() => {
    if (ticker.length > 0) return ticker[0];
    const freshest = tablesByRecency[0];
    if (!freshest || freshest.items.length === 0) return null;
    const latestItem = [...freshest.items].sort((a, b) => b.orderedAt - a.orderedAt)[0];
    return { id: `seed-${latestItem.id}`, tableNumber: freshest.tableNumber, menuItemId: latestItem.menuItemId, at: latestItem.orderedAt };
  }, [ticker, tablesByRecency]);

  // Fade/slide the ticker pill each time a new entry lands.
  const tickAnim = useRef(new Animated.Value(1)).current;
  const lastTickId = useRef<string | null>(null);
  useEffect(() => {
    if (!liveTick || lastTickId.current === liveTick.id) return;
    const isFirst = lastTickId.current === null;
    lastTickId.current = liveTick.id;
    if (isFirst) return;
    tickAnim.setValue(0);
    Animated.timing(tickAnim, { toValue: 1, duration: 340, useNativeDriver: true }).start();
  }, [liveTick, tickAnim]);

  const justOrdered = (table: ActiveTable) => now - (recentlyUpdated[table.id] ?? 0) < JUST_ORDERED_WINDOW_MS;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: 148 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="display" style={{ fontSize: 26, lineHeight: 32 }}>
            {greeting}
          </AppText>
          <AppText variant="secondary">
            Table {session.tableNumber} · {restaurant.name}
          </AppText>
        </View>

        <PressableScale
          haptic
          accessibilityRole="button"
          accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          onPress={() => router.push('/notifications')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="notifications-outline" size={21} color={colors.ink} />
          {unreadCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: -3,
                right: -4,
                minWidth: 17,
                height: 17,
                borderRadius: 9,
                backgroundColor: colors.accent,
                borderWidth: 1.5,
                borderColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}
            >
              <AppText style={{ fontFamily: fonts.bold, fontSize: 10, lineHeight: 12, color: colors.inkInverse }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </AppText>
            </View>
          ) : null}
        </PressableScale>

        <PressableScale
          haptic
          accessibilityRole="button"
          accessibilityLabel="Your profile"
          onPress={() => router.push('/profile')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.accentSoft,
            borderWidth: 1,
            borderColor: colors.accentSoftBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.accent }}>G</AppText>
        </PressableScale>
      </View>

      {!ready ? (
        <HomeSkeleton />
      ) : (
        <Animated.View style={{ opacity: contentFade, gap: spacing.xxl, paddingTop: spacing.md }}>
          {/* Search */}
          <View style={{ paddingHorizontal: spacing.lg }}>
            <PressableScale
              pressedScale={0.99}
              accessibilityRole="button"
              accessibilityLabel="Search the menu"
              onPress={() => router.push('/search')}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  height: 50,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
                shadows.subtle,
              ]}
            >
              <Ionicons name="search" size={19} color={colors.inkTertiary} />
              <AppText variant="secondary" style={{ fontSize: 15 }}>
                What are you craving?
              </AppText>
            </PressableScale>
          </View>

          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}
            style={{ marginTop: -spacing.sm }}
          >
            {categories.map((c) => (
              <Chip
                key={c.id}
                emoji={c.emoji}
                label={c.name}
                onPress={() => router.push({ pathname: '/(tabs)/menu', params: { category: c.id } })}
              />
            ))}
          </ScrollView>

          {/* Popular right now */}
          <View>
            <SectionHeader title="Popular right now" subtitle="Loved across the room tonight" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.xxs }}
            >
              {popular.map(({ item, count }) => (
                <FoodCard
                  key={item.id}
                  item={item}
                  socialProof={count >= 2 ? `${count} tables ordered this` : undefined}
                />
              ))}
            </ScrollView>
          </View>

          {/* What other tables are ordering */}
          <View style={{ gap: spacing.sm }}>
            <SectionHeader
              title="What other tables are ordering"
              subtitle="Peek, then copy what looks good"
              actionLabel="See all"
              onAction={() => router.push('/(tabs)/tables')}
            />
            {liveTick ? (
              <Animated.View
                style={{
                  marginHorizontal: spacing.lg,
                  alignSelf: 'flex-start',
                  opacity: tickAnim,
                  transform: [{ translateY: tickAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
                }}
              >
                <View
                  accessibilityRole="text"
                  accessibilityLabel={`Live: Table ${liveTick.tableNumber} just added ${getItem(liveTick.menuItemId).name}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    backgroundColor: colors.accentSoft,
                    borderWidth: 1,
                    borderColor: colors.accentSoftBorder,
                    borderRadius: radius.pill,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 7,
                  }}
                >
                  <LiveDot />
                  <AppText variant="caption" style={{ color: colors.accent }} numberOfLines={1}>
                    Table {liveTick.tableNumber} just added {getItem(liveTick.menuItemId).name}
                  </AppText>
                </View>
              </Animated.View>
            ) : null}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.xxs }}
            >
              {tablesByRecency.map((table) => (
                <TableCard key={table.id} table={table} compact justOrdered={justOrdered(table)} />
              ))}
            </ScrollView>
          </View>

          {/* Recommended for you */}
          <View>
            <SectionHeader title="Recommended for you" subtitle="Picked from what tables near you love" />
            <View>
              {recommended.map(({ item, count }) => (
                <FoodRow
                  key={item.id}
                  item={item}
                  socialProof={count >= 2 ? `${count} tables nearby ordered this` : undefined}
                />
              ))}
            </View>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}
