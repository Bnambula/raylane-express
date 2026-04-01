// ============================================================
// app/api/payments/initiate/route.ts
// Sends a push payment request to the customer's phone.
// Customer receives a prompt and enters their PIN to pay.
// Works with MTN MoMo API and Airtel Money API.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

// ---- MTN MOMO PUSH ----
async function sendMTNRequest(phone: string, amount: number, referenceId: string) {
  // Step 1: Get OAuth token from MTN
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

  // Step 2: Send the payment request to customer's phone
  const payRes = await fetch(
    `${process.env.MTN_BASE_URL}/collection/v1_0/requesttopay`,
    {
      method:  'POST',
      headers: {
        'Authorization':             `Bearer ${access_token}`,
        'X-Reference-Id':            referenceId,
        'X-Target-Environment':      process.env.MTN_MOMO_ENVIRONMENT || 'sandbox',
        'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY || '',
        'Content-Type':              'application/json',
      },
      body: JSON.stringify({
        amount:     String(amount),
        currency:   'UGX',
        externalId: referenceId,
        payer: {
          partyIdType: 'MSISDN',
          partyId:     phone,      // e.g. "256701234567"
        },
        payerMessage: 'Raylane Express seat booking',
        payeeNote:    'Raylane Express',
      }),
    }
  )

  // 202 = request accepted and sent to customer's phone
  if (payRes.status !== 202) {
    const err = await payRes.text()
    throw new Error('MTN push failed: ' + err)
  }

  return { referenceId, status: 'PENDING' }
}

// ---- AIRTEL MONEY PUSH ----
async function sendAirtelRequest(phone: string, amount: number, referenceId: string) {
  // Step 1: Get OAuth token
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

  // Step 2: Send push request
  const payRes = await fetch(
    `${process.env.AIRTEL_BASE_URL}/merchant/v1/payments/`,
    {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type':  'application/json',
        'X-Country':     'UG',
        'X-Currency':    'UGX',
      },
      body: JSON.stringify({
        reference: referenceId,
        subscriber: {
          country: 'UG',
          currency: 'UGX',
          msisdn:   phone,        // e.g. "256750123456"
        },
        transaction: {
          amount:   amount,
          country:  'UG',
          currency: 'UGX',
          id:       referenceId,
        },
      }),
    }
  )

  const data = await payRes.json()
  if (data.status?.code !== '200') throw new Error('Airtel push failed')
  return { referenceId, status: 'PENDING' }
}

// ---- API ROUTE HANDLER ----
export async function POST(req: NextRequest) {
  try {
    const { method, phone, amount, seats, route } = await req.json()

    if (!method || !phone || !amount) {
      return NextResponse.json({ error: 'method, phone and amount are required' }, { status: 400 })
    }

    // Generate a unique reference ID for this transaction
    const referenceId = crypto.randomUUID()

    let result
    if (method === 'mtn') {
      result = await sendMTNRequest(phone, amount, referenceId)
    } else if (method === 'airtel') {
      result = await sendAirtelRequest(phone, amount, referenceId)
    } else {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }

    // Store the pending transaction in Firebase so we can check status later
    const { db } = await import('@/lib/firebase')
    const { addDoc, collection } = await import('firebase/firestore')
    await addDoc(collection(db, 'pending_payments'), {
      referenceId,
      method,
      phone,
      amount,
      seats,
      route,
      status:    'PENDING',
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, referenceId })

  } catch (error) {
    console.error('Payment initiation error:', error)
    return NextResponse.json(
      { error: 'Payment request failed. Please try again or use the merchant code.' },
      { status: 500 }
    )
  }
}
