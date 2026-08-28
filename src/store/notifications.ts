import { create } from 'zustand';
import type { AppNotification, OrderStatus } from '../domain/types';
import { getItem } from '../data/menu';
import { subscribe } from '../services/realtime';
import { useOrders } from './orders';
import { showToast } from './toast';

interface NotificationsState {
  notifications: AppNotification[];
  markAllRead: () => void;
}

let notifId = 0;

export const useNotifications = create<NotificationsState>((set) => ({
  notifications: [],
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
}));

function push(notification: Omit<AppNotification, 'id' | 'at' | 'read'>) {
  useNotifications.setState((s) => ({
    notifications: [{ ...notification, id: `n-${++notifId}`, at: Date.now(), read: false }, ...s.notifications].slice(0, 30),
  }));
}

const STATUS_COPY: Record<OrderStatus, { title: string; body: string; emoji: string } | null> = {
  placed: null,
  confirmed: { title: 'Order confirmed', body: 'The kitchen has accepted your order.', emoji: '✅' },
  preparing: { title: 'Cooking now', body: 'Your food is being prepared.', emoji: '👨‍🍳' },
  ready: { title: 'Almost there', body: 'Your order is ready and on its way.', emoji: '🛎️' },
  served: { title: 'Served — enjoy!', body: 'Your food has reached your table.', emoji: '🍽️' },
};

subscribe('orderStatusChanged', ({ orderId, status }) => {
  const copy = STATUS_COPY[status];
  if (!copy) return;
  const order = useOrders.getState().orders.find((o) => o.id === orderId);
  push({ title: copy.title, body: order ? `Order #${order.number} — ${copy.body}` : copy.body, kind: 'order' });
  showToast(copy.title, copy.emoji);
});

// Social nudges are deliberately rare — at most one every couple of minutes.
let lastSocialNotification = 0;
subscribe('tableOrderAdded', ({ tableNumber, item }) => {
  const now = Date.now();
  if (now - lastSocialNotification < 120_000) return;
  lastSocialNotification = now;
  push({
    title: `Table ${tableNumber} just ordered`,
    body: `${getItem(item.menuItemId).name} — take a peek before you decide.`,
    kind: 'social',
  });
});

export const selectUnreadCount = (s: NotificationsState) => s.notifications.filter((n) => !n.read).length;
