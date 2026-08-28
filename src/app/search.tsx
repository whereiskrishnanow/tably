import { useEffect, useMemo, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FoodRow } from '../components/FoodRow';
import { AppText } from '../components/ui/AppText';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { PressableScale } from '../components/ui/PressableScale';
import { SectionHeader } from '../components/ui/SectionHeader';
import { menuItems } from '../data/menu';
import type { MenuItem } from '../domain/types';
import { selectPopularity, useTables } from '../store/tables';
import { colors, fonts, radius, spacing } from '../theme/tokens';

const POPULAR_SEARCHES = ['chicken', 'paneer', 'naan', 'biryani', 'dessert', 'coffee'];

function matchesQuery(item: MenuItem, words: string[]): boolean {
  const haystack = [item.name, item.description, ...item.tags, ...item.ingredients].join(' ').toLowerCase();
  return words.some((word) => haystack.includes(word));
}

function RowDivider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg }} />;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  const tables = useTables((s) => s.tables);
  const popularity = useMemo(() => selectPopularity(useTables.getState()), [tables]);

  const words = useMemo(
    () => debouncedQuery.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [debouncedQuery],
  );

  const results = useMemo(() => {
    if (words.length === 0) return null;
    return menuItems.filter((item) => item.available && matchesQuery(item, words));
  }, [words]);

  const favourites = useMemo(() => menuItems.filter((item) => item.bestseller && item.available), []);

  const socialProofFor = (item: MenuItem) => {
    const count = popularity.get(item.id) ?? 0;
    return count >= 2 ? `Ordered by ${count} tables tonight` : undefined;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <PressableScale
          haptic
          accessibilityRole="button"
          accessibilityLabel="Go back"
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

        <View
          style={{
            flex: 1,
            height: 44,
            borderRadius: radius.pill,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.md,
            gap: spacing.xs,
          }}
        >
          <Ionicons name="search" size={18} color={colors.inkTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => {
              setDebouncedQuery(query);
              Keyboard.dismiss();
            }}
            placeholder="Search dishes, ingredients, cravings…"
            placeholderTextColor={colors.inkTertiary}
            accessibilityLabel="Search the menu"
            style={{
              flex: 1,
              height: '100%',
              paddingVertical: 0,
              fontFamily: fonts.regular,
              fontSize: 15,
              color: colors.ink,
            }}
          />
          {query.length > 0 ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => {
                setQuery('');
                setDebouncedQuery('');
              }}
            >
              <Ionicons name="close-circle" size={18} color={colors.inkTertiary} />
            </PressableScale>
          ) : null}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: insets.bottom + 24 }}
      >
        {results === null ? (
          <>
            <SectionHeader title="Popular searches" subtitle="What everyone's craving" />
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.xs,
                paddingHorizontal: spacing.lg,
              }}
            >
              {POPULAR_SEARCHES.map((term) => (
                <Chip key={term} label={term} onPress={() => setQuery(term)} />
              ))}
            </View>

            <View style={{ marginTop: spacing.xxl }}>
              <SectionHeader title="Tonight's favourites" subtitle="Bestsellers, straight from the pass" />
              {favourites.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <RowDivider /> : null}
                  <FoodRow item={item} socialProof={socialProofFor(item)} />
                </View>
              ))}
            </View>
          </>
        ) : results.length === 0 ? (
          <EmptyState
            emoji="🍽️"
            title="We couldn't find that."
            body="Try another dish or category."
            actionLabel="Clear search"
            onAction={() => {
              setQuery('');
              setDebouncedQuery('');
            }}
          />
        ) : (
          <>
            <AppText variant="caption" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xs }}>
              {results.length} {results.length === 1 ? 'dish' : 'dishes'}
            </AppText>
            {results.map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <RowDivider /> : null}
                <FoodRow item={item} socialProof={socialProofFor(item)} />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
