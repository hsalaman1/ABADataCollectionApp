// Milestone 3: Historical/backdated session entry
// This page lets clinicians input past sessions from handwritten notes.
// Full implementation in Milestone 3.
import { useNavigate, useParams } from 'react-router-dom'

export default function BackfillSessionPage() {
  const navigate = useNavigate()
  const { clientId } = useParams()

  return (
    <div className="container" style={{ paddingTop: 24 }}>
      <button className="btn btn-back" onClick={() => navigate(`/data/${clientId}`)}>
        ← Back
      </button>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 0' }}>Add Past Session</h1>
      <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
        <p>Historical session entry will be available in an upcoming update.</p>
      </div>
    </div>
  )
}
