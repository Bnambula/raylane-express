// ============================================================
// app/api/payments/status/route.ts
// Checks whether a pending payment has been confirmed.
// Called every 5 seconds from the frontend after the push
// is sent. Returns SUCCESSFUL, PENDING, or FAILED.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

async function checkMTNStatus(referenceId: string): Promise<string> {
  const tokenRes = await fetch(
    `${process.env.MTN_BASE_URL}/collection/token/`,
    {
      method:  'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(
          process.env.MTN_MOMO_USER_ID + ':' + process.env.MTN_MOMO_API_KEY
        ).toString('base64'),
        'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY || '',
      },
    }
  )
  const { access_token } = await tokenRes.json()

  const statusRes = await fetch(
    `${process.env.MTN_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        'Authorization':             `Bearer ${access_token}`,
        'X-Target-Environment':      process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
        'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY || '',
      },
    }
  )
  const data = await statusRes.json()
  // MTN returns: SUCCESSFUL, PENDING, or FAILED
  return data.status || 'PENDING'
}

async function checkAirtelStatus(referenceId: string): Promise<string> {
  const tokenRes = await fetch(
    `${process.env.AIRTEL_BASE_URL}/auth/oauth2/token`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     process.env.AIRTEL_CLIENT_ID,
        client_secret: process.env.AIRTEL_CLIENT_SECRET,
        grant_type:    'client_credentials',
      }),
    }
  )
  const { access_token } = await tokenRes.json()

  const statusRes = await fetch(
    `${process.env.AIRTEL_BASE_URL}/standard/v1/payments/${referenceId}`,
    {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-Country':     'UG',
        'X-Currency':    'UGX',
      },
    }
  )
  const data = await statusRes.json()
  // Airtel returns TS (SUCCESSFUL), TF (FAILED), or TP (PENDING)
  const map: Record<string, string> = { TS: 'SUCCESSFUL', TF: 'FAILED', TP: 'PENDING' }
  return map[data.data?.transaction?.status] || 'PENDING'
}

export async function POST(req: NextRequest) {
  try {
    const { referenceId, method } = await req.json()
    if (!referenceId || !method) {
      return NextResponse.json({ status: 'PENDING' })
    }

    let status: string
    if (method === 'mtn') {
      status = await checkMTNStatus(referenceId)
    } else {
      status = await checkAirtelStatus(referenceId)
    }

    // If successful, update the pending_payment doc in Firebase
    if (status === 'SUCCESSFUL') {
      const { db } = await import('@/lib/firebase')
      const { collection, query, where, getDocs, updateDoc } = await import('firebase/firestore')
      const snap = await getDocs(
        query(collection(db, 'pending_payments'), where('referenceId', '==', referenceId))
      )
      snap.docs.forEach(d => updateDoc(d.ref, { status: 'SUCCESSFUL', confirmedAt: new Date().toISOString() }))
    }

    return NextResponse.json({ status })

  } catch (error) {
    console.error('Payment status check error:', error)
    return NextResponse.json({ status: 'PENDING' })
  }
}
