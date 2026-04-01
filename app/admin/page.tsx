// ============================================================
// app/admin/page.tsx
// THE ADMIN DASHBOARD — full control centre for Raylane Express
// Sections: Dashboard · Revenue · Costs · Vehicles · Bookings · Payments · Hero Images · Sightseeing · Routes
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, updateDoc, doc, addDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms'
import type { Booking, Vehicle, RevenueRecord, CostRecord } from '@/lib/types'

// ---- DEMO DATA (shown until Firebase is connected) ----
const DEMO_BOOKINGS: Booking[] = [
  { id:'b1', passengerName:'Aisha Nakato',   phone:'0701234567', route:'KLA→MBL', vehicleType:'bus',  seatLabel:'14B', boardingPoint:'Old Park', departureTime:'08:00 AM', travelDate:'2026-03-30', price:35000, paymentMethod:'mtn',    transactionId:'MPS001', status:'confirmed', createdAt:'' },
  { id:'b2', passengerName:'David Okello',   phone:'0750876543', route:'KLA→MBL', vehicleType:'taxi', seatLabel:'F2',  boardingPoint:'Old Park', departureTime:'08:30 AM', travelDate:'2026-03-30', price:45000, paymentMethod:'airtel', transactionId:'AIR042', status:'confirmed', createdAt:'' },
  { id:'b3', passengerName:'Mary Atim',      phone:'0781555000', route:'MBL→KLA', vehicleType:'bus',  seatLabel:'22A', boardingPoint:'Mbale',   departureTime:'09:00 AM', travelDate:'2026-03-30', price:35000, paymentMethod:'mtn',    transactionId:'MPS089', status:'pending',   createdAt:'' },
  { id:'b4', passengerName:'James Wafula',   phone:'0701000123', route:'KLA→JIN', vehicleType:'bus',  seatLabel:'05C', boardingPoint:'Old Park', departureTime:'07:30 AM', travelDate:'2026-03-30', price:15000, paymentMethod:'airtel', transactionId:'AIR055', status:'confirmed', createdAt:'' },
  { id:'b5', passengerName:'Fatuma Nakirya', phone:'0701000111', route:'KLA→MBL', vehicleType:'taxi', seatLabel:'F1',  boardingPoint:'Nakawa',  departureTime:'08:30 AM', travelDate:'2026-03-30', price:45000, paymentMethod:'mtn',    transactionId:'MPS012', status:'pending',   createdAt:'' },
]

const DEMO_COSTS: CostRecord[] = [
  { id:'c1', category:'partner_payout', description:'Bus operator — 08:00 KLA→MBL', amount:620000, date:'2026-03-30', loggedBy:'Admin', createdAt:'', linkedTripId:'T001' },
  { id:'c2', category:'fuel',           description:'Fuel support — 08:30 taxi',     amount:80000,  date:'2026-03-30', loggedBy:'Admin', createdAt:'', linkedTripId:'T002' },
  { id:'c3', category:'staff',          description:'Agent commission',              amount:60000,  date:'2026-03-30', loggedBy:'Admin', createdAt:'', linkedTripId:'' },
  { id:'c4', category:'marketing',      description:'WhatsApp broadcast',            amount:45000,  date:'2026-03-29', loggedBy:'Admin', createdAt:'', linkedTripId:'' },
  { id:'c5', category:'partner_payout', description:'Bus operator — MBL→KLA',       amount:400000, date:'2026-03-29', loggedBy:'Admin', createdAt:'', linkedTripId:'T003' },
]

const BADGE: Record<string,string> = {
  confirmed:      'badge badge-green',
  pending:        'badge badge-orange',
  cancelled:      'badge badge-red',
  boarding:       'badge badge-green',
  soon:           'badge badge-orange',
  full:           'badge badge-red',
  available:      'badge badge-blue',
  partner_payout: 'badge badge-blue',
  fuel:           'badge badge-orange',
  staff:          'badge badge-blue',
  marketing:      'badge badge-gold',
}

