// ============================================================
// lib/sms.ts
// Sends SMS messages to passengers via Africa's Talking.
// Called automatically when a booking is confirmed.
// ============================================================

// This function sends one SMS to one phone number
export async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    // Africa's Talking API endpoint
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'apiKey':       process.env.AFRICASTALKING_API_KEY || '',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept':       'application/json',
      },
      body: new URLSearchParams({
        username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
        to:       phone,
        message:  message,
        from:     'RaylaneExp',  // Your sender name (register with AT)
      }),
    })

    const data = await response.json()
    console.log('SMS sent:', data)
    return true

  } catch (error) {
    // SMS failing should NEVER stop a booking from confirming
    // Log the error but let the booking proceed
    console.error('SMS error (non-critical):', error)
    return false
  }
}

// Pre-written messages so you stay consistent
export const SMS_TEMPLATES = {

  bookingConfirmed: (code: string, seat: string, route: string, time: string) =>
    `Raylane Express: Booking CONFIRMED!\nCode: ${code}\nSeat: ${seat}\nRoute: ${route}\nDep: ${time}\nArrive 30min early. Safe journey!`,

  parcelReceived: (parcelCode: string, destination: string) =>
    `Raylane Express: Parcel ${parcelCode} received. Heading to ${destination}. We will SMS you on delivery.`,

  parcelDelivered: (parcelCode: string) =>
    `Raylane Express: Your parcel ${parcelCode} has been delivered. Thank you for using Raylane Express!`,

  departureSoon: (code: string, time: string) =>
    `Raylane Express: Reminder — your bus departs at ${time}. Booking code: ${code}. Please be at the departure point.`,

  bookingCancelled: (code: string) =>
    `Raylane Express: Booking ${code} has been cancelled. Contact us: +256700000000`,
}
