import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'

export default function SelectClientPage() {
  const navigate = useNavigate()
  const clients = useLiveQuery(() => db.clients.orderBy('name').filter(c => !c._deleted).toArray())
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    if (!clients) return []
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c => c.name.toLowerCase().includes(q))
  }, [clients, query])

  const noMatch = query.trim().length > 0 && filtered.length === 0

  return (
    <>
      <header className="page-header">
        <h1>Start Session</h1>
        <div style={{ width: 48 }} />
      </header>

      <div className="container">
        {clients && clients.length > 0 ? (
          <>
            <div className="input-group mb-3" style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search clients…"
                style={{ paddingLeft: 36 }}
              />
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-secondary)" strokeWidth="2"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {noMatch ? (
              <div className="card text-center mb-3" style={{ padding: 20 }}>
                <p className="text-secondary mb-3">No client named "{query.trim()}"</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/clients/new')}
                >
                  + Add new client
                </button>
              </div>
            ) : (
              <div>
                {filtered.map(client => (
                  <div
                    key={client.id}
                    className="list-item"
                    onClick={() => navigate(`/session/${client.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="list-item-content">
                      <div className="list-item-title">{client.name}</div>
                      <div className="list-item-subtitle">
                        {client.targetBehaviors.filter(b => b.isActive !== false).length} active behavior{client.targetBehaviors.filter(b => b.isActive !== false).length !== 1 ? 's' : ''}
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
            )}

            <div
              className="list-item"
              onClick={() => navigate('/clients/new')}
              style={{ cursor: 'pointer', marginTop: 8, borderStyle: 'dashed', opacity: 0.7 }}
            >
              <div className="list-item-content">
                <div className="list-item-title" style={{ color: 'var(--primary)' }}>+ Add new client</div>
              </div>
            </div>
          </>
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
