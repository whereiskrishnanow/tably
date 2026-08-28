import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, radius, shadows, spacing } from '../../theme/tokens';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark';
  size?: 'lg' | 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  /** Right-aligned detail, e.g. a price: label left, detail right. */
  detail?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const HEIGHTS = { lg: 56, md: 48, sm: 38 } as const;
const FONT_SIZES = { lg: 16, md: 15, sm: 14 } as const;

export function Button({ label, onPress, variant = 'primary', size = 'lg', disabled, loading, detail, style, accessibilityLabel }: ButtonProps) {
  const background =
    variant === 'primary' ? colors.accent : variant === 'dark' ? colors.chip : variant === 'secondary' ? colors.accentSoft : 'transparent';
  const ink = variant === 'primary' || variant === 'dark' ? colors.inkInverse : colors.accent;

  return (
    <PressableScale
      haptic
      disabled={disabled || loading}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        {
          height: HEIGHTS[size],
          borderRadius: radius.pill,
          backgroundColor: background,
          opacity: disabled ? 0.4 : 1,
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: detail ? 'space-between' : 'center',
          gap: spacing.xs,
        },
        variant === 'primary' && !disabled ? shadows.raised : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ink} />
      ) : (
        <>
          <AppText style={{ fontFamily: fonts.semibold, fontSize: FONT_SIZES[size], color: ink }}>{label}</AppText>
          {detail ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ink, opacity: 0.5 }} />
              <AppText style={{ fontFamily: fonts.semibold, fontSize: FONT_SIZES[size], color: ink }}>{detail}</AppText>
            </View>
          ) : null}
        </>
      )}
    </PressableScale>
  );
}
