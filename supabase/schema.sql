-- ============================================================================
-- Tably — production PostgreSQL / Supabase schema
-- ============================================================================
-- This is the real backend that the app's mock layer mirrors 1:1:
--
--   src/domain/types.ts        <->  the row shapes below
--   src/services/realtime.ts   <->  the supabase_realtime publication at the end
--   src/data/seed.ts           <->  example rows for these tables
--
-- Conventions
--   * All primary keys are uuid DEFAULT gen_random_uuid().
--   * All money is integer paise (₹420.00 -> 42000). Never floats.
--   * All timestamps are timestamptz.
--   * Every table has RLS ENABLED. Diners connect with the anon/authenticated
--     role and see ONLY what the policies allow. Restaurant staff and the
--     kitchen display use the service role (bypasses RLS) or a future
--     staff-role policy set — deliberately out of scope here.
--   * Cross-table discovery NEVER goes through direct table reads. It goes
--     through the SECURITY DEFINER function public_table_orders(), which is
--     the single, audited window into other diners' orders.
--
-- Requires: Postgres 15+. gen_random_uuid() is core; pgcrypto supplies
-- gen_random_bytes() for QR tokens.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

-- Lifecycle of a dine-in order, exactly as the app's StatusTimeline renders it.
CREATE TYPE order_status AS ENUM ('placed', 'confirmed', 'preparing', 'ready', 'served', 'cancelled');

-- A dining session is the "visit": opened when the first guest scans the QR,
-- closed when the bill is settled (or abandoned by a sweep job).
CREATE TYPE session_status AS ENUM ('open', 'closed', 'abandoned');

-- Payment modes a restaurant may switch on. Mirrors RestaurantSettings.paymentModes.
CREATE TYPE payment_mode AS ENUM ('pay_at_table', 'pay_online', 'split');

CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

CREATE TYPE dietary_type AS ENUM ('veg', 'non_veg', 'egg');

CREATE TYPE notification_kind AS ENUM ('order', 'social');

-- ----------------------------------------------------------------------------
-- restaurants
-- ----------------------------------------------------------------------------

CREATE TABLE restaurants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  tagline     text NOT NULL DEFAULT '',
  hero_image_url text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE restaurants IS 'One row per venue, e.g. "The Courtyard Kitchen".';

-- ----------------------------------------------------------------------------
-- restaurant_settings — per-restaurant product configuration.
-- Split from restaurants so ops can grant staff UPDATE here without touching
-- the venue identity row, and so the app can subscribe to just this row.
-- Every behavioural switch in the app reads from here; nothing is hardcoded.
-- ----------------------------------------------------------------------------

CREATE TABLE restaurant_settings (
  restaurant_id  uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,

  ordering_enabled            boolean NOT NULL DEFAULT true,   -- kill switch: browse-only mode
  cross_table_visibility      boolean NOT NULL DEFAULT true,   -- master switch for the discovery feed
  show_table_numbers          boolean NOT NULL DEFAULT true,   -- false -> feed says "A table nearby"
  allow_add_from_other_tables boolean NOT NULL DEFAULT true,   -- false -> feed is look-but-don't-copy
  anonymous_orders            boolean NOT NULL DEFAULT false,  -- true -> table identity always hidden in feed

  tax_rate_pct       numeric(5,2) NOT NULL DEFAULT 5.00  CHECK (tax_rate_pct >= 0 AND tax_rate_pct <= 100),
  service_charge_pct numeric(5,2) NOT NULL DEFAULT 0.00  CHECK (service_charge_pct >= 0 AND service_charge_pct <= 100),

  payment_modes payment_mode[] NOT NULL DEFAULT '{pay_at_table}' CHECK (cardinality(payment_modes) > 0)
);

COMMENT ON COLUMN restaurant_settings.anonymous_orders IS
  'Hard privacy switch: when true, public_table_orders() always returns NULL table_number, regardless of show_table_numbers.';

