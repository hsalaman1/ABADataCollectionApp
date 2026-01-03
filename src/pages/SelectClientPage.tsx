import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'

export default function SelectClientPage() {
  const navigate = useNavigate()
  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray())

  return (
    <>
      <header className="page-header">
        <h1>Start Session</h1>
        <div style={{ width: 48 }} />
      </header>

      <div className="container">
        <p className="text-secondary mb-4">Select a client to begin a new session.</p>

        {clients && clients.length > 0 ? (
          <div>
            {clients.map(client => (
              <div
                key={client.id}
                className="list-item"
                onClick={() => navigate(`/session/${client.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="list-item-content">
                  <div className="list-item-title">{client.name}</div>
                  <div className="list-item-subtitle">
                    {client.targetBehaviors.length} target behavior{client.targetBehaviors.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="list-item-action">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <h3>No clients yet</h3>
            <p>Add a client first to start collecting data.</p>
            <button className="btn btn-primary" onClick={() => navigate('/clients/new')}>
              Add Client
            </button>
          </div>
        )}
      </div>
    </>
  )
}
