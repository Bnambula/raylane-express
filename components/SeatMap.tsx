// ============================================================
// components/SeatMap.tsx
// Accurate Uganda RHD seat maps.
//
// MATATU (14-seater):
//   Front row: F1, F2 beside driver (right side, same row)
//   Rows A–D:  col1 = foldable aisle seat (left/door side)
//              col2, col3, col4 = standard seats
//
// COACH (67-seater):
//   Row F:    F1 only, beside driver (right side)
//   Rows 1–12: A, B | aisle | C, D, E
//   Back row:  L1–L6 (no aisle, 6 across)
//
// Multi-select: up to maxSeats (default 5), flight-style chips tray
// ============================================================

'use client'

import { useState, useCallback } from 'react'
import {
  MATATU_SEAT_POSITIONS,
  COACH_COL_POSITIONS,
  MAX_SEATS_PER_BOOKING,
} from '@/lib/constants'

// ---- TYPES ----
type SeatState = 'available' | 'foldable' | 'booked' | 'selected' | 'premium' | 'disabled'

type SeatData = {
  id:       string
  state:    SeatState
  position: string
  type:     string
  price:    number
}

type SeatMapProps = {
  vehicleType:  'matatu' | 'coach'
  bookedSeats?: string[]
  basePrice:    number           // UGX per seat (varies by route)
  maxSeats?:    number
  onChange:     (seats: string[], total: number) => void
}

// ---- COLOURS ----
const COLOURS: Record<SeatState, { bg: string; border: string; borderStyle: string }> = {
  available: { bg: '#F0FDF4', border: '#86EFAC', borderStyle: 'solid'  },
  foldable:  { bg: '#F0FDF4', border: '#86EFAC', borderStyle: 'dashed' },
  booked:    { bg: '#FEF2F2', border: '#FCA5A5', borderStyle: 'solid'  },
  selected:  { bg: '#EFF6FF', border: '#2563EB', borderStyle: 'solid'  },
  premium:   { bg: '#FFFBEB', border: '#FCD34D', borderStyle: 'solid'  },
  disabled:  { bg: '#F9FAFB', border: '#E5E7EB', borderStyle: 'solid'  },
}

// ---- TOOLTIP ----
function Tooltip({ seatId, pos, type }: { seatId: string; pos: string; type: string }) {
  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
      transform: 'translateX(-50%)',
      background: '#1E293B', color: '#fff',
      fontSize: '10px', padding: '6px 10px', borderRadius: '8px',
      whiteSpace: 'nowrap', zIndex: 50, lineHeight: 1.6,
      pointerEvents: 'none',
    }}>
      <strong>Seat {seatId}</strong><br />
      {pos}<br />
      <span style={{ color: '#94A3B8' }}>{type}</span>
      <div style={{
        position: 'absolute', top: '100%', left: '50%',
        transform: 'translateX(-50%)',
        border: '5px solid transparent', borderTopColor: '#1E293B',
      }} />
    </div>
  )
}

// ---- SINGLE SEAT ----
function Seat({
  data, selected, onPress,
}: {
  data: SeatData; selected: boolean; onPress: () => void
}) {
  const [hovered, setHovered] = useState(false)

  const effective: SeatState = selected ? 'selected' : data.state
  const col = COLOURS[effective]
  const isBooked    = data.state === 'booked'
  const isDisabled  = data.state === 'disabled'
  const isBestSeat  = ['F1', 'F2'].includes(data.id)

  return (
    <div style={{ position: 'relative' }}>
      <div
        className={`seat ${selected ? 'seat-selected' : ''}`}
        style={{
          background:    col.bg,
          border:        `${selected ? '2px' : '1.5px'} ${col.borderStyle} ${col.border}`,
          cursor:        (isBooked || isDisabled) ? 'not-allowed' : 'pointer',
          opacity:       isDisabled ? 0.6 : 1,
        }}
        onClick={() => !isBooked && !isDisabled && onPress()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="seat-icon" style={{ color: col.border }}>
          {isBooked ? '🔒' : isDisabled ? '🚫' : '🪑'}
        </span>
        <span className="seat-lbl" style={{ color: col.border }}>{data.id}</span>

        {isBestSeat && !selected && (
          <span className="seat-best-badge">Best</span>
        )}
        {data.state === 'foldable' && !selected && (
          <span style={{
            position: 'absolute', bottom: '-8px',
            fontSize: '6px', color: '#15803D', fontWeight: 700,
          }}>fold</span>
        )}
      </div>

      {hovered && !isBooked && !isDisabled && (
        <Tooltip seatId={data.id} pos={data.position} type={data.type} />
      )}
    </div>
  )
}

// ---- VEHICLE ROOF (RHD orientation bar) ----
function VehicleRoof() {
  return (
    <div className="v-roof">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <div className="door-icon">▭</div>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,.4)' }}>Door</div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.55)', fontWeight: 600, letterSpacing: '.6px' }}>
          ↑ FRONT — DIRECTION OF TRAVEL
        </div>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,.4)', marginTop: '1px' }}>
          Facing forward
        </div>
        <div className="rhd-tag" style={{ marginTop: '3px' }}>Right-hand drive · Uganda</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <div className="driver-icon">🧑‍✈️</div>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,.4)' }}>Driver</div>
      </div>
    </div>
  )
}

