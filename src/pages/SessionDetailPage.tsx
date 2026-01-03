import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BehaviorData } from '../db/database'
import { formatDuration, formatDateTime } from '../utils/time'
import { exportSessionToCSV, exportSessionToPDF, exportNotesToText } from '../utils/export'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'

export default function SessionDetailPage() {
  const navigate = useNavigate()
  const { clientId, sessionId } = useParams()

  const session = useLiveQuery(
    () => sessionId ? db.sessions.get(sessionId) : undefined,
    [sessionId]
  )

  const client = useLiveQuery(
    () => clientId ? db.clients.get(clientId) : undefined,
    [clientId]
  )

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleDelete = async () => {
    if (sessionId) {
      await db.sessions.delete(sessionId)
      navigate(`/data/${clientId}`)
    }
  }

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
        return `${percentage}% (${occurrences}/${data.intervals.length})`
      case 'event':
        if (!data.trials || data.trials.length === 0) return '0/0 (0%)'
        const correct = data.trials.filter(Boolean).length
        const total = data.trials.length
        const pct = Math.round((correct / total) * 100)
        return `${correct}/${total} (${pct}%)`
      case 'deceleration':
        const count = data.decelCount ?? 0
        const duration = formatDuration(data.decelDurationMs ?? 0)
        const abcCount = data.abcRecords?.length ?? 0
        return `${count}x / ${duration} / ${abcCount} ABC`
      default:
        return '-'
    }
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!session || !client) {
    return (
      <div className="container" style={{ paddingTop: 100, textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <>
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(`/data/${clientId}`)}>
          &larr;
        </button>
        <h1>Session Details</h1>
        <button
          className="btn btn-outline"
          style={{ padding: '8px 12px', fontSize: 14 }}
          onClick={() => setShowExportMenu(true)}
        >
          Export
        </button>
      </header>

      <div className="container">
        <div className="card mb-4">
          <h2 className="text-lg font-bold mb-2">{client.name}</h2>
          <div className="text-secondary mb-2">
            {formatDateTime(session.startTime)}
          </div>
          <div className="flex gap-4">
            <div>
              <span className="text-secondary">Duration: </span>
              <span className="font-bold">{formatDuration(session.durationMs ?? 0)}</span>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-2">Behavior Data</h2>
        <div className="session-summary-data mb-4">
          {session.behaviorData.map(bd => (
            <div key={bd.behaviorId} className="session-summary-item">
              <div className="value">{getBehaviorValue(bd)}</div>
              <div className="label">{bd.behaviorName}</div>
              <div className="text-sm text-secondary">{bd.dataType}</div>
            </div>
          ))}
        </div>

        {session.behaviorData.some(bd => bd.dataType === 'interval' && bd.intervals && bd.intervals.length > 0) && (
          <>
            <h2 className="text-lg font-bold mb-2">Interval Details</h2>
            {session.behaviorData
              .filter(bd => bd.dataType === 'interval' && bd.intervals && bd.intervals.length > 0)
              .map(bd => (
                <div key={bd.behaviorId} className="card mb-4">
                  <h3 className="font-bold mb-2">{bd.behaviorName}</h3>
                  <p className="text-sm text-secondary mb-2">
                    {bd.intervalLengthSec}s intervals
                  </p>
                  <div className="interval-history">
                    {bd.intervals?.map((occurred, idx) => (
                      <div
                        key={idx}
                        className={`interval-dot ${occurred ? 'yes' : 'no'}`}
                        title={`Interval ${idx + 1}: ${occurred ? 'Occurred' : 'Did not occur'}`}
                      >
                        {idx + 1}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </>
        )}

        {session.behaviorData.some(bd => bd.dataType === 'event' && bd.trials && bd.trials.length > 0) && (
          <>
            <h2 className="text-lg font-bold mb-2">Trial Details</h2>
            {session.behaviorData
              .filter(bd => bd.dataType === 'event' && bd.trials && bd.trials.length > 0)
              .map(bd => (
                <div key={bd.behaviorId} className="card mb-4">
                  <h3 className="font-bold mb-2">{bd.behaviorName}</h3>
                  <p className="text-sm text-secondary mb-2">
                    {bd.trials?.filter(Boolean).length}/{bd.trials?.length} correct ({Math.round(((bd.trials?.filter(Boolean).length ?? 0) / (bd.trials?.length ?? 1)) * 100)}%)
                  </p>
                  <div className="trial-history">
                    {bd.trials?.map((correct, idx) => (
                      <div
                        key={idx}
                        className={`trial-dot ${correct ? 'correct' : 'incorrect'}`}
                        title={`Trial ${idx + 1}: ${correct ? 'Correct' : 'Incorrect'}`}
                      >
                        {correct ? '+' : '-'}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </>
        )}

        {/* Deceleration ABC Data */}
        {session.behaviorData.some(bd => bd.dataType === 'deceleration' && bd.abcRecords && bd.abcRecords.length > 0) && (
          <>
            <h2 className="text-lg font-bold mb-2">Deceleration & ABC Data</h2>
            {session.behaviorData
              .filter(bd => bd.dataType === 'deceleration')
              .map(bd => (
                <div key={bd.behaviorId} className="card mb-4 decel-detail-card">
                  <h3 className="font-bold mb-2 decel-text">{bd.behaviorName}</h3>
                  <div className="decel-summary mb-4">
                    <div className="decel-stat">
                      <div className="decel-stat-value">{bd.decelCount ?? 0}</div>
                      <div className="decel-stat-label">Occurrences</div>
                    </div>
                    <div className="decel-stat">
                      <div className="decel-stat-value">{formatDuration(bd.decelDurationMs ?? 0)}</div>
                      <div className="decel-stat-label">Total Duration</div>
                    </div>
                    <div className="decel-stat">
                      <div className="decel-stat-value">{bd.abcRecords?.length ?? 0}</div>
                      <div className="decel-stat-label">ABC Records</div>
                    </div>
                  </div>

                  {bd.abcRecords && bd.abcRecords.length > 0 && (
                    <div className="abc-records">
                      <h4 className="text-sm font-bold text-secondary mb-2">ABC Records</h4>
                      {bd.abcRecords.map((record, idx) => (
                        <div key={record.id} className="abc-record">
                          <div className="abc-record-header">
                            <span className="abc-record-number">#{idx + 1}</span>
                            <span className="abc-record-time">{formatTime(record.timestamp)}</span>
                          </div>
                          <div className="abc-record-row">
                            <span className="abc-label">A:</span>
                            <span>{record.antecedent}</span>
                            {record.antecedentNote && (
                              <span className="abc-note">({record.antecedentNote})</span>
                            )}
                          </div>
                          <div className="abc-record-row">
                            <span className="abc-label">B:</span>
                            <span>{bd.behaviorName}</span>
                          </div>
                          <div className="abc-record-row">
                            <span className="abc-label">C:</span>
                            <span>{record.consequence}</span>
                            {record.consequenceNote && (
                              <span className="abc-note">({record.consequenceNote})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </>
        )}

        <h2 className="text-lg font-bold mb-2">Session Notes</h2>
        <div className="card mb-4">
          {session.notes ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>{session.notes}</p>
          ) : (
            <p className="text-secondary">No notes recorded</p>
          )}
        </div>

        <button
          className="btn btn-danger btn-block"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete Session
        </button>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Session"
        message="Are you sure you want to delete this session? This action cannot be undone."
        confirmText="Delete"
        danger
      />

      <Modal
        isOpen={showExportMenu}
        onClose={() => setShowExportMenu(false)}
        title="Export Session"
      >
        <div className="flex flex-col gap-3">
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              exportSessionToCSV(session, client)
              setShowExportMenu(false)
            }}
          >
            Export to CSV
          </button>
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              exportSessionToPDF(session, client)
              setShowExportMenu(false)
            }}
          >
            Export to PDF
          </button>
          {session.notes && (
            <button
              className="btn btn-outline btn-block"
              onClick={() => {
                exportNotesToText(session, client)
                setShowExportMenu(false)
              }}
            >
              Export Notes Only
            </button>
          )}
        </div>
      </Modal>
    </>
  )
}
