// ============================================================
// app/layout.tsx
// This is the "frame" that wraps every single page.
// The nav bar and footer live here so they appear everywhere.
// ============================================================

import type { Metadata } from 'next'
import './globals.css'

// Metadata = the tab title and description Google sees
export const metadata: Metadata = {
  title: 'Raylane Express — Kampala · Eastern Uganda',
  description: 'Book intercity seats and send parcels between Kampala and Eastern Uganda. MTN MoMo and Airtel Money accepted.',
  keywords: 'Kampala Mbale bus, Uganda transport, book seat, parcel delivery Uganda',
  openGraph: {
    title: 'Raylane Express',
    description: 'Smart intercity transport. Kampala to Mbale.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts — DM Sans for body text */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* children = the content of whatever page is being viewed */}
        {children}
      </body>
    </html>
  )
}
