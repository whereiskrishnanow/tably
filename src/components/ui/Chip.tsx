import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fonts, radius, spacing } from '../../theme/tokens';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  emoji?: string;
  style?: StyleProp<ViewStyle>;
}

/** Selectable pill used for categories and filters. */
export function Chip({ label, selected = false, onPress, emoji, style }: ChipProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: spacing.md,
          height: 38,
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.ink : colors.surface,
          borderWidth: 1,
          borderColor: selected ? colors.ink : colors.border,
        },
        style,
      ]}
    >
      {emoji ? <AppText style={{ fontSize: 14 }}>{emoji}</AppText> : null}
      <AppText style={{ fontFamily: fonts.medium, fontSize: 14, color: selected ? colors.inkInverse : colors.ink }}>{label}</AppText>
    </PressableScale>
  );
}
