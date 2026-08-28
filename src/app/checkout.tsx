import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OrderLineRow } from '../components/OrderLineRow';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { SectionHeader } from '../components/ui/SectionHeader';
import { restaurant, session } from '../data/seed';
import type { PlacedOrder, RestaurantSettings } from '../domain/types';
import { cartTotals, selectMyLines, useCart } from '../store/cart';
import { useOrders } from '../store/orders';
import { colors, currency, fonts, radius, shadows, spacing } from '../theme/tokens';

type PaymentMode = RestaurantSettings['paymentModes'][number];

const PAYMENT_COPY: Record<PaymentMode, { title: string; caption: string }> = {
  'pay-at-table': { title: 'Pay at the restaurant', caption: 'Settle when you ask for the bill' },
  'pay-online': { title: 'Pay online now', caption: 'UPI, cards & wallets' },
  split: { title: 'Split with your table', caption: 'Divide it between guests' },
};

function BillRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <AppText variant={strong ? 'bodyStrong' : 'secondary'} style={strong ? { fontSize: 17, lineHeight: 22 } : null}>
        {label}
      </AppText>
      <AppText variant={strong ? 'bodyStrong' : 'body'} style={strong ? { fontSize: 17, lineHeight: 22 } : null}>
        {value}
      </AppText>
    </View>
  );
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const myLines = useCart(selectMyLines);
  const [instructions, setInstructions] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>(
    restaurant.settings.paymentModes.includes('pay-at-table') ? 'pay-at-table' : restaurant.settings.paymentModes[0],
  );
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const popScale = useRef(new Animated.Value(0.6)).current;
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    },
    [],
  );

  // After placing we clear the cart but keep showing the order behind the success overlay.
  const displayLines = placedOrder ? placedOrder.lines : myLines;
  const totals = cartTotals(displayLines);

  if (myLines.length === 0 && !placedOrder) {
    return <Redirect href="/(tabs)" />;
  }

  const handleConfirm = () => {
    if (placedOrder) return;
    const order = useOrders.getState().placeOrder(myLines, instructions);
    useCart.getState().clearMyLines();
    setPlacedOrder(order);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(popScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 9 }),
    ]).start();
    redirectTimer.current = setTimeout(() => {
      router.replace({ pathname: '/order/[id]', params: { id: order.id } });
    }, 1700);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <PressableScale
            haptic
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
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
          <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <AppText variant="heading">Review your order</AppText>
            <AppText variant="caption">Table {session.tableNumber}</AppText>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Read-only order lines */}
          <View
            style={[
              {
                marginHorizontal: spacing.lg,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xxs,
              },
              shadows.card,
            ]}
          >
            {displayLines.map((line, index) => (
              <View key={line.id}>
                {index > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
                <OrderLineRow line={line} editable={false} />
              </View>
            ))}
          </View>

          {/* Special instructions */}
          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader title="Special instructions" subtitle="Allergies, spice level, extra crispy — we'll pass it on" />
            <TextInput
              value={instructions}
              onChangeText={setInstructions}
              multiline
              placeholder="Anything the kitchen should know?"
              placeholderTextColor={colors.inkTertiary}
              accessibilityLabel="Special instructions for the kitchen"
              style={{
                marginHorizontal: spacing.lg,
                minHeight: 88,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
                fontFamily: fonts.regular,
                fontSize: 15,
                lineHeight: 21,
                color: colors.ink,
                textAlignVertical: 'top',
              }}
            />
          </View>

          {/* Payment mode */}
          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader title="How would you like to pay?" />
            <View style={{ marginHorizontal: spacing.lg, gap: spacing.sm }}>
              {restaurant.settings.paymentModes.map((mode) => {
                const copy = PAYMENT_COPY[mode];
                const selected = payMode === mode;
                return (
                  <PressableScale
                    key={mode}
                    haptic
                    onPress={() => setPayMode(mode)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${copy.title}. ${copy.caption}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      borderWidth: 1,
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? colors.accentSoft : colors.surface,
                      borderRadius: radius.md,
                      padding: spacing.md,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: selected ? colors.accent : colors.borderStrong,
                        backgroundColor: colors.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} /> : null}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="bodyStrong">{copy.title}</AppText>
                      <AppText variant="caption">{copy.caption}</AppText>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </View>

          {/* Bill summary */}
          <View
            style={[
              {
                marginHorizontal: spacing.lg,
                marginTop: spacing.xl,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.lg,
                gap: spacing.sm,
              },
              shadows.card,
            ]}
          >
            <BillRow label="Subtotal" value={currency(totals.subtotal)} />
            <BillRow label={`GST (${restaurant.settings.taxRatePct}%)`} value={currency(totals.tax)} />
            {totals.serviceCharge > 0 ? (
              <BillRow
                label={`Service charge (${restaurant.settings.serviceChargePct}%)`}
                value={currency(totals.serviceCharge)}
              />
            ) : null}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.xxs }} />
            <BillRow label="Total" value={currency(totals.total)} strong />
          </View>
        </ScrollView>

        {/* Pinned footer */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xs,
          }}
        >
          <Button
            label="Confirm order"
            detail={currency(totals.total)}
            onPress={handleConfirm}
            accessibilityLabel={`Confirm order, total ${currency(totals.total)}`}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Success overlay */}
      {placedOrder ? (
        <Animated.View
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: overlayOpacity,
          }}
        >
          <Animated.View
            style={{ alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, transform: [{ scale: popScale }] }}
          >
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: colors.success,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.xs,
              }}
            >
              <Ionicons name="checkmark" size={48} color={colors.inkInverse} />
            </View>
            <AppText variant="display" style={{ textAlign: 'center' }}>
              Order placed 🎉
            </AppText>
            <AppText variant="secondary" style={{ textAlign: 'center' }}>
              Order #{placedOrder.number}
            </AppText>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}
