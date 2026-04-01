// ============================================================
// app/page.tsx
// THE HOMEPAGE — what every visitor sees at raylane.ug
// Sections: Ticker → Hero → Quick Search → Departures → Sightseeing → Footer
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Vehicle, SightSpot } from '@/lib/types'
import Navbar from '@/components/Navbar'
import DepartureCard from '@/components/DepartureCard'
import Footer from '@/components/Footer'

// ---- DEMO DATA ----
// While you have no real bookings yet, the page uses this.
// Once you have real vehicles in Firebase, remove this and
// use the useEffect that loads from the database below.
const DEMO_VEHICLES: Vehicle[] = [
  { id:'v1', type:'bus',  plateNumber:'UAX 001A', route:'Kampala → Mbale', departureTime:'08:00 AM', travelDate:'2026-03-30', totalSeats:67, filledSeats:61, status:'boarding',  driverName:'John Opio' },
  { id:'v2', type:'taxi', plateNumber:'UBE 234B', route:'Kampala → Mbale', departureTime:'08:30 AM', travelDate:'2026-03-30', totalSeats:14, filledSeats:12, status:'soon',      driverName:'Peter Mugisha' },
  { id:'v3', type:'bus',  plateNumber:'UAR 567C', route:'Mbale → Kampala', departureTime:'09:00 AM', travelDate:'2026-03-30', totalSeats:67, filledSeats:34, status:'available', driverName:'Grace Akello' },
  { id:'v4', type:'bus',  plateNumber:'UCA 890D', route:'Kampala → Jinja',  departureTime:'07:30 AM', travelDate:'2026-03-30', totalSeats:67, filledSeats:67, status:'full',     driverName:'Moses Wafula' },
  { id:'v5', type:'bus',  plateNumber:'UCB 112E', route:'Kampala → Mbale', departureTime:'10:00 AM', travelDate:'2026-03-30', totalSeats:67, filledSeats:58, status:'soon',      driverName:'Sarah Nambi' },
  { id:'v6', type:'taxi', plateNumber:'UCC 445F', route:'Mbale → Kampala', departureTime:'11:00 AM', travelDate:'2026-03-30', totalSeats:14, filledSeats:6,  status:'available', driverName:'David Okello' },
]

const DEMO_SIGHTS: SightSpot[] = [
  { id:'s1', name:'Mabira Forest Drive',  description:'Equatorial rainforest along the highway. Spot rare birds and primates from your window.',  imageUrl:'', route:'Kampala–Mbale', showOnHomepage:true, status:'active', createdAt:'' },
  { id:'s2', name:'Sezibwa Falls',         description:'A spiritual waterfall with a short nature walk. Unmissable on this route.',                   imageUrl:'', route:'Kampala–Mbale', showOnHomepage:true, status:'active', createdAt:'' },
  { id:'s3', name:'Jinja Nile Bridge',     description:"Cross the point where the world's longest river begins. A landmark you'll remember.",          imageUrl:'', route:'Kampala–Jinja', showOnHomepage:true, status:'active', createdAt:'' },
  { id:'s4', name:'Mount Elgon Views',     description:"Africa's oldest volcano fills your window as you approach Mbale. Breathtaking scenery.",       imageUrl:'', route:'Near Mbale',   showOnHomepage:true, status:'active', createdAt:'' },
]

const SIGHT_COLORS = ['#1A4A2E','#0B2545','#2656A0','#4A2060']

