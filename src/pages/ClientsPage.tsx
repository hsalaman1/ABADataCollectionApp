import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db, type Client, type TargetBehavior, type DataType, type BehaviorCategory } from '../db/database'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'

interface BehaviorFormData {
  id: string
  name: string
  definition: string
  dataType: DataType
  category: BehaviorCategory
  isActive: boolean
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray())
  const sessions = useLiveQuery(() => db.sessions.toArray())
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isTabletView, setIsTabletView] = useState(window.innerWidth >= 960)

  // Client form state
  const [name, setName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [location, setLocation] = useState('')
  const [behaviors, setBehaviors] = useState<BehaviorFormData[]>([])
  const [behaviorTab, setBehaviorTab] = useState<BehaviorCategory>('acquisition')

  // Behavior modal state
  const [showBehaviorModal, setShowBehaviorModal] = useState(false)
  const [editingBehavior, setEditingBehavior] = useState<BehaviorFormData | null>(null)
  const [behaviorName, setBehaviorName] = useState('')
  const [behaviorDefinition, setBehaviorDefinition] = useState('')
  const [behaviorType, setBehaviorType] = useState<DataType>('frequency')
  const [behaviorCategory, setBehaviorCategory] = useState<BehaviorCategory>('acquisition')
  const [deleteBehavior, setDeleteBehavior] = useState<BehaviorFormData | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsTabletView(window.innerWidth >= 960)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (selectedClient) {
      setName(selectedClient.name)
      setDateOfBirth(selectedClient.dateOfBirth || '')
      setPhone(selectedClient.phone || '')
      setAddress(selectedClient.address || '')
      setLocation(selectedClient.location || '')
      setBehaviors(selectedClient.targetBehaviors.map(b => ({
        ...b,
        category: b.category || 'acquisition',
        isActive: b.isActive ?? true
      })))
    } else {
      clearForm()
    }
  }, [selectedClient])

  const clearForm = () => {
    setName('')
    setDateOfBirth('')
    setPhone('')
    setAddress('')
    setLocation('')
    setBehaviors([])
  }

  const getSessionCount = (clientId: string) => {
    return sessions?.filter(s => s.clientId === clientId).length || 0
  }

  const handleDelete = async () => {
    if (deleteClient) {
      await db.sessions.where('clientId').equals(deleteClient.id).delete()
      await db.clients.delete(deleteClient.id)
      if (selectedClient?.id === deleteClient.id) {
        setSelectedClient(null)
      }
      setDeleteClient(null)
    }
  }

  const openBehaviorModal = (behavior?: BehaviorFormData) => {
    if (behavior) {
      setEditingBehavior(behavior)
      setBehaviorName(behavior.name)
      setBehaviorDefinition(behavior.definition)
      setBehaviorType(behavior.dataType)
      setBehaviorCategory(behavior.category)
    } else {
      setEditingBehavior(null)
      setBehaviorName('')
      setBehaviorDefinition('')
      if (behaviorTab === 'deceleration') {
        setBehaviorType('deceleration')
        setBehaviorCategory('deceleration')
      } else {
        setBehaviorType('event')
        setBehaviorCategory('acquisition')
      }
    }
    setShowBehaviorModal(true)
  }

  const saveBehavior = () => {
    if (!behaviorName.trim()) return

    const newBehavior: BehaviorFormData = {
      id: editingBehavior?.id || uuidv4(),
      name: behaviorName.trim(),
      definition: behaviorDefinition.trim(),
      dataType: behaviorType,
      category: behaviorCategory,
      isActive: editingBehavior?.isActive ?? true
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

  const handleSaveClient = async () => {
    if (!name.trim()) return

    const now = new Date().toISOString()
    const targetBehaviors: TargetBehavior[] = behaviors.map(b => ({
      id: b.id,
      name: b.name,
      definition: b.definition,
      dataType: b.dataType,
      category: b.category,
      isActive: b.isActive
    }))

    if (selectedClient) {
      await db.clients.update(selectedClient.id, {
        name: name.trim(),
        dateOfBirth: dateOfBirth || undefined,
        phone: phone || undefined,
        address: address || undefined,
        location: location || undefined,
        targetBehaviors,
        updatedAt: now
      })
      // Update local state
      setSelectedClient({
        ...selectedClient,
        name: name.trim(),
        dateOfBirth: dateOfBirth || undefined,
        phone: phone || undefined,
        address: address || undefined,
        location: location || undefined,
        targetBehaviors,
        updatedAt: now
      })
    } else {
      const newClient: Client = {
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
      await db.clients.add(newClient)
      setSelectedClient(newClient)
    }
  }

  const handleNewClient = () => {
    setSelectedClient(null)
    clearForm()
  }

  const filteredBehaviors = behaviors.filter(b => b.category === behaviorTab)
  const acqCount = behaviors.filter(b => b.category === 'acquisition').length
  const decelCount = behaviors.filter(b => b.category === 'deceleration').length

  // Mobile view - navigate to separate page
  if (!isTabletView) {
    return (
      <>
        <header className="page-header">
          <h1>Clients</h1>
          <div style={{ width: 48 }} />
        </header>

        <div className="container">
          {clients && clients.length > 0 ? (
            <div>
              {clients.map(client => (
                <div
                  key={client.id}
                  className="list-item"
                  onClick={() => navigate(`/clients/${client.id}/edit`)}
                >
                  <div className="list-item-content">
                    <div className="list-item-title">{client.name}</div>
                    <div className="list-item-subtitle">
                      {client.targetBehaviors.length} behavior{client.targetBehaviors.length !== 1 ? 's' : ''} · {getSessionCount(client.id)} session{getSessionCount(client.id) !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    className="list-item-action"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteClient(client)
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
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <h3>No clients yet</h3>
              <p>Add your first client to get started with data collection.</p>
              <button className="btn btn-primary" onClick={() => navigate('/clients/new')}>
                Add Client
              </button>
            </div>
          )}
        </div>

        <button className="fab" onClick={() => navigate('/clients/new')}>
          +
        </button>

        <ConfirmDialog
          isOpen={!!deleteClient}
          onClose={() => setDeleteClient(null)}
          onConfirm={handleDelete}
          title="Delete Client"
          message={`Are you sure you want to delete ${deleteClient?.name}? This will also delete all session data for this client.`}
          confirmText="Delete"
          danger
        />
      </>
    )
  }

  // Tablet/Desktop 3-panel view
  return (
    <>
      <header className="page-header">
        <h1>Client Management</h1>
        <button
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontSize: 14 }}
          onClick={handleNewClient}
        >
          + New Client
        </button>
      </header>

      <div className="three-panel-layout">
        {/* Panel 1: Client List */}
        <div className="panel client-list-panel">
          <div className="panel-header">
            <h2>Clients</h2>
          </div>
          <div className="panel-content">
            {clients && clients.length > 0 ? (
              clients.map(client => (
                <div
                  key={client.id}
                  className={`panel-list-item ${selectedClient?.id === client.id ? 'selected' : ''}`}
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="panel-list-item-name">{client.name}</div>
                  <div className="panel-list-item-count">{getSessionCount(client.id)}</div>
                </div>
              ))
            ) : (
              <div className="panel-empty">No clients yet</div>
            )}
          </div>
        </div>

        {/* Panel 2: Client Details */}
        <div className="panel client-details-panel">
          <div className="panel-header">
            <h2>{selectedClient ? 'Edit Client' : 'New Client'}</h2>
            {selectedClient && (
              <button
                className="panel-action-btn danger"
                onClick={() => setDeleteClient(selectedClient)}
              >
                Delete
              </button>
            )}
          </div>
          <div className="panel-content">
            <div className="input-group">
              <label htmlFor="name">Client Name *</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter client name"
              />
            </div>

            <div className="input-group">
              <label htmlFor="dob">Date of Birth</label>
              <input
                type="date"
                id="dob"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g., 407-555-1234"
              />
            </div>

            <div className="input-group">
              <label htmlFor="address">Address</label>
              <input
                type="text"
                id="address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g., 123 Main St, City, FL"
              />
            </div>

            <div className="input-group">
              <label htmlFor="location">Location</label>
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

            <button
              className="btn btn-primary btn-block"
              onClick={handleSaveClient}
              disabled={!name.trim()}
            >
              {selectedClient ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </div>

        {/* Panel 3: Target Behaviors */}
        <div className="panel behaviors-panel">
          <div className="panel-header">
            <h2>Target Behaviors</h2>
            <button
              className="panel-action-btn"
              onClick={() => openBehaviorModal()}
            >
              + Add
            </button>
          </div>
          <div className="panel-content">
            {/* Behavior Tabs */}
            <div className="behavior-tabs mb-4">
              <button
                className={`behavior-tab ${behaviorTab === 'acquisition' ? 'active' : ''}`}
                onClick={() => setBehaviorTab('acquisition')}
              >
                Acq ({acqCount})
              </button>
              <button
                className={`behavior-tab decel ${behaviorTab === 'deceleration' ? 'active' : ''}`}
                onClick={() => setBehaviorTab('deceleration')}
              >
                Decel ({decelCount})
              </button>
            </div>

            {filteredBehaviors.length > 0 ? (
              filteredBehaviors.map(behavior => (
                <div
                  key={behavior.id}
                  className={`panel-behavior-item ${behavior.category === 'deceleration' ? 'decel' : ''} ${!behavior.isActive ? 'inactive' : ''}`}
                >
                  <div
                    className="panel-behavior-content"
                    onClick={() => openBehaviorModal(behavior)}
                  >
                    <div className="panel-behavior-name">
                      {behavior.name}
                      {!behavior.isActive && <span className="inactive-badge">Inactive</span>}
                    </div>
                    <div className="panel-behavior-type">{behavior.dataType}</div>
                  </div>
                  <button
                    className="panel-behavior-action"
                    onClick={() => toggleBehaviorActive(behavior.id)}
                    title={behavior.isActive ? 'Mark Inactive' : 'Mark Active'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={behavior.isActive ? 'var(--success)' : 'var(--text-secondary)'} strokeWidth="2">
                      {behavior.isActive ? (
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
                      ) : (
                        <circle cx="12" cy="12" r="10" />
                      )}
                    </svg>
                  </button>
                  <button
                    className="panel-behavior-action"
                    onClick={() => setDeleteBehavior(behavior)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="panel-empty">
                No {behaviorTab === 'acquisition' ? 'acquisition' : 'deceleration'} behaviors
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Behavior Modal */}
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
            disabled={behaviorCategory === 'deceleration'}
          >
            {behaviorCategory === 'acquisition' ? (
              <>
                <option value="event">Event Recording (trials +/- for acquisition)</option>
                <option value="frequency">Frequency (count occurrences)</option>
                <option value="duration">Duration (time the behavior lasts)</option>
                <option value="interval">Interval (occurrence each interval)</option>
              </>
            ) : (
              <option value="deceleration">Deceleration (frequency + duration + ABC)</option>
            )}
          </select>
          {behaviorCategory === 'deceleration' && (
            <p className="text-sm text-secondary mt-2">
              Deceleration behaviors track frequency count, duration, and ABC data automatically.
            </p>
          )}
        </div>
      </Modal>

      {/* Delete Client Confirm */}
      <ConfirmDialog
        isOpen={!!deleteClient}
        onClose={() => setDeleteClient(null)}
        onConfirm={handleDelete}
        title="Delete Client"
        message={`Are you sure you want to delete ${deleteClient?.name}? This will also delete all session data for this client.`}
        confirmText="Delete"
        danger
      />

      {/* Delete Behavior Confirm */}
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
