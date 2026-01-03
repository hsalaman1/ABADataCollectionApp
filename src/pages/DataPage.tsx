import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { db, type Session, type BehaviorData } from '../db/database'
import { formatDate, formatDuration } from '../utils/time'
import { exportClientDataToCSV } from '../utils/export'
import Modal from '../components/Modal'
import { v4 as uuidv4 } from 'uuid'

interface ManualSessionData {
  date: string
  durationMinutes: number
  notes: string
  behaviors: { behaviorId: string; value: string }[]
}

export default function DataPage() {
  const navigate = useNavigate()
  const { clientId } = useParams()

  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray())
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientId || null)

  const selectedClient = useLiveQuery(
    () => selectedClientId ? db.clients.get(selectedClientId) : undefined,
    [selectedClientId]
  )

  const sessions = useLiveQuery(
    () => selectedClientId
      ? db.sessions.where('clientId').equals(selectedClientId).reverse().sortBy('startTime')
      : [],
    [selectedClientId]
  )

  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string | null>(null)
  const [showAddSession, setShowAddSession] = useState(false)
  const [manualSession, setManualSession] = useState<ManualSessionData>({
    date: new Date().toISOString().split('T')[0],
    durationMinutes: 30,
    notes: '',
    behaviors: []
  })

  const chartData = useMemo(() => {
    if (!sessions || !selectedClient) return []

    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    return sortedSessions.slice(-10).map(session => {
      const dataPoint: Record<string, unknown> = {
        date: formatDate(session.startTime).split(',')[0],
        fullDate: formatDate(session.startTime)
      }

      session.behaviorData.forEach(bd => {
        if (bd.dataType === 'frequency') {
          dataPoint[bd.behaviorName] = bd.count ?? 0
        } else if (bd.dataType === 'duration') {
          dataPoint[bd.behaviorName] = Math.round((bd.totalDurationMs ?? 0) / 60000 * 10) / 10
        } else if (bd.dataType === 'interval') {
          if (bd.intervals && bd.intervals.length > 0) {
            const pct = Math.round((bd.intervals.filter(Boolean).length / bd.intervals.length) * 100)
            dataPoint[bd.behaviorName] = pct
          } else {
            dataPoint[bd.behaviorName] = 0
          }
        } else if (bd.dataType === 'event') {
          if (bd.trials && bd.trials.length > 0) {
            const pct = Math.round((bd.trials.filter(Boolean).length / bd.trials.length) * 100)
            dataPoint[bd.behaviorName] = pct
          } else {
            dataPoint[bd.behaviorName] = 0
          }
        }
      })

      return dataPoint
    })
  }, [sessions, selectedClient])

  const selectedBehavior = selectedClient?.targetBehaviors.find(b => b.id === selectedBehaviorId)
  const behaviorsToChart = selectedBehavior
    ? [selectedBehavior]
    : selectedClient?.targetBehaviors || []

  const colors = ['#1976d2', '#2e7d32', '#f57c00', '#d32f2f', '#7b1fa2', '#00838f']

  const getBehaviorValue = (data: BehaviorData): string => {
    switch (data.dataType) {
      case 'frequency':
        return String(data.count ?? 0)
      case 'duration':
        return formatDuration(data.totalDurationMs ?? 0)
      case 'interval':
        if (!data.intervals || data.intervals.length === 0) return '0%'
        const occurrences = data.intervals.filter(Boolean).length
        const percentage = Math.round((occurrences / data.intervals.length) * 100)
        return `${percentage}%`
      case 'event':
        if (!data.trials || data.trials.length === 0) return '0/0 (0%)'
        const correct = data.trials.filter(Boolean).length
        const total = data.trials.length
        const pct = Math.round((correct / total) * 100)
        return `${correct}/${total} (${pct}%)`
      default:
        return '-'
    }
  }

  const openAddSession = () => {
    if (!selectedClient) return
    setManualSession({
      date: new Date().toISOString().split('T')[0],
      durationMinutes: 30,
      notes: '',
      behaviors: selectedClient.targetBehaviors.map(b => ({
        behaviorId: b.id,
        value: ''
      }))
    })
    setShowAddSession(true)
  }

  const saveManualSession = async () => {
    if (!selectedClient) return

    const sessionDate = new Date(manualSession.date)
    const now = new Date().toISOString()

    const behaviorData: BehaviorData[] = selectedClient.targetBehaviors.map(b => {
      const input = manualSession.behaviors.find(mb => mb.behaviorId === b.id)
      const value = input?.value || '0'

      if (b.dataType === 'frequency') {
        return {
          behaviorId: b.id,
          behaviorName: b.name,
          dataType: b.dataType,
          count: parseInt(value) || 0
        }
      } else if (b.dataType === 'duration') {
        const minutes = parseFloat(value) || 0
        return {
          behaviorId: b.id,
          behaviorName: b.name,
          dataType: b.dataType,
          totalDurationMs: minutes * 60000
        }
      } else if (b.dataType === 'interval') {
        const percentage = parseFloat(value) || 0
        const intervals = Array(10).fill(false).map((_, i) => i < Math.round(percentage / 10))
        return {
          behaviorId: b.id,
          behaviorName: b.name,
          dataType: b.dataType,
          intervalLengthSec: 15,
          intervals
        }
      } else {
        // Event recording - user enters percentage, we create trials array
        const percentage = parseFloat(value) || 0
        const totalTrials = 10
        const correctCount = Math.round(percentage / 10)
        const trials = Array(totalTrials).fill(false).map((_, i) => i < correctCount)
        return {
          behaviorId: b.id,
          behaviorName: b.name,
          dataType: b.dataType,
          trials,
          totalTrials,
          correctTrials: correctCount
        }
      }
    })

    const session: Session = {
      id: uuidv4(),
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      startTime: sessionDate.toISOString(),
      endTime: new Date(sessionDate.getTime() + manualSession.durationMinutes * 60000).toISOString(),
      durationMs: manualSession.durationMinutes * 60000,
      behaviorData,
      notes: manualSession.notes,
      createdAt: now,
      updatedAt: now
    }

    await db.sessions.add(session)
    setShowAddSession(false)
  }

  const updateManualBehavior = (behaviorId: string, value: string) => {
    setManualSession(prev => ({
      ...prev,
      behaviors: prev.behaviors.map(b =>
        b.behaviorId === behaviorId ? { ...b, value } : b
      )
    }))
  }

  return (
    <>
      <header className="page-header">
        <h1>Data Review</h1>
        {selectedClient && sessions && sessions.length > 0 && (
          <button
            className="btn btn-outline"
            style={{ padding: '8px 12px', fontSize: 14 }}
            onClick={() => exportClientDataToCSV(sessions, selectedClient)}
          >
            Export CSV
          </button>
        )}
      </header>

      <div className="container">
        <div className="input-group">
          <label htmlFor="clientSelect">Select Client</label>
          <select
            id="clientSelect"
            value={selectedClientId || ''}
            onChange={e => {
              setSelectedClientId(e.target.value || null)
              setSelectedBehaviorId(null)
            }}
          >
            <option value="">-- Select a client --</option>
            {clients?.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {selectedClient && (
          <>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold">Behavior Trend</h2>
              <button
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: 14 }}
                onClick={openAddSession}
              >
                + Add Data
              </button>
            </div>

            {selectedClient.targetBehaviors.length > 0 && (
              <div className="mb-4">
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <button
                    className={`chip ${!selectedBehaviorId ? 'chip-primary' : ''}`}
                    onClick={() => setSelectedBehaviorId(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    All Behaviors
                  </button>
                  {selectedClient.targetBehaviors.map(b => (
                    <button
                      key={b.id}
                      className={`chip ${selectedBehaviorId === b.id ? 'chip-primary' : ''}`}
                      onClick={() => setSelectedBehaviorId(b.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chartData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#757575"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#757575"
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: 8
                      }}
                    />
                    {behaviorsToChart.length > 1 && <Legend />}
                    {behaviorsToChart.map((behavior, idx) => (
                      <Line
                        key={behavior.id}
                        type="monotone"
                        dataKey={behavior.name}
                        stroke={colors[idx % colors.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-sm text-secondary text-center mt-2">
                  {selectedBehavior?.dataType === 'duration'
                    ? 'Values in minutes'
                    : selectedBehavior?.dataType === 'interval'
                      ? 'Values in percentage'
                      : selectedBehavior?.dataType === 'event'
                        ? 'Accuracy percentage'
                        : 'Last 10 sessions'
                  }
                </p>
              </div>
            ) : (
              <div className="card text-center text-secondary mb-4" style={{ padding: 32 }}>
                No session data yet. Start a session or add historical data.
              </div>
            )}

            <h2 className="text-lg font-bold mb-2">Session History</h2>

            {sessions && sessions.length > 0 ? (
              <div>
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className="session-summary"
                    onClick={() => navigate(`/data/${selectedClientId}/session/${session.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="session-summary-header">
                      <div>
                        <div className="session-summary-date">
                          {formatDate(session.startTime)}
                        </div>
                        <div className="session-summary-duration">
                          {formatDuration(session.durationMs ?? 0)}
                        </div>
                      </div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#757575" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                    <div className="session-summary-data">
                      {session.behaviorData.slice(0, 3).map(bd => (
                        <div key={bd.behaviorId} className="session-summary-item">
                          <div className="value">{getBehaviorValue(bd)}</div>
                          <div className="label">{bd.behaviorName}</div>
                        </div>
                      ))}
                    </div>
                    {session.notes && (
                      <div className="session-notes" style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {session.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center text-secondary" style={{ padding: 32 }}>
                No sessions recorded yet
              </div>
            )}
          </>
        )}

        {!selectedClient && clients && clients.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <h3>No data yet</h3>
            <p>Add a client and start a session to begin collecting data.</p>
            <button className="btn btn-primary" onClick={() => navigate('/clients/new')}>
              Add Client
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showAddSession}
        onClose={() => setShowAddSession(false)}
        title="Add Historical Session"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowAddSession(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveManualSession}>
              Save Session
            </button>
          </>
        }
      >
        <div className="input-group">
          <label htmlFor="sessionDate">Session Date</label>
          <input
            type="date"
            id="sessionDate"
            value={manualSession.date}
            onChange={e => setManualSession(prev => ({ ...prev, date: e.target.value }))}
          />
        </div>

        <div className="input-group">
          <label htmlFor="sessionDuration">Duration (minutes)</label>
          <input
            type="number"
            id="sessionDuration"
            value={manualSession.durationMinutes}
            onChange={e => setManualSession(prev => ({
              ...prev,
              durationMinutes: parseInt(e.target.value) || 0
            }))}
            min={1}
          />
        </div>

        <h3 className="font-bold mb-2">Behavior Data</h3>
        {selectedClient?.targetBehaviors.map(behavior => {
          const inputValue = manualSession.behaviors.find(b => b.behaviorId === behavior.id)?.value || ''
          return (
            <div key={behavior.id} className="input-group">
              <label htmlFor={`behavior-${behavior.id}`}>
                {behavior.name}
                <span className="text-secondary text-sm" style={{ marginLeft: 8 }}>
                  ({behavior.dataType === 'frequency'
                    ? 'count'
                    : behavior.dataType === 'duration'
                      ? 'minutes'
                      : 'percentage'
                  })
                </span>
              </label>
              <input
                type="number"
                id={`behavior-${behavior.id}`}
                value={inputValue}
                onChange={e => updateManualBehavior(behavior.id, e.target.value)}
                placeholder={
                  behavior.dataType === 'frequency'
                    ? 'e.g., 5'
                    : behavior.dataType === 'duration'
                      ? 'e.g., 10.5'
                      : 'e.g., 80'
                }
                min={0}
                step={behavior.dataType === 'duration' ? '0.1' : '1'}
              />
            </div>
          )
        })}

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label htmlFor="sessionNotes">Notes (optional)</label>
          <textarea
            id="sessionNotes"
            value={manualSession.notes}
            onChange={e => setManualSession(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Session notes..."
          />
        </div>
      </Modal>
    </>
  )
}
