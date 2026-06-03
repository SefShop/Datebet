'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props { onAuth: () => void }

export default function AuthScreen({ onAuth }: Props) {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)
  const [mode, setMode]       = useState<'signin'|'signup'>('signin')

  async function handleSubmit() {
    if (!email || !password) { setError('Fill in both fields'); return }
    setLoading(true); setError(null)
    try {
      const { error: err } = mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      onAuth()
    } catch (e: any) { setError(e.message); setLoading(false) }
  }

  return (
    <div className="flex flex-col h-full items-center justify-center px-8"
      style={{ background:'linear-gradient(170deg, #06060a 0%, #0d0614 100%)' }}>

      <div className="text-[48px] mb-6">🔐</div>
      <h1 className="text-[24px] font-extrabold text-white mb-1 tracking-tight"
        style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
        DateDuel
      </h1>
      <p className="text-[14px] mb-8" style={{ color:'rgba(255,255,255,0.4)' }}>
        {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
      </p>

      <div className="w-full max-w-[320px] flex flex-col gap-3">
        <input value={email} onChange={e => setEmail(e.target.value)}
          type="email" placeholder="Email" autoComplete="email"
          className="w-full rounded-xl px-4 py-3.5 text-[14px] outline-none"
          style={{ background:'rgba(255,255,255,0.06)', color:'#fff', border:'1px solid rgba(255,255,255,0.1)', caretColor:'#fd297b' }} />

        <input value={password} onChange={e => setPassword(e.target.value)}
          type="password" placeholder="Password" autoComplete={mode==='signup'?'new-password':'current-password'}
          onKeyDown={e => { if(e.key==='Enter') handleSubmit() }}
          className="w-full rounded-xl px-4 py-3.5 text-[14px] outline-none"
          style={{ background:'rgba(255,255,255,0.06)', color:'#fff', border:'1px solid rgba(255,255,255,0.1)', caretColor:'#fd297b' }} />

        {error && (
          <div className="text-[12px] text-center px-2 py-1.5 rounded-lg"
            style={{ background:'rgba(239,68,68,0.1)', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full rounded-xl py-3.5 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
          style={{ background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff', boxShadow:'0 8px 30px rgba(253,41,123,0.35)' }}>
          {loading ? '...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>

        <button onClick={() => { setMode(mode==='signin'?'signup':'signin'); setError(null) }}
          className="w-full text-[13px] font-medium py-2 active:opacity-60 transition-opacity cursor-pointer"
          style={{ color:'rgba(255,255,255,0.35)' }}>
          {mode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  )
}
