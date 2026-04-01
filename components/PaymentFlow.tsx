// ============================================================
// components/PaymentFlow.tsx
// Handles the full payment UI:
//   1. Customer selects MTN or Airtel
//   2. Enters their phone number (NOT a reference number)
//   3. System sends a push request via the MoMo/Airtel API
//   4. Customer confirms with their PIN on their phone
//   5. OR customer can dial the merchant code themselves
// ============================================================

'use client'

import { useState } from 'react'
import { PAYMENT_MERCHANT_CODE, MTN_MERCHANT_DIAL, AIRTEL_MERCHANT_DIAL } from '@/lib/constants'

type PayStatus = 'idle' | 'sending' | 'waiting' | 'success' | 'failed'

type PaymentFlowProps = {
  totalAmount:  number
  seats:        string[]
  route:        string
  onSuccess:    (method: string, phone: string) => void
  onBack:       () => void
}

export default function PaymentFlow({
  totalAmount, seats, route, onSuccess, onBack,
}: PaymentFlowProps) {
  const [method,    setMethod]   = useState<'mtn' | 'airtel' | ''>('')
  const [phone,     setPhone]    = useState('')
  const [status,    setStatus]   = useState<PayStatus>('idle')
  const [statusMsg, setStatusMsg] = useState('')

  const phoneValid = phone.replace(/\s/g, '').length >= 9
  const canPay     = !!method && phoneValid && status === 'idle'

  function pickMethod(m: 'mtn' | 'airtel') {
    setMethod(m)
    setPhone('')
    setStatus('idle')
    setStatusMsg('')
  }

  async function initiatePay() {
    if (!canPay) return
    setStatus('sending')
    setStatusMsg(`Sending payment request to +256 ${phone}…`)

    try {
      // Call your API route which calls MTN/Airtel push API
      const res = await fetch('/api/payments/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          phone:  '256' + phone.replace(/^0/, '').replace(/\s/g, ''),
          amount: totalAmount,
          seats,
          route,
        }),
      })

      if (!res.ok) throw new Error('API error')

      setStatus('waiting')
      setStatusMsg('Prompt sent! Check your phone and enter your PIN to confirm.')

      // Poll for confirmation (in production, use webhook callback)
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const check = await fetch('/api/payments/status', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: '256' + phone.replace(/^0/, '').replace(/\s/g, ''), amount: totalAmount }),
          })
          const data = await check.json()
          if (data.status === 'SUCCESSFUL') {
            clearInterval(poll)
            setStatus('success')
            setStatusMsg('Payment confirmed! Generating your ticket…')
            setTimeout(() => onSuccess(method, phone), 1000)
          } else if (data.status === 'FAILED' || attempts > 12) {
            clearInterval(poll)
            setStatus('failed')
            setStatusMsg('Payment was not confirmed. Please try again or use the merchant code below.')
          }
        } catch { /* keep polling */ }
      }, 5000)

    } catch {
      setStatus('failed')
      setStatusMsg('Could not send payment request. Check your internet and try again, or use the merchant code.')
    }
  }

  // Status bar style
  const statusStyle: Record<PayStatus, { bg: string; color: string; icon: string }> = {
    idle:    { bg: 'transparent', color: 'transparent', icon: '' },
    sending: { bg: '#EFF6FF', color: '#1D4ED8', icon: '⏳' },
    waiting: { bg: '#FFFBEB', color: '#B45309', icon: '📲' },
    success: { bg: '#DCFCE7', color: '#15803D', icon: '✅' },
    failed:  { bg: '#FEF2F2', color: '#B91C1C', icon: '⚠️' },
  }
  const ss = statusStyle[status]

  return (
    <div>
      {/* Method selector */}
      <div className="card-box">
        <h3>Choose how to pay</h3>
        <p style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px' }}>
          We will send a payment prompt straight to your phone. You just enter your PIN.
        </p>

        <div className="pay-options">
          {([
            { id: 'mtn',    label: 'MTN Mobile Money', color: '#D97706', note: 'Dial *165#' },
            { id: 'airtel', label: 'Airtel Money',      color: '#EF4444', note: 'Dial *185#' },
          ] as const).map(opt => (
            <div
              key={opt.id}
              className={`pay-opt${method === opt.id ? ' sel' : ''}`}
              onClick={() => pickMethod(opt.id)}
            >
              <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>📱</div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: opt.color }}>{opt.label}</div>
              <div style={{ fontSize: '10px', color: 'var(--text2)', marginTop: '2px' }}>{opt.note}</div>
            </div>
          ))}
        </div>

        {method && (
          <>
            {/* Payment instructions */}
            <div className="pay-instruction-box">
              <strong style={{ color: 'var(--ocean)' }}>
                Option A — We send a prompt to you (easiest):
              </strong><br />
              Enter your {method === 'mtn' ? 'MTN' : 'Airtel'} number below →
              tap &quot;Send Payment Request&quot; →
              a payment prompt will appear on your phone →
              enter your {method === 'mtn' ? 'MTN Mobile Money' : 'Airtel Money'} PIN<br /><br />

              <strong style={{ color: 'var(--ocean)' }}>
                Option B — Pay yourself by dialling:
              </strong><br />
              {method === 'mtn' ? (
                <>Dial <strong>{MTN_MERCHANT_DIAL}</strong> → enter UGX {totalAmount.toLocaleString()}</>
              ) : (
                <>Dial <strong>{AIRTEL_MERCHANT_DIAL}</strong> → enter UGX {totalAmount.toLocaleString()}</>
              )}
            </div>

            {/* Merchant code reminder */}
            <div className="merchant-box">
              <strong>Merchant code: </strong>
              <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700 }}>
                {PAYMENT_MERCHANT_CODE}
              </span><br />
              MTN: <strong>{MTN_MERCHANT_DIAL}</strong><br />
              Airtel: <strong>{AIRTEL_MERCHANT_DIAL}</strong>
            </div>

            {/* Phone number input */}
            <div style={{ marginBottom: '12px' }}>
              <label className="form-label">
                YOUR {method === 'mtn' ? 'MTN' : 'AIRTEL'} PHONE NUMBER
              </label>
              <div className="phone-wrap">
                <div className="phone-prefix">🇺🇬 +256</div>
                <input
                  className="phone-inner"
                  type="tel"
                  placeholder="701 234 567"
                  value={phone}
                  maxLength={12}
                  onChange={e => {
                    setPhone(e.target.value)
                    if (status !== 'idle') setStatus('idle')
                  }}
                />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                Enter the number registered with {method === 'mtn' ? 'MTN' : 'Airtel'} — we will send a PIN prompt to this number
              </div>
            </div>

            {/* Status bar */}
            {status !== 'idle' && (
              <div className="pay-status-bar" style={{ background: ss.bg, color: ss.color, marginBottom: '10px' }}>
                <span>{ss.icon}</span>
                <span>{statusMsg}</span>
                {status === 'sending' && (
                  <div className="spinner" style={{
                    width: '14px', height: '14px',
                    border: '2px solid rgba(0,0,0,.15)',
                    borderTopColor: ss.color, borderRadius: '50',
                  }} />
                )}
              </div>
            )}
          </>
        )}

        {/* Order summary */}
        <div style={{ background: 'var(--warm)', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: 'var(--ocean)', marginBottom: '7px' }}>Order Summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)', marginBottom: '3px' }}>
            <span>Route</span><span>{route}</span>
          </div>
          {seats.map(s => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text2)', marginBottom: '3px' }}>
              <span>Seat {s}</span>
              <span>UGX {(['F1','F2'].includes(s) ? totalAmount / seats.length + 5000 : totalAmount / seats.length).toLocaleString()}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--earth)', margin: '8px 0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--ocean)' }}>
            <span>TOTAL</span><span>UGX {totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn-back" onClick={onBack}>← Back</button>
        <button
          className="btn-confirm"
          disabled={!canPay}
          onClick={initiatePay}
          style={{ flex: 1 }}
        >
          {phoneValid && method
            ? `Send Payment Request to +256 ${phone} →`
            : 'Send Payment Request →'
          }
        </button>
      </div>
    </div>
  )
}
