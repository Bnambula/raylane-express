# RAYLANE EXPRESS — PRO SYSTEM AUDIT & REDESIGN SPECIFICATION
## Complete Weakness Analysis + MVP Architecture

---

## SECTION 1: IDENTIFIED WEAKNESSES — ALL LAYERS

### 1.1 CUSTOMER (PASSENGER) EXPERIENCE GAPS

| # | Gap | Risk | Fix |
|---|-----|------|-----|
| 1 | No passenger account / profile | Guest loses booking history | Supabase Auth — phone OTP login |
| 2 | Seat timer (5min) resets on page refresh | Seat released unexpectedly | Server-side Redis lock, not JS timer |
| 3 | Phone number not validated (format only) | Wrong MoMo number = payment failure | E.164 format validation + OTP verify |
| 4 | No booking confirmation email/SMS | Passenger loses ticket | Africa's Talking SMS + Supabase Edge |
| 5 | Duplicate booking possible (double-click) | Revenue discrepancy | Backend idempotency key on booking creation |
| 6 | Advance booking 20% not enforced | Someone pays 0% | Backend enforces: amount = 20% of price |
| 7 | Payment polling not implemented | UI hangs forever | Webhook + polling fallback with timeout |
| 8 | No cancellation/refund flow | Passengers stuck | Cancel booking API + refund rules engine |
| 9 | QR ticket is client-side generated | Anyone can forge | Server-signed JWT embedded in QR |
| 10 | No seat re-selection if timer expires | User stuck | Re-route back to seat map with alert |
| 11 | Group/charter form has no confirmation | Request disappears into void | Email + SMS auto-confirm + admin alert |
| 12 | Tourist itinerary form has no output | Dead end UX | Show generated itinerary + trip links |
| 13 | No accessibility (aria, keyboard nav) | Legal and UX risk | ARIA labels, keyboard focus management |
| 14 | Price shown without currency context | Confusing for tourists | Show UGX and USD/KES equivalent |

### 1.2 OPERATOR WORKFLOW GAPS

| # | Gap | Risk | Fix |
|---|-----|------|-----|
| 15 | No operator login / auth at all | Anyone can access /operator | Supabase Auth + operator_id JWT |
| 16 | Trip create goes to admin but no feedback | Operator doesn't know status | Real-time status via Supabase Realtime |
| 17 | Module unlock shows CTA but no payment | Premium forever inaccessible | Stripe/mobile payment for module unlock |
| 18 | No driver management in basic tier | Operators can't assign drivers | Add driver CRUD to basic modules |
| 19 | Fleet vehicles not linked to trips | No enforcement of capacity | Vehicle → Trip FK enforced in DB |
| 20 | Operator financials show mock data | No real P&L | Supabase views: sum(bookings) - commission |
| 21 | No email/SMS notifications to operator | Operator misses bookings | Supabase Edge Function on booking insert |
| 22 | Operator application has no document upload | Cannot verify legitimacy | Supabase Storage for cert uploads |
| 23 | No operator payout history | Disputes impossible to resolve | Payout ledger table in Supabase |
| 24 | Premium modules activate on CTA click (mock) | No real gate | Admin toggle → updates operator.modules_enabled |
| 25 | Multiple operators can claim same vehicle plate | Fleet collision | UNIQUE constraint on vehicle.plate |

### 1.3 ADMIN / RAYLANE CONTROL GAPS

| # | Gap | Risk | Fix |
|---|-----|------|-----|
| 26 | No admin authentication | /admin fully open | Supabase Auth + admin role check (RLS) |
| 27 | Alert system is static HTML | No live alerts | Supabase Realtime subscription on alerts table |
| 28 | Payout processing is a button click | No actual transfer | MTN B2C API + Airtel Disbursement API |
| 29 | Commission calculation not enforced | Revenue leak | DB trigger: commission = booking.amount * operator.rate |
| 30 | No audit log | Cannot trace who did what | audit_log table: user, action, entity, timestamp |
| 31 | Raylane Fleet revenue not separated | Unclear P&L | operator_type='RAYLANE' filter on all financial queries |
| 32 | Smart alerts have no backend source | Static decorations | Supabase Edge Functions emit alerts on rule triggers |
| 33 | No role separation (super admin vs staff) | Staff can do anything | admin_roles: SUPER_ADMIN | FINANCE | OPS | SUPPORT |
| 34 | Dashboard KPIs are hardcoded | Always wrong | Supabase materialized views refreshed every 5min |
| 35 | Settings form doesn't persist | Config lost on reload | platform_config table in Supabase |

