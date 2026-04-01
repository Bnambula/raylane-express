// ============================================================
// app/admin-login/page.tsx
// Simple password-protected login for the admin dashboard.
// Sets a cookie that the middleware checks on every /admin visit.
// ============================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router   = useRouter()
  const [secret, setSecret]   = useState('')
  const [error,  setError]    = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin-auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ secret }),
      })

      if (res.ok) {
        // Cookie is set by the API route — now redirect to admin
        router.push('/admin')
      } else {
        setError('Incorrect password. Try again.')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--ocean)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'white', borderRadius:'16px', padding:'2rem', width:'100%', maxWidth:'360px' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <svg width="40" height="40" viewBox="0 0 30 30" style={{ margin:'0 auto 10px' }}>
            <rect width="30" height="30" rx="6" fill="#E8A020"/>
            <polygon points="4,26 11,6 13,6 7,26" fill="#0B2545"/>
            <polygon points="9,26 16,6 18,6 12,26" fill="#0B2545" opacity="0.5"/>
            <polygon points="14,26 21,6 23,6 17,26" fill="#0B2545" opacity="0.25"/>
          </svg>
          <div style={{ fontFamily:'Georgia,serif', fontSize:'1.2rem', color:'var(--ocean)', fontWeight:700 }}>Raylane Express</div>
          <div style={{ fontSize:'12px', color:'var(--text2)', marginTop:'2px' }}>Admin Portal</div>
        </div>

        <div style={{ marginBottom:'12px' }}>
          <label className="form-label">ADMIN PASSWORD</label>
          <input
            className="form-input"
            type="password"
            placeholder="Enter your admin password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        {error && (
          <div style={{ background:'#FEE2E2', color:'#B91C1C', padding:'10px 12px', borderRadius:'8px', fontSize:'12px', marginBottom:'12px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={!secret || loading}
          className="btn-ocean"
          style={{ width:'100%', justifyContent:'center', opacity: (!secret||loading) ? 0.6 : 1 }}>
          {loading ? 'Checking…' : 'Login to Dashboard →'}
        </button>

        <div style={{ textAlign:'center', marginTop:'1rem' }}>
          <a href="/" style={{ fontSize:'12px', color:'var(--text2)', textDecoration:'none' }}>← Back to website</a>
        </div>
      </div>
    </div>
  )
}
