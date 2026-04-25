import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BehaviorData, PROMPT_LABELS, type TaskAnalysisTrial } from '../db/database'
import { softDelete } from '../services/sync'
import { formatDuration, formatDateTime } from '../utils/time'
import { exportSessionToCSV, exportSessionToPDF, exportNotesToText } from '../utils/export'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'

export default function SessionDetailPage() {
  const navigate = useNavigate()
  const { clientId, sessionId } = useParams()

  const session = useLiveQuery(
    async () => {
      if (!sessionId) return undefined
      const s = await db.sessions.get(sessionId)
      return s && !s._deleted ? s : undefined
    },
    [sessionId]
  )

  const client = useLiveQuery(
    async () => {
      if (!clientId) return undefined
      const c = await db.clients.get(clientId)
      return c && !c._deleted ? c : undefined
    },
    [clientId]
  )

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleDelete = async () => {
    if (sessionId) {
      await softDelete('sessions', sessionId)
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
      case 'task_analysis': {
        const tTrials = data.taskAnalysisTrials ?? []
        if (tTrials.length === 0) return '0 trials'
        const last = tTrials[tTrials.length - 1]
        const steps = last.stepResults.length
        const correct = last.stepResults.filter(r => r.correct).length
        return `${tTrials.length} trial${tTrials.length !== 1 ? 's' : ''} · Last: ${correct}/${steps}`
      }
      case 'event': {
        const trials = data.trialsV2 ?? data.trials?.map(c => ({ correct: c, prompt: 'independent' as const })) ?? []
        if (trials.length === 0) return '0/0 (0%)'
        const correct = trials.filter(t => t.correct).length
        const total = trials.length
        const indep = trials.filter(t => t.correct && t.prompt === 'independent').length
        const pct = Math.round((correct / total) * 100)
        const indepPct = Math.round((indep / total) * 100)
        return data.trialsV2 ? `${correct}/${total} (${pct}% · ${indepPct}% indep)` : `${correct}/${total} (${pct}%)`
      }
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

        {session.behaviorData.some(bd => bd.dataType === 'event' && ((bd.trialsV2?.length ?? 0) > 0 || (bd.trials?.length ?? 0) > 0)) && (
          <>
            <h2 className="text-lg font-bold mb-2">Trial Details</h2>
            {session.behaviorData
              .filter(bd => bd.dataType === 'event' && ((bd.trialsV2?.length ?? 0) > 0 || (bd.trials?.length ?? 0) > 0))
              .map(bd => {
                const trials = bd.trialsV2 ?? bd.trials?.map(c => ({ correct: c, prompt: 'independent' as const, timestamp: '' })) ?? []
                const total = trials.length
                const correct = trials.filter(t => t.correct).length
                const indep = trials.filter(t => t.correct && t.prompt === 'independent').length
                const hasPrompts = !!bd.trialsV2
                return (
                  <div key={bd.behaviorId} className="card mb-4">
                    <h3 className="font-bold mb-2">{bd.behaviorName}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: hasPrompts ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                      <div className="event-stat">
                        <div className="value">{total}</div>
                        <div className="label">Total</div>
                      </div>
                      <div className="event-stat">
                        <div className="value">{correct}</div>
                        <div className="label">Correct</div>
                      </div>
                      <div className="event-stat">
                        <div className="value">{total > 0 ? Math.round((correct / total) * 100) : 0}%</div>
                        <div className="label">Accuracy</div>
                      </div>
                      {hasPrompts && (
                        <div className="event-stat">
                          <div className="value" style={{ color: 'var(--success)' }}>{total > 0 ? Math.round((indep / total) * 100) : 0}%</div>
                          <div className="label">Indep.</div>
                        </div>
                      )}
                    </div>
                    <div className="trial-history">
                      {trials.map((trial, idx) => (
                        <div
                          key={idx}
                          className={`trial-dot ${trial.correct ? 'correct' : 'incorrect'}`}
                          title={`Trial ${idx + 1}: ${trial.correct ? 'Correct' : 'Incorrect'}${hasPrompts ? ` (${PROMPT_LABELS[trial.prompt]})` : ''}`}
                          style={hasPrompts ? { width: 32, height: 32, fontSize: 10, flexDirection: 'column', gap: 1 } : {}}
                        >
                          <span>{trial.correct ? '+' : '−'}</span>
                          {hasPrompts && <span style={{ fontSize: 8, opacity: 0.85 }}>{PROMPT_LABELS[trial.prompt]}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </>
        )}

        {session.behaviorData.some(bd => bd.dataType === 'task_analysis' && (bd.taskAnalysisTrials?.length ?? 0) > 0) && (
          <>
            <h2 className="text-lg font-bold mb-2">Task Analysis</h2>
            {session.behaviorData
              .filter(bd => bd.dataType === 'task_analysis' && (bd.taskAnalysisTrials?.length ?? 0) > 0)
              .map(bd => {
                const trials = bd.taskAnalysisTrials as TaskAnalysisTrial[]
                const allStepNums = [...new Set(trials.flatMap(t => t.stepResults.map(r => r.stepNumber)))].sort((a, b) => a - b)
                return (
                  <div key={bd.behaviorId} className="card mb-4">
                    <h3 className="font-bold mb-3">{bd.behaviorName}</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-secondary)' }}>Trial</th>
                            {allStepNums.map(n => (
                              <th key={n} style={{ padding: '4px 6px', color: 'var(--text-secondary)', textAlign: 'center' }}>S{n}</th>
                            ))}
                            <th style={{ padding: '4px 6px', color: 'var(--text-secondary)', textAlign: 'center' }}>%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trials.map((trial, tidx) => {
                            const total = trial.stepResults.length
                            const indep = trial.stepResults.filter(r => r.correct && r.prompt === 'independent').length
                            return (
                              <tr key={tidx} style={{ borderTop: '1px solid var(--border)' }}>
                                <td style={{ padding: '4px 8px', color: 'var(--text-secondary)' }}>{tidx + 1}</td>
                                {allStepNums.map(n => {
                                  const r = trial.stepResults.find(s => s.stepNumber === n)
                                  if (!r) return <td key={n} style={{ textAlign: 'center', padding: '4px 6px' }}>—</td>
                                  return (
                                    <td key={n} style={{ textAlign: 'center', padding: '4px 6px' }}>
                                      <span
                                        title={`${r.correct ? 'Correct' : 'Error'} · ${PROMPT_LABELS[r.prompt]}`}
                                        style={{ display: 'inline-block', width: 24, height: 24, lineHeight: '24px', borderRadius: 4, background: r.correct ? 'var(--success)' : 'var(--danger)', color: 'white', fontSize: 10, fontWeight: 700 }}
                                      >
                                        {PROMPT_LABELS[r.prompt]}
                                      </span>
                                    </td>
                                  )
                                })}
                                <td style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 600 }}>
                                  {total > 0 ? Math.round((indep / total) * 100) : 0}%
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm text-secondary mt-2">
                      Columns show abbreviated prompt level · % = independent steps only
                    </p>
                  </div>
                )
              })}
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
