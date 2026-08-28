// Realtime boundary.
//
// In production this module would subscribe to Supabase Realtime channels
// (orders:<restaurantId>, order_status:<sessionId>) and re-emit typed events.
// For the demo build it simulates the same server pushes on randomized timers,
// so the UI's subscription code is identical either way: stores only ever
// consume events from this bus — nothing in the UI polls.

import type { OrderStatus, TableOrderItem } from '../domain/types';

export type RealtimeEvents = {
  /** Another table added an item to its order. */
  tableOrderAdded: { tableId: string; tableNumber: number; item: TableOrderItem };
  /** The kitchen moved one of OUR orders to a new status. */
  orderStatusChanged: { orderId: string; status: OrderStatus };
};

type Listener<K extends keyof RealtimeEvents> = (payload: RealtimeEvents[K]) => void;

const listeners: { [K in keyof RealtimeEvents]: Set<Listener<K>> } = {
  tableOrderAdded: new Set(),
  orderStatusChanged: new Set(),
};

export function subscribe<K extends keyof RealtimeEvents>(event: K, fn: Listener<K>): () => void {
  listeners[event].add(fn);
  return () => listeners[event].delete(fn);
}

export function emit<K extends keyof RealtimeEvents>(event: K, payload: RealtimeEvents[K]): void {
  listeners[event].forEach((fn) => fn(payload));
}

// ---------------------------------------------------------------------------
// Simulation: other tables keep ordering while you browse.
// ---------------------------------------------------------------------------

const OTHER_TABLES: Array<{ id: string; tableNumber: number }> = [
  { id: 't-8', tableNumber: 8 },
  { id: 't-15', tableNumber: 15 },
  { id: 't-4', tableNumber: 4 },
  { id: 't-18', tableNumber: 18 },
  { id: 't-21', tableNumber: 21 },
];

// Weighted toward crowd-pleasers so the feed feels believable.
const LIKELY_ORDERS = [
  'butter-chicken',
  'garlic-naan',
  'butter-naan',
  'chicken-tikka',
  'chicken-biryani',
  'dal-makhani',
  'paneer-tikka',
  'gulab-jamun',
  'masala-chai',
  'sweet-lassi',
];

let simulationTimer: ReturnType<typeof setTimeout> | null = null;
let itemCounter = 0;

function scheduleNextTableOrder() {
  const delay = 14_000 + Math.random() * 16_000; // every 14–30s
  simulationTimer = setTimeout(() => {
    const table = OTHER_TABLES[Math.floor(Math.random() * OTHER_TABLES.length)];
    const menuItemId = LIKELY_ORDERS[Math.floor(Math.random() * LIKELY_ORDERS.length)];
    emit('tableOrderAdded', {
      tableId: table.id,
      tableNumber: table.tableNumber,
      item: {
        id: `oi-live-${++itemCounter}`,
        menuItemId,
        quantity: Math.random() < 0.25 ? 2 : 1,
        orderedAt: Date.now(),
      },
    });
    scheduleNextTableOrder();
  }, delay);
}

export function startRealtimeSimulation(): void {
  if (simulationTimer) return; // already running
  scheduleNextTableOrder();
}

export function stopRealtimeSimulation(): void {
  if (simulationTimer) clearTimeout(simulationTimer);
  simulationTimer = null;
}

// ---------------------------------------------------------------------------
// Kitchen simulation: progress a placed order through its lifecycle.
// ---------------------------------------------------------------------------

const STATUS_FLOW: Array<{ status: OrderStatus; afterMs: number }> = [
  { status: 'confirmed', afterMs: 7_000 },
  { status: 'preparing', afterMs: 18_000 },
  { status: 'ready', afterMs: 55_000 },
  { status: 'served', afterMs: 75_000 },
];

export function simulateKitchenForOrder(orderId: string): void {
  STATUS_FLOW.forEach(({ status, afterMs }) => {
    setTimeout(() => emit('orderStatusChanged', { orderId, status }), afterMs);
  });
}
