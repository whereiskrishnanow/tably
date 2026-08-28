import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/ui/AppText';
import { DietaryDot, Tag } from '../../components/ui/Badges';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PressableScale } from '../../components/ui/PressableScale';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { getItem } from '../../data/menu';
import type { TableOrderItem } from '../../domain/types';
import { useCart } from '../../store/cart';
import { useTables, selectTable } from '../../store/tables';
import { colors, currency, fonts, hitSlop, radius, shadows, spacing } from '../../theme/tokens';

const FRESH_WINDOW_MS = 15_000;

const timeAgo = (ts: number): string => {
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
};

interface OrderItemRowProps {
  item: TableOrderItem;
  /** True while the dish was ordered moments ago — gets an accent wash. */
  fresh: boolean;
  /** True when the row appeared after first render (a live order landing). */
  animateIn: boolean;
  onAdd: (item: TableOrderItem) => void;
}

function OrderItemRow({ item, fresh, animateIn, onAdd }: OrderItemRowProps) {
  const menuItem = getItem(item.menuItemId);
  const opacity = useRef(new Animated.Value(animateIn ? 0 : 1)).current;

  useEffect(() => {
    if (animateIn) {
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    }
  }, [animateIn, opacity]);

  return (
    <Animated.View
      style={[
        {
          opacity,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: fresh ? colors.accentSoft : colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: fresh ? colors.accentSoftBorder : colors.border,
          padding: spacing.sm,
        },
        shadows.subtle,
      ]}
    >
      <Image
        source={menuItem.image}
        style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceSunken }}
        contentFit="cover"
        transition={200}
      />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <DietaryDot dietary={menuItem.dietary} size={13} />
          <AppText variant="bodyStrong" numberOfLines={2} style={{ flexShrink: 1 }}>
            {menuItem.name}
          </AppText>
        </View>
        <AppText variant="caption">
          × {item.quantity} · {currency(menuItem.price)}
        </AppText>
      </View>
      <Button
        label="＋ Add to mine"
        size="sm"
        variant="secondary"
        onPress={() => onAdd(item)}
        accessibilityLabel={`Add ${menuItem.name} to my order`}
      />
    </Animated.View>
  );
}

export default function TableDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const table = useTables(selectTable(id ?? ''));
  const addItem = useCart((s) => s.addItem);

  // Ticks so the fresh-order highlight and "last ordered" label expire on time.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5_000);
    return () => clearInterval(t);
  }, []);

  // Items present at first render — anything beyond these arrived live and fades in.
  const initialItemIds = useRef<Set<string> | null>(null);
  if (table && initialItemIds.current === null) {
    initialItemIds.current = new Set(table.items.map((i) => i.id));
  }

  const headerRow = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
        gap: spacing.sm,
      }}
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={hitSlop}
        onPress={() => router.back()}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="chevron-back" size={22} color={colors.ink} />
      </PressableScale>
      <AppText variant="heading" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
        {table ? `Table ${table.tableNumber}'s order` : 'Table order'}
      </AppText>
      <View style={{ width: 40 }} />
    </View>
  );

  if (!table) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {headerRow}
        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: insets.bottom + 24 }}>
          <EmptyState
            emoji="🪑"
            title="Can't find that table"
            body="Looks like they've finished up and headed home."
            actionLabel="Go back"
            onAction={() => router.back()}
          />
        </View>
      </View>
    );
  }

  const addOne = (item: TableOrderItem) => {
    addItem(item.menuItemId, {
      quantity: 1,
      sourceRef: { tableNumber: table.tableNumber, orderItemId: item.id },
    });
  };

  const addAll = () => {
    for (const item of table.items) {
      addItem(item.menuItemId, {
        quantity: 1,
        sourceRef: { tableNumber: table.tableNumber, orderItemId: item.id },
      });
    }
  };

  const dishCount = table.items.length;
  const allTotal = table.items.reduce((sum, i) => sum + getItem(i.menuItemId).price, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {headerRow}

      {/* Meta line — dishes only, never people */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
        }}
      >
        <AppText variant="caption">
          {table.guestCount} guest{table.guestCount === 1 ? '' : 's'} · last ordered {timeAgo(table.lastOrderedAt)}
        </AppText>
        {table.isHot ? <Tag label="🔥 Popular" tone="accent" /> : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        {/* Explainer strip */}
        <View
          style={{
            marginHorizontal: spacing.lg,
            marginBottom: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            backgroundColor: colors.surfaceSubtle,
            borderRadius: radius.pill,
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
          }}
        >
          <Ionicons name="copy-outline" size={14} color={colors.inkSecondary} />
          <AppText variant="caption" style={{ flex: 1 }}>
            Anything you add is copied to your order — Table {table.tableNumber} won't be changed.
          </AppText>
        </View>

        <SectionHeader
          title="On their table"
          subtitle={`${dishCount} dish${dishCount === 1 ? '' : 'es'} so far — tap ＋ to copy one to yours`}
        />

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {table.items.map((item) => (
            <OrderItemRow
              key={item.id}
              item={item}
              fresh={Date.now() - item.orderedAt < FRESH_WINDOW_MS}
              animateIn={initialItemIds.current !== null && !initialItemIds.current.has(item.id)}
              onAdd={addOne}
            />
          ))}
        </View>
      </ScrollView>

      {/* Pinned footer */}
      <View
        style={[
          {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.sm,
          },
          shadows.raised,
        ]}
      >
        <Button
          label="Add all to my order"
          detail={currency(allTotal)}
          onPress={addAll}
          disabled={dishCount === 0}
          accessibilityLabel={`Add all ${dishCount} dishes to my order`}
        />
      </View>
    </View>
  );
}
