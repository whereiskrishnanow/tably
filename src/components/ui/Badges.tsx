import { View } from 'react-native';
import type { Dietary, SpiceLevel } from '../../domain/types';
import { colors, fonts, radius } from '../../theme/tokens';
import { AppText } from './AppText';

/** Indian FSSAI-style dietary mark: green square/dot = veg, brown = non-veg. */
export function DietaryDot({ dietary, size = 14 }: { dietary: Dietary; size?: number }) {
  const color = dietary === 'veg' ? colors.veg : colors.nonVeg;
  return (
    <View
      accessibilityLabel={dietary === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size * 0.225, backgroundColor: color }} />
    </View>
  );
}

export function SpiceIndicator({ level }: { level: SpiceLevel }) {
  if (level === 0) return null;
  const label = level === 1 ? 'Mild heat' : level === 2 ? 'Medium heat' : 'Fiery';
  return (
    <AppText accessibilityLabel={`Spice: ${label}`} style={{ fontSize: 11, letterSpacing: 1 }}>
      {'🌶️'.repeat(level)}
    </AppText>
  );
}

export function Tag({ label, tone = 'gold' }: { label: string; tone?: 'gold' | 'accent' | 'neutral' | 'success' }) {
  const palette = {
    gold: { bg: colors.goldSoft, ink: colors.gold },
    accent: { bg: colors.accentSoft, ink: colors.accent },
    neutral: { bg: colors.surfaceSubtle, ink: colors.inkSecondary },
    success: { bg: colors.successSoft, ink: colors.success },
  }[tone];
  return (
    <View style={{ backgroundColor: palette.bg, borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 3 }}>
      <AppText style={{ fontFamily: fonts.semibold, fontSize: 11, color: palette.ink }}>{label}</AppText>
    </View>
  );
}
