-- ================================================================
-- RAYLANE EXPRESS — SUPABASE DATABASE SETUP
-- Run this in the Supabase SQL Editor (dashboard.supabase.com)
-- ================================================================
-- Execution order matters — run top to bottom in one transaction.
-- ================================================================

-- ── 0. EXTENSIONS ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";   -- for scheduled payouts

-- ── 1. ENUMS ────────────────────────────────────────────────────
CREATE TYPE operator_type     AS ENUM ('RAYLANE', 'THIRD_PARTY');
CREATE TYPE operator_status   AS ENUM ('pending', 'active', 'suspended', 'rejected');
CREATE TYPE vehicle_type      AS ENUM ('TAXI_14', 'MINIBUS_22', 'COACH_55', 'COACH_65', 'COACH_67');
CREATE TYPE trip_status       AS ENUM ('pending', 'approved', 'live', 'boarding', 'departed', 'completed', 'cancelled');
CREATE TYPE booking_type      AS ENUM ('standard', 'advance', 'group', 'charter');
CREATE TYPE booking_status    AS ENUM ('pending', 'confirmed', 'cancelled', 'no_show', 'boarded', 'completed');
CREATE TYPE payment_status    AS ENUM ('pending', 'partial', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method_t  AS ENUM ('MTN_MOMO', 'AIRTEL_MONEY', 'BANK_TRANSFER', 'VISA', 'MASTERCARD', 'CASH');
CREATE TYPE seat_status       AS ENUM ('available', 'locked', 'booked');
CREATE TYPE payout_status     AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE alert_priority    AS ENUM ('URGENT', 'ACTION_REQUIRED', 'INFO');
CREATE TYPE admin_role        AS ENUM ('SUPER_ADMIN', 'FINANCE', 'OPERATIONS', 'SUPPORT');
CREATE TYPE module_key        AS ENUM ('trips', 'bookings', 'seats', 'parcels', 'financials', 'fleet', 'analytics', 'hr');

-- ── 2. PLATFORM CONFIG (singleton) ──────────────────────────────
CREATE TABLE platform_config (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_rate              numeric(4,3) NOT NULL DEFAULT 0.100,
  raylane_commission_rate      numeric(4,3) NOT NULL DEFAULT 0.000,
  seat_lock_seconds            integer NOT NULL DEFAULT 300,
  advance_booking_max_weeks    integer NOT NULL DEFAULT 4,
  advance_commitment_percent   numeric(4,3) NOT NULL DEFAULT 0.200,
  min_withdrawal_ugx           integer NOT NULL DEFAULT 20000,
  sms_enabled                  boolean NOT NULL DEFAULT true,
  dynamic_pricing_enabled      boolean NOT NULL DEFAULT false,
  tourist_ai_enabled           boolean NOT NULL DEFAULT true,
  mtn_momo_live                boolean NOT NULL DEFAULT false,   -- flip to true for production
  airtel_money_live            boolean NOT NULL DEFAULT false,
  updated_at                   timestamptz DEFAULT now()
);
-- Ensure only one row
CREATE UNIQUE INDEX platform_config_singleton ON platform_config ((true));
INSERT INTO platform_config DEFAULT VALUES;

-- ── 3. ADMIN USERS ───────────────────────────────────────────────
CREATE TABLE admin_users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  email      text UNIQUE NOT NULL,
  role       admin_role NOT NULL DEFAULT 'SUPPORT',
  created_at timestamptz DEFAULT now()
);

-- ── 4. OPERATORS ─────────────────────────────────────────────────
CREATE TABLE operators (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  email                text UNIQUE NOT NULL,
  phone                text NOT NULL,
  registration_number  text UNIQUE NOT NULL,
  operator_type        operator_type NOT NULL DEFAULT 'THIRD_PARTY',
  is_raylane_fleet     boolean NOT NULL DEFAULT false,
  status               operator_status NOT NULL DEFAULT 'pending',
  commission_rate      numeric(4,3) NOT NULL DEFAULT 0.100,
  modules_enabled      module_key[] NOT NULL DEFAULT ARRAY['trips','bookings','seats','parcels']::module_key[],
  priority_boost       boolean NOT NULL DEFAULT false,
  contact_person       text,
  address              text,
  logo_url             text,
  document_url         text,   -- Supabase Storage path
  license_url          text,
  insurance_url        text,
  notes                text,
  approved_by          uuid REFERENCES admin_users(id),
  approved_at          timestamptz,
  created_at           timestamptz DEFAULT now(),
  deleted_at           timestamptz,          -- Soft delete
  CONSTRAINT raylane_zero_commission CHECK (
    operator_type <> 'RAYLANE' OR commission_rate = 0.000
  )
);

