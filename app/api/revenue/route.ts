// ============================================================
// app/api/revenue/route.ts
// GET /api/revenue  →  returns revenue summary for admin dashboard
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('x-admin-token')
    if (token !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Get today's date range
    const today     = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr  = today.toISOString()

    // Fetch all revenue records
    const revSnap = await getDocs(query(collection(db, 'revenue'), orderBy('recordedAt', 'desc')))
    const allRevenue = revSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))

    // Fetch all costs
    const costSnap = await getDocs(query(collection(db, 'costs'), orderBy('date', 'desc')))
    const allCosts = costSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))

    // Calculate totals
    const gross   = allRevenue.reduce((s: number, r: any) => s + (r.amount || 0), 0)
    const costs   = allCosts.reduce((s: number,   c: any) => s + (c.amount || 0), 0)
    const net     = gross - costs
    const margin  = gross > 0 ? Math.round((net / gross) * 100) : 0

    return NextResponse.json({
      gross,
      costs,
      net,
      margin,
      revenueRecords: allRevenue.slice(0, 50),
      costRecords:    allCosts.slice(0, 50),
    })

  } catch (error) {
    console.error('GET /api/revenue error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
