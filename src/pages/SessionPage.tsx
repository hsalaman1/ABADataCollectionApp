import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { db, type Client, type Session, type BehaviorData, type ABCRecord, type BehaviorCategory, type DataType, type Trial, type PromptLevel, type TaskAnalysisStep, type TaskAnalysisTrial, type TaskAnalysisStepResult, type ChainingType, PROMPT_LABELS, PROMPT_ORDER } from '../db/database'
import { advanceSTOIfMastered } from '../utils/masteryCalculations'
import { useToast } from '../components/Toast'
import { formatDuration } from '../utils/time'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import ABCModal from '../components/ABCModal'

interface UndoEntry {
  label: string
  snapshot: Partial<BehaviorState>
}

interface BehaviorState {
  behaviorId: string
  behaviorName: string
  dataType: DataType
  category: BehaviorCategory
  count: number
  totalDurationMs: number
  isRunning: boolean
  startTime: number | null
  intervalLengthSec: number
  intervals: boolean[]
  intervalTimeRemaining: number
  intervalRunning: boolean
  // Event recording (acquisition)
  trialsV2: Trial[]
  selectedPrompt: PromptLevel
  // Task analysis
  taSteps: TaskAnalysisStep[]
  taChainingType: ChainingType
  taTeachingStep: number
  taCurrentTrial: TaskAnalysisStepResult[]   // in-progress trial, one entry per step
  taskAnalysisTrials: TaskAnalysisTrial[]
  // Deceleration
  decelCount: number
  decelDurationMs: number
  decelIsRunning: boolean
  decelStartTime: number | null
  abcRecords: ABCRecord[]
  undoStack: UndoEntry[]
}

