import { View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, fonts, radius, shadows, spacing } from '../theme/tokens';
import type { ActiveTable } from '../domain/types';
import { getItem } from '../data/menu';
import { restaurant } from '../data/seed';
import { AppText } from './ui/AppText';
import { Tag } from './ui/Badges';
import { PressableScale } from './ui/PressableScale';

interface TableCardProps {
  table: ActiveTable;
  /** Compact horizontal-scroll variant used on Home. */
  compact?: boolean;
  /** Set briefly after a live update to flash a "just ordered" tag. */
  justOrdered?: boolean;
}

const timeAgo = (ts: number) => {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60_000));
  return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
};

export function tableDisplayName(table: ActiveTable): string {
  return restaurant.settings.showExactTableNumbers ? `Table ${table.tableNumber}` : 'A table nearby';
}

/** Card showing another table's live order; tap to view and copy items. */
export function TableCard({ table, compact = false, justOrdered = false }: TableCardProps) {
  const itemCount = table.items.reduce((n, i) => n + i.quantity, 0);
  const names = table.items.map((i) => getItem(i.menuItemId).name);
  const thumbs = table.items.slice(0, 3).map((i) => getItem(i.menuItemId).image);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${tableDisplayName(table)}, ${itemCount} items ordered. View their order.`}
      onPress={() => router.push({ pathname: '/table/[id]', params: { id: table.id } })}
      style={[
        {
          width: compact ? 252 : undefined,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          gap: spacing.sm,
        },
        shadows.card,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.accent }}>
            {restaurant.settings.showExactTableNumbers ? `T${table.tableNumber}` : '👥'}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="bodyStrong">{tableDisplayName(table)}</AppText>
            {table.isHot ? <Tag label="🔥 Popular" tone="accent" /> : null}
            {justOrdered ? <Tag label="Just ordered" tone="success" /> : null}
          </View>
          <AppText variant="caption">
            {itemCount} item{itemCount === 1 ? '' : 's'} · {timeAgo(table.lastOrderedAt)}
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flexDirection: 'row' }}>
          {thumbs.map((src, i) => (
            <Image
              key={i}
              source={src}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                marginLeft: i === 0 ? 0 : -10,
                borderWidth: 2,
                borderColor: colors.surface,
                backgroundColor: colors.surfaceSunken,
              }}
              contentFit="cover"
              transition={200}
            />
          ))}
        </View>
        <AppText variant="secondary" numberOfLines={compact ? 1 : 2} style={{ flex: 1, fontSize: 13 }}>
          {names.join(' · ')}
        </AppText>
      </View>

      <View
        style={{
          alignSelf: 'flex-start',
          backgroundColor: colors.surfaceSubtle,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
        }}
      >
        <AppText style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }}>View table order →</AppText>
      </View>
    </PressableScale>
  );
}
