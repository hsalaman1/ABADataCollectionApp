import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

export default function SignupPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      showToast('Passwords do not match', 'error')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'clinician' } },
    })
    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast('Account created — check your email to confirm.', 'success')
      navigate('/login', { replace: true })
    }
    setLoading(false)
  }

  return (
    <div className="container" style={{ maxWidth: 400, paddingTop: 48 }}>
      <div className="card">
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>
          Create Account
        </h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 28, fontSize: 14 }}>
          Clinician account
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
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <div>
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
