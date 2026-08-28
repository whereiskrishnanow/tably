import { View } from 'react-native';
import { colors, fonts, radius } from '../../theme/tokens';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  size?: 'md' | 'sm';
}

/** Quantity stepper: − value +. Hitting min hands back min (callers may remove the line). */
export function Stepper({ value, onChange, min = 0, size = 'md' }: StepperProps) {
  const height = size === 'md' ? 40 : 32;
  const buttonSize = size === 'md' ? 40 : 32;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        borderRadius: radius.pill,
        height,
        overflow: 'hidden',
      }}
    >
      <PressableScale
        haptic
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={{ width: buttonSize, height, alignItems: 'center', justifyContent: 'center', opacity: value <= min ? 0.35 : 1 }}
      >
        <AppText style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.accent, lineHeight: 20 }}>−</AppText>
      </PressableScale>
      <AppText
        accessibilityLiveRegion="polite"
        style={{ fontFamily: fonts.semibold, fontSize: size === 'md' ? 15 : 14, minWidth: 22, textAlign: 'center', color: colors.ink }}
      >
        {value}
      </AppText>
      <PressableScale
        haptic
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        onPress={() => onChange(value + 1)}
        style={{ width: buttonSize, height, alignItems: 'center', justifyContent: 'center' }}
      >
        <AppText style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.accent, lineHeight: 20 }}>+</AppText>
      </PressableScale>
    </View>
  );
}
