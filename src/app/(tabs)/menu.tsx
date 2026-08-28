import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FoodRow } from '../../components/FoodRow';
import { AppText } from '../../components/ui/AppText';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { PressableScale } from '../../components/ui/PressableScale';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { categories, menuItems } from '../../data/menu';
import { restaurant } from '../../data/seed';
import type { MenuItem } from '../../domain/types';
import { selectPopularity, useTables } from '../../store/tables';
import { colors, spacing } from '../../theme/tokens';

type FilterId = 'veg' | 'non-veg' | 'bestseller' | 'spicy' | 'under300';

const FILTERS: Array<{ id: FilterId; label: string; emoji: string }> = [
  { id: 'veg', label: 'Veg', emoji: '🟢' },
  { id: 'non-veg', label: 'Non-veg', emoji: '🔺' },
  { id: 'bestseller', label: 'Bestseller', emoji: '★' },
  { id: 'spicy', label: 'Spicy', emoji: '🌶️' },
  { id: 'under300', label: 'Under ₹300', emoji: '💸' },
];

function matchesFilters(item: MenuItem, filters: FilterId[]): boolean {
  return filters.every((f) => {
    switch (f) {
      case 'veg':
        return item.dietary === 'veg';
      case 'non-veg':
        return item.dietary === 'non-veg';
      case 'bestseller':
        return item.bestseller;
      case 'spicy':
        return item.spice >= 2;
      case 'under300':
        return item.price < 30000;
    }
  });
}

function RowDivider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg }} />;
}

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { category: categoryParam } = useLocalSearchParams<{ category?: string | string[] }>();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filters, setFilters] = useState<FilterId[]>([]);

  // Honour /(tabs)/menu?category=… deep links, including repeat navigations.
  useEffect(() => {
    const id = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;
    if (id && categories.some((c) => c.id === id)) setSelectedCategory(id);
  }, [categoryParam]);

  const tables = useTables((s) => s.tables);
  const popularity = useMemo(() => selectPopularity(useTables.getState()), [tables]);

  const toggleFilter = (id: FilterId) => {
    setFilters((current) => {
      if (current.includes(id)) return current.filter((f) => f !== id);
      const opposite: FilterId | null = id === 'veg' ? 'non-veg' : id === 'non-veg' ? 'veg' : null;
      return [...current.filter((f) => f !== opposite), id];
    });
  };

  const sections = useMemo(() => {
    const visible = selectedCategory === 'all' ? categories : categories.filter((c) => c.id === selectedCategory);
    return visible
      .map((category) => ({
        category,
        items: menuItems.filter((i) => i.categoryId === category.id && i.available && matchesFilters(i, filters)),
      }))
      .filter((s) => s.items.length > 0);
  }, [selectedCategory, filters]);

  const socialProofFor = (item: MenuItem) => {
    const count = popularity.get(item.id) ?? 0;
    return count >= 2 ? `Ordered by ${count} tables tonight` : undefined;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header + chip rows stay put; only the dish list scrolls. */}
      <View style={{ paddingTop: insets.top + spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
          }}
        >
          <View style={{ gap: 2 }}>
            <AppText variant="display">Menu</AppText>
            <AppText variant="secondary">{restaurant.name}</AppText>
          </View>
          <PressableScale
            haptic
            accessibilityRole="button"
            accessibilityLabel="Search the menu"
            onPress={() => router.push('/search')}
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
            <Ionicons name="search" size={20} color={colors.ink} />
          </PressableScale>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginTop: spacing.md }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}
        >
          <Chip label="All" selected={selectedCategory === 'all'} onPress={() => setSelectedCategory('all')} />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              emoji={category.emoji}
              selected={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginTop: spacing.xs }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.xs, paddingBottom: spacing.sm }}
        >
          {FILTERS.map((filter) => (
            <Chip
              key={filter.id}
              label={filter.label}
              emoji={filter.emoji}
              selected={filters.includes(filter.id)}
              onPress={() => toggleFilter(filter.id)}
              style={{ height: 32, paddingHorizontal: spacing.sm }}
            />
          ))}
        </ScrollView>

        <View style={{ height: 1, backgroundColor: colors.border }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {sections.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="We couldn't find that."
            body="Try another dish or a different filter."
            actionLabel="Clear filters"
            onAction={() => setFilters([])}
          />
        ) : (
          sections.map(({ category, items }) => (
            <View key={category.id} style={{ marginBottom: spacing.xl }}>
              <SectionHeader
                title={`${category.emoji} ${category.name}`}
                subtitle={`${items.length} ${items.length === 1 ? 'dish' : 'dishes'}`}
              />
              {items.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <RowDivider /> : null}
                  <FoodRow item={item} socialProof={socialProofFor(item)} />
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
