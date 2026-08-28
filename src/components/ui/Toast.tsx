import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadows, spacing } from '../../theme/tokens';
import { useToast } from '../../store/toast';
import { AppText } from './AppText';

/** Global toast host — mounted once in the root layout, floats above everything. */
export function ToastHost() {
  const toast = useToast((s) => s.current);
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (toast) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 6 }),
      ]).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => translateY.setValue(12));
    }
  }, [toast, opacity, translateY]);

  if (!toast) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 108, alignItems: 'center' }}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            backgroundColor: colors.chip,
            paddingHorizontal: spacing.lg,
            paddingVertical: 12,
            borderRadius: radius.pill,
            maxWidth: '86%',
            opacity,
            transform: [{ translateY }],
          },
          shadows.raised,
        ]}
      >
        {toast.emoji ? <AppText style={{ fontSize: 15 }}>{toast.emoji}</AppText> : null}
        <AppText numberOfLines={2} style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.chipInk }}>
          {toast.message}
        </AppText>
      </Animated.View>
    </View>
  );
}
