// ============================================================
// app/booking/page.tsx
// THE BOOKING PAGE — 4 steps: Seat → Details → Payment → Confirmed
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { generateBookingCode } from '@/lib/bookingCode'
import type { Booking } from '@/lib/types'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

// Seats that are already taken (in production, load this from Firebase)
const TAXI_TAKEN = [1, 5, 8, 11]
const BUS_TAKEN  = [2, 3, 7, 8, 14, 15, 20, 22, 27, 30, 33, 35, 38, 41, 45]

export default function BookingPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // Which step are we on? 1=Seat, 2=Details, 3=Payment, 4=Confirmed
  const [step, setStep] = useState(1)

  // Booking form data — built up across the 4 steps
  const [vehicleType,    setVehicleType]    = useState<'taxi'|'bus'>('taxi')
  const [selectedSeat,   setSelectedSeat]   = useState('')
  const [passengerName,  setPassengerName]  = useState('')
  const [phone,          setPhone]          = useState('')
  const [nationalId,     setNationalId]     = useState('')
  const [nextOfKin,      setNextOfKin]      = useState('')
  const [boardingPoint,  setBoardingPoint]  = useState('Kampala — Old Park')
  const [luggage,        setLuggage]        = useState('No extra luggage')
  const [termsAccepted,  setTermsAccepted]  = useState(false)
  const [paymentMethod,  setPaymentMethod]  = useState<'mtn'|'airtel'|''>('')
  const [transactionId,  setTransactionId]  = useState('')
  const [bookingCode,    setBookingCode]    = useState('')
  const [loading,        setLoading]        = useState(false)

  const price = vehicleType === 'taxi' ? 45000 : 35000

  // Read URL params if user came from search bar
  const fromCity  = searchParams.get('from')  || 'Kampala'
  const toCity    = searchParams.get('to')    || 'Mbale'
  const travelDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const route     = `${fromCity} → ${toCity}`

  // ---- STEP 1: SEAT SELECTION ----
  function handleSeatClick(label: string, taken: boolean) {
    if (taken) return
    setSelectedSeat(label)
  }

  // ---- STEP 3: CONFIRM BOOKING ----
  async function confirmBooking() {
    if (!transactionId.trim() || !paymentMethod) return
    setLoading(true)

    try {
      const code = generateBookingCode()
      const booking: Omit<Booking, 'id'> = {
        passengerName, phone, nationalId, nextOfKin,
        route, vehicleType,
        seatLabel:     selectedSeat,
        boardingPoint, luggage,
        departureTime: '08:30 AM',
        travelDate,
        price,
        paymentMethod,
        transactionId,
        status:        'pending',   // admin must confirm → triggers revenue record
        createdAt:     new Date().toISOString(),
      }

      // Save booking to Firebase "bookings" collection
      await addDoc(collection(db, 'bookings'), { ...booking, bookingCode: code })

      setBookingCode(code)
      setStep(4)

    } catch (err) {
      console.error('Booking error:', err)
      alert('Something went wrong. Please try again or contact us on WhatsApp.')
    } finally {
      setLoading(false)
    }
  }

  // ---- RENDER ----
  return (
    <div>
      <Navbar />

      <div style={{ maxWidth:'720px', margin:'0 auto', padding:'1.5rem clamp(12px,4vw,2rem)' }}>

        {/* Back button */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1.2rem' }}>
          <button onClick={() => step > 1 ? setStep(step-1) : router.push('/')}
            style={{ background:'var(--earth)', border:'none', padding:'7px 14px', borderRadius:'8px', cursor:'pointer', fontSize:'12px', color:'var(--text2)' }}>
            ← {step > 1 ? 'Back' : 'Home'}
          </button>
          <div>
            <div style={{ fontFamily:'Georgia,serif', fontSize:'1.2rem', color:'var(--ocean)' }}>Book Your Seat</div>
            <div style={{ fontSize:'11px', color:'var(--text2)' }}>{route} · {travelDate}</div>
          </div>
        </div>

        {/* Step indicators */}
        <div style={{ display:'flex', borderBottom:'2px solid var(--earth)', marginBottom:'1.5rem', overflowX:'auto' }}>
          {['Select Seat','Your Details','Payment','Confirmed'].map((label, i) => {
            const n = i + 1
            const isActive = step === n
            const isDone   = step > n
            return (
              <div key={n} style={{
                padding:'10px 14px', fontSize:'12px', whiteSpace:'nowrap',
                borderBottom: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                marginBottom:'-2px',
                color: isActive ? 'var(--ocean)' : isDone ? 'var(--success)' : 'var(--muted)',
                fontWeight: isActive ? 700 : 400,
                display:'flex', alignItems:'center', gap:'7px',
              }}>
                <span style={{
                  width:'20px', height:'20px', borderRadius:'50%', fontSize:'10px',
                  display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0,
                  background: isDone ? 'var(--success)' : isActive ? 'var(--gold)' : 'var(--earth)',
                  color: isDone ? 'white' : isActive ? 'var(--ocean)' : 'var(--muted)',
                }}>
                  {isDone ? '✓' : n}
                </span>
                {label}
              </div>
            )
          })}
        </div>

        {/* ======================================================
            STEP 1 — SELECT SEAT
        ====================================================== */}
        {step === 1 && (
          <div>
            {/* Vehicle type selector */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'1.2rem' }}>
              {(['taxi','bus'] as const).map(v => (
                <div key={v}
                  onClick={() => { setVehicleType(v); setSelectedSeat('') }}
                  style={{
                    background:'white', border:`2px solid ${vehicleType===v ? 'var(--gold)' : 'var(--earth)'}`,
                    borderRadius:'12px', padding:'14px', cursor:'pointer',
                    background: vehicleType===v ? 'var(--gold-pale)' : 'white',
                  }}>
                  <div style={{ fontSize:'1.2rem', marginBottom:'6px' }}>{v==='taxi' ? '🚐' : '🚌'}</div>
                  <div style={{ fontWeight:700, fontSize:'14px', color:'var(--ocean)' }}>{v==='taxi' ? 'Taxi Shuttle' : 'Coach Bus'}</div>
                  <div style={{ fontSize:'11px', color:'var(--text2)' }}>{v==='taxi' ? '14 seats · Faster' : '67 seats · Economy'}</div>
                  <div style={{ fontSize:'16px', fontWeight:700, color:'var(--gold)', marginTop:'6px' }}>UGX {v==='taxi' ? '45,000' : '35,000'}</div>
                </div>
              ))}
            </div>

            {/* Seat map */}
            <div style={{ background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)', padding:'1.2rem', marginBottom:'1.2rem' }}>
              <div style={{ fontWeight:700, fontSize:'13px', color:'var(--ocean)', marginBottom:'10px' }}>
                {vehicleType==='taxi' ? '🚐 Taxi · 14 Seats' : '🚌 Bus · 67 Seats'} — tap a seat to select
              </div>

              {/* Legend */}
              <div style={{ display:'flex', gap:'14px', marginBottom:'12px', flexWrap:'wrap' }}>
                {[
                  { color:'#E0F2FE', border:'#BAE6FD', label:'Available' },
                  { color:'var(--gold)', border:'var(--gold-soft)', label:'Your Seat' },
                  { color:'var(--earth)', border:'#D1C9B8', label:'Taken' },
                ].map(l => (
                  <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'var(--text2)' }}>
                    <div style={{ width:'14px', height:'14px', borderRadius:'3px', background:l.color, border:`1.5px solid ${l.border}` }} />
                    {l.label}
                  </div>
                ))}
              </div>

              {/* Taxi seat map */}
              {vehicleType === 'taxi' && (
                <div style={{ overflowX:'auto' }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:'5px', maxWidth:'260px', minWidth:'200px', margin:'0 auto' }}>
                    {/* Front row: driver + 2 passenger seats */}
                    <div style={{ display:'flex', gap:'5px', alignItems:'center', marginBottom:'4px' }}>
                      <div style={{ width:'36px', height:'36px', background:'#334155', borderRadius:'5px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>🚗</div>
                      {['F1','F2'].map(label => {
                        const taken = TAXI_TAKEN.includes(parseInt(label.replace('F',''))+100)
                        const isSelected = selectedSeat === label
                        return (
                          <div key={label}
                            onClick={() => handleSeatClick(label, false)}
                            className={`seat ${isSelected ? 'seat-selected' : 'seat-available seat-window'}`}>
                            {label}
                          </div>
                        )
                      })}
                    </div>
                    {/* Rows A–D: 3 seats across */}
                    {['A','B','C','D'].map((row, ri) =>
                      <div key={row} style={{ display:'flex', gap:'5px', justifyContent:'center' }}>
                        {[1,2,3].map(col => {
                          const idx   = ri * 3 + col
                          const label = `${row}${col}`
                          const taken = TAXI_TAKEN.includes(idx)
                          const isWin = col === 1 || col === 3
                          const isSel = selectedSeat === label
                          return (
                            <div key={label}
                              onClick={() => handleSeatClick(label, taken)}
                              className={`seat ${isSel ? 'seat-selected' : taken ? 'seat-taken' : `seat-available${isWin?' seat-window':''}`}`}>
                              {label}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop:'10px', fontSize:'10px', color:'var(--text2)', background:'var(--warm)', borderRadius:'8px', padding:'7px 10px' }}>
                    Row F: 2 beside driver · Rows A–D: 3 across · Dashed border = window seat
                  </div>
                </div>
              )}

              {/* Bus seat map */}
              {vehicleType === 'bus' && (
                <div style={{ overflowX:'auto' }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px', minWidth:'240px' }}>
                    {/* Row 1: driver + 1 */}
                    <div style={{ display:'flex', gap:'5px', alignItems:'center', marginBottom:'4px' }}>
                      <div style={{ width:'16px', fontSize:'9px', color:'var(--muted)', textAlign:'right', flexShrink:0 }}></div>
                      <div style={{ width:'30px', height:'30px', background:'#334155', borderRadius:'5px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', flexShrink:0 }}>🚗</div>
                      <div style={{ width:'clamp(10px,3vw,16px)', flexShrink:0 }} />
                      {(() => { const label='1A'; const isSel=selectedSeat===label; return (
                        <div key={label} onClick={() => handleSeatClick(label, false)}
                          className={`seat ${isSel?'seat-selected':'seat-available'}`}>{label}</div>
                      )})()}
                    </div>
                    {/* Rows 2–12: 2 | aisle | 3 */}
                    {Array.from({length:11},(_,i)=>i+2).map(r => {
                      const base = (r-2)*5+1
                      return (
                        <div key={r} style={{ display:'flex', gap:'5px', alignItems:'center' }}>
                          <div style={{ width:'16px', fontSize:'9px', color:'var(--muted)', textAlign:'right', flexShrink:0 }}>{r}</div>
                          {['A','B'].map((col,ci) => {
                            const idx=base+ci; const label=`${r}${col}`; const taken=BUS_TAKEN.includes(idx); const isSel=selectedSeat===label; const isWin=col==='A'
                            return <div key={label} onClick={() => handleSeatClick(label,taken)} className={`seat ${isSel?'seat-selected':taken?'seat-taken':`seat-available${isWin?' seat-window':''}`}`}>{label}</div>
                          })}
                          <div style={{ width:'clamp(10px,3vw,16px)', flexShrink:0 }} />
                          {['C','D','E'].map((col,ci) => {
                            const idx=base+2+ci; const label=`${r}${col}`; const taken=BUS_TAKEN.includes(idx); const isSel=selectedSeat===label; const isWin=col==='E'
                            return <div key={label} onClick={() => handleSeatClick(label,taken)} className={`seat ${isSel?'seat-selected':taken?'seat-taken':`seat-available${isWin?' seat-window':''}`}`}>{label}</div>
                          })}
                        </div>
                      )
                    })}
                    {/* Last row: 6 across */}
                    <div style={{ display:'flex', gap:'5px', alignItems:'center', borderTop:'2px solid var(--earth)', paddingTop:'5px', marginTop:'2px' }}>
                      <div style={{ width:'16px', fontSize:'9px', color:'var(--muted)', textAlign:'right', flexShrink:0 }}>L</div>
                      {[1,2,3,4,5,6].map(n => {
                        const label=`L${n}`; const isSel=selectedSeat===label; const isWin=n===1||n===6
                        return <div key={label} onClick={() => handleSeatClick(label,false)} className={`seat ${isSel?'seat-selected':`seat-available${isWin?' seat-window':''}`}`}>{label}</div>
                      })}
                    </div>
                  </div>
                  <div style={{ marginTop:'10px', fontSize:'10px', color:'var(--text2)', background:'var(--warm)', borderRadius:'8px', padding:'7px 10px' }}>
                    Row 1: 1 beside driver · Rows 2–12: 2 | aisle | 3 · Last row L: 6 across
                  </div>
                </div>
              )}
            </div>

            {/* Selected seat summary + continue */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'white', border:'1.5px solid var(--earth)', borderRadius:'12px', padding:'12px 16px', marginBottom:'1rem' }}>
              <div>
                <div style={{ fontSize:'11px', color:'var(--text2)' }}>Selected seat</div>
                <div style={{ fontWeight:700, color:'var(--ocean)', fontSize:'14px' }}>{selectedSeat || 'None selected'}</div>
              </div>
              <button
                onClick={() => selectedSeat && setStep(2)}
                disabled={!selectedSeat}
                style={{
                  background: selectedSeat ? 'var(--ocean)' : 'var(--earth)',
                  color: selectedSeat ? 'white' : 'var(--muted)',
                  border:'none', padding:'11px 22px', borderRadius:'8px',
                  fontWeight:700, fontSize:'13px',
                  cursor: selectedSeat ? 'pointer' : 'not-allowed', transition:'.2s',
                }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ======================================================
            STEP 2 — PASSENGER DETAILS
        ====================================================== */}
        {step === 2 && (
          <div>
            <div style={{ background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)', padding:'1.2rem', marginBottom:'1.2rem' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--ocean)', marginBottom:'.9rem' }}>Passenger Details</h3>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                <div><label className="form-label">FULL NAME *</label><input className="form-input" placeholder="e.g. Aisha Nakato" value={passengerName} onChange={e=>setPassengerName(e.target.value)} /></div>
                <div><label className="form-label">PHONE (MTN/Airtel) *</label><input className="form-input" placeholder="0701 000 000" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                <div><label className="form-label">NATIONAL ID / PASSPORT</label><input className="form-input" placeholder="CM000000000AA" value={nationalId} onChange={e=>setNationalId(e.target.value)} /></div>
                <div><label className="form-label">NEXT OF KIN (emergency)</label><input className="form-input" placeholder="Full name + phone" value={nextOfKin} onChange={e=>setNextOfKin(e.target.value)} /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                <div>
                  <label className="form-label">BOARDING POINT</label>
                  <select className="form-input" value={boardingPoint} onChange={e=>setBoardingPoint(e.target.value)}>
                    <option>Kampala — Old Park</option>
                    <option>Kampala — Nakawa</option>
                    <option>Kampala — Kireka</option>
                    <option>Jinja (en route)</option>
                    <option>Iganga (en route)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">LUGGAGE</label>
                  <select className="form-input" value={luggage} onChange={e=>setLuggage(e.target.value)}>
                    <option>No extra luggage</option>
                    <option>Small bag (under 10kg)</option>
                    <option>Large bag (10–25kg) · +UGX 5,000</option>
                  </select>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div style={{ background:'var(--warm)', borderRadius:'8px', padding:'12px', marginBottom:'12px', fontSize:'11px', color:'var(--text2)', lineHeight:1.7, border:'1px solid var(--earth)' }}>
                <div style={{ fontWeight:700, color:'var(--ocean)', marginBottom:'4px', fontSize:'12px' }}>Terms & Conditions</div>
                No refund after the vehicle's departure time · Passengers must arrive 30 minutes early · Seat is valid only for the date and route booked · Luggage is carried at the passenger's own risk · Raylane Express is not liable for delays caused by third parties (traffic, weather, road conditions) · Children under 5 are free but must share a seat · Raylane reserves the right to cancel or reschedule trips with prior notice · By completing this booking you agree to all of the above.
              </div>
              <label style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'12px', color:'var(--text2)', cursor:'pointer' }}>
                <input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} style={{ marginTop:'2px' }} />
                I have read and accept the Terms & Conditions and Refund Policy
              </label>
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setStep(1)} style={{ background:'var(--earth)', border:'none', padding:'11px 16px', borderRadius:'8px', fontWeight:700, fontSize:'13px', cursor:'pointer', color:'var(--text2)' }}>← Back</button>
              <button
                onClick={() => termsAccepted && passengerName && phone && setStep(3)}
                disabled={!termsAccepted || !passengerName || !phone}
                style={{
                  flex:1, border:'none', padding:'11px 20px', borderRadius:'8px',
                  fontWeight:700, fontSize:'13px', transition:'.2s', cursor: (termsAccepted && passengerName && phone) ? 'pointer' : 'not-allowed',
                  background: (termsAccepted && passengerName && phone) ? 'var(--ocean)' : 'var(--earth)',
                  color: (termsAccepted && passengerName && phone) ? 'white' : 'var(--muted)',
                }}>
                Continue to Payment →
              </button>
            </div>
          </div>
        )}

        {/* ======================================================
            STEP 3 — PAYMENT
        ====================================================== */}
        {step === 3 && (
          <div>
            <div style={{ background:'white', borderRadius:'12px', border:'1.5px solid var(--earth)', padding:'1.2rem', marginBottom:'1.2rem' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--ocean)', marginBottom:'4px' }}>Payment</h3>
              <p style={{ fontSize:'11px', color:'var(--text2)', marginBottom:'.9rem' }}>Mobile Money only · Your seat is held for 15 minutes</p>

              {/* Payment method selector */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'1rem' }}>
                {([
                  { id:'mtn',    label:'MTN Mobile Money', color:'#F59E0B', dial:'*165*3#',  number:'0781 000 000' },
                  { id:'airtel', label:'Airtel Money',      color:'#EF4444', dial:'*185#',    number:'0750 000 000' },
                ] as const).map(pm => (
                  <div key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    style={{
                      background: paymentMethod===pm.id ? 'var(--gold-pale)' : 'white',
                      border:`2px solid ${paymentMethod===pm.id ? 'var(--gold)' : 'var(--earth)'}`,
                      borderRadius:'12px', padding:'14px', cursor:'pointer', textAlign:'center', transition:'.2s',
                    }}>
                    <div style={{ fontSize:'1.3rem', marginBottom:'6px' }}>📱</div>
                    <div style={{ fontWeight:700, fontSize:'13px', color:pm.color }}>{pm.label}</div>
                    <div style={{ fontSize:'10px', color:'var(--text2)', marginTop:'2px' }}>{pm.dial}</div>
                    <div style={{ fontSize:'11px', fontWeight:700, marginTop:'3px' }}>{pm.number}</div>
                  </div>
                ))}
              </div>

              {/* Payment instructions */}
              {paymentMethod && (
                <div style={{ background:'var(--gold-pale)', border:'1.5px solid var(--gold-soft)', borderRadius:'8px', padding:'12px', marginBottom:'1rem' }}>
                  <div style={{ fontWeight:700, fontSize:'12px', color:'var(--ocean)', marginBottom:'5px' }}>How to pay</div>
                  <div style={{ fontSize:'12px', color:'var(--text2)', lineHeight:1.8 }}>
                    {paymentMethod === 'mtn' ? (
                      <>1. Dial <strong>*165*3#</strong><br/>2. Select &quot;Send Money&quot; → Merchant<br/>3. Enter number: <strong>0781 000 000</strong><br/>4. Amount: <strong>UGX {price.toLocaleString()}</strong><br/>5. Copy the transaction ID you receive</>
                    ) : (
                      <>1. Dial <strong>*185#</strong><br/>2. Select &quot;Payments&quot;<br/>3. Enter number: <strong>0750 000 000</strong><br/>4. Amount: <strong>UGX {price.toLocaleString()}</strong><br/>5. Copy the transaction ID you receive</>
                    )}
                  </div>
                </div>
              )}

              {/* Transaction ID input */}
              <div style={{ marginBottom:'12px' }}>
                <label className="form-label">TRANSACTION ID (from your MoMo/Airtel SMS)</label>
                <input className="form-input" placeholder="e.g. MPS20260330001" value={transactionId} onChange={e=>setTransactionId(e.target.value)} style={{ fontFamily:'monospace' }} />
              </div>

              {/* Order summary */}
              <div style={{ background:'var(--warm)', borderRadius:'8px', padding:'12px', fontSize:'12px' }}>
                <div style={{ fontWeight:700, color:'var(--ocean)', marginBottom:'7px' }}>Order Summary</div>
                {[
                  ['Route',     route],
                  ['Seat',      selectedSeat],
                  ['Vehicle',   vehicleType === 'taxi' ? 'Taxi (14-seater)' : 'Coach Bus (67-seater)'],
                  ['Date',      travelDate],
                  ['Boarding',  boardingPoint],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', color:'var(--text2)', marginBottom:'3px' }}>
                    <span>{k}</span><span>{v}</span>
                  </div>
                ))}
                <div style={{ borderTop:'1px solid var(--earth)', margin:'9px 0', paddingTop:'9px', display:'flex', justifyContent:'space-between', fontWeight:700, color:'var(--ocean)' }}>
                  <span>TOTAL</span><span>UGX {price.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setStep(2)} style={{ background:'var(--earth)', border:'none', padding:'11px 16px', borderRadius:'8px', fontWeight:700, fontSize:'13px', cursor:'pointer', color:'var(--text2)' }}>← Back</button>
              <button
                onClick={confirmBooking}
                disabled={!transactionId.trim() || !paymentMethod || loading}
                style={{
                  flex:1, border:'none', padding:'11px 20px', borderRadius:'8px',
                  fontWeight:700, fontSize:'13px', transition:'.2s',
                  cursor: (transactionId && paymentMethod && !loading) ? 'pointer' : 'not-allowed',
                  background: (transactionId && paymentMethod && !loading) ? 'var(--gold)' : 'var(--earth)',
                  color: (transactionId && paymentMethod && !loading) ? 'var(--ocean)' : 'var(--muted)',
                }}>
                {loading ? 'Processing…' : 'Confirm & Book Seat'}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================
            STEP 4 — CONFIRMED
        ====================================================== */}
        {step === 4 && (
          <div>
            <div style={{ background:'white', borderRadius:'12px', border:'2px solid var(--success)', padding:'1.5rem', textAlign:'center', marginBottom:'1.2rem' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'.8rem' }}>✅</div>
              <div style={{ fontSize:'12px', color:'var(--text2)', marginBottom:'.4rem' }}>Your booking is submitted — awaiting admin confirmation</div>
              <div style={{ fontFamily:'Georgia,serif', fontSize:'2rem', color:'var(--ocean)', fontWeight:700, letterSpacing:'4px', marginBottom:'.4rem' }}>
                {bookingCode}
              </div>
              <div style={{ fontSize:'11px', color:'var(--text2)', marginBottom:'1rem' }}>Screenshot this code. Show it at the vehicle on departure day.</div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', textAlign:'left' }}>
                {[
                  ['Route',     route],
                  ['Seat',      selectedSeat],
                  ['Date',      travelDate],
                  ['Payment',   `${paymentMethod === 'mtn' ? 'MTN MoMo' : 'Airtel Money'} · Pending verification`],
                  ['Boarding',  boardingPoint],
                  ['Price',     `UGX ${price.toLocaleString()}`],
                ].map(([k,v]) => (
                  <div key={k} style={{ background:'var(--warm)', borderRadius:'8px', padding:'10px 14px' }}>
                    <div style={{ fontSize:'10px', color:'var(--muted)', marginBottom:'2px' }}>{k}</div>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'var(--ocean)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:'var(--gold-pale)', border:'1px solid var(--gold-soft)', borderRadius:'8px', padding:'12px', marginBottom:'1rem', fontSize:'12px', color:'var(--text2)', lineHeight:1.7 }}>
              ℹ️ Your seat will be confirmed once our team verifies your payment reference. You will receive an SMS confirmation on <strong>{phone}</strong>. Please arrive at the boarding point 30 minutes before departure.
            </div>

            <button onClick={() => window.location.href='/'} className="btn-primary" style={{ width:'100%', justifyContent:'center' }}>
              ← Back to Home
            </button>
          </div>
        )}

      </div>
      <Footer />
    </div>
  )
}