### 1.4 PAYMENT & FINANCIAL GAPS

| # | Gap | Risk | Fix |
|---|-----|------|-----|
| 36 | MoMo payment is simulated (setTimeout) | Fake confirmed payments | Real MTN/Airtel API integration |
| 37 | No webhook signature verification | Forged payment callbacks | Verify X-Callback-Signature header |
| 38 | Partial payment (advance) not tracked | Balance never collected | payment_status: 'partial', balance_due field |
| 39 | No payment retry logic | Failed payment = lost booking | Auto-retry + passenger SMS to retry |
| 40 | Refund flow entirely missing | Passengers lose money | Refund API → MoMo reversal → booking cancelled |
| 41 | Commission not split at payment time | Manual reconciliation needed | DB trigger splits payment → operator + raylane |
| 42 | No payout schedule | Ad-hoc, unpredictable | Cron: daily payout at midnight for previous day |
| 43 | Currency handling only UGX | Tourism market excluded | Multi-currency: UGX, KES, RWF, USD display |
| 44 | Financial reports don't exist | Cannot file taxes | Daily/monthly P&L export as CSV/PDF |
| 45 | No fraud detection | Stolen cards / fake MoMo | Amount velocity check + phone verification |

### 1.5 DATABASE & SECURITY GAPS

| # | Gap | Risk | Fix |
|---|-----|------|-----|
| 46 | No Row Level Security | Any authenticated user sees all data | Supabase RLS on every table |
| 47 | Seat lock is JS timer only | Race condition — 2 users book same seat | Redis SETNX atomic lock on seat_id |
| 48 | No input sanitization | XSS / injection risk | Supabase parameterized queries + DOMPurify client |
| 49 | No HTTPS enforcement (local static) | MITM on payment data | Render/Netlify auto-SSL + HSTS header |
| 50 | Booking reference is sequential predictable | Enumeration attacks | UUID v4, not RL-001, RL-002 |
| 51 | No rate limiting on booking/payment | Spam attacks | Supabase Edge Function rate limiter |
| 52 | Passenger PII stored unencrypted | Data protection risk | Encrypt phone numbers in DB |
| 53 | No soft delete on records | Accidental data loss | deleted_at timestamp on all tables |
| 54 | No database backups | Catastrophic loss | Supabase daily backups (Pro plan) |
| 55 | JWT secret hardcoded in example | Credentials in git | .env.example clearly marked, never commit |

---

## SECTION 2: PRO SYSTEM ARCHITECTURE

### 2.1 TECH STACK (Supabase Reference)

```
FRONTEND (Static HTML / Progressive Enhancement)
  index.html       → Public site + booking entry
  book.html        → Full 4-step booking flow
  operator/        → Operator portal (auth-gated)
  admin/           → Admin dashboard (auth-gated, role-checked)
  apply.html       → Operator application form

BACKEND (Supabase)
  Auth             → Phone OTP + Email (passengers + operators + admin)
  Database         → PostgreSQL with RLS on every table
  Realtime         → Live seat updates, alert notifications
  Edge Functions   → Payment webhooks, alert triggers, SMS dispatch
  Storage          → Operator documents, vehicle photos
  Cron Jobs        → Daily payouts, P&L snapshots

EXTERNAL SERVICES
  MTN MoMo API     → Collection (passengers) + Disbursement (payouts)
  Airtel Money API → Collection + Disbursement
  Africa's Talking → SMS (confirmations, alerts, OTPs)
  Stripe (future)  → Card payments for tourist market
```

### 2.2 SUPABASE DATABASE SCHEMA (Production-Ready)