// ---- LEGEND ----
function Legend({ showFoldable }: { showFoldable: boolean }) {
  const items = [
    { state: 'available', label: 'Available',  bg: '#F0FDF4', border: '#86EFAC', dash: false },
    { state: 'selected',  label: 'Selected',   bg: '#EFF6FF', border: '#2563EB', dash: false },
    { state: 'booked',    label: 'Booked',     bg: '#FEF2F2', border: '#FCA5A5', dash: false },
    { state: 'premium',   label: 'Premium',    bg: '#FFFBEB', border: '#FCD34D', dash: false },
    ...(showFoldable ? [{ state: 'foldable', label: 'Foldable', bg: '#F0FDF4', border: '#86EFAC', dash: true }] : []),
  ]
  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
      {items.map(item => (
        <div key={item.state} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text2)' }}>
          <div style={{
            width: '12px', height: '12px', borderRadius: '3px',
            background: item.bg,
            border: `1.5px ${item.dash ? 'dashed' : 'solid'} ${item.border}`,
            flexShrink: 0,
          }} />
          {item.label}
        </div>
      ))}
    </div>
  )
}

// ============================================================
//  MATATU MAP  (14 seats, RHD)
// ============================================================
function MatatuMap({
  bookedSeats, basePrice, maxSeats, onChange,
}: {
  bookedSeats: string[]; basePrice: number; maxSeats: number;
  onChange: (seats: string[], total: number) => void
}) {
  const [selected, setSelected] = useState<string[]>([])

  // Premium seats (F1, F2) cost 5000 more
  const seatPrice = (id: string) => ['F1', 'F2'].includes(id) ? basePrice + 5000 : basePrice

  function toggle(id: string) {
    setSelected(prev => {
      let next: string[]
      if (prev.includes(id)) {
        next = prev.filter(s => s !== id)
      } else {
        next = prev.length >= maxSeats
          ? [...prev.slice(1), id]   // drop oldest, add new
          : [...prev, id]
      }
      const total = next.reduce((sum, s) => sum + seatPrice(s), 0)
      onChange(next, total)
      return next
    })
  }

  function getSeat(id: string): SeatData {
    const isBooked  = bookedSeats.includes(id)
    const isPremium = ['F1', 'F2'].includes(id)
    const isFold    = id.length === 2 && id[1] === '1' && id[0] >= 'A' && id[0] <= 'D'
    return {
      id,
      state:    isBooked ? 'booked' : isPremium ? 'premium' : isFold ? 'foldable' : 'available',
      position: MATATU_SEAT_POSITIONS[id] || 'Standard',
      type:     isPremium ? 'Premium' : isFold ? 'Foldable seat' : 'Standard',
      price:    seatPrice(id),
    }
  }

  const ROWS = ['A', 'B', 'C', 'D'] as const

  return (
    <div>
      <Legend showFoldable />
      <div className="vehicle-shell">
        <VehicleRoof />

        {/* FRONT ROW: F1 F2 in SAME ROW as driver — right side */}
        <div className="seat-row" style={{ justifyContent: 'flex-end', marginBottom: '6px' }}>
          <div className="row-lbl">F</div>
          <Seat data={getSeat('F1')} selected={selected.includes('F1')} onPress={() => toggle('F1')} />
          <Seat data={getSeat('F2')} selected={selected.includes('F2')} onPress={() => toggle('F2')} />
          <div style={{ width: '28px', flexShrink: 0 }} />
        </div>

        <div style={{ borderTop: '1px solid #CBD5E1', margin: '4px 0 8px', opacity: 0.4 }} />

        {/* ROWS A–D: foldable seat first (left/door side), then main seats */}
        {ROWS.map(row => (
          <div key={row} className="seat-row">
            <div className="row-lbl">{row}</div>
            {/* col1 = foldable (left/door side) */}
            <Seat data={getSeat(row + '1')} selected={selected.includes(row+'1')} onPress={() => toggle(row+'1')} />
            <div style={{ width: '6px', flexShrink: 0 }} />
            {/* col2, col3, col4 = main seats */}
            {[2, 3, 4].map(col => {
              const id = row + col
              return (
                <Seat key={id} data={getSeat(id)} selected={selected.includes(id)} onPress={() => toggle(id)} />
              )
            })}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '8px', fontSize: '10px', color: 'var(--muted)',
        background: 'var(--warm)', borderRadius: '8px', padding: '7px 10px',
        border: '1px solid var(--earth)',
      }}>
        Row F: F1 & F2 are beside the driver (premium) ·
        A1–D1: left aisle foldable seats ·
        Columns 2–4: standard window/middle seats
      </div>
    </div>
  )
}

// ============================================================
//  COACH MAP  (67 seats, RHD)
// ============================================================
function CoachMap({
  bookedSeats, basePrice, maxSeats, onChange,
}: {
  bookedSeats: string[]; basePrice: number; maxSeats: number;
  onChange: (seats: string[], total: number) => void
}) {
  const [selected, setSelected] = useState<string[]>([])

  const seatPrice = (id: string) => (id === 'F1' || parseInt(id) === 1) ? basePrice + 5000 : basePrice

  function toggle(id: string) {
    if (id === '5A') return  // example disabled/blocked seat
    setSelected(prev => {
      let next: string[]
      if (prev.includes(id)) {
        next = prev.filter(s => s !== id)
      } else {
        next = prev.length >= maxSeats ? [...prev.slice(1), id] : [...prev, id]
      }
      const total = next.reduce((sum, s) => sum + seatPrice(s), 0)
      onChange(next, total)
      return next
    })
  }

  function colPos(col: string): string {
    return COACH_COL_POSITIONS[col] || col
  }

  function getSeat(id: string): SeatData {
    const row   = parseInt(id)
    const col   = id.replace(/[0-9L]/g, '')
    const isBook = bookedSeats.includes(id)
    const isPrem = id === 'F1' || row === 1
    const isBack = id.startsWith('L')
    const isDis  = id === '5A'
    return {
      id,
      state:    isDis ? 'disabled' : isBook ? 'booked' : isPrem ? 'premium' : 'available',
      position: isBack ? 'Back row — less legroom' : colPos(col),
      type:     isPrem ? 'Premium' : isDis ? 'Maintenance' : isBack ? 'Back row' : 'Standard',
      price:    seatPrice(id),
    }
  }

  return (
    <div>
      <Legend showFoldable={false} />
      <div className="vehicle-shell" style={{ overflowX: 'auto' }}>
        <VehicleRoof />

        {/* F1 beside driver (right only) */}
        <div className="seat-row" style={{ justifyContent: 'flex-end', marginBottom: '6px' }}>
          <div className="row-lbl">F</div>
          <div style={{ flex: 1 }} />
          <Seat data={getSeat('F1')} selected={selected.includes('F1')} onPress={() => toggle('F1')} />
          <div style={{ width: '5px' }} />
        </div>

        <div style={{ borderTop: '1px solid #CBD5E1', margin: '4px 0 8px', opacity: 0.4 }} />

        {/* Column header labels */}
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '4px', paddingLeft: '22px' }}>
          {['A', 'B', '', 'C', 'D', 'E'].map((c, i) => (
            c ? (
              <div key={i} style={{ width: 'clamp(32px,8vw,38px)', textAlign: 'center', fontSize: '8px', color: 'var(--muted)', fontWeight: 700 }}>{c}</div>
            ) : (
              <div key={i} className="aisle-gap" />
            )
          ))}
        </div>

        {/* Rows 1–12 */}
        {Array.from({ length: 12 }, (_, i) => i + 1).map(r => (
          <div key={r} className="seat-row">
            <div className="row-lbl">{r}</div>
            {['A', 'B'].map(col => {
              const id = r + col
              return <Seat key={id} data={getSeat(id)} selected={selected.includes(id)} onPress={() => toggle(id)} />
            })}
            <div className="aisle-gap">
              <div style={{ width: '2px', height: '100%', minHeight: '40px', background: 'repeating-linear-gradient(to bottom,#CBD5E1 0,#CBD5E1 5px,transparent 5px,transparent 10px)' }} />
            </div>
            {['C', 'D', 'E'].map(col => {
              const id = r + col
              return <Seat key={id} data={getSeat(id)} selected={selected.includes(id)} onPress={() => toggle(id)} />
            })}
          </div>
        ))}

        {/* Back row: 6 across, no aisle */}
        <div style={{ borderTop: '2px dashed #CBD5E1', paddingTop: '6px', marginTop: '4px' }}>
          <div style={{ fontSize: '8px', color: 'var(--muted)', marginBottom: '5px', fontWeight: 600 }}>
            BACK ROW — less legroom
          </div>
          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5, 6].map(n => {
              const id = 'L' + n
              return <Seat key={id} data={getSeat(id)} selected={selected.includes(id)} onPress={() => toggle(id)} />
            })}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '8px', fontSize: '10px', color: 'var(--muted)',
        background: 'var(--warm)', borderRadius: '8px', padding: '7px 10px',
        border: '1px solid var(--earth)',
      }}>
        F1: beside driver (premium) · Rows 1–12: 2 seats | aisle | 3 seats · Back row L: 6 across (no aisle)
      </div>
    </div>
  )
}