// ---- Simple stat card ----
function StatCard({ val, label, delta, color }: { val:string; label:string; delta?:string; color?:string }) {
  return (
    <div style={{ background:'white', borderRadius:'12px', padding:'1rem', border:'1.5px solid var(--earth)' }}>
      <div style={{ fontFamily:'Georgia,serif', fontSize:'1.5rem', fontWeight:700, color:color||'var(--ocean)', marginBottom:'2px', lineHeight:1 }}>{val}</div>
      <div style={{ fontSize:'11px', color:'var(--text2)' }}>{label}</div>
      {delta && <div style={{ fontSize:'10px', color:'var(--success)', marginTop:'3px' }}>{delta}</div>}
    </div>
  )
}

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [bookings, setBookings]   = useState<Booking[]>(DEMO_BOOKINGS)
  const [costs, setCosts]         = useState<CostRecord[]>(DEMO_COSTS)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Cost form state
  const [costCategory, setCostCategory]       = useState('partner_payout')
  const [costDesc, setCostDesc]               = useState('')
  const [costAmount, setCostAmount]           = useState('')
  const [costDate, setCostDate]               = useState(new Date().toISOString().split('T')[0])
  const [costTrip, setCostTrip]               = useState('')

  // Revenue totals (calculated from confirmed bookings)
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
  const grossRevenue = confirmedBookings.reduce((sum, b) => sum + b.price, 0)
  const totalCosts   = costs.reduce((sum, c) => sum + c.amount, 0)
  const netProfit    = grossRevenue - totalCosts
  const pendingRev   = bookings.filter(b=>b.status==='pending').reduce((sum,b)=>sum+b.price,0)

  // Load real bookings from Firebase
  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt','desc')))
        if (!snap.empty) setBookings(snap.docs.map(d => ({ id:d.id, ...d.data() } as Booking)))
        const cSnap = await getDocs(query(collection(db,'costs'), orderBy('date','desc')))
        if (!cSnap.empty) setCosts(cSnap.docs.map(d => ({ id:d.id, ...d.data() } as CostRecord)))
      } catch { /* use demo data */ }
    }
    load()
  }, [])

  // ---- CONFIRM A BOOKING ----
  // This is the key action: confirming = recording revenue
  async function confirmBooking(booking: Booking) {
    try {
      // 1. Update the booking status in Firebase
      await updateDoc(doc(db, 'bookings', booking.id), {
        status:      'confirmed',
        confirmedAt: new Date().toISOString(),
      })

      // 2. AUTO-RECORD REVENUE immediately
      await addDoc(collection(db, 'revenue'), {
        bookingId:     booking.id,
        amount:        booking.price,
        route:         booking.route,
        vehicleType:   booking.vehicleType,
        paymentMethod: booking.paymentMethod,
        recordedAt:    new Date().toISOString(),
      })

      // 3. Send SMS confirmation to passenger
      await sendSMS(booking.phone, SMS_TEMPLATES.bookingConfirmed(
        booking.id, booking.seatLabel, booking.route, booking.departureTime
      ))

      // 4. Update local state so UI refreshes instantly
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status:'confirmed' } : b))
      alert(`✅ Booking confirmed! SMS sent to ${booking.phone}`)

    } catch (err) {
      console.error(err)
      alert('Error confirming booking. Check your internet connection.')
    }
  }

  // ---- LOG A COST ----
  async function logCost() {
    if (!costDesc || !costAmount) return alert('Please fill in description and amount.')
    const newCost: Omit<CostRecord,'id'> = {
      category:      costCategory as CostRecord['category'],
      description:   costDesc,
      amount:        parseInt(costAmount),
      date:          costDate,
      linkedTripId:  costTrip,
      loggedBy:      'Admin',
      createdAt:     new Date().toISOString(),
    }
    try {
      const ref = await addDoc(collection(db,'costs'), newCost)
      setCosts(prev => [{ id:ref.id, ...newCost }, ...prev])
      setCostDesc(''); setCostAmount(''); setCostTrip('')
      alert('✅ Cost logged successfully.')
    } catch {
      alert('Error logging cost. Check Firebase connection.')
    }
  }

  // Nav items config
  const navItems = [
    { id:'dashboard',   label:'📊 Dashboard'    },
    { id:'revenue',     label:'💰 Revenue'       },
    { id:'costs',       label:'📉 Cost Centre'   },
    { id:'vehicles',    label:'🚌 Vehicles'      },
    { id:'bookings',    label:'🎫 Bookings'      },
    { id:'payments',    label:'💳 Payments'      },
    { id:'hero',        label:'🖼️ Hero Images'  },
    { id:'sightseeing', label:'🌳 Sightseeing'   },
    { id:'routes',      label:'🗺️ Routes'        },
  ]

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', minHeight:'100vh' }}>

      {/* ---- SIDEBAR ---- */}
      <div style={{ background:'var(--ocean)', overflowY:'auto' }}>
        <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)' }}>ADMIN PANEL</div>
          <div style={{ fontSize:'14px', color:'white', fontWeight:700 }}>Raylane Express</div>
        </div>
        {navItems.map(item => (
          <div key={item.id}
            onClick={() => setActiveSection(item.id)}
            style={{
              padding:'10px 16px', color: activeSection===item.id ? 'white' : 'rgba(255,255,255,.6)',
              fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'9px',
              background: activeSection===item.id ? 'rgba(255,255,255,.1)' : 'transparent',
              borderLeft: activeSection===item.id ? '3px solid var(--gold)' : '3px solid transparent',
              transition:'.2s',
            }}>
            {item.label}
          </div>
        ))}
        <div style={{ padding:'14px 16px', marginTop:'8px' }}>
          <a href="/" style={{ display:'block', background:'rgba(255,255,255,.08)', color:'rgba(255,255,255,.6)', border:'1px solid rgba(255,255,255,.12)', padding:'7px 12px', borderRadius:'8px', fontSize:'11px', textAlign:'center', textDecoration:'none' }}>
            ← Back to Site
          </a>
        </div>
      </div>

      {/* ---- MAIN CONTENT ---- */}
      <div style={{ padding:'1.5rem', background:'var(--warm)', overflowY:'auto' }}>

        {/* ======================== DASHBOARD ======================== */}
        {activeSection === 'dashboard' && (
          <div className="fade-in">
            <div style={{ marginBottom:'1.2rem' }}>
              <h2 style={{ fontSize:'1.3rem', marginBottom:'3px' }}>Today&apos;s Overview</h2>
              <div style={{ fontSize:'12px', color:'var(--text2)' }}>{new Date().toDateString()} · Live</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:'12px', marginBottom:'1.5rem' }}>
              <StatCard val={String(confirmedBookings.length)} label="Confirmed Bookings" delta="Today" />
              <StatCard val={`${(grossRevenue/1000000).toFixed(1)}M`} label="Gross Revenue (UGX)" color="var(--success)" />
              <StatCard val={`${(netProfit/1000000).toFixed(1)}M`} label="Net Profit (UGX)" color="var(--success)" />
              <StatCard val={String(bookings.filter(b=>b.status==='pending').length)} label="Pending Bookings" color="var(--warn)" />
            </div>

            <div style={{ fontWeight:700, color:'var(--ocean)', marginBottom:'10px', fontSize:'14px' }}>Recent Bookings — tap Confirm to record revenue</div>
            <div style={{ overflowX:'auto', background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)' }}>
              <table className="admin-table">
                <thead><tr><th>Booking ID</th><th>Passenger</th><th>Route</th><th>Seat</th><th>Payment</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {bookings.slice(0,8).map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily:'monospace', fontSize:'10px' }}>{b.id.slice(0,8)}</td>
                      <td>{b.passengerName}</td>
                      <td>{b.route}</td>
                      <td>{b.seatLabel}</td>
                      <td style={{ textTransform:'uppercase' }}>{b.paymentMethod}</td>
                      <td style={{ color: b.status==='confirmed'?'var(--success)':'var(--muted)', fontWeight:700 }}>
                        {b.status==='confirmed' ? `+${b.price.toLocaleString()}` : 'Pending'}
                      </td>
                      <td><span className={BADGE[b.status]}>{b.status}</span></td>
                      <td>
                        {b.status === 'pending' ? (
                          <button onClick={() => confirmBooking(b)}
                            style={{ fontSize:'11px', padding:'4px 10px', background:'var(--success)', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:700 }}>
                            Confirm ✓
                          </button>
                        ) : (
                          <span style={{ fontSize:'11px', color:'var(--muted)' }}>Confirmed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================== REVENUE ======================== */}
        {activeSection === 'revenue' && (
          <div className="fade-in">
            <h2 style={{ fontSize:'1.3rem', marginBottom:'4px' }}>Revenue Tracker</h2>
            <p style={{ fontSize:'12px', color:'var(--text2)', marginBottom:'1.2rem' }}>Revenue is recorded automatically when you confirm a booking above.</p>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:'12px', marginBottom:'1.5rem' }}>
              <StatCard val={`${(grossRevenue/1000).toFixed(0)}K`} label="Gross Revenue" color="var(--success)" />
              <StatCard val={`${(totalCosts/1000).toFixed(0)}K`}   label="Total Costs"   color="var(--danger)" />
              <StatCard val={`${(netProfit/1000).toFixed(0)}K`}    label="Net Profit"    color="var(--success)" />
              <StatCard val={`${(grossRevenue>0?Math.round(netProfit/grossRevenue*100):0)}%`} label="Profit Margin" />
              <StatCard val={`${(pendingRev/1000).toFixed(0)}K`}   label="Pending (Unverified)" color="var(--warn)" />
            </div>

            <div style={{ overflowX:'auto', background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)' }}>
              <table className="admin-table">
                <thead><tr><th>Booking ID</th><th>Passenger</th><th>Route</th><th>Method</th><th>Amount (UGX)</th><th>Status</th></tr></thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily:'monospace', fontSize:'10px' }}>{b.id.slice(0,8)}</td>
                      <td>{b.passengerName}</td>
                      <td>{b.route}</td>
                      <td style={{ textTransform:'uppercase' }}>{b.paymentMethod}</td>
                      <td style={{ fontWeight:700, color: b.status==='confirmed'?'var(--success)':'var(--muted)' }}>
                        {b.status==='confirmed' ? `+${b.price.toLocaleString()}` : `(${b.price.toLocaleString()})`}
                      </td>
                      <td><span className={BADGE[b.status]}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================== COSTS ======================== */}
        {activeSection === 'costs' && (
          <div className="fade-in">
            <h2 style={{ fontSize:'1.3rem', marginBottom:'4px' }}>Cost Management Centre</h2>
            <p style={{ fontSize:'12px', color:'var(--text2)', marginBottom:'1.2rem' }}>Track every shilling spent. Link costs to specific trips for profitability analysis.</p>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'12px', marginBottom:'1.5rem' }}>
              {Object.entries(
                costs.reduce((acc, c) => { acc[c.category] = (acc[c.category]||0)+c.amount; return acc }, {} as Record<string,number>)
              ).map(([cat, total]) => (
                <StatCard key={cat} val={`${(total/1000).toFixed(0)}K`} label={cat.replace('_',' ')} color="var(--danger)" />
              ))}
            </div>

            {/* Log new cost */}
            <div style={{ background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)', padding:'1.2rem', marginBottom:'1.2rem' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--ocean)', marginBottom:'.9rem' }}>Log New Expense</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                <div>
                  <label className="form-label">CATEGORY</label>
                  <select className="form-input" value={costCategory} onChange={e=>setCostCategory(e.target.value)}>
                    <option value="partner_payout">Partner Payout</option>
                    <option value="fuel">Fuel</option>
                    <option value="staff">Staff / Salaries</option>
                    <option value="sms">SMS / Technology</option>
                    <option value="marketing">Marketing</option>
                    <option value="maintenance">Vehicle Maintenance</option>
                    <option value="utilities">Office / Utilities</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">AMOUNT (UGX)</label>
                  <input className="form-input" type="number" placeholder="e.g. 150000" value={costAmount} onChange={e=>setCostAmount(e.target.value)} />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                <div>
                  <label className="form-label">DATE</label>
                  <input className="form-input" type="date" value={costDate} onChange={e=>setCostDate(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">LINKED TRIP ID (optional)</label>
                  <input className="form-input" placeholder="e.g. T001" value={costTrip} onChange={e=>setCostTrip(e.target.value)} />
                </div>
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label className="form-label">DESCRIPTION</label>
                <input className="form-input" placeholder="e.g. Bus operator payout — 08:00 KLA→MBL" value={costDesc} onChange={e=>setCostDesc(e.target.value)} />
              </div>
              <button onClick={logCost} className="btn-ocean">Save Expense</button>
            </div>

            {/* Cost history table */}
            <div style={{ overflowX:'auto', background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)' }}>
              <table className="admin-table">
                <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Trip</th><th>Amount (UGX)</th></tr></thead>
                <tbody>
                  {costs.map(c => (
                    <tr key={c.id}>
                      <td>{c.date}</td>
                      <td><span className={BADGE[c.category]||'badge badge-blue'}>{c.category.replace('_',' ')}</span></td>
                      <td>{c.description}</td>
                      <td style={{ fontFamily:'monospace', fontSize:'11px' }}>{c.linkedTripId||'—'}</td>
                      <td style={{ color:'var(--danger)', fontWeight:700 }}>−{c.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================== BOOKINGS ======================== */}
        {activeSection === 'bookings' && (
          <div className="fade-in">
            <h2 style={{ fontSize:'1.3rem', marginBottom:'1.2rem' }}>Booking Management</h2>
            <div style={{ overflowX:'auto', background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)' }}>
              <table className="admin-table">
                <thead><tr><th>ID</th><th>Passenger</th><th>Phone</th><th>Route</th><th>Seat</th><th>Price</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily:'monospace', fontSize:'10px' }}>{b.id.slice(0,8)}</td>
                      <td>{b.passengerName}</td>
                      <td>{b.phone}</td>
                      <td>{b.route}</td>
                      <td>{b.seatLabel}</td>
                      <td>{b.price.toLocaleString()}</td>
                      <td><span className={BADGE[b.status]}>{b.status}</span></td>
                      <td>
                        {b.status === 'pending' && (
                          <button onClick={() => confirmBooking(b)}
                            style={{ fontSize:'10px', padding:'3px 8px', background:'var(--success)', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:700 }}>
                            Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop:'1rem', padding:'12px', background:'var(--gold-pale)', borderRadius:'8px', border:'1px solid var(--gold-soft)', fontSize:'12px', color:'var(--text2)' }}>
              💡 Revenue is automatically recorded the moment you click Confirm on any pending booking. Pending bookings are never counted in revenue until confirmed.
            </div>
          </div>
        )}

        {/* ======================== PAYMENTS ======================== */}
        {activeSection === 'payments' && (
          <div className="fade-in">
            <h2 style={{ fontSize:'1.3rem', marginBottom:'1.2rem' }}>Payment Tracking</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:'12px', marginBottom:'1.2rem' }}>
              <StatCard val={`${(bookings.filter(b=>b.paymentMethod==='mtn'&&b.status==='confirmed').reduce((s,b)=>s+b.price,0)/1000).toFixed(0)}K`} label="MTN MoMo" color="var(--success)" />
              <StatCard val={`${(bookings.filter(b=>b.paymentMethod==='airtel'&&b.status==='confirmed').reduce((s,b)=>s+b.price,0)/1000).toFixed(0)}K`} label="Airtel Money" color="#EF4444" />
              <StatCard val={String(bookings.filter(b=>b.status==='pending').length)} label="Awaiting Match" color="var(--warn)" />
            </div>
            <div style={{ overflowX:'auto', background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)' }}>
              <table className="admin-table">
                <thead><tr><th>Txn ID</th><th>Network</th><th>Passenger</th><th>Amount</th><th>Booking</th><th>Status</th></tr></thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily:'monospace', fontSize:'10px' }}>{b.transactionId}</td>
                      <td><span className={b.paymentMethod==='mtn'?'badge badge-orange':'badge badge-red'}>{b.paymentMethod.toUpperCase()}</span></td>
                      <td>{b.passengerName}</td>
                      <td>{b.price.toLocaleString()}</td>
                      <td style={{ fontFamily:'monospace', fontSize:'10px' }}>{b.id.slice(0,8)}</td>
                      <td><span className={b.status==='confirmed'?'badge badge-green':'badge badge-orange'}>{b.status==='confirmed'?'Matched':'Pending'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================== VEHICLES ======================== */}
        {activeSection === 'vehicles' && (
          <div className="fade-in">
            <h2 style={{ fontSize:'1.3rem', marginBottom:'1.2rem' }}>Live Vehicle Control</h2>
            <p style={{ fontSize:'12px', color:'var(--text2)', marginBottom:'1rem' }}>
              Update each vehicle status as the day progresses. Status changes appear live on the homepage urgency cards.
            </p>
            {[
              { route:'KLA→MBL 08:00', type:'Bus 67', occ:61, tot:67, status:'boarding'  },
              { route:'KLA→MBL 08:30', type:'Taxi 14', occ:12, tot:14, status:'soon'     },
              { route:'MBL→KLA 09:00', type:'Bus 67',  occ:34, tot:67, status:'available'},
              { route:'KLA→JIN 07:30', type:'Bus 67',  occ:67, tot:67, status:'full'     },
            ].map((v,i) => {
              const pct = Math.round(v.occ/v.tot*100)
              return (
                <div key={i} style={{ background:'var(--warm)', borderRadius:'8px', border:'1.5px solid var(--earth)', padding:'.9rem', marginBottom:'10px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px', gap:'8px' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'13px', color:'var(--ocean)' }}>{v.type} · {v.route}</div>
                      <div style={{ fontSize:'11px', color:'var(--text2)' }}>{v.occ}/{v.tot} seats · {pct}%</div>
                    </div>
                    <span className={BADGE[v.status]||'badge badge-blue'}>{v.status}</span>
                  </div>
                  <div style={{ height:'4px', background:'var(--earth)', borderRadius:'2px', margin:'6px 0', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:'2px', background: pct>=90?'#EF4444':pct>=75?'#F59E0B':'#22C55E', width:`${pct}%` }} />
                  </div>
                  <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                    {['boarding','soon','full','completed'].map(s => (
                      <button key={s} style={{ padding:'4px 9px', borderRadius:'4px', border:'1px solid var(--earth)', fontSize:'10px', fontWeight:700, cursor:'pointer', background:'white', color:'var(--text2)' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ======================== HERO IMAGES ======================== */}
        {activeSection === 'hero' && (
          <div className="fade-in">
            <h2 style={{ fontSize:'1.3rem', marginBottom:'1.2rem' }}>Hero Image Manager</h2>
            <div style={{ background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)', padding:'1.2rem', marginBottom:'1.2rem' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--ocean)', marginBottom:'.9rem' }}>Upload New Image</h3>
              <div style={{ border:'2px dashed var(--earth)', borderRadius:'8px', padding:'2rem', textAlign:'center', cursor:'pointer', marginBottom:'1rem' }}
                onClick={() => alert('In production: this opens a file picker and uploads to Firebase Storage.')}>
                <div style={{ fontSize:'1.5rem', marginBottom:'6px' }}>📁</div>
                <div style={{ fontSize:'13px', color:'var(--text2)' }}>Click to upload from device</div>
                <div style={{ fontSize:'10px', color:'var(--muted)', marginTop:'4px' }}>JPG, PNG, WebP · Max 5MB · Min 1920×800px recommended</div>
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label className="form-label">OR PASTE CLOUD URL (Google Drive, Cloudinary, S3)</label>
                <input className="form-input" placeholder="https://res.cloudinary.com/your-image.jpg" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                <div>
                  <label className="form-label">ASSIGN TO</label>
                  <select className="form-input">
                    <option>Homepage Hero</option>
                    <option>Kampala → Mbale Route</option>
                    <option>Sightseeing Section</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">ROTATION TIME</label>
                  <select className="form-input">
                    <option>All day</option>
                    <option>Morning (6AM–12PM)</option>
                    <option>Evening (5PM–9PM)</option>
                  </select>
                </div>
              </div>
              <button className="btn-ocean">Upload & Save</button>
            </div>
            <div style={{ background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)', padding:'1.2rem' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--ocean)', marginBottom:'.9rem' }}>Active Hero Images</h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'10px' }}>
                {[
                  { label:'Kampala Highway AM', color:'#0B2545,#1A4A2E', status:'On',  time:'All day' },
                  { label:'Mabira Forest',       color:'#1A4A2E,#2D6A4F', status:'On',  time:'Morning' },
                  { label:'Mt Elgon Sunset',     color:'#4A2060,#1A3A6B', status:'Off', time:'Evening' },
                ].map(img => (
                  <div key={img.label} style={{ borderRadius:'8px', overflow:'hidden', border:'1.5px solid var(--earth)' }}>
                    <div style={{ height:'80px', background:`linear-gradient(135deg,${img.color})`, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.4)', fontSize:'11px' }}>{img.label}</div>
                    <div style={{ padding:'7px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:'10px', color:'var(--text2)' }}>{img.time}</span>
                      <span className={img.status==='On'?'badge badge-green':'badge badge-orange'}>{img.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================== SIGHTSEEING ======================== */}
        {activeSection === 'sightseeing' && (
          <div className="fade-in">
            <h2 style={{ fontSize:'1.3rem', marginBottom:'1.2rem' }}>Sightseeing Manager</h2>
            <div style={{ background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)', padding:'1.2rem', marginBottom:'1.2rem' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--ocean)', marginBottom:'.9rem' }}>Add New Destination</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                <div><label className="form-label">DESTINATION NAME</label><input className="form-input" placeholder="e.g. Sezibwa Falls" /></div>
                <div><label className="form-label">ROUTE</label><select className="form-input"><option>Kampala → Mbale</option><option>All Routes</option></select></div>
              </div>
              <div style={{ marginBottom:'12px' }}><label className="form-label">DESCRIPTION (shown to passengers)</label><input className="form-input" placeholder="Short, vivid description" /></div>
              <div style={{ border:'2px dashed var(--earth)', borderRadius:'8px', padding:'1.5rem', textAlign:'center', cursor:'pointer', marginBottom:'12px' }}>
                <div style={{ fontSize:'1.2rem' }}>🏞️</div>
                <div style={{ fontSize:'12px', color:'var(--text2)' }}>Upload destination image</div>
              </div>
              <button className="btn-ocean">Add Destination</button>
            </div>
            <div style={{ overflowX:'auto', background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)' }}>
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Route</th><th>Homepage</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {[
                    { name:'Mabira Forest Drive', route:'KLA→MBL', homepage:'✓ Shown', status:'active' },
                    { name:'Sezibwa Falls',        route:'KLA→MBL', homepage:'✓ Shown', status:'active' },
                    { name:'Jinja Nile Bridge',    route:'KLA→MBL', homepage:'—',       status:'active' },
                    { name:'Mount Elgon Views',    route:'All',     homepage:'✓ Shown', status:'draft'  },
                  ].map(s => (
                    <tr key={s.name}>
                      <td>{s.name}</td><td>{s.route}</td><td>{s.homepage}</td>
                      <td><span className={s.status==='active'?'badge badge-green':'badge badge-orange'}>{s.status}</span></td>
                      <td><button style={{ fontSize:'10px', padding:'3px 8px', border:'1px solid var(--earth)', borderRadius:'4px', cursor:'pointer', background:'var(--warm)' }}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================== ROUTES ======================== */}
        {activeSection === 'routes' && (
          <div className="fade-in">
            <h2 style={{ fontSize:'1.3rem', marginBottom:'1.2rem' }}>Route Management</h2>
            <div style={{ overflowX:'auto', background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)' }}>
              <table className="admin-table">
                <thead><tr><th>Route</th><th>Distance</th><th>Duration</th><th>Taxi Price</th><th>Bus Price</th><th>Status</th></tr></thead>
                <tbody>
                  {[
                    { route:'Kampala → Mbale', dist:'245 km', dur:'~4.5 hrs', taxi:'45,000', bus:'35,000', status:'active'  },
                    { route:'Mbale → Kampala', dist:'245 km', dur:'~4.5 hrs', taxi:'45,000', bus:'35,000', status:'active'  },
                    { route:'Kampala → Jinja', dist:'80 km',  dur:'~1.5 hrs', taxi:'20,000', bus:'15,000', status:'active'  },
                    { route:'Jinja → Mbale',   dist:'165 km', dur:'~3 hrs',   taxi:'—',      bus:'25,000', status:'planned' },
                  ].map(r => (
                    <tr key={r.route}>
                      <td><strong>{r.route}</strong></td><td>{r.dist}</td><td>{r.dur}</td>
                      <td>UGX {r.taxi}</td><td>UGX {r.bus}</td>
                      <td><span className={r.status==='active'?'badge badge-green':'badge badge-orange'}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
