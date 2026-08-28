import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { colors, fonts, spacing } from '../theme/tokens';
import type { OrderStatus, PlacedOrder } from '../domain/types';
import { AppText } from './ui/AppText';

const STEPS: Array<{ status: OrderStatus; label: string; detail: string }> = [
  { status: 'placed', label: 'Order received', detail: 'We have your order' },
  { status: 'confirmed', label: 'Restaurant confirmed', detail: 'The kitchen accepted it' },
  { status: 'preparing', label: 'Preparing', detail: 'On the stove right now' },
  { status: 'ready', label: 'Ready', detail: 'Plated and heading over' },
  { status: 'served', label: 'Served', detail: 'Enjoy your meal' },
];

const RANK: Record<OrderStatus, number> = { placed: 0, confirmed: 1, preparing: 2, ready: 3, served: 4 };

function PulsingDot() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{ position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accentSoft, transform: [{ scale: pulse }] }}
      />
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent }} />
    </View>
  );
}

/** Vertical order-progress timeline with a pulsing "current" step. */
export function StatusTimeline({ order }: { order: PlacedOrder }) {
  const currentRank = RANK[order.status];

  return (
    <View accessibilityLabel={`Order status: ${STEPS[currentRank].label}`}>
      {STEPS.map((step, i) => {
        const done = i < currentRank;
        const current = i === currentRank;
        const historyEntry = order.statusHistory.find((h) => h.status === step.status);
        const time = historyEntry
          ? new Date(historyEntry.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
          : null;

        return (
          <View key={step.status} style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ alignItems: 'center', width: 26 }}>
              {done ? (
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: colors.success,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 2,
                  }}
                >
                  <AppText style={{ color: '#fff', fontSize: 12, fontFamily: fonts.bold, lineHeight: 14 }}>✓</AppText>
                </View>
              ) : current ? (
                <PulsingDot />
              ) : (
                <View
                  style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.borderStrong, marginVertical: 6, backgroundColor: colors.surface }}
                />
              )}
              {i < STEPS.length - 1 ? (
                <View style={{ width: 2, flex: 1, minHeight: 26, backgroundColor: done ? colors.success : colors.border, borderRadius: 1 }} />
              ) : null}
            </View>
            <View style={{ flex: 1, paddingBottom: i < STEPS.length - 1 ? spacing.lg : 0, paddingTop: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="bodyStrong" style={{ color: done || current ? colors.ink : colors.inkTertiary }}>
                  {step.label}
                </AppText>
                {time && (done || current) ? <AppText variant="caption">{time}</AppText> : null}
              </View>
              {current ? <AppText variant="secondary">{step.detail}</AppText> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
