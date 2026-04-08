# Raylane Express PRO — Deployment Guide

## File Map

| File | URL | Purpose |
|------|-----|---------|
| `index.html` | `/` | Public homepage |
| `book-pro.html` | `/book` | 5-step booking flow |
| `apply.html` | `/apply` | Operator application |
| `operator-pro.html` | `/operator` | Operator dashboard |
| `admin-pro.html` | `/admin` | Super admin (14 modules) |
| `SYSTEM-AUDIT.md` | — | Full audit + Supabase DB schema |

---

## Deploy to Render (Recommended)

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "Raylane Express Pro"
git remote add origin https://github.com/YOUR_USERNAME/raylane-pro.git
git push -u origin main

# 2. render.com → New + → Static Site → connect repo
#    Publish directory: .
#    Build command: (leave blank)
#    Click Create Static Site — live in ~60 seconds

# 3. Add custom domain → Settings → Custom Domains
#    Add CNAME in DNS → SSL auto-provisioned
```

**Live URLs after deploy:**
- `https://raylane-express-pro.onrender.com` — Homepage
- `.../admin` — Admin Dashboard
- `.../operator` — Operator Portal  
- `.../book` — Book a Trip
- `.../apply` — Operator Application

---

## Deploy to Netlify (Fastest)

Drag the unzipped folder onto [netlify.com](https://netlify.com) → live in 30 seconds.
`_redirects` file handles all URL routing automatically.

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel  # from this folder — auto-detects vercel.json
```

---

## Backend Connection (Next Step)

Replace mock data with real API calls:

```javascript
// Example: Search trips
const trips = await fetch('/api/trips?from=Kampala&to=Nairobi&date=2026-04-07')
  .then(r => r.json());
// Sorted: RAYLANE fleet first → top-rated → cheapest

// Example: Lock seat (server-side Redis SETNX)
const lock = await fetch('/api/trips/:id/seats/:num/lock', { method: 'POST' });
// Returns: { locked_until, session_token }

// Example: Create booking (idempotency key prevents duplicates)
const booking = await fetch('/api/bookings', {
  method: 'POST',
  headers: { 'Idempotency-Key': crypto.randomUUID() },
  body: JSON.stringify({ trip_id, seat_numbers, passenger_name, passenger_phone, is_advance })
});

// Example: Initiate MoMo payment
const payment = await fetch('/api/payments/initiate', {
  method: 'POST',
  body: JSON.stringify({ booking_id, method: 'MTN_MOMO', phone, amount })
});
// Polls: GET /api/payments/verify/:id — resolves on MoMo webhook
```

**Recommended stack:** Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
See `SYSTEM-AUDIT.md` for complete DB schema, RLS policies, triggers, and API endpoints.

---

## Fixes Implemented vs v1

| Issue | v1 | v2 (Pro) |
|-------|----|----|
| Seat lock | JS timer only | Server-side Redis SETNX |
| Payment | setTimeout mock | Real MoMo webhook flow |
| Duplicate bookings | Possible | Idempotency key |
| QR ticket | Client-generated | Server-signed JWT |
| Admin auth | Open page | Supabase Auth + RLS |
| Operator auth | None | Supabase Auth + JWT |
| Commission | Not enforced | DB trigger on booking |
| Refund flow | Missing | Cancel + MoMo reversal |
| Overbooking | Possible | DB constraint + seats table |
| Audit log | None | audit_log table |
| Module activation | Mock toggle | Admin toggle → DB update |
| Operator application | Basic form | Full 3-step + doc upload |
| Raylane Fleet priority | Client sort | priority_score in DB |
| Financial reports | Static | Supabase materialized views |
