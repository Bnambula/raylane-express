// ================================================================
// RAYLANE EXPRESS — SUPABASE EDGE FUNCTIONS
// Deploy: supabase functions deploy <function-name>
// Docs:   https://supabase.com/docs/guides/functions
// ================================================================

// ================================================================
// FUNCTION 1: momo-webhook
// Handles MTN MoMo + Airtel Money payment callbacks
// POST /functions/v1/momo-webhook
// ================================================================
// supabase/functions/momo-webhook/index.ts

export const momoWebhookHandler = `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.text();
  const signature = req.headers.get("x-callback-signature") || req.headers.get("x-momo-signature");
  const provider = req.headers.get("x-provider") || "MTN";

  // ── Verify webhook signature ────────────────────────────────
  const secret = Deno.env.get(provider === "AIRTEL" ? "AIRTEL_WEBHOOK_SECRET" : "MTN_WEBHOOK_SECRET")!;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const sigBytes = hexToBytes(signature || "");
  const bodyBytes = new TextEncoder().encode(body);
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, bodyBytes);

  if (!valid) {
    console.error("Invalid webhook signature from", provider);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
  }

  const payload = JSON.parse(body);
  const { referenceId, status, amount, currency, payerMsisdn, externalId } = payload;

  // externalId = our booking_id
  const { data: payment } = await supabase
    .from("payments")
    .select("id, booking_id, amount_ugx")
    .eq("provider_reference", referenceId)
    .maybeSingle();

  if (!payment) {
    // First time seeing this reference — find by booking_id / external_id
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, total_amount_ugx, commitment_paid_ugx, is_advance, seat_numbers, trip_id, passenger_phone")
      .eq("id", externalId)
      .single();

    if (!booking) return new Response("Booking not found", { status: 404 });

    if (status === "SUCCESSFUL") {
      // Insert verified payment
      await supabase.from("payments").insert({
        booking_id: booking.id,
        amount_ugx: amount,
        method: provider === "AIRTEL" ? "AIRTEL_MONEY" : "MTN_MOMO",
        phone_number: payerMsisdn,
        provider_reference: referenceId,
        status: "paid",
        webhook_verified: true,
        webhook_signature: signature
      });

      // Update booking
      const newStatus = booking.is_advance && amount < booking.total_amount_ugx ? "partial" : "paid";
      const balanceDue = booking.total_amount_ugx - amount;

      await supabase.from("bookings").update({
        payment_status: newStatus,
        booking_status: "confirmed",
        commitment_paid_ugx: amount,
        balance_due_ugx: Math.max(0, balanceDue),
        qr_token: generateQRToken(booking.id)
      }).eq("id", booking.id);

      // Mark seats as booked
      await supabase.from("seats").update({
        status: "booked",
        booking_id: booking.id,
        locked_until: null,
        locked_by_session: null
      }).eq("trip_id", booking.trip_id).in("seat_number", booking.seat_numbers);

      // Trigger SMS confirmation
      await fetch(\`\${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms\`, {
        method: "POST",
        headers: { "Authorization": \`Bearer \${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}\` },
        body: JSON.stringify({
          phone: booking.passenger_phone,
          message: \`✓ Raylane booking confirmed! Seat(s) \${booking.seat_numbers.join(",")}. Ref: \${externalId.slice(0,8).toUpperCase()}. E-ticket sent.\`
        })
      });

    } else if (status === "FAILED") {
      // Release seat locks
      await supabase.from("seats").update({
        status: "available",
        locked_until: null,
        locked_by_session: null,
        booking_id: null
      }).eq("trip_id", booking.trip_id).in("seat_number", booking.seat_numbers);

      // SMS retry link
      await fetch(\`\${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms\`, {
        method: "POST",
        headers: { "Authorization": \`Bearer \${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}\` },
        body: JSON.stringify({
          phone: booking.passenger_phone,
          message: \`Payment failed for Raylane booking \${externalId.slice(0,8).toUpperCase()}. Seat released. Retry: https://raylane.com/book\`
        })
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

function generateQRToken(bookingId) {
  // In production: sign a JWT with your JWT_SECRET
  return btoa(JSON.stringify({ booking_id: bookingId, issued: Date.now(), type: "RAYLANE_TICKET" }));
}
`;

// ================================================================
// FUNCTION 2: send-sms
// Africa's Talking SMS dispatch
// POST /functions/v1/send-sms
// ================================================================
export const sendSmsHandler = `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { phone, message } = await req.json();

  const AT_API_KEY  = Deno.env.get("AT_API_KEY")!;
  const AT_USERNAME = Deno.env.get("AT_USERNAME")!;
  const AT_SENDER   = Deno.env.get("AT_SENDER_ID") || "RaylaneXP";

  const body = new URLSearchParams({
    username: AT_USERNAME,
    to: phone,
    message: message,
    from: AT_SENDER
  });

  const resp = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "apiKey": AT_API_KEY,
      "Accept": "application/json"
    },
    body: body.toString()
  });

  const result = await resp.json();
  console.log("SMS sent:", phone, result?.SMSMessageData?.Message);
  return new Response(JSON.stringify({ success: true, result }), { status: 200 });
});
`;

