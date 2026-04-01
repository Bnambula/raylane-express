// ============================================================
// app/api/vehicles/route.ts
// GET   /api/vehicles  →  today's vehicles (used by homepage)
// PATCH /api/vehicles  →  admin updates vehicle status
// POST  /api/vehicles  →  admin adds a new vehicle/trip
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs, query, where, updateDoc, doc, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Homepage calls this every 30 seconds to get live occupancy
export async function GET(req: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]

    const snap = await getDocs(
      query(collection(db, 'vehicles'), where('travelDate', '==', today))
    )

    const vehicles = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    return NextResponse.json({ vehicles })

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Admin updates a vehicle's status (e.g. boarding → soon → completed)
export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('x-admin-token')
    if (token !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { vehicleId, updates } = await req.json()
    await updateDoc(doc(db, 'vehicles', vehicleId), updates)

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Admin adds a new vehicle/trip for the day
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('x-admin-token')
    if (token !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await req.json()
    const ref  = await addDoc(collection(db, 'vehicles'), {
      ...body,
      filledSeats: 0,
      status:      'available',
      createdAt:   new Date().toISOString(),
    })

    return NextResponse.json({ success: true, vehicleId: ref.id })

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
