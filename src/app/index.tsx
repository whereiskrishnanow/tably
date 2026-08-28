import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/ui/AppText';
import { PressableScale } from '../components/ui/PressableScale';
import { useSession } from '../store/sessionStore';
import { colors, fonts, spacing } from '../theme/tokens';

const FINDER_SIZE = 250;
const FINDER_INSET = 8;
const INNER_SIZE = FINDER_SIZE - FINDER_INSET * 2;
const BRACKET_SIZE = 46;
const CELL = 16;
const GLOW_HEIGHT = 22;

// Fixed 8x8 mosaic — deterministic, vaguely QR-ish (finder squares in three corners).
const QR_PATTERN: ReadonlyArray<ReadonlyArray<0 | 1>> = [
  [1, 1, 1, 0, 0, 1, 1, 1],
  [1, 0, 1, 0, 1, 1, 0, 1],
  [1, 1, 1, 0, 0, 1, 1, 1],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 1, 0, 1, 0, 1, 1, 0],
  [1, 1, 1, 0, 1, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 0],
  [1, 1, 1, 0, 1, 0, 1, 1],
];

const JOIN_PARAMS = { restaurant: '123', table: '12', session: 'abc123' } as const;

function CornerBracket({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const top = corner === 'tl' || corner === 'tr';
  const left = corner === 'tl' || corner === 'bl';
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: BRACKET_SIZE,
        height: BRACKET_SIZE,
        top: top ? 0 : undefined,
        bottom: top ? undefined : 0,
        left: left ? 0 : undefined,
        right: left ? undefined : 0,
        borderColor: colors.accent,
        borderTopWidth: top ? 3 : 0,
        borderBottomWidth: top ? 0 : 3,
        borderLeftWidth: left ? 3 : 0,
        borderRightWidth: left ? 0 : 3,
        borderTopLeftRadius: corner === 'tl' ? 24 : 0,
        borderTopRightRadius: corner === 'tr' ? 24 : 0,
        borderBottomLeftRadius: corner === 'bl' ? 24 : 0,
        borderBottomRightRadius: corner === 'br' ? 24 : 0,
      }}
    />
  );
}

export default function ScanScreen() {
  const joined = useSession((s) => s.joined);
  const insets = useSafeAreaInsets();
  const scan = useRef(new Animated.Value(0)).current;
  const navigated = useRef(false);

  const goToWelcome = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace({ pathname: '/welcome', params: JOIN_PARAMS });
  }, []);

  // Scan line sweeps top ↔ bottom, forever.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scan]);

  // Simulate the deep link restaurantapp://join firing once the "camera" finds the code.
  useEffect(() => {
    if (joined) return;
    const timer = setTimeout(goToWelcome, 2600);
    return () => clearTimeout(timer);
  }, [joined, goToWelcome]);

  if (joined) return <Redirect href="/(tabs)" />;

  const translateY = scan.interpolate({ inputRange: [0, 1], outputRange: [0, INNER_SIZE - GLOW_HEIGHT] });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.ink,
        paddingTop: insets.top + spacing.xxl,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
      }}
    >
      {/* Wordmark */}
      <View style={{ alignItems: 'center', gap: spacing.xxs }}>
        <AppText style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.5, color: colors.inkInverse }}>
          Tably
        </AppText>
        <AppText variant="caption" color={colors.inkTertiary}>
          Dine-in, delightfully
        </AppText>
      </View>

      {/* Viewfinder */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          accessibilityLabel="Camera viewfinder scanning for your table's QR code"
          style={{ width: FINDER_SIZE, height: FINDER_SIZE }}
        >
          <View
            style={{
              position: 'absolute',
              top: FINDER_INSET,
              left: FINDER_INSET,
              width: INNER_SIZE,
              height: INNER_SIZE,
              borderRadius: 18,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Deterministic QR-ish mosaic */}
            <View style={{ opacity: 0.14 }}>
              {QR_PATTERN.map((row, r) => (
                <View key={`row-${r}`} style={{ flexDirection: 'row' }}>
                  {row.map((cell, c) => (
                    <View
                      key={`cell-${r}-${c}`}
                      style={{ width: CELL, height: CELL, backgroundColor: cell ? colors.inkInverse : 'transparent' }}
                    />
                  ))}
                </View>
              ))}
            </View>

            {/* Scan line + soft glow */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: GLOW_HEIGHT,
                transform: [{ translateY }],
                justifyContent: 'center',
              }}
            >
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.accentSoft, opacity: 0.16 }} />
              <View style={{ height: 2, backgroundColor: colors.accent, borderRadius: 1 }} />
            </Animated.View>
          </View>

          <CornerBracket corner="tl" />
          <CornerBracket corner="tr" />
          <CornerBracket corner="bl" />
          <CornerBracket corner="br" />
        </View>

        <AppText variant="caption" color={colors.inkTertiary} style={{ marginTop: spacing.xl, textAlign: 'center', maxWidth: 260 }}>
          Point your camera at the QR code on your table
        </AppText>
      </View>

      {/* Manual entry escape hatch */}
      <PressableScale
        onPress={goToWelcome}
        accessibilityRole="button"
        accessibilityLabel="Enter your table code manually"
        style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}
      >
        <AppText variant="caption" color={colors.inkTertiary} style={{ textAlign: 'center' }}>
          Having trouble?{' '}
          <AppText variant="caption" color={colors.inkInverse} style={{ fontFamily: fonts.semibold }}>
            Enter your table code
          </AppText>
        </AppText>
      </PressableScale>
    </View>
  );
}
