import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TableCard } from '../../components/TableCard';
import { AppText } from '../../components/ui/AppText';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { getItem } from '../../data/menu';
import type { ActiveTable } from '../../domain/types';
import { useTables, type LiveTickerEntry } from '../../store/tables';
import { colors, fonts, radius, shadows, spacing } from '../../theme/tokens';

type SortKey = 'recent' | 'items' | 'popular';
type FilterKey = 'all' | 'veg' | 'desserts' | 'drinks';

const SORTS: Array<{ key: SortKey; label: string; emoji?: string }> = [
  { key: 'recent', label: 'Recent' },
  { key: 'items', label: 'Most items' },
  { key: 'popular', label: 'Popular first', emoji: '🔥' },
];

const FILTERS: Array<{ key: FilterKey; label: string; emoji?: string }> = [
  { key: 'all', label: 'All' },
  { key: 'veg', label: 'Veg-friendly', emoji: '🌿' },
  { key: 'desserts', label: 'Desserts', emoji: '🍮' },
  { key: 'drinks', label: 'Drinks', emoji: '🥤' },
];

const JUST_ORDERED_WINDOW_MS = 15_000;

const timeAgo = (ts: number): string => {
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
};

const itemCount = (t: ActiveTable) => t.items.reduce((n, i) => n + i.quantity, 0);

const matchesFilter = (t: ActiveTable, filter: FilterKey): boolean => {
  if (filter === 'all') return true;
  if (filter === 'veg') return t.items.some((i) => getItem(i.menuItemId).dietary === 'veg');
  return t.items.some((i) => getItem(i.menuItemId).categoryId === filter);
};

/** Softly pulsing dot that says "this feed is live". */
function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, opacity: pulse }}
    />
  );
}

/** One line of the live ticker. The newest entry fades in and sits on an accent wash. */
function TickerRow({ entry, newest }: { entry: LiveTickerEntry; newest: boolean }) {
  const opacity = useRef(new Animated.Value(newest ? 0 : 1)).current;

  useEffect(() => {
    // Fade in once on mount; the row simply holds its place afterwards.
    if (newest) {
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    }
  }, [newest, opacity]);

  return (
    <Animated.View
      style={{
        opacity,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: 7,
        paddingHorizontal: spacing.xs,
        borderRadius: radius.sm,
        backgroundColor: newest ? colors.accentSoft : 'transparent',
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
      <AppText numberOfLines={1} style={{ flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink }}>
        Table {entry.tableNumber} · {getItem(entry.menuItemId).name}
      </AppText>
      <AppText style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.inkTertiary }}>{timeAgo(entry.at)}</AppText>
    </Animated.View>
  );
}

export default function TablesScreen() {
  const insets = useSafeAreaInsets();
  const { tables, ticker, recentlyUpdated } = useTables();
  const [sort, setSort] = useState<SortKey>('recent');
  const [filter, setFilter] = useState<FilterKey>('all');

  // Gentle clock so "2m ago" labels and the 15s "just ordered" flags stay honest.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  const visibleTables = useMemo(() => {
    const filtered = tables.filter((t) => matchesFilter(t, filter));
    const sorted = [...filtered];
    if (sort === 'recent') sorted.sort((a, b) => b.lastOrderedAt - a.lastOrderedAt);
    if (sort === 'items') sorted.sort((a, b) => itemCount(b) - itemCount(a));
    if (sort === 'popular') {
      sorted.sort((a, b) => Number(b.isHot) - Number(a.isHot) || b.lastOrderedAt - a.lastOrderedAt);
    }
    return sorted;
  }, [tables, filter, sort]);

  const tickerEntries = ticker.slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: 150 }}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xxs }}>
          <AppText variant="display">Other tables</AppText>
          <AppText variant="secondary">See what the room is having tonight</AppText>
        </View>

        {/* Live activity */}
        <View
          style={[
            {
              marginTop: spacing.lg,
              marginHorizontal: spacing.lg,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
              gap: spacing.xs,
            },
            shadows.card,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs }}>
            <LiveDot />
            <AppText variant="micro">Live from the room</AppText>
          </View>
          {tickerEntries.length === 0 ? (
            <AppText variant="caption" style={{ paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs }}>
              Live orders will appear here as the room gets hungry.
            </AppText>
          ) : (
            <View>
              {tickerEntries.map((entry, index) => (
                <TickerRow key={entry.id} entry={entry} newest={index === 0} />
              ))}
            </View>
          )}
        </View>

        {/* Sort */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: spacing.lg }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}
        >
          {SORTS.map((s) => (
            <Chip key={s.key} label={s.label} emoji={s.emoji} selected={sort === s.key} onPress={() => setSort(s.key)} />
          ))}
        </ScrollView>

        {/* Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: spacing.xs }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}
        >
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} emoji={f.emoji} selected={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ScrollView>

        {/* Tables */}
        {visibleTables.length === 0 ? (
          <EmptyState
            emoji="👀"
            title="It's quiet in here"
            body="No other tables have ordered recently."
            actionLabel={filter === 'all' ? undefined : 'Show all tables'}
            onAction={filter === 'all' ? undefined : () => setFilter('all')}
          />
        ) : (
          <View style={{ marginTop: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md }}>
            {visibleTables.map((table) => {
              const updatedAt = recentlyUpdated[table.id];
              const justOrdered = updatedAt !== undefined && Date.now() - updatedAt < JUST_ORDERED_WINDOW_MS;
              return <TableCard key={table.id} table={table} justOrdered={justOrdered} />;
            })}
          </View>
        )}

        {/* Privacy note */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: spacing.xl,
            paddingHorizontal: spacing.xl,
          }}
        >
          <Ionicons name="lock-closed-outline" size={13} color={colors.inkTertiary} />
          <AppText variant="caption" color={colors.inkTertiary} style={{ textAlign: 'center', flexShrink: 1 }}>
            Guests stay anonymous — you only ever see dishes, never people.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}