-- ----------------------------------------------------------------------------
-- restaurant_tables — physical tables. The QR code on the table encodes
-- qr_token; the join flow exchanges it for a session (see join_table_session).
-- ----------------------------------------------------------------------------

CREATE TABLE restaurant_tables (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number  integer NOT NULL CHECK (table_number > 0),
  seat_count    integer NOT NULL DEFAULT 4 CHECK (seat_count > 0),
  qr_token      text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active     boolean NOT NULL DEFAULT true,

  UNIQUE (restaurant_id, table_number)
);

CREATE INDEX idx_restaurant_tables_restaurant ON restaurant_tables (restaurant_id);

-- ----------------------------------------------------------------------------
-- users — profile row per auth user. Auth itself lives in auth.users
-- (Supabase); this table holds the app-facing profile only.
-- ----------------------------------------------------------------------------

CREATE TABLE users (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Guest',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- dining_sessions — one "visit" at one table. The pivot of the whole model:
-- membership, orders, payments and the cross-table feed all hang off it.
-- ----------------------------------------------------------------------------

CREATE TABLE dining_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id      uuid NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  status        session_status NOT NULL DEFAULT 'open',
  started_at    timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,

  -- closed_at is set exactly when the session leaves 'open'.
  CHECK ((status = 'open') = (closed_at IS NULL))
);

-- Hot path: "is there an open session at this table?" during QR join,
-- and the guarantee that a table hosts at most ONE open session.
CREATE UNIQUE INDEX idx_dining_sessions_open_table
  ON dining_sessions (table_id) WHERE status = 'open';

-- Hot path: the cross-table feed scans open sessions per restaurant.
CREATE INDEX idx_dining_sessions_open_restaurant
  ON dining_sessions (restaurant_id) WHERE status = 'open';

-- ----------------------------------------------------------------------------
-- table_members — who is sitting in a session. display_name is per-session
-- ("You", "Guest 2") so a diner's global profile name never leaks to
-- co-diners unless they choose it.
-- ----------------------------------------------------------------------------

