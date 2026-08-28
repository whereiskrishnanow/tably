import { View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, currency, radius, shadows, spacing } from '../theme/tokens';
import type { MenuItem } from '../domain/types';
import { AddButton } from './AddButton';
import { AppText } from './ui/AppText';
import { DietaryDot, Tag } from './ui/Badges';
import { PressableScale } from './ui/PressableScale';

interface FoodCardProps {
  item: MenuItem;
  width?: number;
  socialProof?: string;
}

/** Vertical food card for carousels ("Popular right now", recommendations). */
export function FoodCard({ item, width = 172, socialProof }: FoodCardProps) {
  // Add control stays a sibling of the pressable area (valid DOM on web).
  return (
    <View
      style={[
        {
          width,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        },
        shadows.card,
      ]}
    >
      <PressableScale
        pressedScale={0.98}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${currency(item.price)}`}
        onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
      >
        <View>
          <Image
            source={item.image}
            style={{ width: '100%', height: 124, backgroundColor: colors.surfaceSunken }}
            contentFit="cover"
            transition={220}
            accessibilityLabel={item.name}
          />
          {item.bestseller ? (
            <View style={{ position: 'absolute', top: 8, left: 8 }}>
              <Tag label="★ Bestseller" tone="gold" />
            </View>
          ) : null}
        </View>
        <View style={{ paddingHorizontal: spacing.sm, paddingTop: spacing.sm, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <DietaryDot dietary={item.dietary} size={12} />
            <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
              {item.name}
            </AppText>
          </View>
          {socialProof ? (
            <AppText variant="caption" numberOfLines={1} style={{ color: colors.accent }}>
              {socialProof}
            </AppText>
          ) : null}
        </View>
      </PressableScale>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.sm,
          paddingBottom: spacing.sm,
          paddingTop: 6,
        }}
      >
        <AppText variant="bodyStrong">{currency(item.price)}</AppText>
        <AddButton item={item} showHint={false} />
      </View>
    </View>
  );
}
