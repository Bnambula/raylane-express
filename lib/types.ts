// ============================================================
// lib/types.ts
// This file describes the "shape" of every piece of data
// in your system. Think of it as defining what columns
// each table in your database has.
// ============================================================

// --- A single booking ---
export type Booking = {
  id: string                // e.g. "RYL-2847"
  passengerName: string     // e.g. "Aisha Nakato"
  phone: string             // e.g. "0701234567"
  nationalId?: string       // optional
  nextOfKin?: string        // emergency contact
  route: string             // e.g. "Kampala → Mbale"
  vehicleType: 'taxi' | 'bus'
  seatLabel: string         // e.g. "A3" or "F2"
  boardingPoint: string     // e.g. "Kampala Old Park"
  departureTime: string     // e.g. "08:00 AM"
  travelDate: string        // e.g. "2026-03-30"
  price: number             // e.g. 45000
  paymentMethod: 'mtn' | 'airtel'
  transactionId: string     // the MoMo / Airtel txn reference
  status: 'pending' | 'confirmed' | 'cancelled'
  luggage?: string          // luggage option selected
  createdAt: string         // ISO date string
  confirmedAt?: string      // set when admin confirms
}

// --- A revenue record (auto-created when booking confirmed) ---
export type RevenueRecord = {
  id: string
  bookingId: string
  amount: number
  route: string
  vehicleType: 'taxi' | 'bus'
  paymentMethod: 'mtn' | 'airtel'
  tripId?: string
  recordedAt: string
}

// --- A cost / expense record ---
export type CostRecord = {
  id: string
  category: 'partner_payout' | 'fuel' | 'staff' | 'sms' | 'marketing' | 'maintenance' | 'utilities' | 'other'
  description: string
  amount: number
  linkedTripId?: string
  date: string
  loggedBy: string
  createdAt: string
}

// --- A vehicle / trip ---
export type Vehicle = {
  id: string
  type: 'taxi' | 'bus'
  plateNumber: string
  route: string
  departureTime: string
  travelDate: string
  totalSeats: number
  filledSeats: number
  driverName?: string
  status: 'available' | 'boarding' | 'soon' | 'full' | 'completed'
  partnerName?: string
  partnerPhone?: string
}

// --- A parcel ---
export type Parcel = {
  id: string                // e.g. "RLX-PCL-99231"
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  pickupPoint: string
  deliveryPoint: string
  description: string
  weight?: string
  route: string
  price: number
  status: 'received' | 'in_transit' | 'arrived' | 'delivered'
  vehicleId?: string
  createdAt: string
}

// --- A hero image (admin uploads these) ---
export type HeroImage = {
  id: string
  url: string
  label: string
  assignedTo: 'homepage' | string  // route name or "homepage"
  rotation: 'all_day' | 'morning' | 'evening'
  enabled: boolean
  uploadedAt: string
}

// --- A sightseeing destination ---
export type SightSpot = {
  id: string
  name: string
  description: string
  imageUrl: string
  route: string
  showOnHomepage: boolean
  status: 'active' | 'draft'
  createdAt: string
}