-- ── 5. OPERATOR AUTH LINK ─────────────────────────────────────────
-- Links Supabase auth.users → operators
CREATE TABLE operator_users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'admin',  -- 'admin' | 'staff'
  created_at  timestamptz DEFAULT now()
);

-- ── 6. VEHICLES ──────────────────────────────────────────────────
CREATE TABLE vehicles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id          uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  plate                text UNIQUE NOT NULL,   -- Global uniqueness enforced
  type                 vehicle_type NOT NULL,
  seats                integer NOT NULL,
  make_model           text,
  year                 integer,
  photo_url            text,
  is_raylane_fleet     boolean NOT NULL DEFAULT false,
  maintenance_status   text NOT NULL DEFAULT 'ok',   -- 'ok' | 'scheduled' | 'in_maintenance'
  odometer_km          integer,
  insurance_expiry     date,
  created_at           timestamptz DEFAULT now(),
  deleted_at           timestamptz,
  CONSTRAINT seats_match_type CHECK (
    (type = 'TAXI_14'    AND seats = 14) OR
    (type = 'MINIBUS_22' AND seats = 22) OR
    (type = 'COACH_55'   AND seats = 55) OR
    (type = 'COACH_65'   AND seats = 65) OR
    (type = 'COACH_67'   AND seats = 67)
  )
);

-- ── 7. DRIVERS ───────────────────────────────────────────────────
CREATE TABLE drivers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id      uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  name             text NOT NULL,
  phone            text NOT NULL,
  license_number   text NOT NULL,
  license_expiry   date,
  photo_url        text,
  rating           numeric(3,2) DEFAULT 5.00,
  trips_completed  integer NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'available',  -- 'available' | 'on_trip' | 'off_duty'
  created_at       timestamptz DEFAULT now(),
  deleted_at       timestamptz
);

-- ── 8. TRIPS ─────────────────────────────────────────────────────
CREATE TABLE trips (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id            uuid NOT NULL REFERENCES operators(id),
  vehicle_id             uuid NOT NULL REFERENCES vehicles(id),
  driver_id              uuid REFERENCES drivers(id),
  from_city              text NOT NULL,
  to_city                text NOT NULL,
  departure_time         timestamptz NOT NULL,
  arrival_time_estimate  timestamptz,
  price_ugx              integer NOT NULL CHECK (price_ugx > 0),
  total_seats            integer NOT NULL,
  booked_seats           integer NOT NULL DEFAULT 0,
  status                 trip_status NOT NULL DEFAULT 'pending',
  auto_approved          boolean NOT NULL DEFAULT false,
  amenities              text[] DEFAULT '{}',
  priority_score         integer NOT NULL DEFAULT 10,   -- 1 = Raylane Fleet (highest)
  is_raylane_fleet       boolean NOT NULL DEFAULT false,
  approved_by            uuid REFERENCES admin_users(id),
  approved_at            timestamptz,
  departure_note         text,   -- e.g. "Delayed 30min"
  created_at             timestamptz DEFAULT now(),
  deleted_at             timestamptz,
  CONSTRAINT valid_seat_count CHECK (booked_seats >= 0 AND booked_seats <= total_seats),
  CONSTRAINT departure_in_future CHECK (departure_time > created_at)
);

-- ── 9. SEATS (per-trip per-seat row) ─────────────────────────────
CREATE TABLE seats (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id           uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_number       integer NOT NULL,
  status            seat_status NOT NULL DEFAULT 'available',
  locked_until      timestamptz,            -- NULL when available
  locked_by_session text,                   -- Client session ID for matching
  booking_id        uuid,                   -- Set on confirm (FK added after bookings table)
  UNIQUE(trip_id, seat_number)              -- Prevents duplicate seat per trip
);

-- ── 10. PASSENGERS ───────────────────────────────────────────────
CREATE TABLE passengers (
  id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name               text NOT NULL,
  phone              text NOT NULL UNIQUE,
  phone_verified     boolean NOT NULL DEFAULT false,
  email              text,
  nationality        text,
  preferred_currency text DEFAULT 'UGX',
  created_at         timestamptz DEFAULT now()
);

