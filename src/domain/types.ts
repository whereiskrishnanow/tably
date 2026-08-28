// Domain model — mirrors the backend schema (see supabase/schema.sql).
// All money values are integer paise (₹420 → 42000).

export type Dietary = 'veg' | 'non-veg' | 'egg';
export type SpiceLevel = 0 | 1 | 2 | 3; // 0 = not spicy, 3 = fiery

export interface Restaurant {
  id: string;
  name: string;
  tagline: string;
  heroImage: number; // require()'d asset
  settings: RestaurantSettings;
}

export interface RestaurantSettings {
  orderingEnabled: boolean;
  crossTableVisibility: boolean;
  showExactTableNumbers: boolean; // false → "A table nearby"
  allowAddFromOtherTables: boolean;
  taxRatePct: number; // GST
  serviceChargePct: number;
  paymentModes: Array<'pay-at-table' | 'pay-online' | 'split'>;
}

export interface DiningSession {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  startedAt: number;
  members: SessionMember[];
  currentMemberId: string;
}

export interface SessionMember {
  id: string;
  displayName: string; // "You", "Guest 2"…
  isCurrentUser: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  emoji: string;
}

export interface MenuAddon {
  id: string;
  name: string;
  price: number;
}

export interface MenuVariantGroup {
  id: string;
  name: string; // "Choose Spice Level"
  options: Array<{ id: string; name: string; priceDelta: number }>;
  defaultOptionId: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  image: number; // require()'d asset
  dietary: Dietary;
  spice: SpiceLevel;
  bestseller: boolean;
  chefSpecial?: boolean;
  ingredients: string[];
  allergens: string[];
  addons: MenuAddon[];
  variantGroups: MenuVariantGroup[];
  available: boolean;
  tags: string[]; // for search: cuisine, ingredient words
}

// ---- Orders ----

export type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'ready' | 'served';

export interface CartLine {
  id: string;
  menuItemId: string;
  quantity: number;
  variantSelections: Record<string, string>; // groupId -> optionId
  addonIds: string[];
  note?: string;
  unitPrice: number; // base + variant deltas + addons, per unit
  memberId: string;
  /** Cross-table provenance: set when this line was copied from another table's order. */
  sourceRef?: { tableNumber: number; orderItemId: string };
}

export interface PlacedOrder {
  id: string;
  number: number; // human order number, e.g. 1048
  tableNumber: number;
  lines: CartLine[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  status: OrderStatus;
  placedAt: number;
  statusHistory: Array<{ status: OrderStatus; at: number }>;
  etaMinutes: [number, number];
  specialInstructions?: string;
}

// ---- Cross-table discovery ----

export interface TableOrderItem {
  id: string; // order_item id on the source table — stored as sourceOrderItemId when copied
  menuItemId: string;
  quantity: number;
  orderedAt: number;
}

export interface ActiveTable {
  id: string;
  tableNumber: number;
  guestCount: number;
  items: TableOrderItem[];
  lastOrderedAt: number;
  isHot: boolean; // trending
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: number;
  kind: 'order' | 'social';
  read: boolean;
}
