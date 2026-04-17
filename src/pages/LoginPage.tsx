import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      showToast(error.message, 'error')
    } else {
      navigate('/', { replace: true })
    }
    setLoading(false)
  }

  return (
    <div className="container" style={{ maxWidth: 400, paddingTop: 48 }}>
      <div className="card">
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>
          ABA Data Collection
        </h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 28, fontSize: 14 }}>
          Sign in to continue
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
          No account?{' '}
          <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 500 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
