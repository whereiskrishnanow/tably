import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OrderStatus, PlacedOrder } from '../../domain/types';
import { getItem } from '../../data/menu';
import { useOrders } from '../../store/orders';
import { AppText } from '../../components/ui/AppText';
import { Tag } from '../../components/ui/Badges';
import { EmptyState } from '../../components/ui/EmptyState';
import { PressableScale } from '../../components/ui/PressableScale';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { colors, currency, radius, shadows, spacing } from '../../theme/tokens';

/** Human-friendly labels + progress rank (out of 4) for the slim progress track. */
const STATUS_META: Record<OrderStatus, { label: string; rank: number }> = {
  placed: { label: 'Order placed', rank: 1 },
  confirmed: { label: 'Kitchen confirmed', rank: 2 },
  preparing: { label: 'Being prepared', rank: 3 },
  ready: { label: 'On its way', rank: 4 },
  served: { label: 'Served', rank: 4 },
};

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const hours = d.getHours();
  const h = hours % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m} ${hours >= 12 ? 'pm' : 'am'}`;
};

/** 4px track that animates its accent fill as the kitchen moves the order along. */
function ProgressTrack({ progress }: { progress: number }) {
  const anim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width animation
    }).start();
  }, [anim, progress]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View
      style={{
        height: 4,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSunken,
        overflow: 'hidden',
      }}
    >
      <Animated.View style={{ height: '100%', width, borderRadius: radius.pill, backgroundColor: colors.accent }} />
    </View>
  );
}

function OrderCard({ order }: { order: PlacedOrder }) {
  const served = order.status === 'served';
  const meta = STATUS_META[order.status];
  const dishSummary = order.lines.map((line) => getItem(line.menuItemId).name).join(' · ');

  return (
    <PressableScale
      haptic
      accessibilityRole="button"
      accessibilityLabel={`Order number ${order.number}, ${meta.label}, total ${currency(order.total)}. View details`}
      onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.sm,
        },
        shadows.card,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <AppText variant="bodyStrong">Order #{order.number}</AppText>
        <Tag label={meta.label} tone={served ? 'success' : 'accent'} />
      </View>

      <AppText variant="caption">
        Placed {formatTime(order.placedAt)} · Table {order.tableNumber}
      </AppText>

      {!served ? <ProgressTrack progress={meta.rank / 4} /> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <AppText variant="secondary" numberOfLines={1} style={{ flex: 1 }}>
          {dishSummary}
        </AppText>
        <AppText variant="bodyStrong">{currency(order.total)}</AppText>
      </View>
    </PressableScale>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const orders = useOrders((s) => s.orders);

  const activeOrders = orders.filter((o) => o.status !== 'served');
  const servedOrders = orders.filter((o) => o.status === 'served');
  const isEmpty = orders.length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: Math.max(insets.bottom + 120, 140),
        flexGrow: isEmpty ? 1 : undefined,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl, gap: spacing.xxs }}>
        <AppText variant="display">Your orders</AppText>
        <AppText variant="secondary">Everything you&apos;ve asked the kitchen for</AppText>
      </View>

      {isEmpty ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            emoji="🧾"
            title="No orders yet"
            body="When you place an order, you can track it here."
            actionLabel="Browse menu"
            onAction={() => router.push('/(tabs)/menu')}
          />
        </View>
      ) : (
        <>
          {activeOrders.length > 0 ? (
            <View style={{ marginBottom: servedOrders.length > 0 ? spacing.xl : 0 }}>
              <SectionHeader title="In the kitchen" subtitle="Live from the pass" />
              <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
                {activeOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </View>
            </View>
          ) : null}

          {servedOrders.length > 0 ? (
            <View>
              <SectionHeader title="Earlier tonight" subtitle="Already on the table" />
              <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
                {servedOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
