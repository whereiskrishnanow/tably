import { create } from 'zustand';
import type { ActiveTable } from '../domain/types';
import { activeTables as seedTables } from '../data/seed';
import { subscribe } from '../services/realtime';

export interface LiveTickerEntry {
  id: string;
  tableNumber: number;
  menuItemId: string;
  at: number;
}

interface TablesState {
  tables: ActiveTable[];
  /** Rolling feed of recent cross-table activity, newest first. */
  ticker: LiveTickerEntry[];
  /** Table ids whose card should flash "just ordered" (cleared after a beat). */
  recentlyUpdated: Record<string, number>;
}

export const useTables = create<TablesState>(() => ({
  tables: seedTables.map((t) => ({ ...t, items: [...t.items] })),
  ticker: [],
  recentlyUpdated: {},
}));

// Live subscription — mirrors what a Supabase channel handler would do.
subscribe('tableOrderAdded', ({ tableId, tableNumber, item }) => {
  useTables.setState((state) => {
    const tables = state.tables.map((t) => {
      if (t.id !== tableId) return t;
      const existing = t.items.find((i) => i.menuItemId === item.menuItemId);
      const items = existing
        ? t.items.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity, orderedAt: item.orderedAt } : i))
        : [...t.items, item];
      return { ...t, items, lastOrderedAt: item.orderedAt, isHot: items.length >= 4 || t.isHot };
    });
    return {
      tables,
      ticker: [
        { id: item.id, tableNumber, menuItemId: item.menuItemId, at: item.orderedAt },
        ...state.ticker,
      ].slice(0, 12),
      recentlyUpdated: { ...state.recentlyUpdated, [tableId]: Date.now() },
    };
  });
});

// ---- Selectors ----
// Derived structures are cached per state version so results stay
// referentially stable across renders (see note in cart.ts).

const recencyCache = new WeakMap<ActiveTable[], ActiveTable[]>();
export const selectTablesByRecency = (s: TablesState): ActiveTable[] => {
  let v = recencyCache.get(s.tables);
  if (!v) {
    v = [...s.tables].sort((a, b) => b.lastOrderedAt - a.lastOrderedAt);
    recencyCache.set(s.tables, v);
  }
  return v;
};

export const selectTable = (tableId: string) => (s: TablesState) => s.tables.find((t) => t.id === tableId);

const popularityCache = new WeakMap<ActiveTable[], Map<string, number>>();
/** menuItemId -> number of other tables that ordered it (for "4 tables nearby ordered this"). */
export const selectPopularity = (s: TablesState): Map<string, number> => {
  let counts = popularityCache.get(s.tables);
  if (!counts) {
    counts = new Map<string, number>();
    for (const t of s.tables) {
      for (const id of new Set(t.items.map((i) => i.menuItemId))) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    popularityCache.set(s.tables, counts);
  }
  return counts;
};