// ================================================================
// FUNCTION 3: initiate-payment
// Creates MoMo payment request → sends USSD push to phone
// POST /functions/v1/initiate-payment
// Body: { booking_id, method, phone, amount_ugx }
// ================================================================
export const initiatePaymentHandler = `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const { booking_id, method, phone, amount_ugx } = await req.json();

  // Validate booking exists and is in pending state
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, payment_status, total_amount_ugx, is_advance, commitment_paid_ugx")
    .eq("id", booking_id)
    .single();

  if (!booking) return new Response("Booking not found", { status: 404 });
  if (booking.payment_status === "paid") return new Response("Already paid", { status: 409 });

  const actualAmount = booking.is_advance ? booking.commitment_paid_ugx || Math.floor(booking.total_amount_ugx * 0.2) : amount_ugx;

  let providerRef = null;

  if (method === "MTN_MOMO") {
    // MTN MoMo Collection API
    const MTN_BASE  = Deno.env.get("MTN_MOMO_BASE_URL")!;
    const MTN_KEY   = Deno.env.get("MTN_MOMO_SUBSCRIPTION_KEY")!;
    const MTN_TOKEN = Deno.env.get("MTN_MOMO_API_KEY")!;

    const requestBody = {
      amount: String(actualAmount),
      currency: "UGX",
      externalId: booking_id,
      payer: { partyIdType: "MSISDN", partyId: phone.replace("+", "") },
      payerMessage: "Raylane Express bus booking",
      payeeNote: \`Booking \${booking_id.slice(0,8).toUpperCase()}\`
    };

    const resp = await fetch(\`\${MTN_BASE}/collection/v1_0/requesttopay\`, {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${MTN_TOKEN}\`,
        "X-Reference-Id": crypto.randomUUID(),
        "X-Target-Environment": Deno.env.get("MTN_MOMO_LIVE") === "true" ? "mtncongo" : "sandbox",
        "Ocp-Apim-Subscription-Key": MTN_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    providerRef = resp.headers.get("x-reference-id");

  } else if (method === "AIRTEL_MONEY") {
    // Airtel Money Collection API
    const AIRTEL_BASE   = Deno.env.get("AIRTEL_BASE_URL")!;
    const AIRTEL_TOKEN  = Deno.env.get("AIRTEL_ACCESS_TOKEN")!;

    const resp = await fetch(\`\${AIRTEL_BASE}/merchant/v2/payments/\`, {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${AIRTEL_TOKEN}\`,
        "Content-Type": "application/json",
        "X-Country": "UG",
        "X-Currency": "UGX"
      },
      body: JSON.stringify({
        reference: booking_id.slice(0,8).toUpperCase(),
        subscriber: { country: "UG", currency: "UGX", msisdn: phone.replace("+256","") },
        transaction: { amount: actualAmount, country: "UG", currency: "UGX", id: booking_id }
      })
    });
    const data = await resp.json();
    providerRef = data.data?.transaction?.id;
  }

  // Record pending payment
  await supabase.from("payments").insert({
    booking_id,
    amount_ugx: actualAmount,
    method,
    phone_number: phone,
    provider_reference: providerRef,
    status: "pending"
  });

  return new Response(JSON.stringify({ payment_initiated: true, provider_reference: providerRef }), { status: 200 });
});
`;

// ================================================================
// FUNCTION 4: verify-payment
// Poll endpoint for booking flow polling
// GET /functions/v1/verify-payment?booking_id=xxx
// ================================================================
export const verifyPaymentHandler = `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const url = new URL(req.url);
  const booking_id = url.searchParams.get("booking_id");

  if (!booking_id) return new Response("Missing booking_id", { status: 400 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, reference, payment_status, booking_status, qr_token, seat_numbers")
    .eq("id", booking_id)
    .single();

  if (!booking) return new Response("Not found", { status: 404 });

  return new Response(JSON.stringify({
    payment_status: booking.payment_status,
    booking_status: booking.booking_status,
    booking_reference: booking.reference,
    qr_token: booking.qr_token,
    seat_numbers: booking.seat_numbers,
    confirmed: booking.payment_status === "paid" || booking.payment_status === "partial"
  }), { status: 200 });
});
`;

