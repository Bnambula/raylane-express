// ============================================================
// app/admin-login/page.tsx
// Clear, welcoming admin login page.
// - Staff-only warning so passengers know to go back
// - Email + password (not just password)
// - Show/hide password toggle
// - Clear error messages
// - "Forgot password" guidance
// - Loading state on the button
// ============================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const canSubmit = email.trim() && password && !loading

  async function handleLogin() {
    if (!canSubmit) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin-auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), secret: password }),
      })

      if (res.ok) {
        router.push('/admin')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(
          data.error ||
          'Incorrect email or password. Please check and try again. If you have forgotten your password, contact the system administrator.'
        )
      }
    } catch {
      setError('Connection error. Please check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(150deg, #0B2545 0%, #152F5E 60%, #1A4A2E 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '2rem',
        width: '100%', maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,.3)',
      }}>

        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <svg width="48" height="48" viewBox="0 0 30 30" style={{ display: 'block', margin: '0 auto 10px' }}>
            <rect width="30" height="30" rx="6" fill="#E8A020"/>
            <polygon points="4,26 11,6 13,6 7,26"  fill="#0B2545"/>
            <polygon points="9,26 16,6 18,6 12,26"  fill="#0B2545" opacity=".5"/>
            <polygon points="14,26 21,6 23,6 17,26" fill="#0B2545" opacity=".25"/>
          </svg>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: '1.2rem', color: '#0B2545', fontWeight: 700 }}>
            Raylane Express
          </div>
          <div style={{ fontSize: '13px', color: '#5A5040', marginTop: '3px' }}>
            Staff &amp; Admin Portal
          </div>
        </div>

        {/* STAFF-ONLY NOTICE — so passengers know to go back */}
        <div style={{
          background: '#F8F6F1', border: '1px solid #EAE5D8',
          borderRadius: '10px', padding: '12px 14px',
          marginBottom: '1.4rem', fontSize: '12px', color: '#5A5040', lineHeight: 1.7,
        }}>
          <strong style={{ color: '#0B2545' }}>This area is for staff only.</strong><br />
          If you are a passenger looking to book a seat or track a parcel,
          please go back to the main website.
        </div>

        {/* EMAIL */}
        <div style={{ marginBottom: '12px' }}>
          <label className="form-label">STAFF EMAIL ADDRESS</label>
          <input
            type="email"
            placeholder="yourname@raylane.ug"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="form-input"
          />
        </div>

        {/* PASSWORD */}
        <div style={{ marginBottom: '14px' }}>
          <label className="form-label">PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="form-input"
              style={{ paddingRight: '44px' }}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              style={{
                position: 'absolute', right: '12px', top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '16px', padding: '2px',
              }}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            borderRadius: '8px', padding: '10px 12px',
            fontSize: '12px', color: '#B91C1C', marginBottom: '12px',
            lineHeight: 1.6,
          }}>
            {error}
          </div>
        )}

        {/* LOGIN BUTTON */}
        <button
          onClick={handleLogin}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '13px',
            background: canSubmit ? '#0B2545' : '#EAE5D8',
            color: canSubmit ? '#fff' : '#8A8070',
            border: 'none', borderRadius: '10px',
            fontWeight: 700, fontSize: '14px',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'background .2s',
            marginBottom: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {loading ? (
            <>
              <span style={{
                width: '14px', height: '14px',
                border: '2px solid rgba(255,255,255,.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin .8s linear infinite', display: 'inline-block',
              }} />
              Signing in…
            </>
          ) : (
            'Sign in to Dashboard →'
          )}
        </button>

        {/* BACK TO SITE */}
        <Link href="/" style={{ display: 'block' }}>
          <button style={{
            width: '100%', padding: '10px',
            background: '#F8F6F1', border: '1px solid #EAE5D8',
            borderRadius: '10px', fontWeight: 600, fontSize: '13px',
            cursor: 'pointer', color: '#5A5040', transition: 'background .15s',
          }}>
            ← Back to Website
          </button>
        </Link>

        {/* FORGOT PASSWORD */}
        <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '11px', color: '#8A8070' }}>
          Forgot your password? Contact your system administrator<br />
          or email <a href="mailto:admin@raylane.ug" style={{ color: '#0B2545' }}>admin@raylane.ug</a>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