CREATE TABLE table_members (
  session_id   uuid NOT NULL REFERENCES dining_sessions(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Guest',
  joined_at    timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (session_id, user_id)
);

-- Hot path: RLS helper resolves "my open sessions" from user_id.
CREATE INDEX idx_table_members_user ON table_members (user_id);

-- ----------------------------------------------------------------------------
-- Menu
-- ----------------------------------------------------------------------------

CREATE TABLE menu_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  emoji         text NOT NULL DEFAULT '',
  sort_order    integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_menu_categories_restaurant ON menu_categories (restaurant_id, sort_order);

CREATE TABLE menu_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id    uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id      uuid NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text NOT NULL DEFAULT '',
  long_description text NOT NULL DEFAULT '',
  price_paise      integer NOT NULL CHECK (price_paise >= 0),
  image_url        text,
  dietary          dietary_type NOT NULL DEFAULT 'veg',
  spice            smallint NOT NULL DEFAULT 0 CHECK (spice BETWEEN 0 AND 3),
  bestseller       boolean NOT NULL DEFAULT false,
  chef_special     boolean NOT NULL DEFAULT false,
  available        boolean NOT NULL DEFAULT true,   -- 86'd items stay on the menu, greyed out
  ingredients      text[] NOT NULL DEFAULT '{}',
  allergens        text[] NOT NULL DEFAULT '{}',
  tags             text[] NOT NULL DEFAULT '{}',    -- search: cuisine, ingredient words
  sort_order       integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_menu_items_restaurant_category ON menu_items (restaurant_id, category_id, sort_order);

-- Variant groups ("Choose spice level") and their options. Options carry a
-- price delta in paise; exactly one option per group is the default.
CREATE TABLE menu_item_variant_groups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name         text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_variant_groups_item ON menu_item_variant_groups (menu_item_id);

CREATE TABLE menu_item_variant_options (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_group_id  uuid NOT NULL REFERENCES menu_item_variant_groups(id) ON DELETE CASCADE,
  name              text NOT NULL,
  price_delta_paise integer NOT NULL DEFAULT 0,   -- may be negative (e.g. "half portion")
  is_default        boolean NOT NULL DEFAULT false,
  sort_order        integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_variant_options_group ON menu_item_variant_options (variant_group_id);

-- At most one default option per group (mirrors MenuVariantGroup.defaultOptionId).
CREATE UNIQUE INDEX idx_variant_options_one_default
  ON menu_item_variant_options (variant_group_id) WHERE is_default;

CREATE TABLE menu_item_addons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name         text NOT NULL,
  price_paise  integer NOT NULL DEFAULT 0 CHECK (price_paise >= 0),
  sort_order   integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_addons_item ON menu_item_addons (menu_item_id);

-- ----------------------------------------------------------------------------
-- orders — one round of ordering, placed by ONE member of ONE session.
-- A session typically accumulates several orders (starters round, mains
-- round, dessert round). Totals are denormalised at placement time so the
-- receipt is immutable even if menu prices or tax rates change later.
-- ----------------------------------------------------------------------------

CREATE TABLE orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES dining_sessions(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Human-friendly order number shown on the tracking screen ("Order #1048").
  order_number bigint GENERATED ALWAYS AS IDENTITY,

  status       order_status NOT NULL DEFAULT 'placed',
  placed_at    timestamptz NOT NULL DEFAULT now(),

  special_instructions text,

  subtotal_paise       integer NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
  tax_paise            integer NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  service_charge_paise integer NOT NULL DEFAULT 0 CHECK (service_charge_paise >= 0),
  total_paise          integer NOT NULL DEFAULT 0 CHECK (total_paise >= 0),

  -- The member must actually belong to the session they order in.
  FOREIGN KEY (session_id, user_id) REFERENCES table_members(session_id, user_id)
);

CREATE INDEX idx_orders_session ON orders (session_id);
CREATE INDEX idx_orders_user ON orders (user_id);

-- ----------------------------------------------------------------------------
-- order_items — the lines of an order. This is the most-read table in the
-- system (kitchen display, tracking screen, cross-table feed) so its indexes
-- matter most.
--
-- source_order_item_id is the cross-table provenance link: when a diner taps
-- "Add to my order" on another table's item, the copy function inserts a NEW
-- row here pointing at the row it was copied from. Copy, never move — the
-- source row is never touched. ON DELETE SET NULL so deleting old data never
-- cascades into someone else's order history.
-- ----------------------------------------------------------------------------

CREATE TABLE order_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id     uuid NOT NULL REFERENCES menu_items(id),
  quantity         integer NOT NULL CHECK (quantity > 0),
  unit_price_paise integer NOT NULL CHECK (unit_price_paise >= 0),
  note             text,                                   -- "less spicy please" — PRIVATE, never in the feed

  -- Snapshot of the diner's configuration at order time, so the receipt
  -- survives menu edits: {"<group_id>": "<option_id>", ...}
  variant_selections jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(variant_selections) = 'object'),
  -- [{"addon_id": "...", "name": "...", "price_paise": 3000}, ...]
  addon_selections   jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(addon_selections) = 'array'),

  -- Cross-table provenance. NULL for organic orders.
  source_order_item_id uuid REFERENCES order_items(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Hot path: load an order's lines (kitchen display, tracking screen, receipt).
CREATE INDEX idx_order_items_order ON order_items (order_id);

-- Hot path: "which items were copied, and from where" (analytics, badges).
-- Partial: the vast majority of rows are organic, keep the index tiny.
CREATE INDEX idx_order_items_source
  ON order_items (source_order_item_id) WHERE source_order_item_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- order_status_history — append-only audit of every status transition,
-- written automatically by the trigger below. Drives the StatusTimeline UI
-- and is in the realtime publication so the app animates transitions live.
-- ----------------------------------------------------------------------------

CREATE TABLE order_status_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     order_status NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES users(id)   -- NULL when the kitchen system (service role) moved it
);

CREATE INDEX idx_order_status_history_order ON order_status_history (order_id, changed_at);

