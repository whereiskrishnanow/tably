import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { router } from 'expo-router';
import { colors, currency, fonts, radius, shadows, spacing } from '../theme/tokens';
import { cartTotals, selectMyItemCount, selectMyLines, useCart } from '../store/cart';
import { AppText } from './ui/AppText';
import { PressableScale } from './ui/PressableScale';

/**
 * Floating order indicator shown above the tab bar whenever the user's
 * order has items. Pops subtly when the count changes.
 */
export function CartPill({ bottom }: { bottom: number }) {
  const count = useCart(selectMyItemCount);
  const myLines = useCart(selectMyLines);
  const { total } = cartTotals(myLines);

  const appear = useRef(new Animated.Value(count > 0 ? 1 : 0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    Animated.spring(appear, { toValue: count > 0 ? 1 : 0, useNativeDriver: true, speed: 20, bounciness: 7 }).start();
    if (count > 0 && count !== prevCount.current) {
      pop.setValue(0.94);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 12 }).start();
    }
    prevCount.current = count;
  }, [count, appear, pop]);

  if (count === 0) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom,
        opacity: appear,
        transform: [
          { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
          { scale: pop },
        ],
      }}
    >
      <PressableScale
        haptic
        accessibilityRole="button"
        accessibilityLabel={`View your order: ${count} items, ${currency(total)}`}
        onPress={() => router.push('/cart')}
        style={[
          {
            backgroundColor: colors.ink,
            borderRadius: radius.pill,
            height: 54,
            paddingHorizontal: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          shadows.raised,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              backgroundColor: colors.accent,
              minWidth: 26,
              height: 26,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 7,
            }}
          >
            <AppText style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.inkInverse }}>{count}</AppText>
          </View>
          <AppText style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.inkInverse }}>View order</AppText>
        </View>
        <AppText style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.inkInverse }}>{currency(total)}</AppText>
      </PressableScale>
    </Animated.View>
  );
}
