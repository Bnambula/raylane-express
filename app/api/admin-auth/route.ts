// ============================================================
// app/api/admin-auth/route.ts
// Checks the admin password and sets a secure cookie.
// Called by the admin login page.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json()

    // Compare against your ADMIN_SECRET environment variable
    if (secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Password is correct — set a cookie that lasts 8 hours
    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_token', secret, {
      httpOnly: true,   // JavaScript cannot read this cookie (security)
      secure:   true,   // Only sent over HTTPS
      sameSite: 'lax',
      maxAge:   60 * 60 * 8,  // 8 hours in seconds
      path:     '/',
    })

    return response

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
