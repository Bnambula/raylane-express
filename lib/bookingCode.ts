// ============================================================
// lib/bookingCode.ts
// Generates unique codes for bookings and parcels.
// Every booking gets a code the passenger shows at the vehicle.
// ============================================================

// Generates: RYL-2847  (booking code)
export function generateBookingCode(): string {
  const number = Math.floor(1000 + Math.random() * 9000)
  return `RYL-${number}`
}

// Generates: RLX-PCL-30-99231  (parcel code with date embedded)
// The date inside the code tells staff when it was booked
export function generateParcelCode(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const num = Math.floor(10000 + Math.random() * 90000)
  return `RLX-PCL-${day}${month}-${num}`
}

// Generates: RYL-TRIP-08001  (internal trip reference for cost tracking)
export function generateTripId(departureTime: string): string {
  const clean = departureTime.replace(':', '').replace(' ', '').replace('AM', '').replace('PM', '')
  const num = Math.floor(100 + Math.random() * 900)
  return `RYL-TRIP-${clean}${num}`
}
