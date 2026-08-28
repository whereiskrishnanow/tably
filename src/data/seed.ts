import type { ActiveTable, DiningSession, Restaurant } from '../domain/types';
import { heroRestaurantImage } from './images';

export const restaurant: Restaurant = {
  id: 'r-courtyard',
  name: 'The Courtyard Kitchen',
  tagline: 'Slow-fired Indian classics under the old neem tree',
  heroImage: heroRestaurantImage,
  settings: {
    orderingEnabled: true,
    crossTableVisibility: true,
    showExactTableNumbers: true,
    allowAddFromOtherTables: true,
    taxRatePct: 5,
    serviceChargePct: 0,
    paymentModes: ['pay-at-table', 'pay-online', 'split'],
  },
};

export const session: DiningSession = {
  id: 'abc123',
  restaurantId: restaurant.id,
  tableId: 't-12',
  tableNumber: 12,
  startedAt: Date.now() - 4 * 60_000,
  members: [
    { id: 'me', displayName: 'You', isCurrentUser: true },
    { id: 'companion-1', displayName: 'Guest 2', isCurrentUser: false },
  ],
  currentMemberId: 'me',
};

const min = (n: number) => Date.now() - n * 60_000;

/**
 * Live orders at other tables in the restaurant right now.
 * These seed the cross-table discovery feature; the realtime
 * simulator mutates copies of these over time.
 */
export const activeTables: ActiveTable[] = [
  {
    id: 't-8',
    tableNumber: 8,
    guestCount: 2,
    isHot: true,
    lastOrderedAt: min(6),
    items: [
      { id: 'oi-t8-1', menuItemId: 'chicken-tikka', quantity: 1, orderedAt: min(14) },
      { id: 'oi-t8-2', menuItemId: 'butter-naan', quantity: 2, orderedAt: min(9) },
      { id: 'oi-t8-3', menuItemId: 'garlic-naan', quantity: 1, orderedAt: min(6) },
    ],
  },
  {
    id: 't-15',
    tableNumber: 15,
    guestCount: 4,
    isHot: false,
    lastOrderedAt: min(11),
    items: [
      { id: 'oi-t15-1', menuItemId: 'paneer-tikka', quantity: 1, orderedAt: min(18) },
      { id: 'oi-t15-2', menuItemId: 'dal-makhani', quantity: 1, orderedAt: min(11) },
      { id: 'oi-t15-3', menuItemId: 'jeera-rice', quantity: 1, orderedAt: min(11) },
    ],
  },
  {
    id: 't-4',
    tableNumber: 4,
    guestCount: 3,
    isHot: false,
    lastOrderedAt: min(21),
    items: [
      { id: 'oi-t4-1', menuItemId: 'butter-chicken', quantity: 1, orderedAt: min(26) },
      { id: 'oi-t4-2', menuItemId: 'garlic-naan', quantity: 2, orderedAt: min(26) },
      { id: 'oi-t4-3', menuItemId: 'sweet-lassi', quantity: 2, orderedAt: min(21) },
    ],
  },
  {
    id: 't-18',
    tableNumber: 18,
    guestCount: 5,
    isHot: true,
    lastOrderedAt: min(3),
    items: [
      { id: 'oi-t18-1', menuItemId: 'chicken-biryani', quantity: 2, orderedAt: min(24) },
      { id: 'oi-t18-2', menuItemId: 'tandoori-wings', quantity: 1, orderedAt: min(24) },
      { id: 'oi-t18-3', menuItemId: 'palak-paneer', quantity: 1, orderedAt: min(16) },
      { id: 'oi-t18-4', menuItemId: 'tandoori-roti', quantity: 4, orderedAt: min(16) },
      { id: 'oi-t18-5', menuItemId: 'gulab-jamun', quantity: 2, orderedAt: min(3) },
    ],
  },
  {
    id: 't-21',
    tableNumber: 21,
    guestCount: 1,
    isHot: false,
    lastOrderedAt: min(29),
    items: [
      { id: 'oi-t21-1', menuItemId: 'masala-dosa', quantity: 1, orderedAt: min(29) },
      { id: 'oi-t21-2', menuItemId: 'filter-coffee', quantity: 1, orderedAt: min(29) },
    ],
  },
];

/** Items the companion at the user's own table (Guest 2) has already added. */
export const companionLines = [
  { menuItemId: 'sweet-lassi', quantity: 1 },
  { menuItemId: 'samosa', quantity: 1 },
];
