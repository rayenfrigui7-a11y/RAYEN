import { useState } from 'react'
import { supabase, supabaseReady } from "./supabaseClient.js";

export default function Auth({ onAuthSuccess }) {
  const [login, setLogin] = useState(false)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!supabaseReady) {
      setError('Supabase is not configured. Add your project URL and publishable key to .env.local, then restart Vite.')
      return
    }
    setBusy(true)
    try {
      if (login) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        onAuthSuccess(data.user)
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim(), username: username.trim() } }
        })
        if (error) throw error
        if (data.session) onAuthSuccess(data.user)
        else setMessage('Account created. Check your email to confirm your address, then sign in.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div className="brand-mark">R<span>.</span></div>
        <p className="eyebrow">YOUR COMMUNITY. YOUR FUTURE.</p>
        <h1>{login ? 'Welcome back' : 'Join RAYEN'}</h1>
        <p className="muted">{login ? 'Sign in to continue to your community.' : 'Create your account and meet your people.'}</p>
        <form onSubmit={submit}>
          {!login && <>
            <label>Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Your full name" />
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required placeholder="Choose a username" />
          </>}
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" />
          {error && <div className="notice error">{error}</div>}
          {message && <div className="notice success">{message}</div>}
          <button className="primary wide" disabled={busy}>{busy ? 'Please wait…' : login ? 'SIGN IN →' : 'CREATE ACCOUNT →'}</button>
        </form>
        <div className="switch-auth">
          {login ? 'New to RAYEN?' : 'Already have an account?'}
          <button className="text-button" onClick={() => { setLogin(!login); setError(''); setMessage('') }}>
            {login ? 'Create account' : 'Sign in'}
          </button>
        </div>
        {!supabaseReady && <p className="config-hint">Supabase setup is required for real accounts. See README.md.</p>}
      </section>
    </main>
  )
}