import { View } from 'react-native';
import { colors, fonts, spacing } from '../../theme/tokens';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.sm,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="title" style={{ fontSize: 20, lineHeight: 26 }}>
          {title}
        </AppText>
        {subtitle ? <AppText variant="secondary">{subtitle}</AppText> : null}
      </View>
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} accessibilityRole="button" style={{ paddingVertical: 4, paddingLeft: spacing.sm }}>
          <AppText style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.accent }}>{actionLabel}</AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}