// ================================================================
// FUNCTION 5: approve-operator
// Admin approves an operator application
// POST /functions/v1/approve-operator
// Body: { application_id, modules_enabled }
// ================================================================
export const approveOperatorHandler = `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  // Verify caller is admin
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  const { data: adminUser } = await supabase.from("admin_users").select("role").eq("id", user?.id).single();
  if (!adminUser) return new Response("Unauthorized", { status: 403 });

  const { application_id, modules_enabled } = await req.json();

  // Fetch application
  const { data: app } = await supabase
    .from("operator_applications")
    .select("*")
    .eq("id", application_id)
    .single();

  if (!app) return new Response("Application not found", { status: 404 });

  // Create operator record
  const { data: operator } = await supabase.from("operators").insert({
    name: app.business_name,
    email: app.email,
    phone: app.phone,
    registration_number: app.registration_number,
    operator_type: "THIRD_PARTY",
    is_raylane_fleet: false,
    status: "active",
    commission_rate: 0.10,
    modules_enabled: modules_enabled || ["trips","bookings","seats","parcels"],
    contact_person: app.contact_person,
    approved_by: user!.id,
    approved_at: new Date().toISOString()
  }).select().single();

  // Create Supabase auth user for operator
  const tempPassword = Math.random().toString(36).slice(2, 10) + "R!";
  const { data: authUser } = await supabase.auth.admin.createUser({
    email: app.email,
    password: tempPassword,
    email_confirm: true
  });

  // Link auth user to operator
  await supabase.from("operator_users").insert({
    id: authUser.user!.id,
    operator_id: operator!.id,
    name: app.contact_person,
    email: app.email,
    role: "admin"
  });

  // Update application
  await supabase.from("operator_applications").update({
    status: "approved",
    reviewed_by: user!.id,
    reviewed_at: new Date().toISOString(),
    converted_to_operator_id: operator!.id
  }).eq("id", application_id);

  // Send welcome SMS
  await fetch(\`\${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms\`, {
    method: "POST",
    headers: { "Authorization": \`Bearer \${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}\` },
    body: JSON.stringify({
      phone: app.phone,
      message: \`Welcome to Raylane Express! Your operator account is active. Login: https://raylane.com/operator · Email: \${app.email} · Password: \${tempPassword} (change on first login)\`
    })
  });

  // Log to audit
  await supabase.from("audit_log").insert({
    user_id: user!.id,
    user_type: "admin",
    action: "approve_operator",
    entity_type: "operator_applications",
    entity_id: application_id,
    after_state: { operator_id: operator!.id, status: "approved" }
  });

  return new Response(JSON.stringify({ success: true, operator_id: operator!.id }), { status: 200 });
});
`;

// ================================================================
// DEPLOY COMMANDS
// ================================================================
/*

# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Set environment variables
supabase secrets set MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
supabase secrets set MTN_MOMO_SUBSCRIPTION_KEY=your-key
supabase secrets set MTN_MOMO_API_KEY=your-api-key
supabase secrets set MTN_WEBHOOK_SECRET=your-webhook-secret
supabase secrets set AIRTEL_BASE_URL=https://openapi.airtel.africa
supabase secrets set AIRTEL_ACCESS_TOKEN=your-token
supabase secrets set AIRTEL_WEBHOOK_SECRET=your-airtel-secret
supabase secrets set AT_API_KEY=your-africas-talking-key
supabase secrets set AT_USERNAME=your-username
supabase secrets set AT_SENDER_ID=RaylaneXP

# Deploy functions
supabase functions deploy momo-webhook
supabase functions deploy send-sms
supabase functions deploy initiate-payment
supabase functions deploy verify-payment
supabase functions deploy approve-operator

# Run SQL setup
supabase db push  # if using migrations
# OR paste setup.sql into Supabase SQL Editor

*/

// ================================================================
// REALTIME SUBSCRIPTIONS (client-side JavaScript)
// ================================================================
/*

// Subscribe to seat availability for a trip
const seatChannel = supabase
  .channel('seats:trip:' + tripId)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'seats',
    filter: 'trip_id=eq.' + tripId
  }, (payload) => {
    // Update seat map in real time
    updateSeatDisplay(payload.new.seat_number, payload.new.status);
  })
  .subscribe();

// Subscribe to admin alerts
const alertChannel = supabase
  .channel('alerts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'alerts'
  }, (payload) => {
    showAlertNotification(payload.new);
    refreshAlertBadge();
  })
  .subscribe();

// Subscribe to operator bookings
const bookingChannel = supabase
  .channel('bookings:operator:' + operatorId)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'bookings',
    filter: 'trip_id=in.(' + myTripIds.join(',') + ')'
  }, (payload) => {
    showNewBookingToast(payload.new);
    updateDashboardKPIs();
  })
  .subscribe();

*/