-- ── 11. BOOKINGS ─────────────────────────────────────────────────
CREATE TABLE bookings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference             text UNIQUE NOT NULL,          -- RL-XXXXXX (not sequential)
  trip_id               uuid NOT NULL REFERENCES trips(id),
  passenger_id          uuid REFERENCES passengers(id), -- NULL for guest bookings
  passenger_name        text NOT NULL,
  passenger_phone       text NOT NULL,
  seat_numbers          integer[] NOT NULL,
  booking_type          booking_type NOT NULL DEFAULT 'standard',
  total_amount_ugx      integer NOT NULL,
  commitment_paid_ugx   integer NOT NULL DEFAULT 0,
  balance_due_ugx       integer NOT NULL DEFAULT 0,
  raylane_commission_ugx integer NOT NULL DEFAULT 0,   -- Set by DB trigger
  operator_net_ugx      integer NOT NULL DEFAULT 0,   -- Set by DB trigger
  payment_status        payment_status NOT NULL DEFAULT 'pending',
  booking_status        booking_status NOT NULL DEFAULT 'pending',
  is_advance            boolean NOT NULL DEFAULT false,
  advance_weeks         integer,
  idempotency_key       text UNIQUE NOT NULL,          -- Prevents double-bookings
  qr_token              text UNIQUE,                   -- Server-signed JWT
  boarded_at            timestamptz,
  cancelled_at          timestamptz,
  cancel_reason         text,
  created_at            timestamptz DEFAULT now()
);
-- Add FK from seats to bookings now that bookings exists
ALTER TABLE seats ADD CONSTRAINT seats_booking_fk FOREIGN KEY (booking_id) REFERENCES bookings(id);

-- ── 12. PAYMENTS ─────────────────────────────────────────────────
CREATE TABLE payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          uuid NOT NULL REFERENCES bookings(id),
  amount_ugx          integer NOT NULL,
  method              payment_method_t NOT NULL,
  phone_number        text,
  provider_reference  text UNIQUE,    -- MoMo transaction ID (UNIQUE prevents replay)
  status              payment_status NOT NULL DEFAULT 'pending',
  webhook_verified    boolean NOT NULL DEFAULT false,
  webhook_signature   text,
  retry_count         integer NOT NULL DEFAULT 0,
  refund_reference    text,
  refunded_at         timestamptz,
  created_at          timestamptz DEFAULT now()
);

-- ── 13. PAYOUTS ──────────────────────────────────────────────────
CREATE TABLE payouts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id        uuid NOT NULL REFERENCES operators(id),
  amount_ugx         integer NOT NULL,
  method             payment_method_t NOT NULL DEFAULT 'MTN_MOMO',
  phone_number       text NOT NULL,
  provider_reference text UNIQUE,
  status             payout_status NOT NULL DEFAULT 'pending',
  period_start       date NOT NULL,
  period_end         date NOT NULL,
  booking_ids        uuid[] NOT NULL,
  processed_by       uuid REFERENCES admin_users(id),
  processed_at       timestamptz,
  created_at         timestamptz DEFAULT now()
);

-- ── 14. PARCELS ──────────────────────────────────────────────────
CREATE TABLE parcels (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference        text UNIQUE NOT NULL,
  trip_id          uuid NOT NULL REFERENCES trips(id),
  operator_id      uuid NOT NULL REFERENCES operators(id),
  sender_name      text NOT NULL,
  sender_phone     text NOT NULL,
  recipient_name   text NOT NULL,
  recipient_phone  text NOT NULL,
  weight_kg        numeric(6,2) NOT NULL,
  declared_value_ugx integer,
  fee_ugx          integer NOT NULL,
  status           text NOT NULL DEFAULT 'received',  -- received | in_transit | delivered | returned
  delivered_at     timestamptz,
  created_at       timestamptz DEFAULT now()
);

-- ── 15. ALERTS ───────────────────────────────────────────────────
CREATE TABLE alerts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text NOT NULL,
  priority     alert_priority NOT NULL,
  title        text NOT NULL,
  message      text NOT NULL,
  action_link  text,
  action_label text,
  metadata     jsonb,
  resolved     boolean NOT NULL DEFAULT false,
  resolved_by  uuid REFERENCES admin_users(id),
  resolved_at  timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- ── 16. AUDIT LOG ────────────────────────────────────────────────