```sql
-- ENUMS
CREATE TYPE operator_type AS ENUM ('RAYLANE', 'THIRD_PARTY');
CREATE TYPE operator_status AS ENUM ('pending', 'active', 'suspended', 'rejected');
CREATE TYPE vehicle_type AS ENUM ('TAXI_14', 'MINIBUS_22', 'COACH_55', 'COACH_65', 'COACH_67');
CREATE TYPE trip_status AS ENUM ('pending', 'approved', 'live', 'boarding', 'departed', 'completed', 'cancelled');
CREATE TYPE booking_type AS ENUM ('standard', 'advance', 'group', 'charter');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'no_show', 'boarded', 'completed');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('MTN_MOMO', 'AIRTEL_MONEY', 'BANK_TRANSFER', 'VISA', 'CASH');
CREATE TYPE seat_status AS ENUM ('available', 'locked', 'booked');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE alert_priority AS ENUM ('URGENT', 'ACTION_REQUIRED', 'INFO');
CREATE TYPE module_key AS ENUM ('trips', 'bookings', 'seats', 'parcels', 'financials', 'fleet', 'analytics', 'hr', 'tourist');
CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'FINANCE', 'OPERATIONS', 'SUPPORT');

-- PLATFORM CONFIG (singleton row)
CREATE TABLE platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_rate numeric NOT NULL DEFAULT 0.10,
  raylane_commission_rate numeric NOT NULL DEFAULT 0.00,
  referral_commission_ugx integer NOT NULL DEFAULT 2000,
  viewing_fee_ugx integer NOT NULL DEFAULT 5000,
  min_withdrawal_ugx integer NOT NULL DEFAULT 20000,
  seat_lock_seconds integer NOT NULL DEFAULT 300,
  advance_booking_max_weeks integer NOT NULL DEFAULT 4,
  advance_commitment_percent numeric NOT NULL DEFAULT 0.20,
  sms_enabled boolean NOT NULL DEFAULT true,
  dynamic_pricing_enabled boolean NOT NULL DEFAULT false,
  tourist_ai_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- OPERATORS
CREATE TABLE operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  registration_number text UNIQUE NOT NULL,
  operator_type operator_type NOT NULL DEFAULT 'THIRD_PARTY',
  is_raylane_fleet boolean NOT NULL DEFAULT false,
  status operator_status NOT NULL DEFAULT 'pending',
  commission_rate numeric NOT NULL DEFAULT 0.10,
  modules_enabled module_key[] NOT NULL DEFAULT ARRAY['trips','bookings','seats','parcels']::module_key[],
  priority_boost boolean NOT NULL DEFAULT false,
  contact_person text,
  address text,
  logo_url text,
  document_url text,  -- Supabase Storage URL
  notes text,         -- Admin notes
  approved_by uuid REFERENCES admin_users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz  -- Soft delete
);

-- ADMIN USERS
CREATE TABLE admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role admin_role NOT NULL DEFAULT 'SUPPORT',
  created_at timestamptz DEFAULT now()
);

-- OPERATOR AUTH LINK (links Supabase auth.users to operators)
CREATE TABLE operator_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  operator_id uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'admin',  -- 'admin' | 'staff'
  created_at timestamptz DEFAULT now()
);

-- VEHICLES
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  plate text UNIQUE NOT NULL,  -- Enforce no duplicates
  type vehicle_type NOT NULL,
  seats integer NOT NULL,
  make_model text,
  year integer,
  photo_url text,
  is_raylane_fleet boolean NOT NULL DEFAULT false,
  maintenance_status text NOT NULL DEFAULT 'ok',  -- 'ok' | 'scheduled' | 'in_maintenance'
  odometer_km integer,
  insurance_expiry date,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- DRIVERS
CREATE TABLE drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  license_number text NOT NULL,
  license_expiry date,
  photo_url text,
  rating numeric DEFAULT 5.0,
  trips_completed integer DEFAULT 0,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- TRIPS
CREATE TABLE trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  driver_id uuid REFERENCES drivers(id),
  from_city text NOT NULL,
  to_city text NOT NULL,
  departure_time timestamptz NOT NULL,
  arrival_time_estimate timestamptz,
  price_ugx integer NOT NULL,
  total_seats integer NOT NULL,
  booked_seats integer NOT NULL DEFAULT 0,
  status trip_status NOT NULL DEFAULT 'pending',
  auto_approved boolean NOT NULL DEFAULT false,
  amenities text[] DEFAULT '{}',
  priority_score integer NOT NULL DEFAULT 10,  -- Lower = higher in results
  is_raylane_fleet boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES admin_users(id),
  approved_at timestamptz,
  departure_note text,  -- e.g. "Delayed 30min"
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT departure_future CHECK (departure_time > created_at),
  CONSTRAINT valid_seats CHECK (booked_seats <= total_seats)
);

-- SEATS (one row per seat per trip)
CREATE TABLE seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_number integer NOT NULL,
  status seat_status NOT NULL DEFAULT 'available',
  locked_until timestamptz,  -- NULL if available
  locked_by_session text,    -- Session ID for client matching
  booking_id uuid REFERENCES bookings(id),
  UNIQUE(trip_id, seat_number)
);

-- PASSENGERS
CREATE TABLE passengers (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  phone_verified boolean NOT NULL DEFAULT false,
  email text,
  nationality text,
  preferred_currency text DEFAULT 'UGX',
  created_at timestamptz DEFAULT now()
);

-- BOOKINGS
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,  -- Server-generated: RL-XXXXXX (not sequential)
  trip_id uuid NOT NULL REFERENCES trips(id),
  passenger_id uuid REFERENCES passengers(id),  -- NULL for guest bookings
  passenger_name text NOT NULL,
  passenger_phone text NOT NULL,
  seat_numbers integer[] NOT NULL,
  booking_type booking_type NOT NULL DEFAULT 'standard',
  total_amount_ugx integer NOT NULL,
  commitment_paid_ugx integer NOT NULL DEFAULT 0,
  balance_due_ugx integer NOT NULL DEFAULT 0,
  raylane_commission_ugx integer NOT NULL DEFAULT 0,
  operator_net_ugx integer NOT NULL DEFAULT 0,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  booking_status booking_status NOT NULL DEFAULT 'pending',
  is_advance boolean NOT NULL DEFAULT false,
  advance_weeks integer,
  idempotency_key text UNIQUE NOT NULL,  -- Prevents duplicate bookings
  qr_token text UNIQUE,  -- Server-signed JWT for QR code
  boarded_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz DEFAULT now()
);

-- PAYMENTS
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  amount_ugx integer NOT NULL,
  method payment_method NOT NULL,
  phone_number text,
  provider_reference text UNIQUE,  -- MoMo transaction ID
  status payment_status NOT NULL DEFAULT 'pending',
  webhook_verified boolean NOT NULL DEFAULT false,
  webhook_signature text,
  retry_count integer NOT NULL DEFAULT 0,
  refund_reference text,
  refunded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- PAYOUTS (operator settlement)
CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators(id),
  amount_ugx integer NOT NULL,
  method payment_method NOT NULL DEFAULT 'MTN_MOMO',
  phone_number text NOT NULL,
  provider_reference text UNIQUE,
  status payout_status NOT NULL DEFAULT 'pending',
  period_start date NOT NULL,
  period_end date NOT NULL,
  booking_ids uuid[] NOT NULL,  -- Which bookings this covers
  processed_by uuid REFERENCES admin_users(id),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- PARCELS
CREATE TABLE parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  trip_id uuid NOT NULL REFERENCES trips(id),
  operator_id uuid NOT NULL REFERENCES operators(id),
  sender_name text NOT NULL,
  sender_phone text NOT NULL,
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  weight_kg numeric NOT NULL,
  declared_value_ugx integer,
  fee_ugx integer NOT NULL,
  status text NOT NULL DEFAULT 'received',
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ALERTS
CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  priority alert_priority NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  action_link text,
  action_label text,
  metadata jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES admin_users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- AUDIT LOG
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text NOT NULL,  -- 'admin' | 'operator' | 'passenger'
  action text NOT NULL,     -- 'approve_trip' | 'cancel_booking' | etc.
  entity_type text NOT NULL,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- TOURIST DESTINATIONS
CREATE TABLE tourist_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  image_url text,
  from_city text NOT NULL,
  drive_time_hours numeric,
  travel_tips text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

-- ITINERARY TEMPLATES
CREATE TABLE itinerary_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  days integer NOT NULL,
  destinations text[] NOT NULL,
  estimated_budget_ugx integer,
  description text,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- OPERATOR APPLICATIONS (before they become operators)
CREATE TABLE operator_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  registration_number text NOT NULL,
  fleet_size integer NOT NULL,
  primary_routes text NOT NULL,
  years_operating integer,
  document_url text,    -- Business certificate upload
  license_url text,     -- Operator license upload
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES admin_users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  converted_to_operator_id uuid REFERENCES operators(id),
  created_at timestamptz DEFAULT now()
);

-- FINANCIAL SNAPSHOTS (daily P&L — materialized)
CREATE TABLE financial_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date UNIQUE NOT NULL,
  total_bookings integer,
  total_revenue_ugx bigint,
  raylane_fleet_revenue_ugx bigint,
  third_party_revenue_ugx bigint,
  total_commission_ugx bigint,
  total_payouts_ugx bigint,
  net_profit_ugx bigint,
  created_at timestamptz DEFAULT now()
);
```

