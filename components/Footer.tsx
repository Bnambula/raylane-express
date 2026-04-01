// ============================================================
// components/Footer.tsx
// The footer that appears at the bottom of every page.
// ============================================================

import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ background: '#0B2545', color: 'rgba(255,255,255,0.6)', padding: '2.5rem clamp(12px,4vw,2rem) 1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* GRID: brand + 3 link columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1.5rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '1.2rem',
        }}>

          {/* Brand column */}
          <div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: 'white', marginBottom: '0.4rem' }}>
              Raylane Express
            </h3>
            <p style={{ fontSize: '12px', lineHeight: 1.7, maxWidth: '240px' }}>
              Connecting Kampala and Eastern Uganda with safe, modern, reliable transport and parcel logistics.
            </p>
            <div style={{ marginTop: '0.8rem', fontSize: '11px' }}>
              📞 +256 700 000 000<br />
              📧 info@raylane.ug<br />
              💬 WhatsApp: +256 700 000 000
            </div>
          </div>

          {/* Travel column */}
          <div>
            <h4 style={{ fontSize: '10px', letterSpacing: '1px', color: '#F5C04A', marginBottom: '0.8rem', fontWeight: 700 }}>TRAVEL</h4>
            <Link href="/booking" style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '0.4rem', textDecoration: 'none' }}>Book a Seat</Link>
            <a style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '0.4rem', cursor: 'pointer' }}>Our Routes</a>
            <a style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '0.4rem', cursor: 'pointer' }}>Timetable</a>
            <a style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '0.4rem', cursor: 'pointer' }}>Parcel Delivery</a>
          </div>

          {/* Company column */}
          <div>
            <h4 style={{ fontSize: '10px', letterSpacing: '1px', color: '#F5C04A', marginBottom: '0.8rem', fontWeight: 700 }}>COMPANY</h4>
            <a style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '0.4rem', cursor: 'pointer' }}>About Us</a>
            <a style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '0.4rem', cursor: 'pointer' }}>Safety Policy</a>
            <a style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '0.4rem', cursor: 'pointer' }}>Terms & Conditions</a>
            <a style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '0.4rem', cursor: 'pointer' }}>Privacy Policy</a>
          </div>

          {/* Support column */}
          <div>
            <h4 style={{ fontSize: '10px', letterSpacing: '1px', color: '#F5C04A', marginBottom: '0.8rem', fontWeight: 700 }}>SUPPORT</h4>
            <a style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '0.4rem', cursor: 'pointer' }}>Help Centre</a>
            <a style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '0.4rem', cursor: 'pointer' }}>Contact Us</a>
            <a style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '0.4rem', cursor: 'pointer' }}>Lost & Found</a>
            {/* Admin link — subtle, only for staff who know it is there */}
            <Link href="/admin" style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,.2)', marginBottom: '0.4rem', textDecoration: 'none' }}>
              Staff Login
            </Link>
          </div>

        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,.3)', flexWrap: 'wrap', gap: '6px' }}>
          <span>© {new Date().getFullYear()} Raylane Express Ltd. All rights reserved.</span>
          <span>Payments: MTN MoMo · Airtel Money</span>
        </div>

      </div>
    </footer>
  )
}
