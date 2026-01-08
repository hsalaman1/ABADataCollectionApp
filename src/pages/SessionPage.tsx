import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { db, type Client, type Session, type BehaviorData, type ABCRecord, type BehaviorCategory, type DataType, type ServiceType, type LocationType } from '../db/database'
import { formatDuration } from '../utils/time'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import ABCModal from '../components/ABCModal'

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
  trials: boolean[]
  // Deceleration
  decelCount: number
  decelDurationMs: number
  decelIsRunning: boolean
  decelStartTime: number | null
  abcRecords: ABCRecord[]
}

export default function SessionPage() {
  const navigate = useNavigate()
  const { clientId } = useParams()

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

  // Parent session note fields
  const [sessionFocus, setSessionFocus] = useState('')
  const [sessionLocation, setSessionLocation] = useState<LocationType | ''>('')
  const [totalUnits, setTotalUnits] = useState<number | ''>('')
  const [serviceType, setServiceType] = useState<ServiceType | ''>('')
  const [parentParticipation, setParentParticipation] = useState<boolean | null>(null)
  const [parentParticipationNotes, setParentParticipationNotes] = useState('')
  const [protocolModification, setProtocolModification] = useState('')
  const [protocolDescription, setProtocolDescription] = useState('')
  const [familyTrainingDescription, setFamilyTrainingDescription] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')
  const [showSessionNoteFields, setShowSessionNoteFields] = useState(false)

  const sessionTimerRef = useRef<number | undefined>(undefined)
  const behaviorTimersRef = useRef<Map<string, number>>(new Map())
  const intervalTimersRef = useRef<Map<string, number>>(new Map())
  const decelTimersRef = useRef<Map<string, number>>(new Map())
  const autoSaveRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (clientId) {
      db.clients.get(clientId).then(c => {
        if (c) {
          setClient(c)
          // Auto-fill session location from client profile
          if (c.defaultSessionLocation) {
            setSessionLocation(c.defaultSessionLocation)
          }
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
            trials: [],
            decelCount: 0,
            decelDurationMs: 0,
            decelIsRunning: false,
            decelStartTime: null,
            abcRecords: []
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
      trials: state.trials,
      totalTrials: state.trials.length,
      correctTrials: state.trials.filter(Boolean).length,
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
      updatedAt: now,
      // Parent session note fields
      sessionFocus: sessionFocus || undefined,
      sessionLocation: sessionLocation || undefined,
      totalUnits: totalUnits ? Number(totalUnits) : undefined,
      serviceType: serviceType || undefined,
      parentParticipation: parentParticipation ?? undefined,
      parentParticipationNotes: parentParticipationNotes || undefined,
      protocolModification: protocolModification || undefined,
      protocolDescription: protocolDescription || undefined,
      familyTrainingDescription: familyTrainingDescription || undefined,
      generalNotes: generalNotes || undefined
    }

    await db.sessions.put(session)
  }, [client, behaviorStates, notes, sessionId, sessionStartTime, sessionFocus, sessionLocation, totalUnits, serviceType, parentParticipation, parentParticipationNotes, protocolModification, protocolDescription, familyTrainingDescription, generalNotes])

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

  const handleFrequencyTap = (behaviorId: string) => {
    updateBehavior(behaviorId, {
      count: (behaviorStates.find(s => s.behaviorId === behaviorId)?.count ?? 0) + 1
    })
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

    updateBehavior(behaviorId, {
      intervals: [...state.intervals, occurred],
      intervalTimeRemaining: state.intervalLengthSec,
      intervalRunning: false
    })
  }

  const recordTrial = (behaviorId: string, correct: boolean) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (!state) return

    updateBehavior(behaviorId, {
      trials: [...state.trials, correct]
    })
  }

  const undoLastTrial = (behaviorId: string) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (!state || state.trials.length === 0) return

    updateBehavior(behaviorId, {
      trials: state.trials.slice(0, -1)
    })
  }

  // Deceleration functions
  const handleDecelFrequencyTap = (behaviorId: string) => {
    const state = behaviorStates.find(s => s.behaviorId === behaviorId)
    if (!state) return

    updateBehavior(behaviorId, {
      decelCount: state.decelCount + 1
    })
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

    updateBehavior(behaviorId, {
      abcRecords: [...state.abcRecords, record]
    })
  }

  const handleEndSession = async () => {
    behaviorTimersRef.current.forEach((timer) => clearInterval(timer))
    intervalTimersRef.current.forEach((timer) => clearInterval(timer))
    decelTimersRef.current.forEach((timer) => clearInterval(timer))
    if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current)

    await saveSession(true)
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

        {/* Session Note Fields Toggle */}
        <button
          className="btn btn-outline btn-block mb-3"
          onClick={() => setShowSessionNoteFields(!showSessionNoteFields)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>Session Note Details</span>
          <span style={{ transform: showSessionNoteFields ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </button>

        {/* Collapsible Session Note Fields */}
        {showSessionNoteFields && (
          <div className="card mb-3">
            {/* Basic Info Row */}
            <div className="flex gap-3 mb-3">
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label htmlFor="sessionFocus">Session Focus</label>
                <input
                  type="text"
                  id="sessionFocus"
                  value={sessionFocus}
                  onChange={e => setSessionFocus(e.target.value)}
                  placeholder="Enter session focus..."
                />
              </div>
            </div>

            <div className="flex gap-3 mb-3">
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label htmlFor="sessionLocation">Location</label>
                <select
                  id="sessionLocation"
                  value={sessionLocation}
                  onChange={e => setSessionLocation(e.target.value as LocationType | '')}
                >
                  <option value="">Select location...</option>
                  <option value="Home">Home</option>
                  <option value="Clinic">Clinic</option>
                </select>
              </div>
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label htmlFor="totalUnits">Total Units</label>
                <input
                  type="number"
                  id="totalUnits"
                  value={totalUnits}
                  onChange={e => setTotalUnits(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>

            {/* Service Type Selection */}
            <div className="input-group mb-3">
              <label>Service Type</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2" style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="serviceType"
                    value="97155"
                    checked={serviceType === '97155'}
                    onChange={e => setServiceType(e.target.value as ServiceType)}
                  />
                  <span>97155 - Behavior Treatment with Protocol Modification (BCBA/BCaBA)</span>
                </label>
                <label className="flex items-center gap-2" style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="serviceType"
                    value="97153"
                    checked={serviceType === '97153'}
                    onChange={e => setServiceType(e.target.value as ServiceType)}
                  />
                  <span>97153 - Behavior Treatment by Protocol (Direct service)</span>
                </label>
                <label className="flex items-center gap-2" style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="serviceType"
                    value="97156"
                    checked={serviceType === '97156'}
                    onChange={e => setServiceType(e.target.value as ServiceType)}
                  />
                  <span>97156 - Family Training (BCBA/BCaBA)</span>
                </label>
              </div>
            </div>

            {/* Service-specific documentation */}
            {serviceType === '97155' && (
              <div className="input-group mb-3">
                <label htmlFor="protocolModification">Description of Modification & Client Responses</label>
                <textarea
                  id="protocolModification"
                  value={protocolModification}
                  onChange={e => setProtocolModification(e.target.value)}
                  placeholder="Describe modifications made to protocol and client responses..."
                  style={{ minHeight: 100 }}
                />
              </div>
            )}

            {serviceType === '97153' && (
              <div className="input-group mb-3">
                <label htmlFor="protocolDescription">Activities, Protocol Description & Client Responses</label>
                <textarea
                  id="protocolDescription"
                  value={protocolDescription}
                  onChange={e => setProtocolDescription(e.target.value)}
                  placeholder="Describe activities, protocol, and client responses..."
                  style={{ minHeight: 100 }}
                />
              </div>
            )}

            {serviceType === '97156' && (
              <div className="input-group mb-3">
                <label htmlFor="familyTrainingDescription">Family Training Description</label>
                <textarea
                  id="familyTrainingDescription"
                  value={familyTrainingDescription}
                  onChange={e => setFamilyTrainingDescription(e.target.value)}
                  placeholder="Describe family training provided..."
                  style={{ minHeight: 100 }}
                />
              </div>
            )}

            {/* Parent Participation */}
            <div className="input-group mb-3">
              <label>Did Parent(s)/Caregiver(s) participate?</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2" style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="parentParticipation"
                    checked={parentParticipation === true}
                    onChange={() => setParentParticipation(true)}
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-2" style={{ fontWeight: 'normal', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="parentParticipation"
                    checked={parentParticipation === false}
                    onChange={() => setParentParticipation(false)}
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            {parentParticipation === false && (
              <div className="input-group mb-3">
                <label htmlFor="parentParticipationNotes">If No, why not?</label>
                <input
                  type="text"
                  id="parentParticipationNotes"
                  value={parentParticipationNotes}
                  onChange={e => setParentParticipationNotes(e.target.value)}
                  placeholder="Explain why parent/caregiver did not participate..."
                />
              </div>
            )}

            {/* General Notes */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label htmlFor="generalNotes">General Notes, Environmental Changes, Recommendations</label>
              <textarea
                id="generalNotes"
                value={generalNotes}
                onChange={e => setGeneralNotes(e.target.value)}
                placeholder="Add general notes, environmental changes, recommendations..."
                style={{ minHeight: 100 }}
              />
            </div>
          </div>
        )}

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
            {state.category === 'acquisition' && (
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

                    <div className="event-summary">
                      <div className="event-stat">
                        <div className="value">{state.trials.length}</div>
                        <div className="label">Total Trials</div>
                      </div>
                      <div className="event-stat">
                        <div className="value">{state.trials.filter(Boolean).length}</div>
                        <div className="label">Correct</div>
                      </div>
                      <div className="event-stat">
                        <div className="value">
                          {state.trials.length > 0
                            ? Math.round((state.trials.filter(Boolean).length / state.trials.length) * 100)
                            : 0}%
                        </div>
                        <div className="label">Accuracy</div>
                      </div>
                    </div>

                    {state.trials.length > 0 && (
                      <>
                        <div className="trial-history">
                          {state.trials.map((correct, idx) => (
                            <div
                              key={idx}
                              className={`trial-dot ${correct ? 'correct' : 'incorrect'}`}
                              title={`Trial ${idx + 1}: ${correct ? 'Correct' : 'Incorrect'}`}
                            >
                              {correct ? '+' : '-'}
                            </div>
                          ))}
                        </div>
                        <button
                          className="btn btn-outline btn-block mt-2"
                          onClick={() => undoLastTrial(state.behaviorId)}
                          style={{ fontSize: 14 }}
                        >
                          Undo Last Trial
                        </button>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* Deceleration behavior controls */}
            {state.category === 'deceleration' && (
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
