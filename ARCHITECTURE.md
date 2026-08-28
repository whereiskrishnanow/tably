# Tably — Architecture

A dine-in ordering app built on Expo SDK 57 / expo-router / React 19 / RN 0.86, with a
zustand state layer fed by a typed realtime event bus. The demo runs entirely on-device;
`supabase/schema.sql` is the production backend the mock layer mirrors.

## 1. Session model

```
Restaurant ─── The Courtyard Kitchen (settings live here)
  └── Table ─── physical table 12, QR on it
        └── Dining Session ─── one visit; opens on first scan, closes on payment
              └── Members ─── "You", "Guest 2" — each person at the table
                    ├── Personal Order ─── the lines *you* added (you edit these)
                    └── Table Order ─── union of every member's lines (you see all of it)
```

Why each level exists:

- **Restaurant vs Table** — all product behaviour is per-restaurant configuration
  (`RestaurantSettings`), while a table is only a location + number. Settings never live
  on the table, so a venue flips one switch for the whole room.
- **Table vs Dining Session** — a table is permanent; a session is one *visit*. Orders,
  members and payments hang off the session, so tonight's party can't see this
  afternoon's receipts at the same table. Exactly one session per table is open at a time
  (enforced in SQL by a partial unique index).
- **Session vs Members** — dine-in is a group activity with individual intent. Membership
  (`table_members`, `SessionMember`) is what lets the app show a shared cart while
  keeping authorship: every `CartLine` carries a `memberId`.
- **Personal Order vs Table Order** — you *read* the whole table's order (that's the
  point of eating together) but *write* only your own lines. In the cart store this is
  `selectMyLines` vs `selectCompanionLines`; checkout totals (`cartTotals`) are computed
  over *my* lines only. In production it's RLS: your rows, your active session.

The current demo session is seeded in `src/data/seed.ts`: session `abc123`, Table 12,
members "You" + "Guest 2" (who has already added a lassi and a samosa).

## 2. Navigation map

All routes are files under `src/app/` (expo-router). Root stack (`_layout.tsx`, headers
off, screens draw their own):

| Route | Screen | Notes |
|---|---|---|
| `/` | Entry / scan | leads into the welcome flow |
| `/join` | QR deep-link target | `restaurantapp://join?restaurant=…&table=…&session=…` → redirects to `/welcome` |
| `/welcome` | "You're at Table 12" | fade animation; `useSession.join()` starts realtime |
| `/(tabs)` | Tab shell | custom tab bar + floating `CartPill` |
| `/(tabs)/index` | Home | hero, categories, bestsellers, cross-table teaser |
| `/(tabs)/menu` | Menu | accepts `?category=` param |
| `/(tabs)/tables` | Tables | live cross-table feed |
| `/(tabs)/orders` | Orders | active + past orders; tab badge shows active count |
| `/item/[id]` | Dish detail | transparent-modal presentation (sheet over the tab) |
| `/table/[id]` | Another table's order | copy items from here |
| `/cart` | Table cart | modal presentation |
| `/checkout` | Checkout | totals, payment mode, place order |
| `/order/[id]` | Live tracking | `StatusTimeline` driven by realtime |
| `/search` | Menu search | fade-from-bottom |
| `/notifications` | Inbox | |
| `/profile` | Session / member info | |

Dynamic pushes use object form: `router.push({ pathname: '/item/[id]', params: { id } })`.

## 3. State topology

Six zustand stores, one owner per concern. Stores never import each other's UI; the only
cross-store reads are `orders` using `cartTotals` and `notifications` looking up order
numbers.

