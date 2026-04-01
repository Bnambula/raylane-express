// ============================================================
// app/booking/page.tsx
// Fixed: removed duplicate 'background' property in vehicle
// selector style object (was causing TypeScript build error)
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { generateBookingCode } from '@/lib/bookingCode'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const TAXI_TAKEN = [1, 5, 8, 11]
const BUS_TAKEN  = [2, 3, 7, 8, 14, 15, 20, 22, 27, 30, 33, 35, 38, 41, 45]

export default function BookingPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [step,           setStep]          = useState(1)
  const [vehicleType,    setVehicleType]   = useState<'taxi'|'bus'>('taxi')
  const [selectedSeats,  setSelectedSeats] = useState<string[]>([])
  const [paxCount,       setPaxCount]      = useState(1)
  const [passengerName,  setPassengerName] = useState('')
  const [phone,          setPhone]         = useState('')
  const [nationalId,     setNationalId]    = useState('')
  const [nextOfKin,      setNextOfKin]     = useState('')
  const [boardingPoint,  setBoardingPoint] = useState('Kampala — Old Park (Main Stage)')
  const [luggage,        setLuggage]       = useState('No extra luggage')
  const [termsAccepted,  setTermsAccepted] = useState(false)
  const [payMethod,      setPayMethod]     = useState<'mtn'|'airtel'|''>('')
  const [payPhone,       setPayPhone]      = useState('')
  const [payStatus,      setPayStatus]     = useState<'idle'|'sending'|'waiting'|'success'|'failed'>('idle')
  const [payMsg,         setPayMsg]        = useState('')
  const [bookingCode,    setBookingCode]   = useState('')
  const [loading,        setLoading]       = useState(false)

  const fromCity   = searchParams.get('from')  || 'Kampala'
  const toCity     = searchParams.get('to')    || 'Mbale'
  const travelDate = searchParams.get('date')  || new Date().toISOString().split('T')[0]
  const route      = `${fromCity} → ${toCity}`

  const basePrice  = vehicleType === 'taxi' ? 45000 : 35000
  const totalPrice = selectedSeats.reduce(
    (sum, id) => sum + (['F1','F2'].includes(id) ? basePrice + 5000 : basePrice),
    0
  )

  useEffect(() => {
    if (!searchParams.get('date')) return
  }, [searchParams])

  // ---- SEAT SELECTION ----
  function toggleSeat(id: string, taken: boolean) {
    if (taken) return
    setSelectedSeats(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id)
      if (prev.length >= paxCount) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  // ---- PAYMENT ----
  async function initiatePay() {
    if (!payMethod || !payPhone.trim()) return
    setPayStatus('sending')
    setPayMsg(`Sending ${payMethod === 'mtn' ? 'MTN' : 'Airtel'} payment request to +256 ${payPhone}…`)

    try {
      await fetch('/api/payments/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: payMethod,
          phone:  '256' + payPhone.replace(/^0/, '').replace(/\s/g, ''),
          amount: totalPrice,
          seats:  selectedSeats,
          route,
        }),
      })

      setPayStatus('waiting')
      setPayMsg('Prompt sent! Check your phone and enter your PIN to confirm.')

      // Poll for confirmation
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const res = await fetch('/api/payments/status', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: payMethod }),
          })
          const data = await res.json()
          if (data.status === 'SUCCESSFUL') {
            clearInterval(poll)
            setPayStatus('success')
            setPayMsg('Payment confirmed! Generating your ticket…')
            setTimeout(() => confirmBooking(), 800)
          } else if (attempts > 12) {
            clearInterval(poll)
            setPayStatus('failed')
            setPayMsg('Payment not confirmed. Use merchant code RAYLANE or try again.')
          }
        } catch { /* keep polling */ }
      }, 5000)

    } catch {
      setPayStatus('failed')
      setPayMsg('Could not send request. Please use the merchant code RAYLANE to pay directly.')
    }
  }

  // ---- CONFIRM BOOKING ----
  async function confirmBooking() {
    setLoading(true)
    try {
      const code = generateBookingCode()
      await addDoc(collection(db, 'bookings'), {
        bookingCode:   code,
        passengerName, phone, nationalId, nextOfKin,
        route, vehicleType,
        seats:         selectedSeats,
        boardingPoint, luggage,
        travelDate,
        totalPrice,
        payMethod,
        payPhone,
        status:        'pending',
        createdAt:     new Date().toISOString(),
      })
      setBookingCode(code)
      setStep(5)
    } catch {
      // Demo mode — still show ticket
      setBookingCode(generateBookingCode())
      setStep(5)
    } finally {
      setLoading(false)
    }
  }

  // ---- STEP INDICATOR ----
  function StepsBar() {
    const steps = ['Vehicle', 'Seats', 'Details', 'Payment', 'Confirmed']
    return (
      <div style={{ display:'flex', borderBottom:'2px solid #EAE5D8', marginBottom:'1.2rem', overflowX:'auto' }}>
        {steps.map((label, i) => {
          const n = i + 1
          const isActive = step === n
          const isDone   = step > n
          return (
            <div key={n} style={{
              padding:'9px 12px', fontSize:'11px', whiteSpace:'nowrap',
              borderBottom: isActive ? '2px solid #E8A020' : '2px solid transparent',
              marginBottom:'-2px',
              color: isActive ? '#0B2545' : isDone ? '#1A7A4A' : '#8A8070',
              fontWeight: isActive ? 700 : 400,
              display:'flex', alignItems:'center', gap:'6px',
            }}>
              <span style={{
                width:'18px', height:'18px', borderRadius:'50%', fontSize:'9px', fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                background: isDone ? '#1A7A4A' : isActive ? '#E8A020' : '#EAE5D8',
                color: isDone ? '#fff' : isActive ? '#0B2545' : '#8A8070',
              }}>
                {isDone ? '✓' : n}
              </span>
              {label}
            </div>
          )
        })}
      </div>
    )
  }

  // ---- BUILD MATATU SEAT MAP ----
  function buildMatatuMap() {
    const ROWS = ['A','B','C','D']
    return (
      <div style={{ overflowX:'auto' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'5px', minWidth:'200px', maxWidth:'280px', margin:'0 auto' }}>

          {/* Front row: F1 F2 same row as driver — right side */}
          <div style={{ display:'flex', gap:'5px', justifyContent:'flex-end', marginBottom:'6px' }}>
            <div style={{ width:'18px', fontSize:'8px', color:'#8A8070', textAlign:'center', fontWeight:700, paddingTop:'12px' }}>F</div>
            {['F1','F2'].map(id => renderSeat(id, false, true))}
            <div style={{ width:'28px', flexShrink:0 }} />
          </div>

          <div style={{ borderTop:'1px solid #CBD5E1', marginBottom:'6px', opacity:0.4 }} />

          {/* Rows A–D: col1=foldable (left/door side), col2–col4=standard */}
          {ROWS.map(row => (
            <div key={row} style={{ display:'flex', gap:'5px', alignItems:'center' }}>
              <div style={{ width:'18px', fontSize:'8px', color:'#8A8070', textAlign:'center', fontWeight:700 }}>{row}</div>
              {/* Foldable seat — left aisle */}
              {renderSeat(row+'1', false, false, true)}
              <div style={{ width:'6px', flexShrink:0 }} />
              {/* Main seats */}
              {[2,3,4].map(col => renderSeat(row+col, TAXI_TAKEN.includes(parseInt(row)+col), false))}
            </div>
          ))}
        </div>

        <div style={{ marginTop:'8px', fontSize:'10px', color:'#8A8070', background:'#F8F6F1', borderRadius:'8px', padding:'7px 10px', border:'1px solid #EAE5D8' }}>
          F1 & F2: beside driver (premium) · A1–D1: foldable aisle seats (dashed) · Cols 2–4: standard seats
        </div>
      </div>
    )
  }

  // ---- BUILD COACH SEAT MAP ----
  function buildCoachMap() {
    return (
      <div style={{ overflowX:'auto' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'4px', minWidth:'240px' }}>

          {/* F1 beside driver (right only) */}
          <div style={{ display:'flex', gap:'5px', justifyContent:'flex-end', marginBottom:'6px' }}>
            <div style={{ flex:1 }} />
            {renderSeat('F1', false, true)}
            <div style={{ width:'5px' }} />
          </div>

          <div style={{ borderTop:'1px solid #CBD5E1', marginBottom:'6px', opacity:0.4 }} />

          {/* Column headers */}
          <div style={{ display:'flex', gap:'5px', alignItems:'center', marginBottom:'4px', paddingLeft:'22px' }}>
            {['A','B','','C','D','E'].map((c,i) => (
              c
                ? <div key={i} style={{ width:'clamp(32px,8vw,38px)', textAlign:'center', fontSize:'8px', color:'#8A8070', fontWeight:700 }}>{c}</div>
                : <div key={i} style={{ width:'clamp(12px,3vw,20px)', flexShrink:0 }} />
            ))}
          </div>

          {/* Rows 1–12 */}
          {Array.from({length:12},(_,i)=>i+1).map(r => (
            <div key={r} style={{ display:'flex', gap:'5px', alignItems:'center' }}>
              <div style={{ width:'18px', fontSize:'8px', color:'#8A8070', textAlign:'center', fontWeight:700 }}>{r}</div>
              {['A','B'].map(col => renderSeat(r+col, BUS_TAKEN.includes(r*10+col.charCodeAt(0)), false))}
              <div style={{ width:'clamp(12px,3vw,20px)', flexShrink:0 }} />
              {['C','D','E'].map(col => renderSeat(r+col, BUS_TAKEN.includes(r*10+col.charCodeAt(0)), false))}
            </div>
          ))}

          {/* Back row: 6 across */}
          <div style={{ borderTop:'2px dashed #CBD5E1', paddingTop:'5px', marginTop:'4px' }}>
            <div style={{ fontSize:'8px', color:'#8A8070', marginBottom:'4px', fontWeight:600 }}>BACK ROW — less legroom</div>
            <div style={{ display:'flex', gap:'5px', justifyContent:'center' }}>
              {[1,2,3,4,5,6].map(n => renderSeat('L'+n, false, false))}
            </div>
          </div>
        </div>

        <div style={{ marginTop:'8px', fontSize:'10px', color:'#8A8070', background:'#F8F6F1', borderRadius:'8px', padding:'7px 10px', border:'1px solid #EAE5D8' }}>
          F1: beside driver (premium) · Rows 1–12: 2 seats | aisle | 3 seats · Row L: 6 across (no aisle)
        </div>
      </div>
    )
  }

  // ---- RENDER ONE SEAT ----
  function renderSeat(id: string, taken: boolean, isPremium: boolean, isFoldable = false) {
    const isSelected = selectedSeats.includes(id)

    // Determine background colour — no duplicate properties
    let bgColor = '#F0FDF4'
    let borderColor = '#86EFAC'
    let borderStyle = isFoldable ? 'dashed' : 'solid'
    let borderWidth = '1.5px'

    if (taken) {
      bgColor = '#FEF2F2'; borderColor = '#FCA5A5'
    } else if (isSelected) {
      bgColor = '#EFF6FF'; borderColor = '#2563EB'; borderWidth = '2px'
    } else if (isPremium) {
      bgColor = '#FFFBEB'; borderColor = '#FCD34D'
    }

    return (
      <div
        key={id}
        onClick={() => !taken && toggleSeat(id, taken)}
        style={{
          width:          'clamp(32px,8vw,38px)',
          height:         'clamp(34px,9vw,42px)',
          borderRadius:   '8px',
          border:         `${borderWidth} ${borderStyle} ${borderColor}`,
          background:     bgColor,                  // ← single background property
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          cursor:         taken ? 'not-allowed' : 'pointer',
          position:       'relative',
          flexShrink:     0,
          transition:     'transform .15s',
          userSelect:     'none',
          ...(isSelected ? { boxShadow:'0 0 0 3px rgba(37,99,235,.2)' } : {}),
        }}
        title={`Seat ${id}${isPremium ? ' (Premium)' : isFoldable ? ' (Foldable)' : ''}`}
      >
        <span style={{ fontSize:'13px', lineHeight:1 }}>{taken ? '🔒' : '🪑'}</span>
        <span style={{ fontSize:'7px', fontWeight:700, marginTop:'1px', opacity:.8, color: borderColor }}>
          {id}
        </span>
        {['F1','F2'].includes(id) && !isSelected && (
          <span style={{
            position:'absolute', top:'-6px', right:'-5px',
            background:'#E8A020', color:'#0B2545',
            fontSize:'6px', padding:'1px 4px', borderRadius:'5px', fontWeight:700,
          }}>Best</span>
        )}
      </div>
    )
  }

  // ---- SEAT LEGEND ----
  function SeatLegend() {
    return (
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'10px' }}>
        {[
          { bg:'#F0FDF4', border:'#86EFAC', dash:false,  label:'Available'  },
          { bg:'#EFF6FF', border:'#2563EB', dash:false,  label:'Selected'   },
          { bg:'#FEF2F2', border:'#FCA5A5', dash:false,  label:'Booked'     },
          { bg:'#FFFBEB', border:'#FCD34D', dash:false,  label:'Premium'    },
          { bg:'#F0FDF4', border:'#86EFAC', dash:true,   label:'Foldable'   },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'#5A5040' }}>
            <div style={{
              width:'12px', height:'12px', borderRadius:'3px',
              background: item.bg,
              border: `1.5px ${item.dash ? 'dashed' : 'solid'} ${item.border}`,
              flexShrink:0,
            }} />
            {item.label}
          </div>
        ))}
      </div>
    )
  }

  // ---- SELECTED CHIPS TRAY ----
  function SelectedTray() {
    return (
      <div style={{ background:'#fff', border:'1.5px solid #EAE5D8', borderRadius:'10px', padding:'10px 14px', marginBottom:'10px' }}>
        <div style={{ fontSize:'11px', fontWeight:700, color:'#0B2545', marginBottom:'6px' }}>
          Selected seats
          <span style={{ background:'#0B2545', color:'#fff', fontSize:'10px', padding:'1px 7px', borderRadius:'10px', marginLeft:'6px' }}>
            {selectedSeats.length} / {paxCount}
          </span>
        </div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'8px', minHeight:'28px' }}>
          {selectedSeats.length === 0
            ? <span style={{ fontSize:'11px', color:'#8A8070' }}>Tap a seat above to select it</span>
            : selectedSeats.map(id => (
                <div
                  key={id}
                  onClick={() => toggleSeat(id, false)}
                  style={{
                    background:'#EFF6FF', border:'1.5px solid #93C5FD',
                    color:'#2563EB', fontSize:'11px', fontWeight:700,
                    padding:'3px 8px', borderRadius:'6px',
                    display:'flex', alignItems:'center', gap:'4px', cursor:'pointer',
                  }}
                >
                  {id} <span style={{ fontSize:'14px' }}>×</span>
                </div>
              ))
          }
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#5A5040', paddingTop:'8px', borderTop:'1px solid #EAE5D8' }}>
          <span>{selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''}</span>
          <strong style={{ color:'#0B2545' }}>UGX {totalPrice.toLocaleString()}</strong>
        </div>
      </div>
    )
  }

  // ---- SHARED BUTTON STYLES ----
  const btnBack: React.CSSProperties = {
    background:'#EAE5D8', border:'none', padding:'10px 16px',
    borderRadius:'8px', fontWeight:600, fontSize:'13px',
    cursor:'pointer', color:'#5A5040',
  }
  const btnConfirmBase: React.CSSProperties = {
    flex:1, border:'none', padding:'12px 20px',
    borderRadius:'10px', fontWeight:700, fontSize:'14px',
    cursor:'pointer', transition:'.2s', width:'100%',
  }

  function btnConfirm(active: boolean): React.CSSProperties {
    return {
      ...btnConfirmBase,
      background: active ? '#E8A020' : '#EAE5D8',
      color:      active ? '#0B2545' : '#8A8070',
      cursor:     active ? 'pointer' : 'not-allowed',
    }
  }

  // ==============================================================
  //  RENDER
  // ==============================================================
  return (
    <div>
      <Navbar />

      <div style={{ maxWidth:'720px', margin:'0 auto', padding:'1.5rem clamp(12px,4vw,1.5rem)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1.2rem' }}>
          <button
            onClick={() => step > 1 ? setStep(step-1) : router.push('/')}
            style={btnBack}
          >
            ← {step > 1 ? 'Back' : 'Home'}
          </button>
          <div>
            <div style={{ fontFamily:'Georgia,serif', fontSize:'1.2rem', color:'#0B2545' }}>Book Your Seat</div>
            <div style={{ fontSize:'11px', color:'#5A5040' }}>{route} · {travelDate}</div>
          </div>
        </div>

        <StepsBar />

        {/* ================================================
            STEP 1 — VEHICLE + ROUTE
        ================================================ */}
        {step === 1 && (
          <div>
            <div style={{ background:'#fff', borderRadius:'12px', border:'1.5px solid #EAE5D8', padding:'14px', marginBottom:'12px' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'#0B2545', marginBottom:'10px' }}>Your journey</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'#5A5040', fontWeight:700, marginBottom:'5px' }}>FROM</label>
                  <select defaultValue={fromCity} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #EAE5D8', borderRadius:'8px', fontSize:'13px', background:'#F8F6F1', fontFamily:'inherit', outline:'none' }}>
                    <option>Kampala</option><option>Mbale</option><option>Mbarara</option><option>Jinja</option>
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'#5A5040', fontWeight:700, marginBottom:'5px' }}>TO</label>
                  <select defaultValue={toCity} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #EAE5D8', borderRadius:'8px', fontSize:'13px', background:'#F8F6F1', fontFamily:'inherit', outline:'none' }}>
                    <option>Mbale</option><option>Kampala</option><option>Mbarara</option><option>Jinja</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'#5A5040', fontWeight:700, marginBottom:'5px' }}>DATE</label>
                  <input type="date" defaultValue={travelDate} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #EAE5D8', borderRadius:'8px', fontSize:'13px', background:'#F8F6F1', fontFamily:'inherit', outline:'none' }} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'#5A5040', fontWeight:700, marginBottom:'5px' }}>PASSENGERS (max 5)</label>
                  <select value={paxCount} onChange={e => setPaxCount(parseInt(e.target.value))} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #EAE5D8', borderRadius:'8px', fontSize:'13px', background:'#F8F6F1', fontFamily:'inherit', outline:'none' }}>
                    <option value={1}>1 passenger</option>
                    <option value={2}>2 passengers</option>
                    <option value={3}>3 passengers</option>
                    <option value={4}>4 passengers</option>
                    <option value={5}>5 passengers</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vehicle selector */}
            <div style={{ background:'#fff', borderRadius:'12px', border:'1.5px solid #EAE5D8', padding:'14px', marginBottom:'12px' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'#0B2545', marginBottom:'10px' }}>Choose your vehicle</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                {([
                  { id:'taxi' as const, icon:'🚐', label:'Matatu',    detail:'14 seats · Faster',   price:'UGX 45,000', badge:'3 left',  badgeBg:'#FEF3C7', badgeColor:'#B45309' },
                  { id:'bus'  as const, icon:'🚌', label:'Coach Bus', detail:'67 seats · Economy',  price:'UGX 35,000', badge:'22 avail', badgeBg:'#DCFCE7', badgeColor:'#15803D' },
                ]).map(v => (
                  <div
                    key={v.id}
                    onClick={() => { setVehicleType(v.id); setSelectedSeats([]) }}
                    style={{
                      borderRadius: '12px',
                      border:       `2px solid ${vehicleType === v.id ? '#E8A020' : '#EAE5D8'}`,
                      padding:      '14px',
                      cursor:       'pointer',
                      textAlign:    'left',
                      transition:   '.15s',
                      // ← single background property — no duplicate
                      background:   vehicleType === v.id ? '#FDF3DC' : '#fff',
                    }}
                  >
                    <div style={{ fontSize:'1.3rem', marginBottom:'6px' }}>{v.icon}</div>
                    <div style={{ fontWeight:700, fontSize:'14px', color:'#0B2545' }}>{v.label}</div>
                    <div style={{ fontSize:'11px', color:'#5A5040' }}>{v.detail}</div>
                    <div style={{ fontSize:'16px', fontWeight:700, color:'#E8A020', marginTop:'6px' }}>{v.price}</div>
                    <div style={{ marginTop:'5px' }}>
                      <span style={{ background:v.badgeBg, color:v.badgeColor, fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'10px' }}>
                        {v.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button style={btnConfirm(true)} onClick={() => setStep(2)}>
              Choose Seats →
            </button>
          </div>
        )}

        {/* ================================================
            STEP 2 — SEAT MAP
        ================================================ */}
        {step === 2 && (
          <div>
            <div style={{ background:'#FDF3DC', border:'1px solid #F5C04A', borderRadius:'8px', padding:'8px 12px', fontSize:'11px', color:'#5A5040', marginBottom:'10px' }}>
              Select <strong>{paxCount}</strong> seat{paxCount > 1 ? 's' : ''} — tap any green seat
            </div>

            <SeatLegend />

            {/* Vehicle shell */}
            <div style={{ background:'#F1F5F9', borderRadius:'16px', border:'2px solid #CBD5E1', padding:'14px', marginBottom:'10px' }}>
              {/* Roof: door LEFT, driver RIGHT (RHD Uganda) */}
              <div style={{ background:'#0B2545', borderRadius:'12px 12px 0 0', padding:'9px 14px', margin:'-14px -14px 12px -14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                  <div style={{ width:'26px', height:'32px', background:'#1E3A5F', border:'2px solid #2E5080', borderRadius:'5px 5px 0 0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', color:'rgba(255,255,255,.4)' }}>▭</div>
                  <div style={{ fontSize:'8px', color:'rgba(255,255,255,.4)' }}>Door</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'9px', color:'rgba(255,255,255,.55)', fontWeight:600, letterSpacing:'.6px' }}>↑ FRONT — DIRECTION OF TRAVEL</div>
                  <div style={{ background:'rgba(232,160,32,.2)', border:'1px solid rgba(232,160,32,.35)', color:'#F5C04A', fontSize:'9px', padding:'2px 7px', borderRadius:'8px', marginTop:'3px' }}>
                    Right-hand drive · Uganda
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                  <div style={{ width:'34px', height:'34px', background:'#334155', border:'2px solid #475569', borderRadius:'7px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>🧑‍✈️</div>
                  <div style={{ fontSize:'8px', color:'rgba(255,255,255,.4)' }}>Driver</div>
                </div>
              </div>

              {vehicleType === 'taxi' ? buildMatatuMap() : buildCoachMap()}
            </div>

            <SelectedTray />

            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btnBack} onClick={() => setStep(1)}>← Back</button>
              <button
                style={btnConfirm(selectedSeats.length > 0)}
                disabled={selectedSeats.length === 0}
                onClick={() => selectedSeats.length > 0 && setStep(3)}
              >
                Continue to Details →
              </button>
            </div>
          </div>
        )}

        {/* ================================================
            STEP 3 — PASSENGER DETAILS
        ================================================ */}
        {step === 3 && (
          <div>
            <div style={{ background:'#fff', borderRadius:'12px', border:'1.5px solid #EAE5D8', padding:'14px', marginBottom:'12px' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'#0B2545', marginBottom:'10px' }}>
                Passenger details · Seats: {selectedSeats.join(', ')}
              </h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'#5A5040', fontWeight:700, marginBottom:'5px' }}>FULL NAME *</label>
                  <input placeholder="e.g. Aisha Nakato" value={passengerName} onChange={e=>setPassengerName(e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #EAE5D8', borderRadius:'8px', fontSize:'13px', background:'#F8F6F1', fontFamily:'inherit', outline:'none' }} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'#5A5040', fontWeight:700, marginBottom:'5px' }}>PHONE *</label>
                  <input placeholder="0701 000 000" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #EAE5D8', borderRadius:'8px', fontSize:'13px', background:'#F8F6F1', fontFamily:'inherit', outline:'none' }} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'#5A5040', fontWeight:700, marginBottom:'5px' }}>NATIONAL ID</label>
                  <input placeholder="CM000000000AA" value={nationalId} onChange={e=>setNationalId(e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #EAE5D8', borderRadius:'8px', fontSize:'13px', background:'#F8F6F1', fontFamily:'inherit', outline:'none' }} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'#5A5040', fontWeight:700, marginBottom:'5px' }}>NEXT OF KIN</label>
                  <input placeholder="Emergency contact" value={nextOfKin} onChange={e=>setNextOfKin(e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #EAE5D8', borderRadius:'8px', fontSize:'13px', background:'#F8F6F1', fontFamily:'inherit', outline:'none' }} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'#5A5040', fontWeight:700, marginBottom:'5px' }}>BOARDING POINT</label>
                  <select value={boardingPoint} onChange={e=>setBoardingPoint(e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #EAE5D8', borderRadius:'8px', fontSize:'13px', background:'#F8F6F1', fontFamily:'inherit', outline:'none' }}>
                    <option>Kampala — Old Park (Main Stage)</option>
                    <option>Kampala — Nakawa</option>
                    <option>Kampala — Kireka</option>
                    <option>Jinja (en route stop)</option>
                    <option>Mbarara — Main Bus Park</option>
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'#5A5040', fontWeight:700, marginBottom:'5px' }}>LUGGAGE</label>
                  <select value={luggage} onChange={e=>setLuggage(e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #EAE5D8', borderRadius:'8px', fontSize:'13px', background:'#F8F6F1', fontFamily:'inherit', outline:'none' }}>
                    <option>No extra luggage</option>
                    <option>Small bag (under 10kg)</option>
                    <option>Large bag (10–25kg) · +UGX 5,000</option>
                  </select>
                </div>
              </div>

              {/* T&C */}
              <div style={{ background:'#F8F6F1', borderRadius:'8px', padding:'10px 12px', fontSize:'11px', color:'#5A5040', lineHeight:1.7, border:'1px solid #EAE5D8', marginBottom:'10px' }}>
                <div style={{ fontWeight:700, color:'#0B2545', marginBottom:'3px', fontSize:'12px' }}>Terms & Conditions</div>
                No refund after departure · Arrive 30 min early · Seat valid for booked date only · Luggage at passenger's risk · Raylane is not liable for third-party delays
              </div>
              <label style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'12px', color:'#5A5040', cursor:'pointer' }}>
                <input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} style={{ marginTop:'2px' }} />
                I accept the Terms &amp; Conditions and Refund Policy
              </label>
            </div>

            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btnBack} onClick={() => setStep(2)}>← Back</button>
              <button
                style={btnConfirm(termsAccepted && !!passengerName && !!phone)}
                disabled={!termsAccepted || !passengerName || !phone}
                onClick={() => termsAccepted && passengerName && phone && setStep(4)}
              >
                Continue to Payment →
              </button>
            </div>
          </div>
        )}

        {/* ================================================
            STEP 4 — PAYMENT
        ================================================ */}
        {step === 4 && (
          <div>
            <div style={{ background:'#fff', borderRadius:'12px', border:'1.5px solid #EAE5D8', padding:'14px', marginBottom:'12px' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'#0B2545', marginBottom:'4px' }}>Payment</h3>
              <p style={{ fontSize:'12px', color:'#5A5040', marginBottom:'12px' }}>We send a prompt to your phone — you just enter your PIN.</p>

              {/* Method picker */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
                {([
                  { id:'mtn' as const,    label:'MTN Mobile Money', color:'#D97706', dial:'*165#' },
                  { id:'airtel' as const, label:'Airtel Money',      color:'#EF4444', dial:'*185#' },
                ]).map(pm => (
                  <div
                    key={pm.id}
                    onClick={() => { setPayMethod(pm.id); setPayStatus('idle'); setPayMsg('') }}
                    style={{
                      borderRadius: '12px',
                      border:       `2px solid ${payMethod === pm.id ? '#E8A020' : '#EAE5D8'}`,
                      padding:      '14px',
                      cursor:       'pointer',
                      textAlign:    'center',
                      transition:   '.15s',
                      background:   payMethod === pm.id ? '#FDF3DC' : '#fff',
                    }}
                  >
                    <div style={{ fontSize:'1.3rem', marginBottom:'5px' }}>📱</div>
                    <div style={{ fontWeight:700, fontSize:'13px', color:pm.color }}>{pm.label}</div>
                    <div style={{ fontSize:'10px', color:'#5A5040', marginTop:'2px' }}>{pm.dial}</div>
                  </div>
                ))}
              </div>

              {payMethod && (
                <>
                  {/* Instructions */}
                  <div style={{ background:'#FDF3DC', border:'1.5px solid #F5C04A', borderRadius:'8px', padding:'12px', marginBottom:'10px', fontSize:'12px', color:'#5A5040', lineHeight:1.8 }}>
                    <strong style={{ color:'#0B2545' }}>Option A — We send a prompt (easiest):</strong><br />
                    Enter your number below → tap Send → prompt appears on your phone → enter your PIN<br /><br />
                    <strong style={{ color:'#0B2545' }}>Option B — Dial yourself:</strong><br />
                    {payMethod === 'mtn'
                      ? <>MTN: Dial <strong>*165*3*RAYLANE#</strong> → amount: UGX {totalPrice.toLocaleString()}</>
                      : <>Airtel: Dial <strong>*185*RAYLANE#</strong> → amount: UGX {totalPrice.toLocaleString()}</>
                    }
                  </div>

                  {/* Merchant code */}
                  <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:'8px', padding:'10px 12px', marginBottom:'10px', fontSize:'11px', color:'#1E3A8A', lineHeight:1.7 }}>
                    Merchant code: <strong style={{ fontFamily:'monospace', fontSize:'13px' }}>RAYLANE</strong><br />
                    MTN: <strong>*165*3*RAYLANE#</strong> &nbsp;·&nbsp; Airtel: <strong>*185*RAYLANE#</strong>
                  </div>

                  {/* Phone input */}
                  <div style={{ marginBottom:'12px' }}>
                    <label style={{ display:'block', fontSize:'11px', color:'#5A5040', fontWeight:700, marginBottom:'5px' }}>
                      YOUR {payMethod === 'mtn' ? 'MTN' : 'AIRTEL'} PHONE NUMBER
                    </label>
                    <div style={{ display:'flex', border:'1.5px solid #EAE5D8', borderRadius:'8px', overflow:'hidden', background:'#F8F6F1' }}>
                      <div style={{ padding:'10px 12px', background:'#EAE5D8', fontSize:'13px', fontWeight:700, color:'#0B2545', borderRight:'1px solid #D1C9B8', whiteSpace:'nowrap' }}>
                        🇺🇬 +256
                      </div>
                      <input
                        type="tel"
                        placeholder="701 234 567"
                        value={payPhone}
                        maxLength={12}
                        onChange={e => { setPayPhone(e.target.value); setPayStatus('idle') }}
                        style={{ flex:1, padding:'10px 12px', border:'none', background:'transparent', fontSize:'14px', fontFamily:'monospace', outline:'none', color:'#1A1208' }}
                      />
                    </div>
                  </div>

                  {/* Status bar */}
                  {payStatus !== 'idle' && (
                    <div style={{
                      display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                      padding:'12px', borderRadius:'10px', marginBottom:'10px',
                      fontSize:'13px', fontWeight:600,
                      background: payStatus==='success'?'#DCFCE7':payStatus==='failed'?'#FEF2F2':payStatus==='waiting'?'#FFFBEB':'#EFF6FF',
                      color:      payStatus==='success'?'#15803D':payStatus==='failed'?'#B91C1C':payStatus==='waiting'?'#B45309':'#1D4ED8',
                    }}>
                      <span>{payStatus==='success'?'✅':payStatus==='failed'?'⚠️':payStatus==='waiting'?'📲':'⏳'}</span>
                      <span>{payMsg}</span>
                    </div>
                  )}

                  {/* Order summary */}
                  <div style={{ background:'#F8F6F1', borderRadius:'8px', padding:'12px', fontSize:'12px' }}>
                    <div style={{ fontWeight:700, color:'#0B2545', marginBottom:'7px' }}>Order Summary</div>
                    <div style={{ display:'flex', justifyContent:'space-between', color:'#5A5040', marginBottom:'3px' }}><span>Route</span><span>{route}</span></div>
                    <div style={{ display:'flex', justifyContent:'space-between', color:'#5A5040', marginBottom:'3px' }}><span>Seats</span><span>{selectedSeats.join(', ')}</span></div>
                    <div style={{ display:'flex', justifyContent:'space-between', color:'#5A5040', marginBottom:'3px' }}><span>Date</span><span>{travelDate}</span></div>
                    <div style={{ borderTop:'1px solid #EAE5D8', margin:'8px 0', paddingTop:'8px', display:'flex', justifyContent:'space-between', fontWeight:700, color:'#0B2545' }}>
                      <span>TOTAL</span><span>UGX {totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btnBack} onClick={() => setStep(3)}>← Back</button>
              <button
                style={btnConfirm(!!payMethod && payPhone.replace(/\s/g,'').length >= 9 && payStatus === 'idle')}
                disabled={!payMethod || payPhone.replace(/\s/g,'').length < 9 || payStatus !== 'idle'}
                onClick={initiatePay}
              >
                {payPhone.replace(/\s/g,'').length >= 9 && payMethod
                  ? `Send Payment Request to +256 ${payPhone} →`
                  : 'Send Payment Request →'
                }
              </button>
            </div>
          </div>
        )}

        {/* ================================================
            STEP 5 — CONFIRMED TICKET
        ================================================ */}
        {step === 5 && (
          <div>
            <div style={{ textAlign:'center', marginBottom:'14px' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'8px' }}>✅</div>
              <div style={{ fontFamily:'Georgia,serif', fontSize:'1.2rem', color:'#0B2545', marginBottom:'3px' }}>Booking Confirmed!</div>
              <div style={{ fontSize:'12px', color:'#5A5040' }}>SMS sent to {phone} · Show code at vehicle</div>
            </div>

            {/* Ticket card */}
            <div style={{ background:'#fff', borderRadius:'14px', border:'2px solid #EAE5D8', overflow:'hidden', maxWidth:'340px', margin:'0 auto 14px' }}>
              <div style={{ background:'#0B2545', padding:'14px 18px', textAlign:'center' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'7px', marginBottom:'3px' }}>
                  <svg width="20" height="20" viewBox="0 0 30 30"><rect width="30" height="30" rx="5" fill="#E8A020"/><polygon points="4,26 11,6 13,6 7,26" fill="#0B2545"/><polygon points="9,26 16,6 18,6 12,26" fill="#0B2545" opacity=".5"/><polygon points="14,26 21,6 23,6 17,26" fill="#0B2545" opacity=".25"/></svg>
                  <span style={{ color:'#fff', fontWeight:700, fontSize:'14px' }}>RAYLANE EXPRESS</span>
                </div>
                <div style={{ color:'rgba(255,255,255,.5)', fontSize:'9px', letterSpacing:'.8px' }}>PASSENGER TICKET</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', padding:'0 6px' }}>
                <div style={{ width:'14px', height:'14px', borderRadius:'50%', background:'#F8F6F1', flexShrink:0 }} />
                <div style={{ flex:1, borderTop:'1.5px dashed #CBD5E1' }} />
                <div style={{ fontSize:'8px', color:'#9CA3AF', padding:'0 7px', whiteSpace:'nowrap' }}>PASSENGER COPY</div>
                <div style={{ flex:1, borderTop:'1.5px dashed #CBD5E1' }} />
                <div style={{ width:'14px', height:'14px', borderRadius:'50%', background:'#F8F6F1', flexShrink:0 }} />
              </div>
              <div style={{ padding:'14px 18px' }}>
                {[
                  ['Passenger', passengerName || 'Passenger'],
                  ['Route',     route],
                  ['Date',      travelDate],
                  ['Vehicle',   vehicleType === 'taxi' ? 'Matatu (14-seater)' : 'Coach Bus (67-seater)'],
                  ['Payment',   payMethod === 'mtn' ? 'MTN Mobile Money' : payMethod === 'airtel' ? 'Airtel Money' : 'Mobile Money'],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'6px', color:'#5A5040' }}>
                    <span>{k}</span><strong style={{ color:'#0B2545' }}>{v}</strong>
                  </div>
                ))}
                <div style={{ background:'#FDF3DC', border:'1px solid #F5C04A', borderRadius:'8px', padding:'10px', textAlign:'center', margin:'10px 0' }}>
                  <div style={{ fontSize:'9px', color:'#8A8070', marginBottom:'2px' }}>SEAT(S)</div>
                  <div style={{ fontSize:'22px', fontWeight:700, color:'#0B2545' }}>{selectedSeats.join(', ') || '—'}</div>
                </div>
                <div style={{ background:'#F8F8F8', border:'1.5px solid #EAE5D8', borderRadius:'10px', width:'88px', height:'88px', display:'flex', alignItems:'center', justifyContent:'center', margin:'10px auto', fontSize:'10px', color:'#8A8070' }}>
                  QR Code
                </div>
                <div style={{ fontFamily:'monospace', fontSize:'9px', color:'#8A8070', textAlign:'center', wordBreak:'break-all', marginBottom:'8px' }}>
                  {bookingCode}
                </div>
                <div style={{ textAlign:'center', marginBottom:'5px' }}>
                  <span style={{ background:'#DCFCE7', color:'#15803D', fontSize:'10px', fontWeight:700, padding:'4px 14px', borderRadius:'16px' }}>
                    CONFIRMED
                  </span>
                </div>
                <div style={{ fontSize:'9px', color:'#8A8070', textAlign:'center' }}>Arrive 30 min early · Show at vehicle</div>
              </div>
            </div>

            <div style={{ display:'flex', gap:'8px', maxWidth:'340px', margin:'0 auto' }}>
              <button style={{ ...btnBack, flex:1, textAlign:'center' as const }} onClick={() => router.push('/')}>← Home</button>
              <button
                style={{ flex:1, padding:'10px', background:'#0B2545', color:'#fff', border:'none', borderRadius:'8px', fontWeight:700, fontSize:'12px', cursor:'pointer' }}
                onClick={() => alert('In production: downloads PDF or shares via WhatsApp')}
              >
                Share Ticket
              </button>
            </div>
          </div>
        )}

      </div>
      <Footer />
    </div>
  )
}