export default function SessionPage() {
  const navigate = useNavigate()
  const { clientId } = useParams()
  const toast = useToast()

  const [client, setClient] = useState<Client | null>(null)
  const [sessionId] = useState(uuidv4())
  const [sessionStartTime] = useState(new Date().toISOString())
  const [elapsedMs, setElapsedMs] = useState(0)
  const [notes, setNotes] = useState('')
  const [behaviorStates, setBehaviorStates] = useState<BehaviorState[]>([])
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showIntervalSetup, setShowIntervalSetup] = useState<string | null>(null)
  const [intervalLength, setIntervalLength] = useState(15)
  const [activeTab, setActiveTab] = useState<BehaviorCategory>('acquisition')
  const [showABCModal, setShowABCModal] = useState<string | null>(null)

  const sessionTimerRef = useRef<number | undefined>(undefined)
  const behaviorTimersRef = useRef<Map<string, number>>(new Map())
  const intervalTimersRef = useRef<Map<string, number>>(new Map())
  const decelTimersRef = useRef<Map<string, number>>(new Map())
  const autoSaveRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (clientId) {
      db.clients.get(clientId).then(c => {
        if (c && !c._deleted) {
          setClient(c)
          // Filter only active behaviors
          const activeBehaviors = c.targetBehaviors.filter(b => b.isActive !== false)
          setBehaviorStates(activeBehaviors.map(b => ({
            behaviorId: b.id,
            behaviorName: b.name,
            dataType: b.dataType,
            category: b.category || 'acquisition',
            count: 0,
            totalDurationMs: 0,
            isRunning: false,
            startTime: null,
            intervalLengthSec: 15,
            intervals: [],
            intervalTimeRemaining: 15,
            intervalRunning: false,
            trialsV2: [],
            selectedPrompt: 'independent' as PromptLevel,
            taSteps: b.taskAnalysis?.steps ?? [],
            taChainingType: b.taskAnalysis?.chainingType ?? 'total_task',
            taTeachingStep: b.taskAnalysis?.currentStep ?? 1,
            taCurrentTrial: (b.taskAnalysis?.steps ?? []).map(s => ({
              stepNumber: s.stepNumber,
              prompt: 'independent' as PromptLevel,
              correct: true,
            })),
            taskAnalysisTrials: [],
            decelCount: 0,
            decelDurationMs: 0,
            decelIsRunning: false,
            decelStartTime: null,
            abcRecords: [],
            undoStack: []
          })))
        }
      })
    }
  }, [clientId])

  useEffect(() => {
    sessionTimerRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - new Date(sessionStartTime).getTime())
    }, 100)

    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current)
    }
  }, [sessionStartTime])

  const saveSession = useCallback(async (endSession = false) => {
    if (!client) return

    const now = new Date().toISOString()
    const behaviorData: BehaviorData[] = behaviorStates.map(state => ({
      behaviorId: state.behaviorId,
      behaviorName: state.behaviorName,
      dataType: state.dataType,
      category: state.category,
      count: state.count,
      totalDurationMs: state.totalDurationMs + (state.isRunning && state.startTime ? Date.now() - state.startTime : 0),
      intervalLengthSec: state.intervalLengthSec,
      intervals: state.intervals,
      trialsV2: state.trialsV2,
      trials: state.trialsV2.map(t => t.correct), // keep for chart backward-compat
      totalTrials: state.trialsV2.length,
      correctTrials: state.trialsV2.filter(t => t.correct).length,
      independentTrials: state.trialsV2.filter(t => t.correct && t.prompt === 'independent').length,
      taskAnalysisTrials: state.taskAnalysisTrials,
      // Deceleration data
      decelCount: state.decelCount,
      decelDurationMs: state.decelDurationMs + (state.decelIsRunning && state.decelStartTime ? Date.now() - state.decelStartTime : 0),
      abcRecords: state.abcRecords
    }))

    const session: Session = {
      id: sessionId,
      clientId: client.id,
      clientName: client.name,
      startTime: sessionStartTime,
      endTime: endSession ? now : undefined,
      durationMs: endSession ? Date.now() - new Date(sessionStartTime).getTime() : undefined,
      behaviorData,
      notes,
      createdAt: sessionStartTime,
      updatedAt: now
    }

    await db.sessions.put(session)
  }, [client, behaviorStates, notes, sessionId, sessionStartTime])

  useEffect(() => {
    autoSaveRef.current = window.setInterval(() => {
      saveSession(false)
    }, 5000)

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    }
  }, [saveSession])

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveSession(false)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveSession])

  const updateBehavior = (behaviorId: string, updates: Partial<BehaviorState>) => {
    setBehaviorStates(states =>
      states.map(s => s.behaviorId === behaviorId ? { ...s, ...updates } : s)
    )
  }

  const pushUndo = (behaviorId: string, label: string, snapshot: Partial<BehaviorState>) => {
    setBehaviorStates(states =>
      states.map(s => {
        if (s.behaviorId !== behaviorId) return s
        const stack = [...s.undoStack, { label, snapshot }].slice(-20)
        return { ...s, undoStack: stack }
      })
    )
  }

  const undoLast = (behaviorId: string) => {
    setBehaviorStates(states =>
      states.map(s => {
        if (s.behaviorId !== behaviorId || s.undoStack.length === 0) return s
        const entry = s.undoStack[s.undoStack.length - 1]
        return { ...s, ...entry.snapshot, undoStack: s.undoStack.slice(0, -1) }
      })
    )
  }

  const handleFrequencyTap = (behaviorId: string) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (!state) return
    pushUndo(behaviorId, 'frequency tap', { count: state.count })
    updateBehavior(behaviorId, { count: state.count + 1 })
  }

  const handleDurationToggle = (behaviorId: string) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (!state) return

    if (state.isRunning && state.startTime) {
      const elapsed = Date.now() - state.startTime
      if (behaviorTimersRef.current.has(behaviorId)) {
        clearInterval(behaviorTimersRef.current.get(behaviorId))
        behaviorTimersRef.current.delete(behaviorId)
      }
      pushUndo(behaviorId, 'duration stop', { totalDurationMs: state.totalDurationMs, isRunning: true, startTime: state.startTime })
      updateBehavior(behaviorId, {
        isRunning: false,
        startTime: null,
        totalDurationMs: state.totalDurationMs + elapsed
      })
    } else {
      const timerId = window.setInterval(() => {
        setBehaviorStates(states =>
          states.map(s => {
            if (s.behaviorId === behaviorId && s.isRunning && s.startTime) {
              return { ...s }
            }
            return s
          })
        )
      }, 100)
      behaviorTimersRef.current.set(behaviorId, timerId)
      updateBehavior(behaviorId, {
        isRunning: true,
        startTime: Date.now()
      })
    }
  }

  const startInterval = (behaviorId: string) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (!state) return

    updateBehavior(behaviorId, {
      intervalRunning: true,
      intervalTimeRemaining: state.intervalLengthSec
    })

    const timerId = window.setInterval(() => {
      setBehaviorStates(states =>
        states.map(s => {
          if (s.behaviorId === behaviorId && s.intervalRunning) {
            const newTime = s.intervalTimeRemaining - 1
            if (newTime <= 0) {
              return { ...s, intervalTimeRemaining: 0 }
            }
            return { ...s, intervalTimeRemaining: newTime }
          }
          return s
        })
      )
    }, 1000)
    intervalTimersRef.current.set(behaviorId, timerId)
  }

  const recordInterval = (behaviorId: string, occurred: boolean) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (!state) return

    if (intervalTimersRef.current.has(behaviorId)) {
      clearInterval(intervalTimersRef.current.get(behaviorId))
      intervalTimersRef.current.delete(behaviorId)
    }

    pushUndo(behaviorId, 'interval mark', { intervals: state.intervals })
    updateBehavior(behaviorId, {
      intervals: [...state.intervals, occurred],
      intervalTimeRemaining: state.intervalLengthSec,
      intervalRunning: false
    })
  }

  const recordTrial = (behaviorId: string, correct: boolean) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (!state) return

    const trial: Trial = {
      correct,
      prompt: state.selectedPrompt,
      timestamp: new Date().toISOString(),
    }
    pushUndo(behaviorId, correct ? `correct (${PROMPT_LABELS[state.selectedPrompt]})` : 'incorrect', { trialsV2: state.trialsV2 })
    updateBehavior(behaviorId, { trialsV2: [...state.trialsV2, trial] })
  }

  const setPrompt = (behaviorId: string, prompt: PromptLevel) => {
    updateBehavior(behaviorId, { selectedPrompt: prompt })
  }

  const updateTAStep = (behaviorId: string, stepNumber: number, updates: Partial<TaskAnalysisStepResult>) => {
    setBehaviorStates(states => states.map(s => {
      if (s.behaviorId !== behaviorId) return s
      const updated = s.taCurrentTrial.map(r =>
        r.stepNumber === stepNumber ? { ...r, ...updates } : r
      )
      return { ...s, taCurrentTrial: updated }
    }))
  }

  const completeTATrial = (behaviorId: string) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (!state || state.taCurrentTrial.length === 0) return
    const newTrial: TaskAnalysisTrial = {
      timestamp: new Date().toISOString(),
      stepResults: state.taCurrentTrial,
    }
    pushUndo(behaviorId, 'complete TA trial', { taskAnalysisTrials: state.taskAnalysisTrials })
    updateBehavior(behaviorId, {
      taskAnalysisTrials: [...state.taskAnalysisTrials, newTrial],
      taCurrentTrial: state.taSteps.map(s => ({ stepNumber: s.stepNumber, prompt: 'independent' as PromptLevel, correct: true })),
    })
  }

  // Deceleration functions
  const handleDecelFrequencyTap = (behaviorId: string) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (!state) return

    pushUndo(behaviorId, 'decel count', { decelCount: state.decelCount })
    updateBehavior(behaviorId, { decelCount: state.decelCount + 1 })
  }

  const handleDecelDurationToggle = (behaviorId: string) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (!state) return

    if (state.decelIsRunning && state.decelStartTime) {
      const elapsed = Date.now() - state.decelStartTime
      if (decelTimersRef.current.has(behaviorId)) {
        clearInterval(decelTimersRef.current.get(behaviorId))
        decelTimersRef.current.delete(behaviorId)
      }
      pushUndo(behaviorId, 'decel duration stop', { decelDurationMs: state.decelDurationMs, decelIsRunning: true, decelStartTime: state.decelStartTime })
      updateBehavior(behaviorId, {
        decelIsRunning: false,
        decelStartTime: null,
        decelDurationMs: state.decelDurationMs + elapsed
      })
    } else {
      const timerId = window.setInterval(() => {
        setBehaviorStates(states =>
          states.map(s => {
            if (s.behaviorId === behaviorId && s.decelIsRunning && s.decelStartTime) {
              return { ...s }
            }
            return s
          })
        )
      }, 100)
      decelTimersRef.current.set(behaviorId, timerId)
      updateBehavior(behaviorId, {
        decelIsRunning: true,
        decelStartTime: Date.now()
      })
    }
  }

  const handleABCSave = (behaviorId: string, record: ABCRecord) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (!state) return

    pushUndo(behaviorId, 'ABC record', { abcRecords: state.abcRecords })
    updateBehavior(behaviorId, { abcRecords: [...state.abcRecords, record] })
  }

  const handleEndSession = async () => {
    behaviorTimersRef.current.forEach((timer) => clearInterval(timer))
    intervalTimersRef.current.forEach((timer) => clearInterval(timer))
    decelTimersRef.current.forEach((timer) => clearInterval(timer))
    if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current)

    await saveSession(true)

    // Check mastery auto-advance for all behaviors with STOs
    if (client) {
      const allSessions = await db.sessions.where('clientId').equals(client.id).filter(s => !s._deleted).toArray()
      const updatedBehaviors = [...client.targetBehaviors]
      let anyAdvanced = false

      for (let i = 0; i < updatedBehaviors.length; i++) {
        const b = updatedBehaviors[i]
        if (!b.masteryCriteria || !b.stos?.length) continue
        const result = advanceSTOIfMastered(b, allSessions)
        if (result.advanced) {
          updatedBehaviors[i] = result.updatedBehavior
          anyAdvanced = true
          const msg = result.nextSto
            ? `🎉 "${b.name}" mastered! Now on: ${result.nextSto.description}`
            : `🎉 "${b.name}" — all STOs mastered!`
          toast.success(msg)
        }
      }

      if (anyAdvanced) {
        await db.clients.update(client.id, { targetBehaviors: updatedBehaviors, updatedAt: new Date().toISOString() })
      }
    }

    navigate('/data')
  }

  const setupInterval = (behaviorId: string) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (state) {
      setIntervalLength(state.intervalLengthSec)
    }
    setShowIntervalSetup(behaviorId)
  }

  const confirmIntervalSetup = () => {
    if (showIntervalSetup) {
      updateBehavior(showIntervalSetup, {
        intervalLengthSec: intervalLength,
        intervalTimeRemaining: intervalLength
      })
      setShowIntervalSetup(null)
    }
  }

  const acqBehaviors = behaviorStates.filter(s => s.category === 'acquisition')
  const decelBehaviors = behaviorStates.filter(s => s.category === 'deceleration')
  const filteredBehaviors = activeTab === 'acquisition' ? acqBehaviors : decelBehaviors

  if (!client) {
    return (
      <div className="container" style={{ paddingTop: 100, textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <>
      <header className="page-header">
        <button className="back-btn" onClick={() => setShowEndConfirm(true)}>
          &larr;
        </button>
        <h1>{client.name}</h1>
        <button
          className="btn btn-danger"
          style={{ padding: '8px 16px', fontSize: 14 }}
          onClick={() => setShowEndConfirm(true)}
        >
          End
        </button>
      </header>

      <div className="container">
        <div className="session-timer">
          {formatDuration(elapsedMs)}
        </div>

        {/* Acq/Decel Tabs */}
        {(acqBehaviors.length > 0 || decelBehaviors.length > 0) && (
          <div className="session-tabs">
            <button
              className={`session-tab ${activeTab === 'acquisition' ? 'active' : ''}`}
              onClick={() => setActiveTab('acquisition')}
            >
              Acq ({acqBehaviors.length})
            </button>
            <button
              className={`session-tab decel-tab ${activeTab === 'deceleration' ? 'active' : ''}`}
              onClick={() => setActiveTab('deceleration')}
            >
              Decel ({decelBehaviors.length})
            </button>
          </div>
        )}

        {filteredBehaviors.length === 0 && (
          <div className="card text-center text-secondary" style={{ padding: 32 }}>
            No {activeTab === 'acquisition' ? 'acquisition' : 'deceleration'} behaviors configured
          </div>
        )}

        {filteredBehaviors.map(state => (
          <div
            key={state.behaviorId}
            className={`behavior-card ${state.category === 'deceleration' ? 'decel-card' : ''}`}
          >
            <div className="behavior-card-header">
              <div className="behavior-card-title">{state.behaviorName}</div>
              <div className="behavior-card-type">
                {state.dataType === 'deceleration' ? 'frequency + duration + abc' : state.dataType}
              </div>
            </div>

            {/* Acquisition behavior controls */}
            {(state.category === 'acquisition' || (state.category === 'deceleration' && state.dataType !== 'deceleration')) && (
              <>
                {state.dataType === 'frequency' && (
                  <button
                    className="frequency-btn"
                    onClick={() => handleFrequencyTap(state.behaviorId)}
                  >
                    {state.count}
                    <span>Tap to count</span>
                  </button>
                )}

                {state.dataType === 'duration' && (
                  <>
                    <div className="duration-controls">
                      {!state.isRunning ? (
                        <button
                          className="duration-btn start"
                          onClick={() => handleDurationToggle(state.behaviorId)}
                        >
                          Start
                        </button>
                      ) : (
                        <button
                          className="duration-btn stop pulse"
                          onClick={() => handleDurationToggle(state.behaviorId)}
                        >
                          Stop
                        </button>
                      )}
                    </div>
                    <div className="duration-display">
                      {formatDuration(
                        state.totalDurationMs +
                        (state.isRunning && state.startTime ? Date.now() - state.startTime : 0)
                      )}
                    </div>
                  </>
                )}

                {state.dataType === 'interval' && (
                  <>
                    {!state.intervalRunning && state.intervals.length === 0 && (
                      <div className="flex gap-2 mb-2">
                        <button
                          className="btn btn-outline"
                          onClick={() => setupInterval(state.behaviorId)}
                          style={{ flex: 1 }}
                        >
                          Set Interval ({state.intervalLengthSec}s)
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => startInterval(state.behaviorId)}
                          style={{ flex: 1 }}
                        >
                          Start Recording
                        </button>
                      </div>
                    )}

                    {(state.intervalRunning || state.intervals.length > 0) && (
                      <>
                        <div className="interval-timer">
                          <div className="time">{state.intervalTimeRemaining}s</div>
                          <div className="label">
                            {state.intervalRunning
                              ? `Interval ${state.intervals.length + 1}`
                              : state.intervalTimeRemaining === 0
                                ? 'Record this interval'
                                : `Completed ${state.intervals.length} interval${state.intervals.length !== 1 ? 's' : ''}`
                            }
                          </div>
                        </div>

                        {(state.intervalTimeRemaining === 0 || !state.intervalRunning) && state.intervals.length > 0 && (
                          <button
                            className="btn btn-primary btn-block mb-2"
                            onClick={() => startInterval(state.behaviorId)}
                          >
                            Start Next Interval
                          </button>
                        )}

                        {state.intervalTimeRemaining === 0 && (
                          <div className="interval-controls">
                            <button
                              className="interval-btn yes"
                              onClick={() => recordInterval(state.behaviorId, true)}
                            >
                              Occurred
                            </button>
                            <button
                              className="interval-btn no"
                              onClick={() => recordInterval(state.behaviorId, false)}
                            >
                              Did Not Occur
                            </button>
                          </div>
                        )}

                        {state.intervals.length > 0 && (
                          <div className="interval-history">
                            {state.intervals.map((occurred, idx) => (
                              <div
                                key={idx}
                                className={`interval-dot ${occurred ? 'yes' : 'no'}`}
                                title={`Interval ${idx + 1}: ${occurred ? 'Occurred' : 'Did not occur'}`}
                              >
                                {idx + 1}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {state.dataType === 'event' && (
                  <>
                    {/* Prompt selector */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                      {PROMPT_ORDER.map(p => (
                        <button
                          key={p}
                          onClick={() => setPrompt(state.behaviorId, p)}
                          style={{
                            flex: 1,
                            minWidth: 44,
                            padding: '6px 4px',
                            borderRadius: 6,
                            border: `2px solid ${state.selectedPrompt === p ? 'var(--primary)' : 'var(--border)'}`,
                            background: state.selectedPrompt === p ? 'var(--primary)' : 'var(--background)',
                            color: state.selectedPrompt === p ? 'white' : 'var(--text-secondary)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {PROMPT_LABELS[p]}
                        </button>
                      ))}
                    </div>

                    <div className="event-controls">
                      <button
                        className="event-btn correct"
                        onClick={() => recordTrial(state.behaviorId, true)}
                      >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Correct (+)</span>
                      </button>
                      <button
                        className="event-btn incorrect"
                        onClick={() => recordTrial(state.behaviorId, false)}
                      >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        <span>Incorrect (-)</span>
                      </button>
                    </div>

                    {(() => {
                      const total = state.trialsV2.length
                      const correct = state.trialsV2.filter(t => t.correct).length
                      const indep = state.trialsV2.filter(t => t.correct && t.prompt === 'independent').length
                      return (
                        <div className="event-summary" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
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
                          <div className="event-stat">
                            <div className="value" style={{ color: 'var(--success)' }}>{total > 0 ? Math.round((indep / total) * 100) : 0}%</div>
                            <div className="label">Indep.</div>
                          </div>
                        </div>
                      )
                    })()}

                    {state.trialsV2.length > 0 && (
                      <div className="trial-history">
                        {state.trialsV2.map((trial, idx) => (
                          <div
                            key={idx}
                            className={`trial-dot ${trial.correct ? 'correct' : 'incorrect'}`}
                            title={`Trial ${idx + 1}: ${trial.correct ? 'Correct' : 'Incorrect'} (${PROMPT_LABELS[trial.prompt]})`}
                            style={{ fontSize: 10, width: 32, height: 32, flexDirection: 'column', gap: 1 }}
                          >
                            <span>{trial.correct ? '+' : '−'}</span>
                            <span style={{ fontSize: 8, opacity: 0.85 }}>{PROMPT_LABELS[trial.prompt]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {state.dataType === 'task_analysis' && state.taSteps.length > 0 && (
                  <>
                    <p className="text-sm text-secondary mb-2" style={{ textTransform: 'capitalize' }}>
                      {state.taChainingType.replace('_', ' ')} · Trial {state.taskAnalysisTrials.length + 1}
                      {state.taChainingType !== 'total_task' && ` · Teaching step ${state.taTeachingStep}`}
                    </p>

                    {state.taSteps.map(step => {
                      const result = state.taCurrentTrial.find(r => r.stepNumber === step.stepNumber)
                      if (!result) return null
                      const isTeaching = state.taChainingType !== 'total_task' && step.stepNumber === state.taTeachingStep
                      return (
                        <div
                          key={step.stepNumber}
                          style={{
                            border: `2px solid ${isTeaching ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: 10,
                            padding: '10px 12px',
                            marginBottom: 8,
                            background: isTeaching ? 'rgba(25,118,210,0.05)' : 'var(--background)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>
                              {step.stepNumber}. {step.description}
                            </span>
                            {isTeaching && <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>★ teaching</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                            {PROMPT_ORDER.map(p => (
                              <button
                                key={p}
                                onClick={() => updateTAStep(state.behaviorId, step.stepNumber, { prompt: p })}
                                style={{
                                  flex: 1, minWidth: 36, padding: '4px 3px', borderRadius: 5,
                                  border: `2px solid ${result.prompt === p ? 'var(--primary)' : 'var(--border)'}`,
                                  background: result.prompt === p ? 'var(--primary)' : 'var(--background)',
                                  color: result.prompt === p ? 'white' : 'var(--text-secondary)',
                                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                }}
                              >{PROMPT_LABELS[p]}</button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => updateTAStep(state.behaviorId, step.stepNumber, { correct: true })}
                              style={{
                                flex: 1, padding: '6px', borderRadius: 6, border: `2px solid ${result.correct ? 'var(--success)' : 'var(--border)'}`,
                                background: result.correct ? 'var(--success)' : 'var(--background)',
                                color: result.correct ? 'white' : 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                              }}
                            >✓ Correct</button>
                            <button
                              onClick={() => updateTAStep(state.behaviorId, step.stepNumber, { correct: false })}
                              style={{
                                flex: 1, padding: '6px', borderRadius: 6, border: `2px solid ${!result.correct ? 'var(--danger)' : 'var(--border)'}`,
                                background: !result.correct ? 'var(--danger)' : 'var(--background)',
                                color: !result.correct ? 'white' : 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                              }}
                            >✗ Error</button>
                          </div>
                        </div>
                      )
                    })}

                    <button
                      className="btn btn-primary btn-block mt-2"
                      onClick={() => completeTATrial(state.behaviorId)}
                      style={{ marginBottom: 4 }}
                    >
                      Complete Trial ({state.taskAnalysisTrials.length + 1})
                    </button>

                    {state.taskAnalysisTrials.length > 0 && (() => {
                      const lastTrial = state.taskAnalysisTrials[state.taskAnalysisTrials.length - 1]
                      const correct = lastTrial.stepResults.filter(r => r.correct).length
                      const total = lastTrial.stepResults.length
                      const indep = lastTrial.stepResults.filter(r => r.correct && r.prompt === 'independent').length
                      return (
                        <p className="text-sm text-secondary text-center">
                          {state.taskAnalysisTrials.length} trial{state.taskAnalysisTrials.length !== 1 ? 's' : ''} · Last: {correct}/{total} correct · {total > 0 ? Math.round((indep / total) * 100) : 0}% indep
                        </p>
                      )
                    })()}
                  </>
                )}
              </>
            )}

            {/* Deceleration behavior controls — only for the combined type */}
            {state.category === 'deceleration' && state.dataType === 'deceleration' && (
              <div className="decel-controls">
                {/* Frequency counter + Duration timer row */}
                <div className="decel-row">
                  <button
                    className="decel-frequency-btn"
                    onClick={() => handleDecelFrequencyTap(state.behaviorId)}
                  >
                    {state.decelCount}
                    <span>Tap to count</span>
                  </button>
                </div>

                {/* Duration timer */}
                <div className="decel-row">
                  <div className={`decel-timer-display ${state.decelIsRunning ? 'running pulse' : ''}`}>
                    {formatDuration(
                      state.decelDurationMs +
                      (state.decelIsRunning && state.decelStartTime ? Date.now() - state.decelStartTime : 0)
                    )}
                  </div>
                  {!state.decelIsRunning ? (
                    <button
                      className="decel-timer-btn start"
                      onClick={() => handleDecelDurationToggle(state.behaviorId)}
                    >
                      Start
                    </button>
                  ) : (
                    <button
                      className="decel-timer-btn stop"
                      onClick={() => handleDecelDurationToggle(state.behaviorId)}
                    >
                      Stop
                    </button>
                  )}
                </div>

                {/* ABC Button */}
                <button
                  className="abc-btn"
                  onClick={() => setShowABCModal(state.behaviorId)}
                >
                  ABC Data
                  {state.abcRecords.length > 0 && (
                    <span className="abc-count">{state.abcRecords.length}</span>
                  )}
                </button>

                {/* ABC Records Summary */}
                {state.abcRecords.length > 0 && (
                  <div className="text-sm text-secondary mt-2">
                    Last: {state.abcRecords[state.abcRecords.length - 1].antecedent} → {state.abcRecords[state.abcRecords.length - 1].consequence}
                  </div>
                )}
              </div>
            )}

            {/* Unified undo button — shown for any data type when there's history */}
            {state.undoStack.length > 0 && (
              <button
                className="btn btn-outline btn-block mt-2"
                onClick={() => undoLast(state.behaviorId)}
                disabled={state.isRunning || state.decelIsRunning}
                style={{ fontSize: 13, minHeight: 40 }}
                title={state.isRunning || state.decelIsRunning ? 'Stop timer before undoing' : undefined}
              >
                ↩ Undo: {state.undoStack[state.undoStack.length - 1].label}
              </button>
            )}
          </div>
        ))}

        <div className="card">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label htmlFor="notes">Session Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about this session..."
              style={{ minHeight: 120 }}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={handleEndSession}
        title="End Session"
        message="Are you sure you want to end this session? All data will be saved."
        confirmText="End Session"
      />

      <Modal
        isOpen={!!showIntervalSetup}
        onClose={() => setShowIntervalSetup(null)}
        title="Set Interval Length"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowIntervalSetup(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={confirmIntervalSetup}>
              Save
            </button>
          </>
        }
      >
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label htmlFor="intervalLength">Interval Length (seconds)</label>
          <input
            type="number"
            id="intervalLength"
            value={intervalLength}
            onChange={e => setIntervalLength(Math.max(1, parseInt(e.target.value) || 15))}
            min={1}
          />
        </div>
        <p className="text-sm text-secondary mt-2">
          Common intervals: 10s, 15s, 30s, 60s
        </p>
      </Modal>

      {/* ABC Modal */}
      {showABCModal && (
        <ABCModal
          isOpen={true}
          onClose={() => setShowABCModal(null)}
          onSave={(record) => {
            handleABCSave(showABCModal, record)
            setShowABCModal(null)
          }}
          behaviorName={behaviorStates.find(s => s.behaviorId === showABCModal)?.behaviorName || ''}
        />
      )}
    </>
  )
}