CREATE TABLE audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  user_type    text NOT NULL,    -- 'admin' | 'operator' | 'passenger' | 'system'
  action       text NOT NULL,    -- 'approve_trip' | 'cancel_booking' | etc.
  entity_type  text NOT NULL,
  entity_id    uuid,
  before_state jsonb,
  after_state  jsonb,
  ip_address   inet,
  created_at   timestamptz DEFAULT now()
);

-- ── 17. TOURIST DESTINATIONS ─────────────────────────────────────
CREATE TABLE tourist_destinations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  category          text NOT NULL,    -- 'wildlife' | 'adventure' | 'scenic' | 'nature' | 'cultural'
  description       text NOT NULL,
  image_url         text,
  from_city         text NOT NULL,
  drive_time_hours  numeric(4,1),
  travel_tips       text[] DEFAULT '{}',
  status            text NOT NULL DEFAULT 'draft',
  created_at        timestamptz DEFAULT now()
);

-- ── 18. ITINERARY TEMPLATES ──────────────────────────────────────
CREATE TABLE itinerary_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  days                  integer NOT NULL,
  destinations          text[] NOT NULL,
  estimated_budget_ugx  integer,
  description           text,
  usage_count           integer NOT NULL DEFAULT 0,
  created_at            timestamptz DEFAULT now()
);

-- ── 19. OPERATOR APPLICATIONS ────────────────────────────────────
CREATE TABLE operator_applications (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name           text NOT NULL,
  contact_person          text NOT NULL,
  email                   text NOT NULL,
  phone                   text NOT NULL,
  registration_number     text NOT NULL,
  fleet_size              integer NOT NULL,
  vehicle_types           jsonb,   -- { taxi: 2, minibus: 1, coach: 0 }
  primary_routes          text NOT NULL,
  years_operating         integer,
  payout_method           text,
  payout_phone            text,
  document_url            text,    -- Supabase Storage: business cert
  license_url             text,
  insurance_url           text,
  requested_modules       module_key[],
  status                  text NOT NULL DEFAULT 'pending',  -- pending | reviewing | approved | rejected
  reviewed_by             uuid REFERENCES admin_users(id),
  reviewed_at             timestamptz,
  rejection_reason        text,
  converted_to_operator_id uuid REFERENCES operators(id),
  created_at              timestamptz DEFAULT now()
);

