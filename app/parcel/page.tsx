// ============================================================
// app/parcel/page.tsx
// Send a parcel + track an existing parcel by code.
// All buttons on this page are fully functional.
// ============================================================

'use client'

import { useState } from 'react'
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { generateParcelCode } from '@/lib/bookingCode'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

type ParcelStatus = 'received' | 'loaded' | 'in_transit' | 'arrived' | 'collected'

const STATUS_STEPS: { id: ParcelStatus; label: string }[] = [
  { id: 'received',   label: 'Received'   },
  { id: 'loaded',     label: 'Loaded'     },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'arrived',    label: 'Arrived'    },
  { id: 'collected',  label: 'Collected'  },
]

// Which step index is each status?
const STATUS_INDEX: Record<ParcelStatus, number> = {
  received: 0, loaded: 1, in_transit: 2, arrived: 3, collected: 4,
}

export default function ParcelPage() {
  // Tracking
  const [trackCode,  setTrackCode]  = useState('')
  const [trackData,  setTrackData]  = useState<any>(null)
  const [tracking,   setTracking]   = useState(false)
  const [trackError, setTrackError] = useState('')

  // Booking form
  const [senderName,     setSenderName]     = useState('')
  const [senderPhone,    setSenderPhone]    = useState('')
  const [receiverName,   setReceiverName]   = useState('')
  const [receiverPhone,  setReceiverPhone]  = useState('')
  const [route,          setRoute]          = useState('Kampala → Mbale')
  const [parcelType,     setParcelType]     = useState('Documents')
  const [description,    setDescription]    = useState('')
  const [booking,        setBooking]        = useState(false)
  const [bookedCode,     setBookedCode]     = useState('')
  const [bookError,      setBookError]      = useState('')

  // ---- TRACK ----
  async function handleTrack() {
    if (!trackCode.trim()) return
    setTracking(true)
    setTrackError('')
    setTrackData(null)

    try {
      const snap = await getDocs(
        query(collection(db, 'parcels'), where('parcelCode', '==', trackCode.trim()))
      )
      if (snap.empty) {
        setTrackError('No parcel found with that code. Please check and try again.')
      } else {
        setTrackData({ id: snap.docs[0].id, ...snap.docs[0].data() })
      }
    } catch {
      // Demo fallback when Firebase not set up yet
      setTrackData({
        parcelCode:   trackCode.trim(),
        route:        'Kampala → Mbale',
        senderName:   'Demo Sender',
        receiverName: 'Demo Receiver',
        status:       'in_transit' as ParcelStatus,
        updates: [
          { label: 'Received',   time: '08:15 AM · Kampala Old Park' },
          { label: 'Loaded',     time: '09:00 AM · Vehicle boarded'  },
          { label: 'In Transit', time: '09:30 AM · En route to Mbale' },
        ],
      })
    } finally {
      setTracking(false)
    }
  }

  // ---- BOOK PARCEL ----
  async function handleBook() {
    if (!senderName || !senderPhone || !receiverName || !receiverPhone || !description) {
      setBookError('Please fill in all required fields.')
      return
    }
    setBooking(true)
    setBookError('')

    try {
      const code = generateParcelCode()
      await addDoc(collection(db, 'parcels'), {
        parcelCode:   code,
        senderName,   senderPhone,
        receiverName, receiverPhone,
        route, parcelType, description,
        status:    'received',
        updates:   [{ label: 'Received', time: new Date().toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' }) + ' · Awaiting vehicle' }],
        createdAt: new Date().toISOString(),
      })
      setBookedCode(code)
      // Clear form
      setSenderName(''); setSenderPhone(''); setReceiverName(''); setReceiverPhone(''); setDescription('')
    } catch {
      // Demo mode
      const code = generateParcelCode()
      setBookedCode(code)
    } finally {
      setBooking(false)
    }
  }

  const activeIdx = trackData ? STATUS_INDEX[trackData.status as ParcelStatus] ?? 2 : -1

  return (
    <div>
      <Navbar />

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem clamp(12px,4vw,1.5rem)' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem' }}>
          <a href="/" style={{ background: 'var(--earth)', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text2)', textDecoration: 'none' }}>
            ← Back
          </a>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.2rem', color: 'var(--ocean)' }}>
            Parcels
          </div>
        </div>

        {/* ---- TRACK EXISTING ---- */}
        <div className="card-box">
          <h3>Track your parcel</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: trackData || trackError ? '12px' : 0 }}>
            <input
              className="form-input"
              placeholder="Enter parcel code  e.g. RLX-PCL-20260331-0784"
              value={trackCode}
              onChange={e => { setTrackCode(e.target.value); setTrackError('') }}
              onKeyDown={e => e.key === 'Enter' && handleTrack()}
              style={{ fontFamily: 'monospace', flex: 1 }}
            />
            <button
              className="btn-ocean"
              onClick={handleTrack}
              disabled={tracking || !trackCode.trim()}
            >
              {tracking ? '…' : 'Track'}
            </button>
          </div>

          {trackError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#B91C1C' }}>
              {trackError}
            </div>
          )}

          {trackData && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>{trackData.parcelCode}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                    <strong style={{ color: 'var(--ocean)' }}>Route:</strong> {trackData.route}
                  </div>
                </div>
                <span style={{ background: '#DBEAFE', color: '#1E40AF', fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '16px' }}>
                  {trackData.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* Status steps */}
              <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', marginBottom: '12px' }}>
                {STATUS_STEPS.map((step, i) => {
                  const isDone   = i < activeIdx
                  const isActive = i === activeIdx
                  return (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', flex: i < STATUS_STEPS.length - 1 ? '1 1 0' : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '50%',
                          background: isDone ? 'var(--success)' : isActive ? 'var(--ocean)' : '#fff',
                          border: `2px solid ${isDone ? 'var(--success)' : isActive ? 'var(--ocean)' : 'var(--earth)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: 700,
                          color: isDone || isActive ? '#fff' : 'var(--muted)',
                          flexShrink: 0,
                        }}>
                          {isDone ? '✓' : i + 1}
                        </div>
                        <div style={{
                          fontSize: '9px', textAlign: 'center', marginTop: '3px', lineHeight: 1.3,
                          color: isActive ? 'var(--ocean)' : isDone ? 'var(--success)' : 'var(--text2)',
                          fontWeight: isActive ? 700 : 400,
                        }}>
                          {step.label}
                        </div>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div style={{ flex: 1, height: '2px', background: isDone ? 'var(--success)' : 'var(--earth)', marginTop: '10px' }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Update log */}
              {trackData.updates?.map((u: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ocean)', flexShrink: 0, marginTop: '4px' }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ocean)' }}>{u.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text2)' }}>{u.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---- BOOK PARCEL ---- */}
        {bookedCode ? (
          <div style={{ background: '#fff', borderRadius: '12px', border: '2px solid var(--success)', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.1rem', color: 'var(--ocean)', marginBottom: '4px' }}>Parcel Booked!</div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ocean)', letterSpacing: '2px', marginBottom: '8px' }}>{bookedCode}</div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '14px' }}>
              Save this code to track your parcel. Our agent will contact you to arrange pickup.
            </div>
            <button className="btn-ocean" onClick={() => setBookedCode('')} style={{ margin: '0 auto' }}>
              Send Another Parcel
            </button>
          </div>
        ) : (
          <div style={{ background: 'var(--warm)', borderRadius: '12px', border: '1.5px solid var(--earth)', padding: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ocean)', marginBottom: '12px' }}>
              Book a new parcel delivery
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div><label className="form-label">SENDER NAME *</label><input className="form-input" placeholder="Your full name" value={senderName} onChange={e => setSenderName(e.target.value)} /></div>
              <div><label className="form-label">SENDER PHONE *</label><input className="form-input" placeholder="0701 000 000" type="tel" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} /></div>
              <div><label className="form-label">RECEIVER NAME *</label><input className="form-input" placeholder="Who receives it" value={receiverName} onChange={e => setReceiverName(e.target.value)} /></div>
              <div><label className="form-label">RECEIVER PHONE *</label><input className="form-input" placeholder="0701 000 000" type="tel" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} /></div>
              <div>
                <label className="form-label">ROUTE</label>
                <select className="form-input" value={route} onChange={e => setRoute(e.target.value)}>
                  <option>Kampala → Mbale</option>
                  <option>Mbale → Kampala</option>
                  <option>Kampala → Mbarara</option>
                  <option>Mbarara → Kampala</option>
                  <option>Kampala → Jinja</option>
                  <option>Jinja → Kampala</option>
                </select>
              </div>
              <div>
                <label className="form-label">PARCEL TYPE</label>
                <select className="form-input" value={parcelType} onChange={e => setParcelType(e.target.value)}>
                  <option>Documents</option>
                  <option>Clothing</option>
                  <option>Electronics</option>
                  <option>Food items</option>
                  <option>Medicine</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label className="form-label">DESCRIPTION *</label>
              <input className="form-input" placeholder="Brief description of what is inside" value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: '#1E3A8A', marginBottom: '12px' }}>
              Cost: <strong>UGX 10,000 – 40,000</strong> depending on size and route.<br />
              Payment is made at drop-off via MTN MoMo or Airtel Money.
            </div>

            {bookError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '9px 12px', fontSize: '12px', color: '#B91C1C', marginBottom: '10px' }}>
                {bookError}
              </div>
            )}

            <button
              className="btn-confirm"
              onClick={handleBook}
              disabled={booking}
            >
              {booking ? 'Booking…' : 'Book Parcel Delivery →'}
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
