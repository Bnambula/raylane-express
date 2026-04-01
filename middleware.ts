// ============================================================
// middleware.ts  (lives in the ROOT of your project)
// Protects /admin from being accessed by anyone who is not logged in.
// Anyone visiting /admin without the correct cookie is redirected to /admin-login.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {

  // Is the user trying to access the admin area?
  if (req.nextUrl.pathname.startsWith('/admin')) {

    // Check for the admin token cookie
    const token = req.cookies.get('admin_token')?.value

    // If no token or wrong token → send to login page
    if (!token || token !== process.env.ADMIN_SECRET) {
      const loginUrl = new URL('/admin-login', req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Everyone else passes through normally
  return NextResponse.next()
}

// Tell Next.js which paths this middleware should run on
export const config = {
  matcher: ['/admin/:path*'],
}
