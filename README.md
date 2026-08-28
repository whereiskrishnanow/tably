# Tably

**See what the room is eating.**

Tably is a premium dine-in ordering app. Scan the QR on your table, and the restaurant's menu opens already knowing where you sit — no app-store detour, no waving for a waiter. Browse, customise, order and track your food live from your phone, while everyone at your table builds one shared order. The hook is the room itself: Tably shows you what other tables are ordering *right now* — anonymised, opt-in for the restaurant — and lets you tap **Add to my order** on anything that catches your eye. That plate of Chicken Tikka gliding past you to Table 8? It's one tap away, and your copy carries an "Inspired by Table 8" tag so the restaurant learns which tables (and dishes) sell the room.

The demo seats you at **Table 12** of **The Courtyard Kitchen**, a slow-fired Indian kitchen with 18 dishes across six categories.

## Features

- **QR-to-table onboarding** — deep link lands you in your table's live dining session; a warm welcome screen confirms you're at Table 12.
- **Cross-table discovery** — a live feed of what other tables ordered, updating every ~14–30 seconds while you browse, with "hot table" highlights and per-dish social proof ("4 tables nearby ordered this").
- **One-tap copy** — add any other table's item straight into your own order; it arrives as a fresh line (quantity 1, default options) with an "Inspired by Table N" provenance tag.
- **Full menu with customisation** — variants (spice level, sweetness), paid add-ons, dietary and spice indicators, bestseller and chef's-special badges, notes to the kitchen, search.
- **Shared table cart** — your lines and your co-diners' lines side by side; you edit yours, you see theirs.
- **Checkout with real maths** — integer-paise pricing, GST and service charge from restaurant settings, special instructions, configurable payment modes (pay at table / pay online / split).
- **Live order tracking** — placed → confirmed → preparing → ready → served on an animated timeline, driven by realtime events, with toasts and a notification inbox.
- **Premium feel** — Fraunces + Inter type, cream/terracotta palette, haptic press feedback, skeleton loading, safe-area-correct on notches and home indicators.

## Screenshots

*Screenshots pending — run the web build (`npx expo start`, press `w`) and walk the demo script below; every screen in the flow is real.*

## Run it

```bash
npm install
npx expo start
```

Then press **`i`** (iOS simulator), **`a`** (Android emulator) or **`w`** (web).

In production the guest arrives via the QR code on the table, which encodes a deep link:

```
restaurantapp://join?restaurant=123&table=12&session=abc123
```

The `/join` route validates the params and drops the guest into the welcome screen for that table. In the demo, launching the app takes the same path with the seeded session.

## The 60-second demo

1. **Scan** — open the app (the QR deep link above): welcome screen greets you at **Table 12**, The Courtyard Kitchen.
2. **Home** — hero, categories, bestsellers… and the section that sells the product: **What other tables are ordering**.
3. Tap **Table 8** — see their live order: Chicken Tikka, Butter Naan, Garlic Naan.
4. Tap **Add** on **Chicken Tikka** — instant toast, cart pill ticks up.
5. Open the **cart** — your Chicken Tikka is there with an **"Inspired by Table 8"** tag, next to your companion's items.
6. From the **menu**, add a **Garlic Naan**.
7. **Checkout** — subtotal, GST, payment mode — then **confirm**.
8. **Live tracking** — the timeline advances on its own: **confirmed ~7s** after placing, **preparing ~18s**, **ready ~55s**, **served ~75s**, each with a toast and notification.
9. While you wait, watch the Tables feed — other tables keep ordering live, a new item landing every **~14–30 seconds**.

## Project structure

```
tably/
├── src/
│   ├── app/                     # expo-router routes
│   │   ├── _layout.tsx          # root stack, fonts, toast host
│   │   ├── index.tsx            # entry → scan/welcome flow
│   │   ├── join.tsx             # QR deep-link target (restaurantapp://join?...)
│   │   ├── welcome.tsx          # "You're at Table 12" landing
│   │   ├── (tabs)/              # Home · Menu · Tables · Orders (custom tab bar + cart pill)
│   │   ├── item/[id].tsx        # dish detail modal (variants, add-ons, notes)
│   │   ├── table/[id].tsx       # another table's live order
│   │   ├── cart.tsx             # shared table cart
│   │   ├── checkout.tsx         # totals, payment mode, place order
│   │   ├── order/[id].tsx       # live status tracking
│   │   ├── search.tsx           # menu search
│   │   ├── notifications.tsx    # inbox
│   │   └── profile.tsx          # session/member info
│   ├── components/              # FoodRow, FoodCard, TableCard, AddButton, CartPill,
│   │   │                        #   OrderLineRow, StatusTimeline
│   │   └── ui/                  # AppText, Button, Chip, Badges, Stepper, Sheet,
│   │                            #   Skeleton, EmptyState, SectionHeader, PressableScale, Toast
│   ├── store/                   # zustand: cart, tables, orders, notifications, session, toast
│   ├── services/
│   │   └── realtime.ts          # the realtime seam (see below)
│   ├── data/                    # menu, seed session/tables, bundled food images
│   ├── domain/types.ts          # domain model (mirrors the SQL schema)
│   └── theme/tokens.ts          # colors, spacing, type, shadows, currency()
├── supabase/
│   └── schema.sql               # production Postgres schema + RLS + RPCs
└── assets/images/food/          # bundled photography
```

## How the mock realtime maps to production

`src/services/realtime.ts` is the **only** seam between the demo and a real backend. It exposes a tiny typed event bus:

- `tableOrderAdded` — another table added an item to its order
- `orderStatusChanged` — the kitchen moved one of *your* orders forward

Stores subscribe to this bus (`subscribe(event, fn)`) and update state; **nothing in the UI polls, and no store knows where events come from**. In the demo, two simulators feed the bus: a table-activity loop emitting a weighted-random order from another table every 14–30 s, and a kitchen loop that advances a placed order through confirmed/preparing/ready/served on fixed timers.

To go live, replace only the emitting half of that file with Supabase Realtime subscriptions against `supabase/schema.sql`:

```ts
supabase.channel(`orders:${restaurantId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' },
      () => refreshFeedVia_public_table_orders())   // → emit('tableOrderAdded', …)
  .subscribe();

supabase.channel(`order_status:${sessionId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_status_history' },
      (row) => emit('orderStatusChanged', mapRow(row)))
  .subscribe();
```

Both tables are already in the `supabase_realtime` publication (see the bottom of `supabase/schema.sql`). The stores, screens and components don't change at all.