-- Log every transition (and the initial 'placed') automatically.
CREATE OR REPLACE FUNCTION log_order_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_status_history (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_status_history (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_status_history
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status();

-- ----------------------------------------------------------------------------
-- payments — one row per payment attempt. Bound to a session (the bill) and
-- optionally to a single order; 'split' mode produces several rows per
-- session, one per paying member. Status transitions come from the payment
-- provider webhook (service role) — diners can only create 'pending' rows.
-- ----------------------------------------------------------------------------

CREATE TABLE payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES dining_sessions(id) ON DELETE CASCADE,
  order_id     uuid REFERENCES orders(id) ON DELETE SET NULL,
  user_id      uuid NOT NULL REFERENCES users(id),
  mode         payment_mode NOT NULL,
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  status       payment_status NOT NULL DEFAULT 'pending',
  provider     text,          -- 'razorpay', 'stripe', 'cash', ...
  provider_ref text,          -- opaque gateway reference, never card data
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_session ON payments (session_id);
CREATE INDEX idx_payments_user ON payments (user_id);

-- ----------------------------------------------------------------------------
-- notifications — per-user inbox ("Order confirmed", "Table 8 just ordered").
-- Written by backend jobs / triggers with the service role.
-- ----------------------------------------------------------------------------

CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       notification_kind NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL DEFAULT '',
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Hot path: unread badge count.
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE NOT read;

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- The mental model:
--   * You can see/act on YOUR OWN data inside YOUR OWN active dining session.
--   * You can read the menu of the restaurant you are currently seated at.
--   * You can see OTHER tables' orders ONLY through public_table_orders(),
--     which strips identity and respects the restaurant's privacy switches.
--   * Staff/kitchen/webhooks use the service role and bypass RLS entirely.
-- ============================================================================

ALTER TABLE restaurants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_variant_groups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_addons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS helper functions.
-- Kept in a private schema so PostgREST never exposes them as RPC endpoints
-- (only `public` is exposed by default). SECURITY DEFINER so they can read
-- table_members/dining_sessions without tripping over those tables' own
-- policies (avoids policy recursion). STABLE so the planner caches them
-- per-statement.
-- ----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS app_private;
GRANT USAGE ON SCHEMA app_private TO authenticated;

-- Sessions the calling user currently sits in.
CREATE OR REPLACE FUNCTION app_private.my_open_session_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT tm.session_id
  FROM table_members tm
  JOIN dining_sessions ds ON ds.id = tm.session_id
  WHERE tm.user_id = auth.uid() AND ds.status = 'open';
$$;

-- Restaurants the calling user is currently seated at (almost always one).
CREATE OR REPLACE FUNCTION app_private.my_restaurant_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT ds.restaurant_id
  FROM table_members tm
  JOIN dining_sessions ds ON ds.id = tm.session_id
  WHERE tm.user_id = auth.uid() AND ds.status = 'open';
$$;

REVOKE ALL ON FUNCTION app_private.my_open_session_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.my_restaurant_ids()  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.my_open_session_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.my_restaurant_ids()  TO authenticated;

-- ----------------------------------------------------------------------------
-- users: you are your own row.
-- ----------------------------------------------------------------------------

CREATE POLICY users_select_self ON users FOR SELECT
  USING (id = auth.uid());
CREATE POLICY users_insert_self ON users FOR INSERT
  WITH CHECK (id = auth.uid());
CREATE POLICY users_update_self ON users FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ----------------------------------------------------------------------------
-- restaurants / settings / tables: readable while seated there.
-- (The pre-join lookup during QR scan goes through join_table_session below,
-- which is SECURITY DEFINER — so no anon read access is needed here.)
-- ----------------------------------------------------------------------------

CREATE POLICY restaurants_select_seated ON restaurants FOR SELECT
  USING (id IN (SELECT app_private.my_restaurant_ids()));

CREATE POLICY restaurant_settings_select_seated ON restaurant_settings FOR SELECT
  USING (restaurant_id IN (SELECT app_private.my_restaurant_ids()));

-- Table numbers/seat counts are not sensitive; qr_token is, so we would use a
-- column grant in production: REVOKE SELECT (qr_token) is not supported per
-- column in policies, so instead: grant column-level SELECT.
REVOKE SELECT ON restaurant_tables FROM authenticated;
GRANT SELECT (id, restaurant_id, table_number, seat_count, is_active) ON restaurant_tables TO authenticated;

CREATE POLICY restaurant_tables_select_seated ON restaurant_tables FOR SELECT
  USING (restaurant_id IN (SELECT app_private.my_restaurant_ids()));

-- ----------------------------------------------------------------------------
-- dining_sessions / table_members: visible to their members only.
-- Membership rows are created exclusively by join_table_session() (definer),
-- so there is deliberately NO insert policy on table_members.
-- ----------------------------------------------------------------------------

CREATE POLICY dining_sessions_select_member ON dining_sessions FOR SELECT
  USING (id IN (SELECT app_private.my_open_session_ids()));

CREATE POLICY table_members_select_comembers ON table_members FOR SELECT
  USING (session_id IN (SELECT app_private.my_open_session_ids()));

CREATE POLICY table_members_update_own_name ON table_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Menu: readable for the restaurant of your active session. Menu writes are
-- a staff/admin concern (service role) — no write policies for diners.
-- ----------------------------------------------------------------------------

CREATE POLICY menu_categories_select_seated ON menu_categories FOR SELECT
  USING (restaurant_id IN (SELECT app_private.my_restaurant_ids()));

CREATE POLICY menu_items_select_seated ON menu_items FOR SELECT
  USING (restaurant_id IN (SELECT app_private.my_restaurant_ids()));

CREATE POLICY variant_groups_select_seated ON menu_item_variant_groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM menu_items mi
    WHERE mi.id = menu_item_id
      AND mi.restaurant_id IN (SELECT app_private.my_restaurant_ids())
  ));

