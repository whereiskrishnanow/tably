import { useEffect } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { PressableScale } from '../components/ui/PressableScale';
import type { AppNotification } from '../domain/types';
import { useNotifications } from '../store/notifications';
import { colors, hitSlop, spacing } from '../theme/tokens';

const timeAgo = (at: number): string => {
  const minutes = Math.floor((Date.now() - at) / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
};

function NotificationRow({ notification }: { notification: AppNotification }) {
  const isOrder = notification.kind === 'order';
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isOrder ? colors.accentSoft : colors.surfaceSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={isOrder ? 'Order update' : 'Around the room'}
      >
        <AppText style={{ fontSize: 18 }}>{isOrder ? '🛎️' : '👀'}</AppText>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{notification.title}</AppText>
        <AppText variant="secondary" numberOfLines={2}>
          {notification.body}
        </AppText>
      </View>
      <AppText variant="caption" color={colors.inkTertiary}>
        {timeAgo(notification.at)}
      </AppText>
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const notifications = useNotifications((s) => s.notifications);

  useEffect(() => {
    useNotifications.getState().markAllRead();
  }, []);

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
          Notifications
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <NotificationRow notification={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 40 + spacing.md }} />}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xs,
          paddingBottom: insets.bottom + spacing.xl,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState
              emoji="🔔"
              title="Nothing yet"
              body="Order updates and tasty happenings around the room will land here."
            />
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
