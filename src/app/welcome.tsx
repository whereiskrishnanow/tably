import { useEffect, useRef } from 'react';
import { Animated, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { restaurant } from '../data/seed';
import { useSession } from '../store/sessionStore';
import { colors, fonts, radius, shadows, spacing } from '../theme/tokens';

export default function WelcomeScreen() {
  const params = useLocalSearchParams<{ table?: string }>();
  const table = typeof params.table === 'string' && params.table.length > 0 ? params.table : '12';
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const heroHeight = Math.round(height * 0.44);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const startOrdering = () => {
    useSession.getState().join();
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — the restaurant, melting into the page */}
        <View style={{ height: heroHeight }}>
          <Image
            source={restaurant.heroImage}
            contentFit="cover"
            transition={200}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.surfaceSunken }}
            accessibilityLabel={`${restaurant.name} restaurant`}
          />
          <LinearGradient
            colors={['transparent', colors.background]}
            locations={[0.35, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                ...shadows.subtle,
              }}
            >
              <AppText style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>CK</AppText>
            </View>
            <AppText variant="display">{restaurant.name}</AppText>
            <AppText variant="secondary">{restaurant.tagline}</AppText>
          </View>
        </View>

        {/* Session card */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: spacing.lg,
              gap: spacing.xs,
              ...shadows.card,
            }}
          >
            <AppText variant="micro" color={colors.inkTertiary}>
              You're dining at
            </AppText>
            <AppText variant="display" style={{ fontSize: 36, lineHeight: 42 }}>
              Table {table}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs }}>
              <Animated.View
                style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success, opacity: pulse }}
              />
              <AppText variant="caption">Session active · scanned just now</AppText>
            </View>
          </View>

          <AppText variant="secondary" style={{ textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.md }}>
            Browse the menu and order directly from your phone — no waiter needed.
          </AppText>
        </View>

        <View style={{ flex: 1 }} />

        {/* CTA */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.md }}>
          <Button label="Start ordering" onPress={startOrdering} accessibilityLabel="Start ordering from the menu" />
          <AppText variant="caption" color={colors.inkTertiary} style={{ textAlign: 'center', paddingHorizontal: spacing.md }}>
            No account needed — you're ordering as a guest. Sign in anytime from Profile.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}