CREATE POLICY variant_options_select_seated ON menu_item_variant_options FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM menu_item_variant_groups g
    JOIN menu_items mi ON mi.id = g.menu_item_id
    WHERE g.id = variant_group_id
      AND mi.restaurant_id IN (SELECT app_private.my_restaurant_ids())
  ));

CREATE POLICY addons_select_seated ON menu_item_addons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM menu_items mi
    WHERE mi.id = menu_item_id
      AND mi.restaurant_id IN (SELECT app_private.my_restaurant_ids())
  ));

-- ----------------------------------------------------------------------------
-- orders: a diner reads and writes ONLY their own orders in their own ACTIVE
-- session. (Post-visit receipts would come from a separate, read-only
-- endpoint/policy — intentionally out of scope for the dine-in surface.)
-- Status transitions belong to the kitchen (service role), so diners get no
-- UPDATE policy on orders.
-- ----------------------------------------------------------------------------

CREATE POLICY orders_select_own_active ON orders FOR SELECT
  USING (
    user_id = auth.uid()
    AND session_id IN (SELECT app_private.my_open_session_ids())
  );

CREATE POLICY orders_insert_own_active ON orders FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND session_id IN (SELECT app_private.my_open_session_ids())
    AND status = 'placed'
  );

-- ----------------------------------------------------------------------------
-- order_items: same ownership rule, via the parent order. Direct inserts must
-- NOT carry source_order_item_id — cross-table copies are only minted by
-- create_cross_table_copy(), which validates the source server-side. This
-- closes the hole where a client fabricates provenance or probes foreign ids.
-- ----------------------------------------------------------------------------

CREATE POLICY order_items_select_own_active ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_id
      AND o.user_id = auth.uid()
      AND o.session_id IN (SELECT app_private.my_open_session_ids())
  ));

CREATE POLICY order_items_insert_own_active ON order_items FOR INSERT
  WITH CHECK (
    source_order_item_id IS NULL
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND o.user_id = auth.uid()
        AND o.session_id IN (SELECT app_private.my_open_session_ids())
        AND o.status = 'placed'    -- lines can only be added before the kitchen confirms
    )
  );