### 2.3 ROW LEVEL SECURITY POLICIES

```sql
-- Operators: can only see their own data
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operators_own_trips" ON trips
  FOR ALL USING (
    auth.uid() IN (
      SELECT ou.id FROM operator_users ou WHERE ou.operator_id = trips.operator_id
    ) OR
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Bookings: passengers see own, operators see theirs, admins see all
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_access" ON bookings
  FOR SELECT USING (
    passenger_id = auth.uid() OR
    trip_id IN (SELECT id FROM trips WHERE operator_id IN (
      SELECT operator_id FROM operator_users WHERE id = auth.uid()
    )) OR
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Payments: only admin and booking owner
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_access" ON payments
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE passenger_id = auth.uid()) OR
    auth.uid() IN (SELECT id FROM admin_users)
  );
```

### 2.4 DB TRIGGERS (Auto-business logic)

```sql
-- Auto-set commission on booking insert
CREATE OR REPLACE FUNCTION set_booking_commission()
RETURNS TRIGGER AS $$
DECLARE
  op_rate numeric;
BEGIN
  SELECT commission_rate INTO op_rate
  FROM operators WHERE id = (SELECT operator_id FROM trips WHERE id = NEW.trip_id);
  
  NEW.raylane_commission_ugx := FLOOR(NEW.total_amount_ugx * op_rate);
  NEW.operator_net_ugx := NEW.total_amount_ugx - NEW.raylane_commission_ugx;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_commission
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_booking_commission();

-- Auto-update booked_seats on booking confirm
CREATE OR REPLACE FUNCTION update_trip_seat_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_status = 'confirmed' AND OLD.booking_status != 'confirmed' THEN
    UPDATE trips SET booked_seats = booked_seats + array_length(NEW.seat_numbers, 1)
    WHERE id = NEW.trip_id;
  ELSIF NEW.booking_status = 'cancelled' AND OLD.booking_status = 'confirmed' THEN
    UPDATE trips SET booked_seats = booked_seats - array_length(NEW.seat_numbers, 1)
    WHERE id = NEW.trip_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-emit alert on trip full
CREATE OR REPLACE FUNCTION check_trip_full()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booked_seats >= NEW.total_seats THEN
    INSERT INTO alerts (type, priority, title, message, action_link, action_label, metadata)
    VALUES (
      'TRIP_FULL', 'INFO',
      'Trip is now full: ' || NEW.from_city || ' → ' || NEW.to_city,
      'All ' || NEW.total_seats || ' seats are booked. Trip hidden from search.',
      '/admin/trips/' || NEW.id,
      'Suggest Alternatives',
      jsonb_build_object('trip_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## SECTION 3: MVP PAGE ARCHITECTURE

### Pages
```
/                → index.html  (Public site — no auth required)
/book            → book.html   (Booking flow — phone OTP for ticket)
/apply           → apply.html  (Operator application — public)
/operator/login  → operator-login.html
/operator        → operator-dashboard.html (auth-gated)
/admin/login     → admin-login.html  
/admin           → admin-dashboard.html (auth-gated + role check)
```

### Auth Flows
```
PASSENGER: Browse free → Book → Phone OTP to confirm → Gets ticket
           Optional: Create account for booking history

