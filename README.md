# Raylane Express — Deployment Guide

## 📁 File Structure

```
raylane-express/
├── index.html          ← Public website (homepage)
├── admin.html          ← Admin dashboard (all modules)
├── operator.html       ← Operator portal
├── book.html           ← Passenger booking flow
├── render.yaml         ← Render deployment config
├── _redirects          ← URL routing for Netlify/Render
└── README.md           ← This file
```

---

## 🚀 Deploy to Render (Recommended — Free)

### Step 1 — Push to GitHub

```bash
# Create a new GitHub repository at github.com/new
# Then in this folder:

git init
git add .
git commit -m "Initial Raylane Express deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/raylane-express.git
git push -u origin main
```

### Step 2 — Connect to Render

1. Go to **[render.com](https://render.com)** and sign up / log in
2. Click **New +** → **Static Site**
3. Connect your GitHub account and select the `raylane-express` repo
4. Configure:
   - **Name**: `raylane-express`
   - **Branch**: `main`
   - **Build Command**: *(leave blank — no build needed)*
   - **Publish Directory**: `.`
5. Click **Create Static Site**

Render auto-detects `render.yaml` and applies all settings including URL rewrites and security headers.

### Step 3 — Your Live URLs

Once deployed (takes ~60 seconds):

| URL | Page |
|-----|------|
| `https://raylane-express.onrender.com` | Public Website |
| `https://raylane-express.onrender.com/admin` | Admin Dashboard |
| `https://raylane-express.onrender.com/operator` | Operator Portal |
| `https://raylane-express.onrender.com/book` | Booking Flow |

---

## 🌐 Alternative: Deploy to Netlify (Also Free)

### Option A — Drag & Drop (Fastest)

1. Go to **[netlify.com](https://netlify.com)** → Log in
2. In the dashboard, scroll to the bottom where it says **"Want to deploy a new site without connecting to Git?"**
3. Drag the entire `raylane-express` folder onto that area
4. Done — live in under 30 seconds ✓

### Option B — Via GitHub

1. Go to **[netlify.com](https://netlify.com)** → New site from Git
2. Connect GitHub → select your repo
3. Build command: *(leave blank)*
4. Publish directory: `.`
5. Click **Deploy**

The `_redirects` file handles all URL routing automatically on Netlify.

---

## 🌐 Alternative: Deploy to Vercel (Also Free)

```bash
# Install Vercel CLI
npm install -g vercel

# From the raylane-express folder:
vercel

# Follow prompts — choose "Static site", deploy to production
```

Create a `vercel.json` file if needed:
```json
{
  "rewrites": [
    { "source": "/admin", "destination": "/admin.html" },
    { "source": "/operator", "destination": "/operator.html" },
    { "source": "/book", "destination": "/book.html" }
  ]
}
```

---

## 🖥️ Deploy on Your Own Server (VPS / cPanel)

### cPanel (Namecheap, HostGator, etc.)

1. Log into cPanel → **File Manager**
2. Navigate to `public_html/`
3. Upload all 4 HTML files + `render.yaml` + `_redirects`
4. If using a subdomain (e.g. `app.raylane.com`), upload to the subdomain's document root

### Nginx

```nginx
server {
    listen 80;
    server_name raylane.com www.raylane.com;
    root /var/www/raylane;
    index index.html;

    location /admin { try_files /admin.html =404; }
    location /operator { try_files /operator.html =404; }
    location /book { try_files /book.html =404; }
    location / { try_files $uri $uri/ /index.html; }
}
```

### Apache (.htaccess)

```apache
RewriteEngine On
RewriteRule ^admin$ /admin.html [L]
RewriteRule ^operator$ /operator.html [L]
RewriteRule ^book$ /book.html [L]
```

---

## 🔗 Page Links Summary

| Page | File | Direct URL |
|------|------|------------|
| Homepage | `index.html` | `/` |
| Admin Dashboard | `admin.html` | `/admin` |
| Operator Portal | `operator.html` | `/operator` |
| Booking Flow | `book.html` | `/book` |

**Internal links between pages:**
- Homepage → Admin: `admin.html`
- Homepage → Booking: `book.html`
- Admin sidebar → View Site: `index.html`
- Operator sidebar → View Site: `index.html`

---

## 🔒 Custom Domain on Render

1. In Render dashboard → your site → **Settings** → **Custom Domains**
2. Add your domain (e.g. `app.raylane.ug`)
3. Add a CNAME record in your DNS: `app → raylane-express.onrender.com`
4. Render auto-provisions SSL (HTTPS) via Let's Encrypt

---

## 📋 What's in Each File

### `index.html` — Public Website (82KB)
- Animated hero (Ken Burns 3-image slideshow)
- Real-time "Leaving Soon" departure strip
- Services grid, SVG East Africa map, advance booking section
- Tourist planner form, sightseeing gallery, charter form
- Partners carousel, testimonials, ecosystem links
- Full footer, mobile bottom navigation

### `admin.html` — Admin Dashboard (116KB)
- Collapsible dark sidebar — 12 modules
- Dashboard: pipeline, KPIs, revenue chart, operator approvals
- **Raylane Fleet Control**: vehicle management, driver assignment, live operations panel, dispatch controls, fleet P&L
- **Tourist Experience Engine**: destination manager (add/edit/publish), itinerary templates, tour provider directory, travel tips manager
- **Smart Alert Centre**: actionable alerts with inline approve/reject/resolve buttons, filter by urgency (Urgent / Action Required / Info)
- Operators, Trips, Bookings, Seat Manager, Payments, Financials, Fleet, Parcels, Analytics, Settings

### `operator.html` — Operator Portal (47KB)
- Light sidebar with Basic/Premium module split
- Dashboard with today's trips, occupancy, earnings
- Create Trip form (submits for admin approval)
- Bookings, Seat Manager, Parcels
- Premium locked modules: Financials, Fleet, Analytics

### `book.html` — Passenger Booking (40KB)
- 4-step progress flow: Search → Seats → Payment → Ticket
- Skeleton loaders → real trip cards with filters
- Interactive seat map (44-seat, Uganda RHD layout, 5-min lock timer)
- 4 payment methods, advance booking toggle
- Print-ready QR e-ticket with booking reference

---

## 🔄 Connecting a Backend (Next Step)

When you're ready to add a real API:

1. Replace mock data objects in each HTML file with `fetch()` calls
2. Build API in Node.js + Express (recommended) or Python FastAPI
3. Key endpoints needed:

```
GET  /api/trips?from=&to=&date=          → Search trips
POST /api/bookings                        → Create booking
POST /api/payments/initiate               → Start payment
GET  /api/payments/verify/:ref            → Verify payment
GET  /api/operators                       → List operators
POST /api/operators/apply                 → Operator application
GET  /api/admin/alerts                    → Get actionable alerts
POST /api/admin/trips/:id/approve         → Approve trip
POST /api/fleet/vehicles                  → Add Raylane vehicle (is_raylane_fleet: true)
GET  /api/tourist/destinations            → Tourist destinations
GET  /api/tourist/itineraries             → Itinerary templates
```

4. Backend database: **PostgreSQL** (trips, bookings, operators, payments)
5. Real-time seats: **Redis** (seat locking, 5-min TTL)
6. Payments: MTN MoMo API + Airtel Money API (both have Uganda SDKs)
7. SMS: Africa's Talking SMS API (Ugandan number support)

---

## 📞 Support

- Site: raylane.com
- Email: info@raylane.com
- WhatsApp: +256 700 123 466
- Admin portal: /admin