-- ----------------------------------------------------------------------------
-- order_status_history: readable for your own orders; written only by the
-- trigger above (definer) — no insert policy.
-- ----------------------------------------------------------------------------

CREATE POLICY order_status_history_select_own ON order_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_id
      AND o.user_id = auth.uid()
      AND o.session_id IN (SELECT app_private.my_open_session_ids())
  ));

-- ----------------------------------------------------------------------------
-- payments: you see your own; you may open a 'pending' intent in an allowed
-- mode; the gateway webhook (service role) settles it.
-- ----------------------------------------------------------------------------

CREATE POLICY payments_select_own ON payments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY payments_insert_own_pending ON payments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND session_id IN (SELECT app_private.my_open_session_ids())
    AND EXISTS (
      SELECT 1
      FROM dining_sessions ds
      JOIN restaurant_settings rs ON rs.restaurant_id = ds.restaurant_id
      WHERE ds.id = session_id
        AND mode = ANY (rs.payment_modes)   -- mode must be enabled by the restaurant
    )
  );

-- ----------------------------------------------------------------------------
-- notifications: your own inbox; you may mark them read.
-- ----------------------------------------------------------------------------

CREATE POLICY notifications_select_own ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Joining a table (QR scan)
-- ============================================================================
-- restaurantapp://join?restaurant=..&table=..&session=..  ->  this RPC.
-- SECURITY DEFINER because at scan time the caller is not yet a member of
-- anything, so no RLS policy could let them in. The QR token is the
-- capability: knowing it proves physical presence at the table.
-- ============================================================================

CREATE OR REPLACE FUNCTION join_table_session(p_qr_token text, p_display_name text DEFAULT 'Guest')
RETURNS uuid  -- the dining_session id
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_table restaurant_tables%ROWTYPE;
  v_session_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_table FROM restaurant_tables
  WHERE qr_token = p_qr_token AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown table';
  END IF;

  -- Ensure a profile row exists (first scan ever).
  INSERT INTO users (id, display_name) VALUES (auth.uid(), p_display_name)
  ON CONFLICT (id) DO NOTHING;

  -- Reuse the table's open session or open a new one. The partial unique
  -- index guarantees at most one open session per table even under races.
  SELECT id INTO v_session_id FROM dining_sessions
  WHERE table_id = v_table.id AND status = 'open';
  IF NOT FOUND THEN
    INSERT INTO dining_sessions (restaurant_id, table_id)
    VALUES (v_table.restaurant_id, v_table.id)
    RETURNING id INTO v_session_id;
  END IF;

  INSERT INTO table_members (session_id, user_id, display_name)
  VALUES (v_session_id, auth.uid(), p_display_name)
  ON CONFLICT (session_id, user_id) DO NOTHING;

  RETURN v_session_id;
END;
$$;