OPERATOR:  Apply at /apply → Upload docs → Admin reviews (2-4hr) →
           Approval email + login credentials set → Access /operator

ADMIN:     Email + password → 2FA TOTP → Role-based view
           SUPER_ADMIN: everything
           FINANCE: payouts, financials only
           OPERATIONS: trips, operators, alerts
           SUPPORT: bookings, passengers, parcels
```

---

## SECTION 4: MVP FEATURE MATRIX

### Raylane Express (Primary Operator) — ALWAYS INCLUDED
- ✅ Fleet management (add vehicles, assign drivers)
- ✅ Trip creation (auto-approved, no commission)
- ✅ 100% revenue retained
- ✅ Priority listing #1 in search results
- ✅ Full financial P&L dashboard
- ✅ Real-time live operations panel
- ✅ Driver performance tracking
- ✅ Tourist experience engine
- ✅ Smart alert centre
- ✅ All analytics

### Third-Party Operators — BASIC (Free to onboard)
- ✅ Account creation via admin approval
- ✅ Trip creation (requires admin approval)
- ✅ Seat management
- ✅ Booking management (view only)
- ✅ Parcel management
- ✅ SMS notifications on bookings
- ❌ Financials (premium)
- ❌ Fleet management (premium)
- ❌ Analytics (premium)
- ❌ HR / driver management (premium)

### Third-Party Operators — PREMIUM (Module activation via admin)
- Module activation: Admin toggles in super admin dashboard
- Payment trigger: Operator pays subscription → Admin activates
- Modules activate individually or in bundles

### Module Pricing Suggestion
```
Basic (included):     Free — trips, seats, bookings, parcels
Financials Module:    UGX 50,000/month
Fleet Module:         UGX 80,000/month  
Analytics Module:     UGX 60,000/month
HR Module:            UGX 40,000/month
Full Premium Bundle:  UGX 180,000/month
```

---

## SECTION 5: INFORMATION FLOW — COMPLETE

### Booking Flow (Correct)
```
1. Passenger searches → GET /api/trips (Raylane Fleet first)
2. Selects trip → POST /api/seats/lock (Redis SETNX, 5min TTL — SERVER side)
3. Enters details + phone → POST /api/bookings (idempotency_key in header)
4. Initiates payment → POST /api/payments/initiate → MoMo prompt sent to phone
5. Webhook receives callback → verify signature → POST /api/payments/webhook
6. On success: booking_status = confirmed, seats updated, QR token generated (JWT)
7. SMS sent via Africa's Talking with ticket link + reference
8. If payment fails: seats auto-release, SMS sent with retry link
9. If timer expires (5min no payment): Redis releases seat, booking cancelled
```

### Operator Application Flow (Correct)
```
1. Applicant visits /apply → fills form + uploads documents (Supabase Storage)
2. POST /api/applications → row created in operator_applications
3. Auto-alert created in alerts table → Admin notified
4. Admin reviews at /admin → Reviews documents → Approve/Reject
5. On Approve:
   a. operator_applications.converted_to_operator_id set
   b. New row in operators table (status: active)
   c. Supabase auth user created for operator
   d. Welcome email + temp password sent
   e. Operator logs in at /operator/login
