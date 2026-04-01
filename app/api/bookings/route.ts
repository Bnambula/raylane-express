// ============================================================
// app/api/bookings/route.ts
// API ROUTES for bookings.
// POST  /api/bookings        → create a new booking
// PATCH /api/bookings        → admin confirms a booking (triggers revenue)
// GET   /api/bookings        → list all bookings (admin only)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { generateBookingCode } from '@/lib/bookingCode'
import { sendSMS, SMS_TEMPLATES } from '@/lib/sms'

// ---- CREATE A BOOKING (called from the booking page) ----
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate required fields
    if (!body.passengerName || !body.phone || !body.seatLabel || !body.transactionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const code = generateBookingCode()

    // Save to Firebase
    const ref = await addDoc(collection(db, 'bookings'), {
      ...body,
      bookingCode: code,
      status:      'pending',       // always starts as pending
      createdAt:   new Date().toISOString(),
    })

    return NextResponse.json({ success: true, bookingId: ref.id, bookingCode: code })

  } catch (error) {
    console.error('POST /api/bookings error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ---- CONFIRM A BOOKING (admin action — this is where revenue is recorded) ----
export async function PATCH(req: NextRequest) {
  try {
    // Check admin token
    const token = req.headers.get('x-admin-token')
    if (token !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { bookingId, bookingData } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    const now = new Date().toISOString()

    // 1. Update booking status to "confirmed"
    await updateDoc(doc(db, 'bookings', bookingId), {
      status:      'confirmed',
      confirmedAt: now,
    })

    // 2. AUTO-RECORD REVENUE — this is the key step
    //    Revenue only exists once a booking is confirmed by admin
    await addDoc(collection(db, 'revenue'), {
      bookingId,
      amount:        bookingData.price,
      route:         bookingData.route,
      vehicleType:   bookingData.vehicleType,
      paymentMethod: bookingData.paymentMethod,
      tripId:        bookingData.tripId || '',
      recordedAt:    now,
    })

    // 3. Send SMS to passenger
    if (bookingData.phone) {
      await sendSMS(
        bookingData.phone,
        SMS_TEMPLATES.bookingConfirmed(
          bookingData.bookingCode || bookingId,
          bookingData.seatLabel,
          bookingData.route,
          bookingData.departureTime,
        )
      )
    }

    return NextResponse.json({ success: true, message: 'Booking confirmed and revenue recorded.' })

  } catch (error) {
    console.error('PATCH /api/bookings error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ---- LIST ALL BOOKINGS (admin) ----
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('x-admin-token')
    if (token !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const snap = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')))
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    return NextResponse.json({ bookings })

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
