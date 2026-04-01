// ============================================================
// components/DepartureCard.tsx
// One card showing a live departure with occupancy + urgency.
// Used on the homepage in a grid of cards.
// ============================================================

'use client'

import { useRouter } from 'next/navigation'
import type { Vehicle } from '@/lib/types'

// Props = the data this component needs to display
type Props = {
  vehicle: Vehicle
}

export default function DepartureCard({ vehicle }: Props) {
  const router = useRouter()

  // Calculate how full the vehicle is (as a percentage)
  const pct = Math.round((vehicle.filledSeats / vehicle.totalSeats) * 100)
  const seatsLeft = vehicle.totalSeats - vehicle.filledSeats
  const isFull = vehicle.status === 'full' || seatsLeft === 0
  const isUrgent = pct >= 95 && !isFull

  // Decide which colour the occupancy bar should be
  const barColor = pct >= 90 ? '#EF4444' : pct >= 75 ? '#F59E0B' : '#22C55E'
  const barClass = pct >= 90 ? 'bar-critical' : ''

  // Status badge appearance
  const statusConfig = {
    boarding:  { label: '● Boarding',       bg: '#DCFCE7', color: '#15803D' },
    soon:      { label: '⚠ Departs Soon',   bg: '#FEF3C7', color: '#B45309' },
    full:      { label: '● FULL',            bg: '#FEE2E2', color: '#B91C1C' },
    available: { label: '● Available',       bg: '#E0F2FE', color: '#0369A1' },
    completed: { label: '✓ Completed',       bg: '#F1F5F9', color: '#64748B' },
  }
  const status = statusConfig[vehicle.status] || statusConfig.available

  return (
    <div className="card" style={{ background: 'white' }}>

      {/* TOP ROW: route name + status badge */}
      <div style={{
        padding: '12px 14px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        borderBottom: '1px solid var(--earth)',
        gap: '8px',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ocean)' }}>{vehicle.route}</div>
          <div style={{
            fontSize: '10px', color: 'var(--text2)',
            background: 'var(--warm)', padding: '2px 7px',
            borderRadius: '4px', display: 'inline-block', marginTop: '2px',
          }}>
            {vehicle.type === 'taxi' ? '🚐 Taxi 14-seater' : '🚌 Bus 67-seater'}
          </div>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 700,
          padding: '4px 10px', borderRadius: '20px',
          background: status.bg, color: status.color,
          whiteSpace: 'nowrap',
        }}>
          {status.label}
        </span>
      </div>

      {/* BODY */}
      <div style={{ padding: '14px' }}>

        {/* Departure time + price */}
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ocean)', marginBottom: '10px' }}>
          {vehicle.departureTime}
          <span style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 400, marginLeft: '6px' }}>
            {vehicle.type === 'taxi' ? 'UGX 45,000' : 'UGX 35,000'}
          </span>
        </div>

        {/* Occupancy bar */}
        <div style={{ height: '5px', background: 'var(--earth)', borderRadius: '3px', overflow: 'hidden', marginBottom: '7px' }}>
          <div
            className={barClass}
            style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '3px', transition: 'width 0.5s' }}
          />
        </div>

        {/* Seat count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text2)', marginBottom: '12px' }}>
          <span>{vehicle.filledSeats}/{vehicle.totalSeats} filled</span>
          {!isFull && <strong style={{ color: 'var(--danger)' }}>{seatsLeft} left</strong>}
        </div>

        {/* Call to action button */}
        <button
          onClick={() => !isFull && router.push('/booking')}
          className={isUrgent ? 'pulse-urgent' : ''}
          style={{
            width: '100%', padding: '11px',
            background: isFull ? 'var(--earth)' : isUrgent ? 'var(--danger)' : 'var(--gold)',
            color: isFull ? 'var(--muted)' : isUrgent ? 'white' : 'var(--ocean)',
            border: 'none', borderRadius: '8px',
            fontWeight: 700, fontSize: '13px',
            cursor: isFull ? 'not-allowed' : 'pointer',
            transition: '0.2s',
          }}
        >
          {isFull ? 'SOLD OUT' : isUrgent ? '🔴 BOOK LAST SEATS' : 'Book Seat'}
        </button>

        {/* Urgency text for "soon" status */}
        {vehicle.status === 'soon' && !isFull && (
          <div style={{ fontSize: '11px', color: 'var(--warn)', textAlign: 'center', marginTop: '6px' }}>
            Leaving soon — secure your seat now
          </div>
        )}
      </div>
    </div>
  )
}