6. On Reject:
   a. rejection_reason saved
   b. Email sent to applicant with reason
```

### Trip Display Flow (Correct Priority Order)
```
GET /api/trips?from=Kampala&to=Nairobi&date=2026-04-07

ORDER BY:
  1. is_raylane_fleet DESC     -- Raylane Fleet always first
  2. priority_score ASC        -- Lower number = higher
  3. rating DESC               -- Highest rated next
  4. price_ugx ASC             -- Cheapest within same tier
  5. departure_time ASC        -- Earliest within same price

WHERE:
  status = 'approved' OR status = 'live'
  departure_time::date = requested_date
  booked_seats < total_seats
  deleted_at IS NULL
```

### Payout Flow (Correct)
```
Daily cron at 23:59 (Supabase pg_cron):
1. Calculate: bookings WHERE payment_status='paid' AND NOT payout_processed
2. Group by operator_id
3. For each operator:
   a. Sum operator_net_ugx (already commission-deducted at booking time)
   b. Check minimum payout threshold
   c. POST to MTN B2C or Airtel Disbursement API
   d. Create payout record (status: processing)
4. Webhook confirms → payout.status = completed
5. Operator gets SMS: "UGX X,XXX paid to your MoMo account"
6. Alert dismissed automatically
```

---

## SECTION 6: GLOBAL STANDARD FEATURES CHECKLIST

| Feature | Status | Notes |
|---------|--------|-------|
| Real-time seat availability | ✅ Design | Supabase Realtime subscription |
| QR e-ticket (server-signed) | ✅ Design | JWT signed with secret |
| Multi-currency display | ✅ Design | UGX primary, KES/USD shown |
| Mobile-first booking | ✅ Design | PWA-ready |
| Push notifications | 🔄 Future | Firebase FCM |
| Live bus tracking | 🔄 Future | GPS device + WebSocket |
| Passenger reviews/ratings | 🔄 Future | After completed trip |
| Carbon offset tracking | 🔄 Future | ESG reporting |
| Loyalty points | 🔄 Future | Accumulate per trip |
| Group booking (10+) | ✅ Design | Charter flow |
| Parcel delivery | ✅ Design | Per-bus manifest |
| Tourist itinerary AI | ✅ Design | OpenAI integration ready |
| Audit trail | ✅ Design | Every action logged |
| Financial reports (CSV) | ✅ Design | Daily/monthly export |
| Role-based admin access | ✅ Design | 4 roles defined |
| Soft delete (no data loss) | ✅ Design | deleted_at on all tables |
| Idempotent payments | ✅ Design | Idempotency key |
| Refund automation | ✅ Design | MoMo reversal API |
| Rate limiting | ✅ Design | Edge Function middleware |
| HTTPS + security headers | ✅ Design | Render auto-SSL + HSTS |
