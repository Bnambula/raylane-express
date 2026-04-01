// ============================================================
// lib/constants.ts
// Single source of truth for routes, pricing, and seat data.
// Change a price here and it updates everywhere automatically.
// ============================================================

export const ROUTES = [
  {
    id:         'kla-mbl',
    from:       'Kampala',
    to:         'Mbale',
    duration:   '4.5 hrs',
    distance:   '245 km',
    taxiPrice:  45000,
    busPrice:   35000,
    active:     true,
    departures: ['06:00 AM', '08:00 AM', '10:00 AM', '02:00 PM', '05:00 PM'],
  },
  {
    id:         'mbl-kla',
    from:       'Mbale',
    to:         'Kampala',
    duration:   '4.5 hrs',
    distance:   '245 km',
    taxiPrice:  45000,
    busPrice:   35000,
    active:     true,
    departures: ['06:00 AM', '08:00 AM', '10:00 AM', '02:00 PM', '05:00 PM'],
  },
  {
    id:         'kla-mba',
    from:       'Kampala',
    to:         'Mbarara',
    duration:   '3.5 hrs',
    distance:   '270 km',
    taxiPrice:  40000,
    busPrice:   30000,
    active:     true,
    departures: ['07:00 AM', '09:00 AM', '01:00 PM', '04:00 PM'],
  },
  {
    id:         'mba-kla',
    from:       'Mbarara',
    to:         'Kampala',
    duration:   '3.5 hrs',
    distance:   '270 km',
    taxiPrice:  40000,
    busPrice:   30000,
    active:     true,
    departures: ['06:00 AM', '08:00 AM', '12:00 PM', '03:00 PM'],
  },
  {
    id:         'kla-jin',
    from:       'Kampala',
    to:         'Jinja',
    duration:   '1.5 hrs',
    distance:   '80 km',
    taxiPrice:  20000,
    busPrice:   15000,
    active:     true,
    departures: ['07:00 AM', '09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM'],
  },
  {
    id:         'jin-kla',
    from:       'Jinja',
    to:         'Kampala',
    duration:   '1.5 hrs',
    distance:   '80 km',
    taxiPrice:  20000,
    busPrice:   15000,
    active:     true,
    departures: ['07:30 AM', '09:30 AM', '11:30 AM', '01:30 PM', '03:30 PM'],
  },
]

// Boarding points for each origin city
export const BOARDING_POINTS: Record<string, string[]> = {
  Kampala: [
    'Kampala — Old Park (Main Stage)',
    'Kampala — Nakawa',
    'Kampala — Kireka',
    'Kampala — Mukono (en route)',
  ],
  Mbale: [
    'Mbale — Main Bus Park',
    'Mbale — Namatala',
  ],
  Mbarara: [
    'Mbarara — Main Bus Park',
    'Mbarara — Ntungamo Road',
    'Mbarara — Kabale Road Junction',
  ],
  Jinja: [
    'Jinja — Main Stage',
    'Jinja — Clock Tower',
  ],
}

// Matatu: seats already booked (in production this comes from Firebase)
// Layout: Row F = F1,F2 beside driver | Rows A-D = col1(foldable), col2, col3, col4
export const MATATU_BOOKED_DEMO = ['B1', 'C2', 'D3', 'A3']

// Coach: seats already booked
// Layout: F1 beside driver | Rows 1-12: A,B | aisle | C,D,E | Back row: L1-L6
export const COACH_BOOKED_DEMO = [
  '1B','2A','3C','4D','5E','6B','7A','8C','9D','10E','11B','12A'
]

// Max seats per booking (flight-style multi-seat selection)
export const MAX_SEATS_PER_BOOKING = 5

// Seat position descriptions
export const MATATU_SEAT_POSITIONS: Record<string, string> = {
  F1: 'Right of driver (premium)',
  F2: 'Right of driver (premium)',
  A1: 'Left aisle — foldable seat',
  B1: 'Left aisle — foldable seat',
  C1: 'Left aisle — foldable seat',
  D1: 'Left aisle — foldable seat',
  A2: 'Left window', A3: 'Middle', A4: 'Right window',
  B2: 'Left window', B3: 'Middle', B4: 'Right window',
  C2: 'Left window', C3: 'Middle', C4: 'Right window',
  D2: 'Left window', D3: 'Middle', D4: 'Right window',
}

export const COACH_COL_POSITIONS: Record<string, string> = {
  A: 'Left window', B: 'Left aisle',
  C: 'Middle',      D: 'Right aisle', E: 'Right window',
}

// Payment
export const PAYMENT_MERCHANT_CODE = 'RAYLANE'
export const MTN_MERCHANT_DIAL     = '*165*3*RAYLANE#'
export const AIRTEL_MERCHANT_DIAL  = '*185*RAYLANE#'

// Sightseeing spots
export const SIGHT_SPOTS = [
  { name: 'Mabira Forest Drive',   route: 'KLA–MBL', color: '#1A4A2E', desc: 'Equatorial rainforest stretching along the highway — spot rare birds from your window.' },
  { name: 'Sezibwa Falls',          route: 'KLA–MBL', color: '#0B2545', desc: 'A spiritual waterfall with a nature walk. A peaceful stop along the route.' },
  { name: 'Jinja Nile Bridge',      route: 'KLA–MBL', color: '#2656A0', desc: "Cross where the world's longest river begins its journey to the sea." },
  { name: 'Mount Elgon Views',      route: 'Near Mbale', color: '#4A2060', desc: "Africa's oldest volcano fills your window as you approach Mbale." },
  { name: 'Equator Crossing',       route: 'KLA–MBR', color: '#854F0B', desc: 'Cross the exact centre of the earth — photo opportunity with the famous sign.' },
  { name: 'Lake Mburo National Park', route: 'KLA–MBR', color: '#0F6E56', desc: 'Zebras and hippos visible from the roadside near Mbarara route.' },
  { name: 'Ankole Cattle Country',  route: 'Near Mbarara', color: '#3B6D11', desc: 'The famous long-horned Ankole cattle grace the rolling green hills.' },
  { name: 'Masaka Hills',           route: 'KLA–MBR', color: '#1A3A6B', desc: 'Lush green hills of Masaka district midway on the Mbarara route.' },
]
