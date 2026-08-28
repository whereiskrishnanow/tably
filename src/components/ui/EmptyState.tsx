import { View } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

interface EmptyStateProps {
  emoji: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.xs }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.surfaceSubtle,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xs,
        }}
      >
        <AppText style={{ fontSize: 30 }}>{emoji}</AppText>
      </View>
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText variant="secondary" style={{ textAlign: 'center', maxWidth: 280 }}>
        {body}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} size="md" variant="secondary" onPress={onAction} style={{ marginTop: spacing.md }} /> : null}
    </View>
  );
}
