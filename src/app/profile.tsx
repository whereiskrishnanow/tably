import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { Sheet } from '../components/ui/Sheet';
import { restaurant, session } from '../data/seed';
import { showToast } from '../store/toast';
import { colors, fonts, hitSlop, radius, shadows, spacing } from '../theme/tokens';

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const hours = d.getHours() % 12 || 12;
  const minutes = `${d.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes} ${d.getHours() >= 12 ? 'pm' : 'am'}`;
};

function SessionRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

function ActionCard({
  icon,
  iconBackground,
  title,
  caption,
  onPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBackground: string;
  title: string;
  caption: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        ...shadows.card,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: iconBackground,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption">{caption}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.inkTertiary} />
    </PressableScale>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [billSheetOpen, setBillSheetOpen] = useState(false);
  const [signInSheetOpen, setSignInSheetOpen] = useState(false);

  const requestBill = () => {
    setBillSheetOpen(false);
    showToast('Bill requested — on its way 🧾');
  };

  const continueAsGuest = () => {
    setSignInSheetOpen(false);
    showToast("You're all set — no account needed", '👌');
  };

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
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={hitSlop}
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
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }}>
          Profile
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            ...shadows.card,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText style={{ fontFamily: fonts.display, fontSize: 22, color: colors.accent }}>G</AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading">Guest</AppText>
            <AppText variant="caption">
              Dining at Table {session.tableNumber} · {restaurant.name}
            </AppText>
          </View>
        </View>

        {/* Session details */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing.lg,
            gap: spacing.md,
            ...shadows.card,
          }}
        >
          <AppText variant="micro" color={colors.inkTertiary}>
            Your session
          </AppText>
          <SessionRow label="Restaurant" value={restaurant.name} />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SessionRow label="Table" value={`Table ${session.tableNumber}`} />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SessionRow label="Started" value={formatTime(session.startedAt)} />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SessionRow label="Guests at table" value={session.members.map((m) => m.displayName).join(', ')} />
        </View>

        {/* Actions */}
        <ActionCard
          icon="receipt-outline"
          iconBackground={colors.accentSoft}
          title="Request the bill"
          caption="We'll bring it right over"
          onPress={() => setBillSheetOpen(true)}
          accessibilityLabel="Request the bill"
        />
        <ActionCard
          icon="person-circle-outline"
          iconBackground={colors.accentSoft}
          title="Save your tastes"
          caption="Keep favourites & reorder faster next visit"
          onPress={() => setSignInSheetOpen(true)}
          accessibilityLabel="Sign in to save your tastes"
        />

        <AppText variant="caption" color={colors.inkTertiary} style={{ textAlign: 'center', marginTop: spacing.md }}>
          Tably · Table {session.tableNumber} session {session.id}
        </AppText>
      </ScrollView>

      {/* Request-the-bill sheet */}
      <Sheet visible={billSheetOpen} onClose={() => setBillSheetOpen(false)}>
        <View style={{ padding: spacing.lg, paddingTop: spacing.md, gap: spacing.sm }}>
          <AppText variant="title" style={{ fontSize: 22, lineHeight: 28 }}>
            Ask for the bill?
          </AppText>
          <AppText variant="secondary">A server will bring Table {session.tableNumber}'s bill to your table.</AppText>
          <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
            <Button label="Yes, bring the bill" onPress={requestBill} />
            <Button label="Not yet" variant="ghost" onPress={() => setBillSheetOpen(false)} />
          </View>
        </View>
      </Sheet>

      {/* Sign-in sheet */}
      <Sheet visible={signInSheetOpen} onClose={() => setSignInSheetOpen(false)}>
        <View style={{ padding: spacing.lg, paddingTop: spacing.md, gap: spacing.sm }}>
          <AppText variant="title" style={{ fontSize: 22, lineHeight: 28 }}>
            Accounts are optional
          </AppText>
          <AppText variant="secondary">
            Tonight, everything works without one — browse, order and ask for the bill as a guest. Sign in on a future visit to keep
            favourites and reorder in a tap.
          </AppText>
          <Button label="Continue as guest" onPress={continueAsGuest} style={{ marginTop: spacing.md }} />
        </View>
      </Sheet>
    </View>
  );
}