REVOKE ALL ON FUNCTION join_table_session(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_table_session(text, text) TO authenticated;

-- ============================================================================
-- Cross-table discovery: public_table_orders(restaurant_id)
-- ============================================================================
-- THE ONLY window into other diners' orders. SECURITY DEFINER so it can read
-- across sessions that RLS otherwise hides, returning a deliberately tiny
-- projection:
--
--   exposed:  order_item id (opaque provenance handle for the copy RPC),
--             table_number (NULL when the restaurant anonymises tables),
--             menu_item_id, quantity, ordered_at
--   NEVER:    user ids, member names, notes, special instructions, prices
--             paid, payment data, session ids
--
-- Honours restaurant_settings:
--   cross_table_visibility = false  ->  returns zero rows
--   show_table_numbers     = false  ->  table_number is NULL ("A table nearby")
--   anonymous_orders       = true   ->  table_number is NULL, always
--
-- The caller's own table is excluded — you already see your own cart.
-- ============================================================================

CREATE OR REPLACE FUNCTION public_table_orders(p_restaurant_id uuid)
RETURNS TABLE (
  item_id      uuid,          -- pass to create_cross_table_copy as source
  table_number integer,       -- NULL when anonymised by settings
  menu_item_id uuid,
  quantity     integer,
  ordered_at   timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_settings restaurant_settings%ROWTYPE;
  v_reveal_numbers boolean;
BEGIN
  -- The caller must be seated at THIS restaurant right now. We derive that
  -- from their membership rows — the client-supplied id is only a filter,
  -- never trusted as authorisation.
  IF NOT EXISTS (
    SELECT 1
    FROM table_members tm
    JOIN dining_sessions ds ON ds.id = tm.session_id
    WHERE tm.user_id = auth.uid()
      AND ds.status = 'open'
      AND ds.restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'not seated at this restaurant';
  END IF;

  SELECT * INTO v_settings FROM restaurant_settings WHERE restaurant_id = p_restaurant_id;

  -- Restaurant-level master switch.
  IF v_settings IS NULL OR NOT v_settings.cross_table_visibility THEN
    RETURN; -- feature off: empty feed, not an error
  END IF;

  v_reveal_numbers := v_settings.show_table_numbers AND NOT v_settings.anonymous_orders;

  RETURN QUERY
  SELECT
    oi.id,
    CASE WHEN v_reveal_numbers THEN rt.table_number ELSE NULL END,
    oi.menu_item_id,
    oi.quantity,
    oi.created_at
  FROM order_items oi
  JOIN orders o          ON o.id = oi.order_id
  JOIN dining_sessions ds ON ds.id = o.session_id
  JOIN restaurant_tables rt ON rt.id = ds.table_id
  WHERE ds.restaurant_id = p_restaurant_id
    AND ds.status = 'open'                                   -- live tables only
    AND o.status <> 'cancelled'
    AND ds.id NOT IN (SELECT app_private.my_open_session_ids()) -- not my own table
  ORDER BY oi.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public_table_orders(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public_table_orders(uuid) TO authenticated;

-- ============================================================================
-- Cross-table copy: create_cross_table_copy(source, target_order, qty)
-- ============================================================================
-- "Add Table 8's Chicken Tikka to my order." Semantics, enforced server-side:
--
--   * COPY, never move: inserts a brand-new order_item on the CALLER's order;
--     the source row is never read-modified, decremented or locked.
--   * The caller must own the target order, inside their own OPEN session.
--   * Source and target must belong to the SAME restaurant — derived from the
--     rows themselves, never from client-supplied table/session ids.
--   * Settings gates: ordering_enabled, cross_table_visibility and
--     allow_add_from_other_tables must all be on.
--   * The copy is re-priced from today's menu (base price, default variants,
--     no addons, no note) — you copy the DISH, not the other diner's
--     customisations, notes or negotiated price.
--   * source_order_item_id records provenance for the "Inspired by Table 8"
--     tag and for the analytics below.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_cross_table_copy(
  p_source_order_item_id uuid,
  p_target_order_id      uuid,
  p_qty                  integer DEFAULT 1
)
RETURNS uuid  -- the new order_item id
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_target_order   orders%ROWTYPE;
  v_target_rest    uuid;
  v_source_rest    uuid;
  v_source_session uuid;
  v_menu_item_id   uuid;
  v_settings       restaurant_settings%ROWTYPE;
  v_price          integer;
  v_available      boolean;
  v_new_id         uuid;
BEGIN
  IF p_qty IS NULL OR p_qty < 1 OR p_qty > 20 THEN
    RAISE EXCEPTION 'quantity must be between 1 and 20';
  END IF;

  -- 1) The target order must be MINE, still open for additions, in MY open session.
  SELECT o.* INTO v_target_order FROM orders o WHERE o.id = p_target_order_id;
  IF NOT FOUND OR v_target_order.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'target order not found';   -- same error either way: no id probing
  END IF;
  IF v_target_order.status <> 'placed' THEN
    RAISE EXCEPTION 'order can no longer be modified';
  END IF;

  SELECT ds.restaurant_id INTO v_target_rest
  FROM dining_sessions ds
  WHERE ds.id = v_target_order.session_id AND ds.status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'your dining session is closed';
  END IF;

  -- 2) The source item must live in an OPEN session at the SAME restaurant.
  --    All of this is derived server-side from the source row — the client
  --    only ever hands us the opaque id it got from public_table_orders().
  SELECT ds.restaurant_id, ds.id, oi.menu_item_id
    INTO v_source_rest, v_source_session, v_menu_item_id
  FROM order_items oi
  JOIN orders o           ON o.id = oi.order_id
  JOIN dining_sessions ds ON ds.id = o.session_id
  WHERE oi.id = p_source_order_item_id
    AND ds.status = 'open'
    AND o.status <> 'cancelled';
  IF NOT FOUND OR v_source_rest IS DISTINCT FROM v_target_rest THEN
    RAISE EXCEPTION 'source item not available';
  END IF;
  IF v_source_session = v_target_order.session_id THEN
    RAISE EXCEPTION 'that item is already at your table';
  END IF;

  -- 3) Restaurant switches.
  SELECT * INTO v_settings FROM restaurant_settings WHERE restaurant_id = v_target_rest;
  IF v_settings IS NULL
     OR NOT v_settings.ordering_enabled
     OR NOT v_settings.cross_table_visibility
     OR NOT v_settings.allow_add_from_other_tables THEN
    RAISE EXCEPTION 'copying from other tables is not enabled here';
  END IF;

  -- 4) Re-price from the live menu; refuse 86'd items.
  SELECT mi.price_paise, mi.available INTO v_price, v_available
  FROM menu_items mi WHERE mi.id = v_menu_item_id;
  IF NOT FOUND OR NOT v_available THEN
    RAISE EXCEPTION 'this dish is not available right now';
  END IF;

  -- 5) Insert the NEW line. The source row is untouched.
  INSERT INTO order_items (
    order_id, menu_item_id, quantity, unit_price_paise,
    variant_selections, addon_selections, note, source_order_item_id
  )
  VALUES (
    p_target_order_id, v_menu_item_id, p_qty, v_price,
    '{}'::jsonb, '[]'::jsonb, NULL, p_source_order_item_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION create_cross_table_copy(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_cross_table_copy(uuid, uuid, integer) TO authenticated;

-- ============================================================================
-- Realtime
-- ============================================================================
-- The app (src/services/realtime.ts) subscribes to exactly two streams:
--   * order_items          -> "another table just ordered X" (via the feed)
--   * order_status_history -> "your order moved to preparing/ready/served"
-- RLS applies to realtime payloads too, so diners only receive rows their
-- policies let them read; the cross-table feed re-queries public_table_orders()
-- when a change arrives rather than reading foreign rows directly.
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE order_status_history;

-- ============================================================================
-- Analytics example: how much ordering does each table INSPIRE?
-- ============================================================================
-- Share of copied order_items attributed to each source table — i.e. "% of
-- all cross-table copies that were copied FROM table N", plus each table's
-- copy rate. This is the business case for source_order_item_id: it turns
-- 'social proof' into a measurable funnel.
--
--   SELECT
--     rt.table_number                                        AS source_table,
--     COUNT(copy.id)                                         AS items_copied_from_it,
--     ROUND(100.0 * COUNT(copy.id)
--                 / SUM(COUNT(copy.id)) OVER (), 1)          AS pct_of_all_copies
--   FROM order_items copy
--   JOIN order_items src ON src.id = copy.source_order_item_id
--   JOIN orders o           ON o.id  = src.order_id
--   JOIN dining_sessions ds ON ds.id = o.session_id
--   JOIN restaurant_tables rt ON rt.id = ds.table_id
--   WHERE copy.source_order_item_id IS NOT NULL
--     AND rt.restaurant_id = :restaurant_id
--   GROUP BY rt.table_number
--   ORDER BY items_copied_from_it DESC;
--
-- (For the overall conversion rate: COUNT(*) FILTER (WHERE
--  source_order_item_id IS NOT NULL)::numeric / COUNT(*) over order_items.)
-- ============================================================================
