import { create } from 'zustand';
import type { CartLine, MenuItem } from '../domain/types';
import { getItem } from '../data/menu';
import { companionLines, restaurant, session } from '../data/seed';

let lineCounter = 0;
const nextLineId = () => `line-${++lineCounter}`;

export interface AddConfig {
  quantity?: number;
  variantSelections?: Record<string, string>;
  addonIds?: string[];
  note?: string;
  /** Present when copying an item from another table's order. */
  sourceRef?: { tableNumber: number; orderItemId: string };
}

export function defaultVariantSelections(item: MenuItem): Record<string, string> {
  return Object.fromEntries(item.variantGroups.map((g) => [g.id, g.defaultOptionId]));
}

export function computeUnitPrice(item: MenuItem, variantSelections: Record<string, string>, addonIds: string[]): number {
  let price = item.price;
  for (const group of item.variantGroups) {
    const chosen = group.options.find((o) => o.id === variantSelections[group.id]);
    if (chosen) price += chosen.priceDelta;
  }
  for (const addonId of addonIds) {
    const addon = item.addons.find((a) => a.id === addonId);
    if (addon) price += addon.price;
  }
  return price;
}

const configKey = (line: Pick<CartLine, 'menuItemId' | 'variantSelections' | 'addonIds' | 'note'>) =>
  [line.menuItemId, JSON.stringify(line.variantSelections), [...line.addonIds].sort().join('+'), line.note ?? ''].join('|');

interface CartState {
  /** Every line at this table, mine and my companions'. */
  lines: CartLine[];
  addItem: (menuItemId: string, config?: AddConfig) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clearMyLines: () => void;
}

export const useCart = create<CartState>((set) => ({
  lines: companionLines.map((c) => {
    const item = getItem(c.menuItemId);
    return {
      id: nextLineId(),
      menuItemId: c.menuItemId,
      quantity: c.quantity,
      variantSelections: defaultVariantSelections(item),
      addonIds: [],
      unitPrice: item.price,
      memberId: 'companion-1',
    } satisfies CartLine;
  }),

  addItem: (menuItemId, config = {}) =>
    set((state) => {
      const item = getItem(menuItemId);
      const variantSelections = config.variantSelections ?? defaultVariantSelections(item);
      const addonIds = config.addonIds ?? [];
      const candidate: CartLine = {
        id: nextLineId(),
        menuItemId,
        quantity: config.quantity ?? 1,
        variantSelections,
        addonIds,
        note: config.note,
        unitPrice: computeUnitPrice(item, variantSelections, addonIds),
        memberId: session.currentMemberId,
        sourceRef: config.sourceRef,
      };
      // Merge with an identical existing line of mine (keeps the cart tidy).
      const existing = state.lines.find(
        (l) => l.memberId === session.currentMemberId && configKey(l) === configKey(candidate),
      );
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.id === existing.id ? { ...l, quantity: l.quantity + candidate.quantity, sourceRef: l.sourceRef ?? candidate.sourceRef } : l,
          ),
        };
      }
      return { lines: [...state.lines, candidate] };
    }),

  setQuantity: (lineId, quantity) =>
    set((state) => ({
      lines:
        quantity <= 0
          ? state.lines.filter((l) => l.id !== lineId)
          : state.lines.map((l) => (l.id === lineId ? { ...l, quantity } : l)),
    })),

  removeLine: (lineId) => set((state) => ({ lines: state.lines.filter((l) => l.id !== lineId) })),

  clearMyLines: () => set((state) => ({ lines: state.lines.filter((l) => l.memberId !== session.currentMemberId) })),
}));

// ---- Selectors (use inside components: useCart(selectMyLines) etc.) ----
// Derived arrays are cached per state version so selector results stay
// referentially stable — zustand v5 re-runs selectors on every render and
// a fresh array each time would loop React forever.

const myLinesCache = new WeakMap<CartLine[], CartLine[]>();
export const selectMyLines = (s: CartState): CartLine[] => {
  let v = myLinesCache.get(s.lines);
  if (!v) {
    v = s.lines.filter((l) => l.memberId === session.currentMemberId);
    myLinesCache.set(s.lines, v);
  }
  return v;
};

const companionLinesCache = new WeakMap<CartLine[], CartLine[]>();
export const selectCompanionLines = (s: CartState): CartLine[] => {
  let v = companionLinesCache.get(s.lines);
  if (!v) {
    v = s.lines.filter((l) => l.memberId !== session.currentMemberId);
    companionLinesCache.set(s.lines, v);
  }
  return v;
};

export const lineTotal = (l: CartLine) => l.unitPrice * l.quantity;

export function cartTotals(myLines: CartLine[]) {
  const subtotal = myLines.reduce((sum, l) => sum + lineTotal(l), 0);
  const tax = Math.round((subtotal * restaurant.settings.taxRatePct) / 100);
  const serviceCharge = Math.round((subtotal * restaurant.settings.serviceChargePct) / 100);
  return { subtotal, tax, serviceCharge, total: subtotal + tax + serviceCharge };
}

export const selectMyItemCount = (s: CartState) =>
  s.lines.filter((l) => l.memberId === session.currentMemberId).reduce((n, l) => n + l.quantity, 0);