// ============================================================
//  SELECTION TRAY  (chips showing chosen seats)
// ============================================================
function SelectionTray({
  seats, total, maxSeats, vehicleType, onRemove,
}: {
  seats: string[]; total: number; maxSeats: number;
  vehicleType: 'matatu' | 'coach'; onRemove: (id: string) => void
}) {
  return (
    <div className="sel-tray">
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ocean)', marginBottom: '6px' }}>
        Selected seats
        <span style={{
          background: 'var(--ocean)', color: '#fff',
          fontSize: '10px', padding: '1px 7px', borderRadius: '10px', marginLeft: '6px',
        }}>
          {seats.length} / {maxSeats}
        </span>
      </div>

      <div className="sel-chips">
        {seats.length === 0
          ? <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Tap a seat above to select it</span>
          : seats.map(id => (
              <div key={id} className="sel-chip" onClick={() => onRemove(id)}>
                {id} <span style={{ fontSize: '14px' }}>×</span>
              </div>
            ))
        }
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '12px', color: 'var(--text2)',
        paddingTop: '8px', borderTop: '1px solid var(--earth)',
      }}>
        <span>{seats.length} seat{seats.length !== 1 ? 's' : ''} selected</span>
        <strong style={{ color: 'var(--ocean)' }}>UGX {total.toLocaleString()}</strong>
      </div>
    </div>
  )
}

