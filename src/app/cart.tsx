import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OrderLineRow } from '../components/OrderLineRow';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PressableScale } from '../components/ui/PressableScale';
import { SectionHeader } from '../components/ui/SectionHeader';
import { restaurant, session } from '../data/seed';
import type { CartLine } from '../domain/types';
import { cartTotals, selectCompanionLines, selectMyLines, useCart } from '../store/cart';
import { colors, currency, radius, shadows, spacing } from '../theme/tokens';

function BillRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <AppText variant={strong ? 'bodyStrong' : 'secondary'} style={strong ? { fontSize: 17, lineHeight: 22 } : null}>
        {label}
      </AppText>
      <AppText variant={strong ? 'bodyStrong' : 'body'} style={strong ? { fontSize: 17, lineHeight: 22 } : null}>
        {value}
      </AppText>
    </View>
  );
}

function LinesCard({ lines, editable, subtle }: { lines: CartLine[]; editable: boolean; subtle?: boolean }) {
  return (
    <View
      style={[
        {
          marginHorizontal: spacing.lg,
          backgroundColor: subtle ? colors.surfaceSubtle : colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xxs,
          opacity: subtle ? 0.92 : 1,
        },
        subtle ? null : shadows.card,
      ]}
    >
      {lines.map((line, index) => (
        <View key={line.id}>
          {index > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
          <OrderLineRow line={line} editable={editable} />
        </View>
      ))}
    </View>
  );
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const myLines = useCart(selectMyLines);
  const companionLines = useCart(selectCompanionLines);
  const totals = cartTotals(myLines);
  const companionName = session.members.find((m) => !m.isCurrentUser)?.displayName ?? 'Guest 2';
  const tableDishCount = [...myLines, ...companionLines].reduce((n, l) => n + l.quantity, 0);
  const hasMyLines = myLines.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <PressableScale
          haptic
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
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
          <Ionicons name="chevron-down" size={22} color={colors.ink} />
        </PressableScale>
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <AppText variant="heading">Your order</AppText>
          <AppText variant="caption">
            Table {session.tableNumber} · {restaurant.name}
          </AppText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: hasMyLines ? spacing.xl : insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {hasMyLines ? (
          <>
            <SectionHeader title="Your dishes" subtitle="Tweak anything before it heads to the kitchen" />
            <LinesCard lines={myLines} editable />

            {companionLines.length > 0 ? (
              <View style={{ marginTop: spacing.xl }}>
                <SectionHeader
                  title="Also at your table"
                  subtitle={`Added by ${companionName} — part of the table's bill, not yours`}
                />
                <LinesCard lines={companionLines} editable={false} subtle />
              </View>
            ) : null}

            {tableDishCount > 0 ? (
              <View
                style={{
                  alignSelf: 'center',
                  marginTop: spacing.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  backgroundColor: colors.surfaceSubtle,
                  borderRadius: radius.pill,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                }}
              >
                <Ionicons name="people" size={16} color={colors.inkSecondary} />
                <AppText variant="caption">
                  Table {session.tableNumber} is ordering {tableDishCount} {tableDishCount === 1 ? 'dish' : 'dishes'} together
                </AppText>
              </View>
            ) : null}

            <View
              style={[
                {
                  marginHorizontal: spacing.lg,
                  marginTop: spacing.lg,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                  gap: spacing.sm,
                },
                shadows.card,
              ]}
            >
              <BillRow label="Subtotal" value={currency(totals.subtotal)} />
              <BillRow label={`GST (${restaurant.settings.taxRatePct}%)`} value={currency(totals.tax)} />
              {totals.serviceCharge > 0 ? (
                <BillRow
                  label={`Service charge (${restaurant.settings.serviceChargePct}%)`}
                  value={currency(totals.serviceCharge)}
                />
              ) : null}
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.xxs }} />
              <BillRow label="Total" value={currency(totals.total)} strong />
              <AppText variant="caption" style={{ marginTop: spacing.xxs }}>
                Your share only — {companionName} pays for their own additions.
              </AppText>
            </View>

            <Button
              variant="ghost"
              size="md"
              label="Add more dishes"
              onPress={() => router.back()}
              style={{ alignSelf: 'center', marginTop: spacing.sm }}
            />
          </>
        ) : (
          <>
            <EmptyState
              emoji="🍽️"
              title="Your order is empty"
              body="Explore the menu and find something delicious."
              actionLabel="Browse menu"
              onAction={() => router.replace({ pathname: '/(tabs)/menu' })}
            />
            {companionLines.length > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                <SectionHeader
                  title="Also at your table"
                  subtitle={`Added by ${companionName} — part of the table's bill, not yours`}
                />
                <LinesCard lines={companionLines} editable={false} subtle />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Pinned footer */}
      {hasMyLines ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xs,
          }}
        >
          <Button
            label="Place order"
            detail={currency(totals.total)}
            onPress={() => router.push('/checkout')}
            accessibilityLabel={`Place order, total ${currency(totals.total)}`}
          />
        </View>
      ) : null}
    </View>
  );
}
