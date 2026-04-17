import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'

export default function ParentDashboardPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    showToast('Signed out', 'info')
    navigate('/login', { replace: true })
  }

  return (
    <div className="container" style={{ paddingTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Parent Portal</h1>
        <button className="btn btn-secondary" onClick={handleSignOut} style={{ fontSize: 13 }}>
          Sign Out
        </button>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: 16, marginBottom: 8 }}>Parent data collection coming in Milestone 5.</p>
        <p style={{ fontSize: 13 }}>Your clinician will link your child's targets here.</p>
      </div>
    </div>
  )
}
