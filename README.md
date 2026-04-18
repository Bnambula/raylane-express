# Raylane Express PRO — Complete MVP

## Platform Overview
East Africa's smart transport booking ecosystem. Raylane Express is the primary operator and control centre — all third-party operators are onboarded with basic modules, with premium modules activated by admin after payment.

## File Map

| File | URL Route | Purpose |
|------|-----------|---------|
| `index.html` | `/` | Public site — hero, search, routes SVG map, tourist planner, charter form, sightseeing, testimonials, operator section |
| `book-pro.html` | `/book` | 5-step booking — search → seat (Redis lock) → details → MoMo payment → QR e-ticket |
| `apply.html` | `/apply` | 3-step operator application — business info, fleet & routes, documents + consent |
| `operator-login.html` | `/operator/login` | Operator login with first-time password setup and forgot password |
| `operator-pro.html` | `/operator` | Full operator dashboard — trips, bookings, seat map, parcels, premium locks |
| `admin-login.html` | `/admin/login` | Admin login — email + password + 2FA TOTP, role selector |
| `admin-pro.html` | `/admin` | Super admin — 14 modules: Fleet Control, Applications, Module Activation, Financials, Alerts, Audit Log etc. |
| `setup.sql` | — | Complete Supabase DB schema: 20 tables, RLS on all, 5 triggers, pg_cron jobs, seed data |
| `edge-functions.js` | — | 5 Supabase Edge Functions: MoMo webhook, SMS, payment initiate, verify, operator approval |
| `SYSTEM-AUDIT.md` | — | Full 55-issue audit report, architecture decisions, API endpoint reference |

---

## Deploy in 3 Steps (Render — Recommended)

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "Raylane Express PRO"
git remote add origin https://github.com/YOUR_USERNAME/raylane-pro.git
git push -u origin main

# 2. render.com → New + → Static Site → connect repo
#    Publish directory: .  |  Build command: (leave blank)
#    → Create Static Site — live in ~60 seconds

# 3. Add your domain
#    render.com → Settings → Custom Domains → Add CNAME in DNS
#    SSL auto-provisioned by Render
```

**Live URLs:**
- `https://yourdomain.com` → Public website
- `https://yourdomain.com/admin/login` → Admin login
- `https://yourdomain.com/admin` → Admin dashboard
- `https://yourdomain.com/operator/login` → Operator login
- `https://yourdomain.com/operator` → Operator portal
- `https://yourdomain.com/book` → Book a trip
- `https://yourdomain.com/apply` → Operator application

---

## Deploy to Netlify (30 seconds)
Drag the unzipped folder to [netlify.com](https://netlify.com). `_redirects` handles all routing.

## Deploy to Vercel
```bash
npm install -g vercel && vercel
```

---

## Backend Connection (Supabase)

### 1. Create Supabase project
- [dashboard.supabase.com](https://dashboard.supabase.com) → New Project
- Copy `URL` and `anon key` from Settings → API

### 2. Run database setup
- Supabase Dashboard → SQL Editor → paste `setup.sql` → Run

### 3. Deploy Edge Functions
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
# Set environment variables (see edge-functions.js for full list)
supabase secrets set MTN_MOMO_API_KEY=your-key
supabase functions deploy momo-webhook
supabase functions deploy send-sms
supabase functions deploy initiate-payment
supabase functions deploy verify-payment
supabase functions deploy approve-operator
```

### 4. Wire up the frontend
Replace mock data in HTML files with real API calls:
```javascript
// Trip search (returns Raylane Fleet first)
const { data: trips } = await supabase
  .from('trips')
  .select('*, operators(name, is_raylane_fleet)')
  .eq('from_city', 'Kampala').eq('to_city', 'Nairobi')
  .gte('departure_time', today)
  .eq('status', 'approved').lt('booked_seats', 'total_seats')
  .order('is_raylane_fleet', { ascending: false })
  .order('priority_score', { ascending: true });

// Initiate payment
await fetch('/functions/v1/initiate-payment', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${session.access_token}` },
  body: JSON.stringify({ booking_id, method: 'MTN_MOMO', phone, amount_ugx })
});
```

---

## System Architecture

```
FRONTEND (Static HTML)
  index.html ─────────────────── Public site
  book-pro.html ──────────────── Passenger booking
  apply.html ─────────────────── Operator onboarding
  operator-login.html ────────── Operator auth
  operator-pro.html ──────────── Operator dashboard
  admin-login.html ───────────── Admin auth (2FA)
  admin-pro.html ─────────────── Super admin (14 modules)

BACKEND (Supabase)
  PostgreSQL + RLS ────────────── All data, secure by default
  Supabase Auth ───────────────── Passengers (OTP), operators (email), admins (2FA)
  Supabase Realtime ───────────── Live seat maps, admin alerts, booking confirmations
  Edge Functions ──────────────── Payment webhooks, SMS, operator approval
  Storage ─────────────────────── Operator documents, vehicle photos
  pg_cron ─────────────────────── Daily payouts at 23:59, seat lock cleanup every 60s

EXTERNAL SERVICES
  MTN MoMo API ────────────────── Payment collection + B2C disbursement
  Airtel Money API ────────────── Payment collection + disbursement
  Africa's Talking ────────────── SMS (tickets, alerts, OTPs)
```

---

## Module System

### Raylane Express (Primary Operator) — All Modules Always Active
- Fleet control, auto-approved trips, 0% commission, 100% revenue retained
- Listed #1 in all search results (`priority_score = 1, is_raylane_fleet = true`)
- Full financial P&L: gross revenue, fleet expenses, net profit, commission saved

### Third-Party Operators — Basic (Free)
- Trips (requires admin approval before going live)
- Bookings (view only)
- Seat Manager (live map)
- Parcels (manifest and tracking)

### Third-Party Operators — Premium (Admin Activates After Payment)
| Module | Price | Activates |
|--------|-------|-----------|
| Financials | UGX 50,000/mo | P&L, expenses, vendor payments, CSV export |
| Fleet & Drivers | UGX 80,000/mo | Vehicle management, maintenance, driver records |
| Analytics | UGX 60,000/mo | Route heatmaps, demand forecasting, insights |
| HR / Staff | UGX 40,000/mo | Employee management, payroll, driver performance |

Activation flow: Operator requests → pays → Admin toggles in Module Control → `operators.modules_enabled[]` updated → written to audit_log

---

## Key Fixes vs Previous Version

| Issue | Before | After |
|-------|--------|-------|
| Seat locking | JS `setTimeout` only | Server-side Redis (pg_cron releases expired) |
| Race conditions | Possible double-booking | `UNIQUE(trip_id, seat_number)` DB constraint |
| Payment | `setTimeout` mock | Real MTN/Airtel webhook with signature verification |
| Duplicate bookings | Possible on double-click | `idempotency_key UNIQUE` in DB |
| QR ticket forgery | Client-side generated | Server-signed JWT stored in DB |
| Admin auth | Fully open page | Supabase Auth + admin_users role check + 2FA |
| Operator auth | No auth at all | Supabase Auth + operator_users RLS |
| Commission | Not enforced | DB trigger fires on every booking INSERT |
| Module activation | Visual mock | Admin toggle → DB update → audit logged |
| Operator onboarding | Basic form | Full 3-step + doc upload (Supabase Storage) → admin review |
| Audit trail | None | audit_log table, immutable, all admin actions |
| Scheduled payouts | None | pg_cron at 23:59 EAT daily |
| Financial reporting | Hardcoded | Supabase materialized views + daily snapshots |
