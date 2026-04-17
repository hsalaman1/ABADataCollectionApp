import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { db, type Client, type TargetBehavior, type DataType, type BehaviorCategory, type TaskAnalysisStep, type ChainingType, type MasteryCriteria, type BehaviorSTO } from '../db/database'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'

interface BehaviorFormData {
  id: string
  name: string
  definition: string
  dataType: DataType
  category: BehaviorCategory
  isActive: boolean
  taskAnalysis?: {
    steps: TaskAnalysisStep[]
    chainingType: ChainingType
    currentStep?: number
  }
  masteryCriteria?: MasteryCriteria
  stos?: BehaviorSTO[]
  currentStoId?: string
}

export default function ClientFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [name, setName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [location, setLocation] = useState('')
  const [behaviors, setBehaviors] = useState<BehaviorFormData[]>([])
  const [behaviorTab, setBehaviorTab] = useState<BehaviorCategory>('acquisition')

  const [showBehaviorModal, setShowBehaviorModal] = useState(false)
  const [editingBehavior, setEditingBehavior] = useState<BehaviorFormData | null>(null)
  const [behaviorName, setBehaviorName] = useState('')
  const [behaviorDefinition, setBehaviorDefinition] = useState('')
  const [behaviorType, setBehaviorType] = useState<DataType>('frequency')
  const [behaviorCategory, setBehaviorCategory] = useState<BehaviorCategory>('acquisition')
  const [deleteBehavior, setDeleteBehavior] = useState<BehaviorFormData | null>(null)
  // Task analysis fields
  const [taSteps, setTaSteps] = useState<TaskAnalysisStep[]>([])
  const [taChaining, setTaChaining] = useState<ChainingType>('total_task')
  const [taCurrentStep, setTaCurrentStep] = useState<number>(1)
  const [taNewStep, setTaNewStep] = useState('')
  // Mastery criteria fields
  const [masteryEnabled, setMasteryEnabled] = useState(false)
  const [masteryPct, setMasteryPct] = useState(80)
  const [masteryConsecutive, setMasteryConsecutive] = useState(3)
  const [masteryMetric, setMasteryMetric] = useState<'independent' | 'correct'>('independent')
  const [stos, setStos] = useState<BehaviorSTO[]>([])
  const [stoNewDesc, setStoNewDesc] = useState('')

  useEffect(() => {
    if (id) {
      db.clients.get(id).then(client => {
        if (client) {
          setName(client.name)
          setDateOfBirth(client.dateOfBirth || '')
          setPhone(client.phone || '')
          setAddress(client.address || '')
          setLocation(client.location || '')
          setBehaviors(client.targetBehaviors.map(b => ({
            ...b,
            category: b.category || 'acquisition',
            isActive: b.isActive ?? true
          })))
        }
      })
    }
  }, [id])

  const openBehaviorModal = (behavior?: BehaviorFormData) => {
    if (behavior) {
      setEditingBehavior(behavior)
      setBehaviorName(behavior.name)
      setBehaviorDefinition(behavior.definition)
      setBehaviorType(behavior.dataType)
      setBehaviorCategory(behavior.category)
      setTaSteps(behavior.taskAnalysis?.steps ?? [])
      setTaChaining(behavior.taskAnalysis?.chainingType ?? 'total_task')
      setTaCurrentStep(behavior.taskAnalysis?.currentStep ?? 1)
      setMasteryEnabled(!!behavior.masteryCriteria)
      setMasteryPct(behavior.masteryCriteria?.percentage ?? 80)
      setMasteryConsecutive(behavior.masteryCriteria?.consecutiveSessions ?? 3)
      setMasteryMetric(behavior.masteryCriteria?.metric ?? 'independent')
      setStos(behavior.stos ?? [])
    } else {
      setEditingBehavior(null)
      setBehaviorName('')
      setBehaviorDefinition('')
      setTaSteps([])
      setTaChaining('total_task')
      setTaCurrentStep(1)
      setMasteryEnabled(false)
      setMasteryPct(80)
      setMasteryConsecutive(3)
      setMasteryMetric('independent')
      setStos([])
      // Set defaults based on current tab
      if (behaviorTab === 'deceleration') {
        setBehaviorType('deceleration')
        setBehaviorCategory('deceleration')
      } else {
        setBehaviorType('event')
        setBehaviorCategory('acquisition')
      }
    }
    setTaNewStep('')
    setShowBehaviorModal(true)
  }

  const addTaStep = () => {
    const desc = taNewStep.trim()
    if (!desc) return
    setTaSteps(prev => [...prev, { stepNumber: prev.length + 1, description: desc }])
    setTaNewStep('')
  }

  const removeTaStep = (stepNumber: number) => {
    setTaSteps(prev => {
      const filtered = prev.filter(s => s.stepNumber !== stepNumber)
      return filtered.map((s, i) => ({ ...s, stepNumber: i + 1 }))
    })
  }

  const saveBehavior = () => {
    if (!behaviorName.trim()) return

    const newBehavior: BehaviorFormData = {
      id: editingBehavior?.id || uuidv4(),
      name: behaviorName.trim(),
      definition: behaviorDefinition.trim(),
      dataType: behaviorType,
      category: behaviorCategory,
      isActive: editingBehavior?.isActive ?? true,
      taskAnalysis: behaviorType === 'task_analysis' && taSteps.length > 0
        ? { steps: taSteps, chainingType: taChaining, currentStep: taCurrentStep }
        : undefined,
      masteryCriteria: masteryEnabled
        ? { percentage: masteryPct, consecutiveSessions: masteryConsecutive, metric: masteryMetric }
        : undefined,
      stos: masteryEnabled ? stos : undefined,
      currentStoId: masteryEnabled ? (stos.find(s => s.status === 'active')?.id ?? stos[0]?.id) : undefined,
    }

    if (editingBehavior) {
      setBehaviors(behaviors.map(b => b.id === editingBehavior.id ? newBehavior : b))
    } else {
      setBehaviors([...behaviors, newBehavior])
    }

    setShowBehaviorModal(false)
  }

  const handleDeleteBehavior = () => {
    if (deleteBehavior) {
      setBehaviors(behaviors.filter(b => b.id !== deleteBehavior.id))
      setDeleteBehavior(null)
    }
  }

  const toggleBehaviorActive = (behaviorId: string) => {
    setBehaviors(behaviors.map(b =>
      b.id === behaviorId ? { ...b, isActive: !b.isActive } : b
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const now = new Date().toISOString()
    const targetBehaviors: TargetBehavior[] = behaviors.map(b => ({
      id: b.id,
      name: b.name,
      definition: b.definition,
      dataType: b.dataType,
      category: b.category,
      isActive: b.isActive,
      taskAnalysis: b.taskAnalysis,
      masteryCriteria: b.masteryCriteria,
      stos: b.stos,
      currentStoId: b.currentStoId,
    }))

    if (isEditing && id) {
      const existing = await db.clients.get(id)
      if (existing) {
        await db.clients.update(id, {
          name: name.trim(),
          dateOfBirth: dateOfBirth || undefined,
          phone: phone || undefined,
          address: address || undefined,
          location: location || undefined,
          targetBehaviors,
          updatedAt: now
        })
      }
    } else {
      const client: Client = {
        id: uuidv4(),
        name: name.trim(),
        dateOfBirth: dateOfBirth || undefined,
        phone: phone || undefined,
        address: address || undefined,
        location: location || undefined,
        targetBehaviors,
        createdAt: now,
        updatedAt: now
      }
      await db.clients.add(client)
    }

    navigate('/clients')
  }

  const filteredBehaviors = behaviors.filter(b => b.category === behaviorTab)
  const acqCount = behaviors.filter(b => b.category === 'acquisition').length
  const decelCount = behaviors.filter(b => b.category === 'deceleration').length

  return (
    <>
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/clients')}>
          &larr;
        </button>
        <h1>{isEditing ? 'Edit Client' : 'New Client'}</h1>
        <div style={{ width: 48 }} />
      </header>

      <div className="container">
        <form onSubmit={handleSubmit}>
          <div className="card mb-4">
            <div className="input-group">
              <label htmlFor="name">Client Name *</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter client name"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="dob">Date of Birth (optional)</label>
              <input
                type="date"
                id="dob"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="phone">Phone Number (optional)</label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g., 407-555-1234"
              />
            </div>

            <div className="input-group">
              <label htmlFor="address">Address (optional)</label>
              <input
                type="text"
                id="address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g., 123 Main St, City, FL"
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label htmlFor="location">Location (optional)</label>
              <select
                id="location"
                value={location}
                onChange={e => setLocation(e.target.value)}
              >
                <option value="">Select location...</option>
                <option value="Clinic">Clinic</option>
                <option value="InHome">In-Home</option>
                <option value="School">School</option>
                <option value="Community">Community</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">Target Behaviors</h2>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => openBehaviorModal()}
            >
              + Add
            </button>
          </div>

          {/* Behavior Category Tabs */}
          <div className="behavior-tabs mb-4">
            <button
              type="button"
              className={`behavior-tab ${behaviorTab === 'acquisition' ? 'active' : ''}`}
              onClick={() => setBehaviorTab('acquisition')}
            >
              Acq ({acqCount})
            </button>
            <button
              type="button"
              className={`behavior-tab decel ${behaviorTab === 'deceleration' ? 'active' : ''}`}
              onClick={() => setBehaviorTab('deceleration')}
            >
              Decel ({decelCount})
            </button>
          </div>

          {filteredBehaviors.length > 0 ? (
            <div className="mb-4">
              {filteredBehaviors.map(behavior => (
                <div
                  key={behavior.id}
                  className={`list-item ${behavior.category === 'deceleration' ? 'decel-item' : ''} ${!behavior.isActive ? 'inactive-item' : ''}`}
                >
                  <div
                    className="list-item-content"
                    onClick={() => openBehaviorModal(behavior)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={`list-item-title ${behavior.category === 'deceleration' ? 'decel-text' : ''}`}>
                      {behavior.name}
                      {!behavior.isActive && <span className="inactive-badge">Inactive</span>}
                    </div>
                    <div className="list-item-subtitle">
                      <span className={`chip ${behavior.category === 'deceleration' ? 'chip-danger' : 'chip-primary'}`}>
                        {behavior.dataType}
                      </span>
                      {behavior.definition && (
                        <span style={{ marginLeft: 8 }}>{behavior.definition}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="list-item-action"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleBehaviorActive(behavior.id)
                    }}
                    title={behavior.isActive ? 'Mark Inactive' : 'Mark Active'}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={behavior.isActive ? 'var(--success)' : 'var(--text-secondary)'} strokeWidth="2">
                      {behavior.isActive ? (
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
                      ) : (
                        <circle cx="12" cy="12" r="10" />
                      )}
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="list-item-action"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteBehavior(behavior)
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card mb-4 text-center text-secondary" style={{ padding: 32 }}>
              No {behaviorTab === 'acquisition' ? 'acquisition' : 'deceleration'} behaviors added yet
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block btn-large">
            {isEditing ? 'Save Changes' : 'Create Client'}
          </button>
        </form>
      </div>

      <Modal
        isOpen={showBehaviorModal}
        onClose={() => setShowBehaviorModal(false)}
        title={editingBehavior ? 'Edit Behavior' : 'Add Behavior'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowBehaviorModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveBehavior}>
              {editingBehavior ? 'Save' : 'Add'}
            </button>
          </>
        }
      >
        <div className="input-group">
          <label htmlFor="behaviorName">Behavior Name *</label>
          <input
            type="text"
            id="behaviorName"
            value={behaviorName}
            onChange={e => setBehaviorName(e.target.value)}
            placeholder={behaviorCategory === 'deceleration' ? 'e.g., Physical Aggression' : 'e.g., 1-Step Instructions'}
          />
        </div>

        <div className="input-group">
          <label htmlFor="behaviorDefinition">Definition (optional)</label>
          <textarea
            id="behaviorDefinition"
            value={behaviorDefinition}
            onChange={e => setBehaviorDefinition(e.target.value)}
            placeholder="Describe what counts as this behavior..."
          />
        </div>

        <div className="input-group">
          <label>Category *</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="category"
                value="acquisition"
                checked={behaviorCategory === 'acquisition'}
                onChange={() => {
                  setBehaviorCategory('acquisition')
                  if (behaviorType === 'deceleration') {
                    setBehaviorType('event')
                  }
                }}
              />
              <span>Acquisition (skills to increase)</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="category"
                value="deceleration"
                checked={behaviorCategory === 'deceleration'}
                onChange={() => {
                  setBehaviorCategory('deceleration')
                  setBehaviorType('deceleration')
                }}
              />
              <span className="decel-text">Deceleration (behaviors to decrease)</span>
            </label>
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label htmlFor="behaviorType">Data Type *</label>
          <select
            id="behaviorType"
            value={behaviorType}
            onChange={e => setBehaviorType(e.target.value as DataType)}
          >
            {behaviorCategory === 'acquisition' ? (
              <>
                <option value="event">Event Recording (trials +/- for acquisition)</option>
                <option value="task_analysis">Task Analysis (step-by-step chain)</option>
                <option value="frequency">Frequency (count occurrences)</option>
                <option value="duration">Duration (time the behavior lasts)</option>
                <option value="interval">Interval (occurrence each interval)</option>
              </>
            ) : (
              <>
                <option value="deceleration">Frequency + Duration + ABC (full)</option>
                <option value="frequency">Frequency only (count occurrences)</option>
                <option value="duration">Duration only (time how long it lasts)</option>
              </>
            )}
          </select>
          {behaviorCategory === 'deceleration' && behaviorType === 'deceleration' && (
            <p className="text-sm text-secondary mt-2">
              Tracks frequency count, duration, and ABC data together.
            </p>
          )}
        </div>

        {behaviorType === 'task_analysis' && (
          <>
            <div className="input-group mt-2">
              <label>Chaining Method</label>
              <div className="radio-group">
                {(['total_task', 'forward', 'backward'] as ChainingType[]).map(ct => (
                  <label key={ct} className="radio-label">
                    <input type="radio" name="chaining" value={ct} checked={taChaining === ct} onChange={() => setTaChaining(ct)} />
                    <span>
                      {ct === 'total_task' ? 'Total Task' : ct === 'forward' ? 'Forward Chaining' : 'Backward Chaining'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {taChaining !== 'total_task' && taSteps.length > 0 && (
              <div className="input-group">
                <label>Teaching Step (currently active)</label>
                <select value={taCurrentStep} onChange={e => setTaCurrentStep(Number(e.target.value))}>
                  {taSteps.map(s => (
                    <option key={s.stepNumber} value={s.stepNumber}>Step {s.stepNumber}: {s.description}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="input-group">
              <label>Steps ({taSteps.length})</label>
              {taSteps.map(step => (
                <div key={step.stepNumber} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ minWidth: 22, color: 'var(--text-secondary)', fontSize: 13 }}>{step.stepNumber}.</span>
                  <span style={{ flex: 1, fontSize: 14 }}>{step.description}</span>
                  <button type="button" onClick={() => removeTaStep(step.stepNumber)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  type="text"
                  value={taNewStep}
                  onChange={e => setTaNewStep(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTaStep() } }}
                  placeholder={`Step ${taSteps.length + 1} description…`}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-outline" onClick={addTaStep} style={{ padding: '8px 14px', minHeight: 'auto' }}>Add</button>
              </div>
            </div>
          </>
        )}

        {/* Mastery criteria — only for event & task_analysis */}
        {(behaviorType === 'event' || behaviorType === 'task_analysis') && (
          <div className="input-group mt-2" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={masteryEnabled} onChange={e => setMasteryEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span>Enable mastery criteria</span>
            </label>
            {masteryEnabled && (
              <>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Metric</label>
                    <select value={masteryMetric} onChange={e => setMasteryMetric(e.target.value as 'independent' | 'correct')} style={{ width: '100%' }}>
                      <option value="independent">% Independent</option>
                      <option value="correct">% Correct</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Target %</label>
                    <input type="number" value={masteryPct} min={1} max={100} onChange={e => setMasteryPct(Number(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Sessions</label>
                    <input type="number" value={masteryConsecutive} min={1} max={10} onChange={e => setMasteryConsecutive(Number(e.target.value))} style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Short-Term Objectives ({stos.length})</label>
                  {stos.map((sto, idx) => (
                    <div key={sto.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: sto.status === 'mastered' ? 'var(--success)' : 'var(--primary)', minWidth: 14 }}>{idx + 1}.</span>
                      <span style={{ flex: 1, fontSize: 13, textDecoration: sto.status === 'mastered' ? 'line-through' : 'none', color: sto.status === 'mastered' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{sto.description}</span>
                      {sto.status === 'mastered' && <span style={{ fontSize: 10, color: 'var(--success)' }}>✓ Mastered</span>}
                      <button type="button" onClick={() => setStos(prev => prev.filter(s => s.id !== sto.id))} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <input
                      type="text"
                      value={stoNewDesc}
                      onChange={e => setStoNewDesc(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const desc = stoNewDesc.trim()
                          if (!desc) return
                          setStos(prev => [...prev, { id: uuidv4(), description: desc, criteria: { percentage: masteryPct, consecutiveSessions: masteryConsecutive, metric: masteryMetric }, status: prev.length === 0 ? 'active' : 'active' }])
                          setStoNewDesc('')
                        }
                      }}
                      placeholder="Add STO description…"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button" className="btn btn-outline"
                      onClick={() => {
                        const desc = stoNewDesc.trim()
                        if (!desc) return
                        setStos(prev => [...prev, { id: uuidv4(), description: desc, criteria: { percentage: masteryPct, consecutiveSessions: masteryConsecutive, metric: masteryMetric }, status: 'active' }])
                        setStoNewDesc('')
                      }}
                      style={{ padding: '8px 14px', minHeight: 'auto' }}
                    >Add</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteBehavior}
        onClose={() => setDeleteBehavior(null)}
        onConfirm={handleDeleteBehavior}
        title="Delete Behavior"
        message={`Are you sure you want to remove "${deleteBehavior?.name}"?`}
        confirmText="Delete"
        danger
      />
    </>
  )
}
