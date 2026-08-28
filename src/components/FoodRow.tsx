import { View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, currency, radius, spacing } from '../theme/tokens';
import type { MenuItem } from '../domain/types';
import { AddButton } from './AddButton';
import { AppText } from './ui/AppText';
import { DietaryDot, SpiceIndicator, Tag } from './ui/Badges';
import { PressableScale } from './ui/PressableScale';

interface FoodRowProps {
  item: MenuItem;
  /** e.g. "3 tables nearby ordered this" */
  socialProof?: string;
}

/** Menu list row: details left, photo + Add button right. Tap opens the item sheet. */
export function FoodRow({ item, socialProof }: FoodRowProps) {
  const openSheet = () => router.push({ pathname: '/item/[id]', params: { id: item.id } });

  // The Add control is a SIBLING of the pressable areas (never nested) so the
  // DOM on web stays valid and taps never fight each other.
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
      <PressableScale
        pressedScale={0.99}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${currency(item.price)}`}
        onPress={openSheet}
        style={{ flex: 1, gap: 5, paddingTop: 2 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <DietaryDot dietary={item.dietary} />
          {item.bestseller ? <Tag label="★ Bestseller" tone="gold" /> : null}
          <SpiceIndicator level={item.spice} />
        </View>
        <AppText variant="bodyStrong" style={{ fontSize: 16 }}>
          {item.name}
        </AppText>
        <AppText variant="bodyStrong" style={{ fontSize: 15 }}>
          {currency(item.price)}
        </AppText>
        <AppText variant="secondary" numberOfLines={2}>
          {item.description}
        </AppText>
        {socialProof ? (
          <AppText variant="caption" style={{ color: colors.accent }}>
            {socialProof}
          </AppText>
        ) : null}
      </PressableScale>
      <View style={{ width: 116, alignItems: 'center' }}>
        <PressableScale accessibilityRole="button" accessibilityLabel={`View ${item.name}`} onPress={openSheet}>
          <Image
            source={item.image}
            style={{ width: 116, height: 108, borderRadius: radius.md, backgroundColor: colors.surfaceSunken }}
            contentFit="cover"
            transition={220}
            accessibilityLabel={item.name}
          />
        </PressableScale>
        <View style={{ marginTop: -18 }}>
          <AddButton item={item} />
        </View>
      </View>
    </View>
  );
}
