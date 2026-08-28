import { useEffect, useRef } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { OrderStatus } from '../../domain/types';
import { restaurant } from '../../data/seed';
import { selectOrder, useOrders } from '../../store/orders';
import { OrderLineRow } from '../../components/OrderLineRow';
import { StatusTimeline } from '../../components/StatusTimeline';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PressableScale } from '../../components/ui/PressableScale';
import { colors, currency, radius, shadows, spacing } from '../../theme/tokens';

const HERO: Record<OrderStatus, { emoji: string; headline: string }> = {
  placed: { emoji: '📝', headline: "We've got your order" },
  confirmed: { emoji: '✅', headline: 'Kitchen confirmed' },
  preparing: { emoji: '👨‍🍳', headline: 'Being prepared' },
  ready: { emoji: '🛎️', headline: 'Almost at your table' },
  served: { emoji: '🍽️', headline: 'Served — dig in!' },
};

const cardStyle = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.lg,
  padding: spacing.lg,
} as const;

function BillRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <AppText variant={strong ? 'bodyStrong' : 'secondary'}>{label}</AppText>
      <AppText variant={strong ? 'bodyStrong' : 'body'}>{currency(value)}</AppText>
    </View>
  );
}

export default function OrderTrackingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? '');
  const order = useOrders(selectOrder(id));

  // Gentle pop on the hero circle whenever the kitchen moves the order along.
  const pop = useRef(new Animated.Value(1)).current;
  const prevStatus = useRef<OrderStatus | undefined>(order?.status);
  useEffect(() => {
    if (order && prevStatus.current !== order.status) {
      prevStatus.current = order.status;
      pop.setValue(0.7);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }).start();
    }
  }, [order, order?.status, pop]);

  const headerRow = (title: string, subtitle?: string) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
      }}
    >
      <PressableScale
        haptic
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
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
        <Ionicons name="chevron-back" size={22} color={colors.ink} />
      </PressableScale>
      <View style={{ flex: 1, alignItems: 'center', gap: 1 }}>
        <AppText variant="heading">{title}</AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      <View style={{ width: 40 }} />
    </View>
  );

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {headerRow('Order')}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            emoji="🧾"
            title="We can't find that order"
            body="It may have been cleared. Head back and check your orders."
            actionLabel="Go back"
            onAction={() => router.back()}
          />
        </View>
      </View>
    );
  }

  const hero = HERO[order.status];
  const served = order.status === 'served';
  const [etaLow, etaHigh] = order.etaMinutes;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {headerRow(`Order #${order.number}`, `Table ${order.tableNumber}`)}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 24,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Reassuring hero */}
        <View style={[cardStyle, shadows.card, { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }]}>
          <Animated.View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pop }],
            }}
          >
            <AppText style={{ fontSize: 32, lineHeight: 40 }}>{hero.emoji}</AppText>
          </Animated.View>
          <AppText variant="title" style={{ textAlign: 'center' }}>
            {hero.headline}
          </AppText>
          <AppText variant="caption">{served ? 'Enjoy your meal' : `Estimated ${etaLow}–${etaHigh} min`}</AppText>
        </View>

        {/* Live timeline */}
        <View style={[cardStyle, shadows.card]}>
          <StatusTimeline order={order} />
        </View>

        {/* Dishes + bill */}
        <View style={[cardStyle, shadows.card, { paddingVertical: spacing.md }]}>
          <AppText variant="heading" style={{ marginBottom: spacing.xxs }}>
            Your dishes
          </AppText>
          {order.lines.map((line) => (
            <OrderLineRow key={line.id} line={line} editable={false} />
          ))}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs, paddingTop: spacing.sm, gap: spacing.xs }}>
            <BillRow label="Subtotal" value={order.subtotal} />
            <BillRow label={`GST (${restaurant.settings.taxRatePct}%)`} value={order.tax} />
            {order.serviceCharge > 0 ? <BillRow label="Service charge" value={order.serviceCharge} /> : null}
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xxs }}>
              <BillRow label="Total" value={order.total} strong />
            </View>
          </View>
        </View>

        {/* Note for the kitchen */}
        {order.specialInstructions ? (
          <View style={{ backgroundColor: colors.surfaceSubtle, borderRadius: radius.md, padding: spacing.md, gap: spacing.xxs }}>
            <AppText variant="micro">Note for the kitchen</AppText>
            <AppText variant="caption">&ldquo;{order.specialInstructions}&rdquo;</AppText>
          </View>
        ) : null}

        <Button
          variant="ghost"
          size="md"
          label="Still hungry? Browse the menu"
          onPress={() => router.push('/(tabs)/menu')}
        />
      </ScrollView>
    </View>
  );
}