| Store | Owns | Written by |
|---|---|---|
| `sessionStore` | `joined`, `scannedAt`; re-exports the seeded `session` | welcome screen (`join()` also starts the realtime simulation) |
| `cart` | every `CartLine` at the table (mine + companions), add/merge/quantity/remove/clear | menu, dish detail, table screens, cart |
| `tables` | `ActiveTable[]`, rolling 12-entry ticker, `recentlyUpdated` flash map | **only** the `tableOrderAdded` realtime event |
| `orders` | `PlacedOrder[]`, `placeOrder()` (order numbers from #1048) | checkout; `orderStatusChanged` events advance status (monotonic — a late `confirmed` can never regress a `preparing` order) |
| `notifications` | 30-item inbox, unread count | both realtime events (social nudges throttled to one per 2 min) |
| `toast` | the single current toast (2.4 s) | `showToast()` from anywhere |

### Event flow: realtime → stores → UI

```
src/services/realtime.ts  (the seam — mock timers today, Supabase channels in prod)
   │  emit('tableOrderAdded', …)        every ~14–30 s
   │  emit('orderStatusChanged', …)     ~7 s / 18 s / 55 s / 75 s after placing
   ▼
store subscriptions (module-level subscribe() calls in tables/orders/notifications)
   ▼
zustand setState → React re-render (selectors keep updates narrow)
   ▼
UI: TableCard flash, ticker, StatusTimeline advance, toast, tab badge
```

Nothing in the UI polls, and no component subscribes to the bus directly — screens read
stores, stores consume events. Swapping the emitters for Supabase Realtime channels
(`order_items`, `order_status_history` are in the publication) touches one file.

## 4. Cross-table copy semantics

Copying is **inspiration, not intervention**:

- **Copy, never move.** Adding Table 8's Chicken Tikka inserts a *new* line in *your*
  cart. The source table's data is never mutated — the `tables` store is only ever
  written by realtime events, and in production `create_cross_table_copy()` only ever
  INSERTs.
- **Quantity resets to 1, configuration resets to defaults.** You copy the *dish*, not
  the other diner's quantity, spice choice, add-ons, note or price. The copy is re-priced
  from the live menu.
- **Provenance is kept.** The new line carries
  `sourceRef: { tableNumber, orderItemId }` (production: `order_items.source_order_item_id`).
  It powers the "Inspired by Table 8" tag in the cart and the analytics question the
  restaurant actually cares about: *which tables and dishes sell the room?* (Example
  query at the bottom of `supabase/schema.sql`.)
- **The source is immutable and unaware.** The source diner is never notified, and
  deleting old source rows only nulls the pointer (`ON DELETE SET NULL`) — it never
  cascades into someone else's order.

## 5. Privacy model

What another table can see about you — the entire surface, nothing else:

| Exposed (via feed) | Never exposed |
|---|---|
| Table number (or "A table nearby") | Your name or any member identity |
| Dish + quantity + when | Notes / special instructions |
| Guest count, "hot" state | Prices paid, totals, payment anything |
| | Session and user ids |

In production this is structural, not conventional: RLS hides all foreign rows, and the
*only* window across tables is the `public_table_orders()` SECURITY DEFINER function,
which returns exactly the left column.

`RestaurantSettings` switches (each one honoured in UI *and* enforced in SQL):

- `orderingEnabled` — kill switch; browse-only mode.
- `crossTableVisibility` — master switch for the feed; off means *zero rows*, not blurred rows.
- `showExactTableNumbers` — off replaces "Table 8" with "A table nearby".
- `allowAddFromOtherTables` — off makes the feed look-but-don't-copy.
- (schema also has `anonymous_orders` — a hard override that blanks table identity regardless of the above.)

## 6. Payment architecture

Nothing about money is hardcoded:

- **Modes** come from `settings.paymentModes` (`pay-at-table` / `pay-online` / `split`);
  checkout renders whatever the restaurant enabled, and the SQL insert policy rejects a
  payment in a disabled mode.
- **Rates** — GST (`taxRatePct`) and service charge (`serviceChargePct`) are settings,
  applied in one place (`cartTotals`). The demo venue runs 5% GST, 0% service.
- **Money is integer paise** end-to-end (`price: 42000` = ₹420), rendered only through
  `currency()`. No floats, ever.
- Order totals are denormalised onto the order at placement, so receipts survive later
  menu or tax changes; payment rows hold only a mode, an amount and an opaque
  `provider_ref` — card data never touches this schema.

## 7. Design system

Single source of truth: `src/theme/tokens.ts`. Warm, premium, minimal — cream canvas,
warm charcoal ink, terracotta accent, plus semantic veg/non-veg/gold/danger/success/info
pairs (each with a soft background variant). Scales: `spacing` 4–44, `radius` 8–pill,
`shadows` card/raised/subtle. Type is Fraunces (display/title) over Inter
(heading→micro), pre-composed as `type` variants; `currency()` formats paise as
Indian-grouped rupees. No raw `<Text>`, no hex literals in screens.

Component inventory:

- **Primitives (`components/ui/`)** — `AppText` (token-typed text), `Button`
  (primary/variants, loading, detail slot), `Chip`, `Badges` (`DietaryDot`,
  `SpiceIndicator`, `Tag`), `Stepper`, `Sheet`, `Skeleton`, `EmptyState`,
  `SectionHeader`, `PressableScale` (scale + optional haptic on every tappable),
  `Toast`/`ToastHost`.
- **Product (`components/`)** — `FoodRow` and `FoodCard` (menu items, social-proof
  slot), `TableCard` (+ `tableDisplayName` honouring the privacy switch), `AddButton`,
  `OrderLineRow` (+ `describeLineConfig`), `StatusTimeline`, `CartPill` (floating cart
  summary above the tab bar).

## 8. Performance notes

- **Images are bundled** (`assets/images/food/` via `src/data/images.ts`) and rendered
  with `expo-image` — decoded natively, cached, 200 ms fade-in, token-coloured
  placeholder. No network waterfalls in the food browse path.
- **Optimistic cart** — adds/edits are synchronous zustand mutations; the UI never waits
  on a server round-trip (production would reconcile in the background). Identical
  configurations merge into one line to keep the cart short.
- **Skeletons over spinners** — `Skeleton` blocks hold layout while anything loads, so
  nothing jumps.
- **Push, don't poll** — all liveness comes from the event bus; selectors
  (`selectMyItemCount`, `selectActiveOrders`, …) keep re-renders scoped to the
  components that actually changed.
- **Realtime state is bounded** — ticker capped at 12 entries, inbox at 30; status
  updates are monotonic so late timers can't thrash the timeline.
- **Lists** — screens use `FlatList` for long/live collections and `ScrollView` for
  short composed pages; every item is keyed by stable ids. Tab screens pad scroll
  content ≥120 so the absolute tab bar + cart pill never cover content.