export default function HomePage() {
  const router = useRouter()

  // State = data that can change and triggers a re-render when it does
  const [vehicles,  setVehicles]  = useState<Vehicle[]>(DEMO_VEHICLES)
  const [sights,    setSights]    = useState<SightSpot[]>(DEMO_SIGHTS)
  const [fromCity,  setFromCity]  = useState('Kampala')
  const [toCity,    setToCity]    = useState('Mbale')
  const [travelDate, setTravelDate] = useState('')

  // Set today's date as the default
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setTravelDate(today)
  }, [])

  // Load real data from Firebase (runs once when page loads)
  useEffect(() => {
    async function loadData() {
      try {
        // Load today's vehicles
        const today = new Date().toISOString().split('T')[0]
        const vSnap = await getDocs(
          query(collection(db, 'vehicles'), where('travelDate', '==', today))
        )
        if (!vSnap.empty) {
          setVehicles(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)))
        }

        // Load homepage sightseeing spots
        const sSnap = await getDocs(
          query(collection(db, 'sightspots'), where('showOnHomepage', '==', true))
        )
        if (!sSnap.empty) {
          setSights(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as SightSpot)))
        }
      } catch (err) {
        // If Firebase isn't set up yet, demo data is already showing — no crash
        console.log('Using demo data:', err)
      }
    }
    loadData()
  }, [])

  // Handle the search form submit
  function handleSearch() {
    router.push(`/booking?from=${fromCity}&to=${toCity}&date=${travelDate}`)
  }

  // Ticker items for the scrolling bar at the top
  const tickerItems = vehicles.map(v => ({
    label: `${v.route} · ${v.type === 'taxi' ? '🚐' : '🚌'} · ${v.filledSeats}/${v.totalSeats} · ${v.status === 'full' ? 'FULL' : v.totalSeats - v.filledSeats + ' seats left'}`,
    color: v.status === 'full' ? '#EF4444' : v.status === 'soon' ? '#F59E0B' : '#22C55E',
    blink: v.status === 'soon',
  }))

  return (
    <div>
      <Navbar />

      {/* ---- LIVE TICKER BAR ---- */}
      <div style={{ background: '#1A3A6B', padding: '9px clamp(12px,3vw,2rem)', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="ticker-animate" style={{ display: 'flex', gap: '3rem', width: 'max-content' }}>
          {/* Duplicate the items so the scroll looks infinite */}
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <div key={i} style={{ whiteSpace: 'nowrap', fontSize: '11px', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span className={item.blink ? 'dot-blink' : ''} style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color, flexShrink: 0, display: 'inline-block' }} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* ---- HERO SECTION ---- */}
      <section style={{
        background: 'linear-gradient(150deg, #0B2545 0%, #152F5E 45%, #1A4A2E 100%)',
        minHeight: 'clamp(360px, 55vw, 500px)',
        display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
        padding: 'clamp(2rem,5vw,4rem) clamp(12px,4vw,2rem)',
      }}>
        {/* Decorative glow orbs */}
        <div style={{ position:'absolute', right:'-5%', top:'-10%', width:'clamp(200px,40vw,380px)', height:'clamp(200px,40vw,380px)', background:'radial-gradient(circle, rgba(232,160,32,.12) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', left:'-5%', bottom:'-15%', width:'clamp(150px,30vw,260px)', height:'clamp(150px,30vw,260px)', background:'radial-gradient(circle, rgba(26,122,74,.15) 0%, transparent 70%)', pointerEvents:'none' }} />

        {/* Hero content */}
        <div style={{ maxWidth: '560px', position: 'relative', zIndex: 1 }}>
          <div style={{ display:'inline-block', background:'rgba(232,160,32,.18)', border:'1px solid rgba(232,160,32,.35)', color:'#F5C04A', fontSize:'10px', padding:'5px 14px', borderRadius:'20px', marginBottom:'1rem', letterSpacing:'.6px' }}>
            🇺🇬 Uganda&apos;s Smart Transport Link
          </div>
          <h1 style={{ fontSize:'clamp(1.6rem,4.5vw,3rem)', color:'white', lineHeight:1.15, marginBottom:'.9rem' }}>
            Travel <span style={{ color:'#F5C04A' }}>Kampala & Eastern Uganda</span> the Smart Way
          </h1>
          <p style={{ color:'rgba(255,255,255,0.72)', fontSize:'clamp(.85rem,2vw,.95rem)', lineHeight:1.7, marginBottom:'1.8rem', maxWidth:'440px' }}>
            Book seats instantly. Track journeys. Send parcels safely.
          </p>
          <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
            <button className="btn-primary" onClick={() => router.push('/booking')}>🎫 Book Seat Now</button>
            <button className="btn-outline">📦 Send Parcel</button>
            <button className="btn-outline">🗺️ Explore Routes</button>
          </div>
        </div>
      </section>

      {/* ---- QUICK SEARCH BAR ---- */}
      <div style={{ background:'white', padding:'1.2rem clamp(12px,4vw,2rem)', borderBottom:'1px solid var(--earth)' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:'10px', alignItems:'end' }}>
          <div>
            <label className="form-label">FROM</label>
            <select className="form-input" value={fromCity} onChange={e => setFromCity(e.target.value)}>
              <option>Kampala</option>
              <option>Mbale</option>
              <option>Jinja</option>
            </select>
          </div>
          <div>
            <label className="form-label">TO</label>
            <select className="form-input" value={toCity} onChange={e => setToCity(e.target.value)}>
              <option>Mbale</option>
              <option>Kampala</option>
              <option>Jinja</option>
            </select>
          </div>
          <div>
            <label className="form-label">DATE</label>
            <input className="form-input" type="date" value={travelDate} onChange={e => setTravelDate(e.target.value)} />
          </div>
          <button className="btn-ocean" style={{ height:'42px' }} onClick={handleSearch}>
            Search Seats →
          </button>
        </div>
      </div>

      {/* ---- LIVE DEPARTURES SECTION ---- */}
      <section style={{ padding:'2.5rem clamp(12px,4vw,2rem)', maxWidth:'1100px', margin:'0 auto' }}>
        <div style={{ marginBottom:'1.2rem' }}>
          <h2 style={{ fontSize:'clamp(1.2rem,3vw,1.5rem)', marginBottom:'4px' }}>Departures in Progress</h2>
          <p style={{ fontSize:'12px', color:'var(--text2)' }}>Live availability — seats are selling fast</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap:'14px' }}>
          {vehicles.map(v => <DepartureCard key={v.id} vehicle={v} />)}
        </div>
      </section>

      {/* ---- SIGHTSEEING SECTION ---- */}
      <div style={{ background:'var(--earth)', padding:'1px 0' }}>
        <section style={{ padding:'2.5rem clamp(12px,4vw,2rem)', maxWidth:'1100px', margin:'0 auto' }}>
          <h2 style={{ fontSize:'clamp(1.2rem,3vw,1.5rem)', marginBottom:'1.2rem' }}>Discover Uganda Along Your Journey</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(100%,200px),1fr))', gap:'14px' }}>
            {sights.map((s, i) => (
              <div key={s.id} className="card" style={{ cursor:'pointer' }}>
                {/* Image area — uses uploaded image or gradient placeholder */}
                <div style={{ height:'120px', position:'relative', overflow:'hidden' }}>
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg, ${SIGHT_COLORS[i % SIGHT_COLORS.length]}, ${SIGHT_COLORS[i % SIGHT_COLORS.length]}88)` }} />
                  )}
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 60%)' }} />
                  <span style={{ position:'absolute', bottom:'10px', left:'10px', background:'rgba(232,160,32,.9)', color:'var(--ocean)', fontSize:'9px', padding:'2px 7px', borderRadius:'3px', fontWeight:700 }}>On Route</span>
                </div>
                <div style={{ padding:'10px 12px' }}>
                  <div style={{ fontWeight:700, fontSize:'13px', color:'var(--ocean)', marginBottom:'3px' }}>{s.name}</div>
                  <div style={{ fontSize:'11px', color:'var(--text2)', lineHeight:1.5 }}>{s.description}</div>
                  <div style={{ fontSize:'10px', color:'var(--ocean-light)', marginTop:'6px', fontWeight:500 }}>📍 {s.route}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