// ============================================================
//  EXPORTED MAIN COMPONENT
// ============================================================
export default function SeatMap({
  vehicleType, bookedSeats = [], basePrice, maxSeats = MAX_SEATS_PER_BOOKING, onChange,
}: SeatMapProps) {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [total, setTotal]                 = useState(0)

  const handleChange = useCallback((seats: string[], amt: number) => {
    setSelectedSeats(seats)
    setTotal(amt)
    onChange(seats, amt)
  }, [onChange])

  function removeSeat(id: string) {
    // Re-fire toggle by removing from list
    const next = selectedSeats.filter(s => s !== id)
    const price = ['F1','F2'].includes(id) ? basePrice + 5000 : basePrice
    const newTotal = total - price
    setSelectedSeats(next)
    setTotal(newTotal)
    onChange(next, newTotal)
  }

  return (
    <div>
      {vehicleType === 'matatu' ? (
        <MatatuMap
          bookedSeats={bookedSeats}
          basePrice={basePrice}
          maxSeats={maxSeats}
          onChange={handleChange}
        />
      ) : (
        <CoachMap
          bookedSeats={bookedSeats}
          basePrice={basePrice}
          maxSeats={maxSeats}
          onChange={handleChange}
        />
      )}

      <SelectionTray
        seats={selectedSeats}
        total={total}
        maxSeats={maxSeats}
        vehicleType={vehicleType}
        onRemove={removeSeat}
      />
    </div>
  )
}
