// ============================================================
// components/Navbar.tsx
// The navigation bar at the top of every page.
// Import this into any page with:
//   import Navbar from '@/components/Navbar'
// ============================================================

'use client'  // needed because we use useState (interactive)

import { useState } from 'react'
import Link from 'next/link'

export default function Navbar() {
  // Controls whether the mobile menu is open or closed
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav style={{
      background: '#0B2545',
      padding: '0 clamp(12px, 4vw, 2rem)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '56px',
      position: 'sticky',
      top: 0,
      zIndex: 200,
    }}>

      {/* LOGO */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
        {/* Inline SVG logo mark — three converging lanes */}
        <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
          <rect width="30" height="30" rx="6" fill="#E8A020"/>
          <polygon points="4,26 11,6 13,6 7,26"  fill="#0B2545"/>
          <polygon points="9,26 16,6 18,6 12,26"  fill="#0B2545" opacity="0.5"/>
          <polygon points="14,26 21,6 23,6 17,26" fill="#0B2545" opacity="0.25"/>
        </svg>
        <div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>Raylane Express</span>
          <span style={{ color: '#F5C04A', fontSize: '9px', display: 'block', lineHeight: 1 }}>Kampala · Eastern Uganda</span>
        </div>
      </Link>

      {/* DESKTOP LINKS — hidden on small screens */}
      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link href="/"        className="nav-link" style={{ color: 'rgba(255,255,255,.7)', fontSize: '13px', padding: '5px 10px', borderRadius: '6px', textDecoration: 'none', transition: '0.2s' }}>Home</Link>
        <Link href="/booking" className="nav-link" style={{ color: 'rgba(255,255,255,.7)', fontSize: '13px', padding: '5px 10px', borderRadius: '6px', textDecoration: 'none', transition: '0.2s' }}>Book</Link>
        <Link href="/booking">
          <button className="btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
            Book Now
          </button>
        </Link>
      </div>

      {/* MOBILE MENU BUTTON */}
      <button
        className="show-mobile-only"
        onClick={() => setMenuOpen(!menuOpen)}
        style={{ background: 'none', border: 'none', color: 'white', fontSize: '22px', cursor: 'pointer' }}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* MOBILE DROPDOWN MENU */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: '56px', left: 0, right: 0,
          background: '#0B2545', padding: '1rem',
          borderTop: '1px solid rgba(255,255,255,.1)',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          <Link href="/"        onClick={() => setMenuOpen(false)} style={{ color: 'white', textDecoration: 'none', padding: '10px', borderRadius: '8px' }}>Home</Link>
          <Link href="/booking" onClick={() => setMenuOpen(false)} style={{ color: 'white', textDecoration: 'none', padding: '10px', borderRadius: '8px' }}>Book a Seat</Link>
          <Link href="/booking" onClick={() => setMenuOpen(false)}>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Book Now</button>
          </Link>
        </div>
      )}
    </nav>
  )
}