-- ── 20. FINANCIAL SNAPSHOTS (daily P&L) ──────────────────────────
CREATE TABLE financial_snapshots (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date              date UNIQUE NOT NULL,
  total_bookings             integer,
  total_revenue_ugx          bigint,
  raylane_fleet_revenue_ugx  bigint,
  third_party_revenue_ugx    bigint,
  total_commission_ugx       bigint,
  total_payouts_ugx          bigint,
  net_profit_ugx             bigint,
  created_at                 timestamptz DEFAULT now()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX idx_trips_from_to      ON trips(from_city, to_city);
CREATE INDEX idx_trips_departure    ON trips(departure_time);
CREATE INDEX idx_trips_status       ON trips(status);
CREATE INDEX idx_trips_operator     ON trips(operator_id);
CREATE INDEX idx_trips_priority     ON trips(is_raylane_fleet DESC, priority_score ASC);
CREATE INDEX idx_bookings_trip      ON bookings(trip_id);
CREATE INDEX idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX idx_bookings_status    ON bookings(booking_status, payment_status);
CREATE INDEX idx_payments_booking   ON payments(booking_id);
CREATE INDEX idx_seats_trip         ON seats(trip_id, status);
CREATE INDEX idx_seats_lock         ON seats(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX idx_alerts_priority    ON alerts(priority, resolved, created_at DESC);
CREATE INDEX idx_audit_user         ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_entity       ON audit_log(entity_type, entity_id);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Trigger 1: Auto-set commission on booking INSERT
CREATE OR REPLACE FUNCTION set_booking_commission()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  op_rate numeric;
BEGIN
  SELECT o.commission_rate INTO op_rate
  FROM operators o
  JOIN trips t ON t.operator_id = o.id
  WHERE t.id = NEW.trip_id;

  NEW.raylane_commission_ugx := FLOOR(NEW.total_amount_ugx * COALESCE(op_rate, 0.10));
  NEW.operator_net_ugx       := NEW.total_amount_ugx - NEW.raylane_commission_ugx;
  RETURN NEW;
END;
$$;
CREATE TRIGGER booking_commission_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_booking_commission();

-- Trigger 2: Update booked_seats count on booking status change
CREATE OR REPLACE FUNCTION update_trip_seat_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  seat_count integer;
BEGIN
  seat_count := array_length(COALESCE(NEW.seat_numbers, '{}'), 1);

  IF NEW.booking_status = 'confirmed' AND OLD.booking_status <> 'confirmed' THEN
    UPDATE trips SET booked_seats = booked_seats + seat_count WHERE id = NEW.trip_id;
  ELSIF NEW.booking_status = 'cancelled' AND OLD.booking_status = 'confirmed' THEN
    UPDATE trips SET booked_seats = GREATEST(0, booked_seats - seat_count) WHERE id = NEW.trip_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trip_seat_count_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_trip_seat_count();

-- Trigger 3: Emit alert when trip is full
CREATE OR REPLACE FUNCTION check_trip_full()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.booked_seats >= NEW.total_seats AND OLD.booked_seats < OLD.total_seats THEN
    INSERT INTO alerts (type, priority, title, message, action_link, action_label, metadata)
    VALUES (
      'TRIP_FULL', 'INFO',
      'Trip full: ' || NEW.from_city || ' → ' || NEW.to_city,
      'All ' || NEW.total_seats || ' seats booked. Trip hidden from search results.',
      '/admin/trips/' || NEW.id,
      'Suggest Alternatives',
      jsonb_build_object('trip_id', NEW.id, 'departure_time', NEW.departure_time)
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trip_full_alert_trigger
  AFTER UPDATE OF booked_seats ON trips
  FOR EACH ROW EXECUTE FUNCTION check_trip_full();

-- Trigger 4: Auto-approve Raylane Fleet trips
CREATE OR REPLACE FUNCTION auto_approve_raylane_trips()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_raylane_fleet = true THEN
    NEW.status        := 'approved';
    NEW.auto_approved := true;
    NEW.priority_score := 1;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER raylane_auto_approve_trigger
  BEFORE INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION auto_approve_raylane_trips();

-- Trigger 5: Auto-log audit on key table changes
CREATE OR REPLACE FUNCTION log_audit_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit_log (user_id, user_type, action, entity_type, entity_id, before_state, after_state)
  VALUES (
    COALESCE(auth.uid(), gen_random_uuid()),
    'system',
    TG_OP || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
-- Apply audit trigger to critical tables
CREATE TRIGGER audit_operators AFTER INSERT OR UPDATE OR DELETE ON operators FOR EACH ROW EXECUTE FUNCTION log_audit_change();
CREATE TRIGGER audit_trips     AFTER UPDATE ON trips             FOR EACH ROW EXECUTE FUNCTION log_audit_change();
CREATE TRIGGER audit_bookings  AFTER INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION log_audit_change();
CREATE TRIGGER audit_payouts   AFTER INSERT OR UPDATE ON payouts  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================
-- Enable RLS on all tables
ALTER TABLE operators              ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels                ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_applications  ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid());
$$;

-- Helper function to get current operator_id
CREATE OR REPLACE FUNCTION my_operator_id() RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT operator_id FROM operator_users WHERE id = auth.uid() LIMIT 1;
$$;

-- OPERATORS table
CREATE POLICY "admins_all_operators"    ON operators FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "operators_view_self"     ON operators FOR SELECT TO authenticated USING (id = my_operator_id());

-- OPERATOR_USERS table
CREATE POLICY "admins_all_op_users"     ON operator_users FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "op_users_view_self"      ON operator_users FOR SELECT TO authenticated USING (operator_id = my_operator_id());

-- VEHICLES table
CREATE POLICY "admins_all_vehicles"     ON vehicles FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "operators_own_vehicles"  ON vehicles FOR ALL TO authenticated USING (operator_id = my_operator_id());

-- DRIVERS table
CREATE POLICY "admins_all_drivers"      ON drivers FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "operators_own_drivers"   ON drivers FOR ALL TO authenticated USING (operator_id = my_operator_id());

-- TRIPS — public SELECT (active trips for booking), operator CRUD own trips
CREATE POLICY "public_view_active_trips" ON trips FOR SELECT USING (
  status IN ('approved','live','boarding') AND deleted_at IS NULL AND booked_seats < total_seats
);
CREATE POLICY "admins_all_trips"         ON trips FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "operators_own_trips"      ON trips FOR ALL TO authenticated USING (operator_id = my_operator_id());

-- SEATS — public SELECT, only system writes
CREATE POLICY "public_view_seats"        ON seats FOR SELECT USING (true);
CREATE POLICY "admins_all_seats"         ON seats FOR ALL TO authenticated USING (is_admin());

-- BOOKINGS — passenger owns, operator sees their trip's bookings, admin all
CREATE POLICY "admins_all_bookings"      ON bookings FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "passengers_own_bookings"  ON bookings FOR SELECT TO authenticated USING (passenger_id = auth.uid());
CREATE POLICY "operators_trip_bookings"  ON bookings FOR SELECT TO authenticated USING (
  trip_id IN (SELECT id FROM trips WHERE operator_id = my_operator_id())
);

-- PAYMENTS — admin + booking owner
CREATE POLICY "admins_all_payments"      ON payments FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "passengers_own_payments"  ON payments FOR SELECT TO authenticated USING (
  booking_id IN (SELECT id FROM bookings WHERE passenger_id = auth.uid())
);

-- PAYOUTS — admin + operator sees own
CREATE POLICY "admins_all_payouts"       ON payouts FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "operators_own_payouts"    ON payouts FOR SELECT TO authenticated USING (operator_id = my_operator_id());

-- PARCELS — operator sees own trip parcels
CREATE POLICY "admins_all_parcels"       ON parcels FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "operators_own_parcels"    ON parcels FOR ALL TO authenticated USING (operator_id = my_operator_id());

-- ALERTS — admin only
CREATE POLICY "admins_all_alerts"        ON alerts FOR ALL TO authenticated USING (is_admin());

-- AUDIT LOG — read-only for admin, never deletable
CREATE POLICY "admins_read_audit"        ON audit_log FOR SELECT TO authenticated USING (is_admin());
-- No DELETE policy on audit_log — immutable by design

-- OPERATOR APPLICATIONS — public INSERT, admin all
CREATE POLICY "public_insert_application" ON operator_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "admins_all_applications"   ON operator_applications FOR ALL TO authenticated USING (is_admin());

-- ================================================================
-- SCHEDULED JOBS (pg_cron) — requires pg_cron extension
-- ================================================================

-- Daily payout at 23:59 EAT (21:59 UTC)
SELECT cron.schedule(
  'daily-operator-payout',
  '59 21 * * *',
  $$
    INSERT INTO alerts (type, priority, title, message, action_link, action_label, metadata)
    SELECT
      'PAYOUT_READY', 'ACTION_REQUIRED',
      'Daily payout: ' || COUNT(*) || ' operators · UGX ' || SUM(operator_net_ugx) || ' total',
      'Process payouts for ' || COUNT(DISTINCT o.name) || ' operators',
      '/admin/payments',
      'Process Now',
      jsonb_build_object('booking_count', COUNT(*), 'total_ugx', SUM(operator_net_ugx))
    FROM bookings b
    JOIN trips t ON t.id = b.trip_id
    JOIN operators o ON o.id = t.operator_id
    WHERE b.payment_status = 'paid'
    AND b.created_at::date = CURRENT_DATE - 1;
  $$
);

-- Release expired seat locks every 30 seconds
SELECT cron.schedule(
  'release-expired-seats',
  '*/1 * * * *',
  $$
    UPDATE seats SET
      status = 'available',
      locked_until = NULL,
      locked_by_session = NULL
    WHERE status = 'locked'
    AND locked_until < now();
  $$
);

-- Daily financial snapshot at 00:05 EAT (22:05 UTC previous day)
SELECT cron.schedule(
  'daily-financial-snapshot',
  '5 22 * * *',
  $$
    INSERT INTO financial_snapshots (
      snapshot_date,
      total_bookings,
      total_revenue_ugx,
      raylane_fleet_revenue_ugx,
      third_party_revenue_ugx,
      total_commission_ugx,
      total_payouts_ugx,
      net_profit_ugx
    )
    SELECT
      CURRENT_DATE - 1,
      COUNT(b.id),
      SUM(b.total_amount_ugx),
      SUM(CASE WHEN o.is_raylane_fleet THEN b.total_amount_ugx ELSE 0 END),
      SUM(CASE WHEN NOT o.is_raylane_fleet THEN b.total_amount_ugx ELSE 0 END),
      SUM(b.raylane_commission_ugx),
      COALESCE((SELECT SUM(amount_ugx) FROM payouts WHERE processed_at::date = CURRENT_DATE - 1 AND status = 'completed'), 0),
      SUM(b.raylane_commission_ugx) + SUM(CASE WHEN o.is_raylane_fleet THEN b.total_amount_ugx ELSE 0 END)
    FROM bookings b
    JOIN trips t ON t.id = b.trip_id
    JOIN operators o ON o.id = t.operator_id
    WHERE b.payment_status = 'paid'
    AND b.created_at::date = CURRENT_DATE - 1
    ON CONFLICT (snapshot_date) DO NOTHING;
  $$
);

-- ================================================================
-- SUPABASE STORAGE BUCKETS
-- ================================================================
-- Run in Supabase dashboard: Storage → New Bucket
-- Or via API:
--   supabase storage create operator-documents --public false
--   supabase storage create operator-logos --public true
-- Policies:
--   operator-documents: authenticated users (operators) can upload to their own folder
--   operator-logos: public read, authenticated write

-- ================================================================
-- SEED DATA — Raylane Express (Primary Operator)
-- ================================================================

-- Insert the Raylane Express operator record
INSERT INTO operators (
  id, name, email, phone,
  registration_number, operator_type, is_raylane_fleet,
  status, commission_rate,
  modules_enabled, priority_boost, contact_person
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Raylane Express',
  'admin@raylane.com',
  '+256700123456',
  'UG-RAYLANE-001',
  'RAYLANE',
  true,
  'active',
  0.000,
  ARRAY['trips','bookings','seats','parcels','financials','fleet','analytics','hr']::module_key[],
  true,
  'Raylane Admin'
);

-- Sample tourist destinations
INSERT INTO tourist_destinations (name, category, description, from_city, drive_time_hours, status) VALUES
  ('Bwindi Impenetrable Forest', 'wildlife', 'Home to mountain gorillas. UNESCO World Heritage Site.', 'Kampala', 7.0, 'active'),
  ('Source of the Nile, Jinja', 'adventure', 'White water rafting, bungee jumping, kayaking.', 'Kampala', 2.0, 'active'),
  ('Murchison Falls National Park', 'nature', 'World''s most powerful waterfall. Big 5 safaris.', 'Kampala', 4.0, 'active'),
  ('Lake Bunyonyi', 'scenic', 'Uganda''s deepest lake. Island tours and canoe safaris.', 'Kabale', 0.5, 'active'),
  ('Sipi Falls', 'adventure', 'Three-tiered waterfall on Mount Elgon. Hiking and coffee tours.', 'Mbale', 0.5, 'active'),
  ('Kibale Forest National Park', 'wildlife', 'Chimpanzee tracking. 13 primate species.', 'Fort Portal', 0.5, 'active'),
  ('Queen Elizabeth National Park', 'wildlife', 'Tree-climbing lions. Kazinga Channel boat cruise.', 'Fort Portal', 1.0, 'active'),
  ('Ssese Islands', 'scenic', '84 tropical islands on Lake Victoria.', 'Kampala', 1.0, 'active');

-- Platform config defaults already inserted above
-- Run VACUUM ANALYZE after seeding large datasets
VACUUM ANALYZE;

-- ================================================================
-- USEFUL QUERIES FOR ADMIN DASHBOARD
-- ================================================================

-- Today's revenue summary
-- SELECT
--   SUM(CASE WHEN o.is_raylane_fleet THEN b.total_amount_ugx ELSE 0 END) as raylane_revenue,
--   SUM(b.raylane_commission_ugx) as commission_revenue,
--   COUNT(b.id) as total_bookings
-- FROM bookings b
-- JOIN trips t ON t.id = b.trip_id
-- JOIN operators o ON o.id = t.operator_id
-- WHERE b.payment_status = 'paid' AND b.created_at::date = CURRENT_DATE;

-- Smart trip search (Priority Engine)
-- SELECT t.*, o.name as operator_name, o.is_raylane_fleet
-- FROM trips t JOIN operators o ON o.id = t.operator_id
-- WHERE t.from_city = 'Kampala' AND t.to_city = 'Nairobi'
-- AND t.departure_time::date = CURRENT_DATE
-- AND t.status IN ('approved','live')
-- AND t.booked_seats < t.total_seats
-- AND t.deleted_at IS NULL
-- ORDER BY t.is_raylane_fleet DESC, t.priority_score ASC, o.rating DESC, t.price_ugx ASC;
