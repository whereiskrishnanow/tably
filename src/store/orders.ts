import { create } from 'zustand';
import type { CartLine, OrderStatus, PlacedOrder } from '../domain/types';
import { session } from '../data/seed';
import { simulateKitchenForOrder, subscribe } from '../services/realtime';
import { cartTotals } from './cart';

let orderNumber = 1047; // first placed order becomes #1048, matching the brief

interface OrdersState {
  orders: PlacedOrder[];
  placeOrder: (myLines: CartLine[], specialInstructions?: string) => PlacedOrder;
}

export const useOrders = create<OrdersState>((set) => ({
  orders: [],

  placeOrder: (myLines, specialInstructions) => {
    const totals = cartTotals(myLines);
    const order: PlacedOrder = {
      id: `order-${Date.now()}`,
      number: ++orderNumber,
      tableNumber: session.tableNumber,
      lines: myLines.map((l) => ({ ...l })),
      ...totals,
      status: 'placed',
      placedAt: Date.now(),
      statusHistory: [{ status: 'placed', at: Date.now() }],
      etaMinutes: [20, 25],
      specialInstructions: specialInstructions?.trim() || undefined,
    };
    set((state) => ({ orders: [order, ...state.orders] }));
    simulateKitchenForOrder(order.id); // in production the kitchen drives this via realtime
    return order;
  },
}));

const STATUS_RANK: Record<OrderStatus, number> = { placed: 0, confirmed: 1, preparing: 2, ready: 3, served: 4 };

subscribe('orderStatusChanged', ({ orderId, status }) => {
  useOrders.setState((state) => ({
    orders: state.orders.map((o) => {
      if (o.id !== orderId || STATUS_RANK[status] <= STATUS_RANK[o.status]) return o;
      return { ...o, status, statusHistory: [...o.statusHistory, { status, at: Date.now() }] };
    }),
  }));
});

export const selectOrder = (orderId: string) => (s: OrdersState) => s.orders.find((o) => o.id === orderId);

// Cached per state version for referential stability (see note in cart.ts).
const activeOrdersCache = new WeakMap<PlacedOrder[], PlacedOrder[]>();
export const selectActiveOrders = (s: OrdersState): PlacedOrder[] => {
  let v = activeOrdersCache.get(s.orders);
  if (!v) {
    v = s.orders.filter((o) => o.status !== 'served');
    activeOrdersCache.set(s.orders, v);
  }
  return v;
};
