import { useState } from 'react'
import { ANTECEDENT_OPTIONS, CONSEQUENCE_OPTIONS, type ABCRecord } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import Modal from './Modal'

interface ABCModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (record: ABCRecord) => void
  behaviorName: string
}

export default function ABCModal({ isOpen, onClose, onSave, behaviorName }: ABCModalProps) {
  const [antecedent, setAntecedent] = useState('')
  const [antecedentNote, setAntecedentNote] = useState('')
  const [consequence, setConsequence] = useState('')
  const [consequenceNote, setConsequenceNote] = useState('')

  const handleSave = () => {
    if (!antecedent || !consequence) return

    const record: ABCRecord = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      antecedent,
      antecedentNote: antecedentNote.trim() || undefined,
      consequence,
      consequenceNote: consequenceNote.trim() || undefined
    }

    onSave(record)

    // Reset form
    setAntecedent('')
    setAntecedentNote('')
    setConsequence('')
    setConsequenceNote('')
    onClose()
  }

  const handleClose = () => {
    setAntecedent('')
    setAntecedentNote('')
    setConsequence('')
    setConsequenceNote('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`ABC Data - ${behaviorName}`}
      footer={
        <>
          <button className="btn btn-outline" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!antecedent || !consequence}
          >
            Save ABC
          </button>
        </>
      }
    >
      <div className="input-group">
        <label htmlFor="antecedent">Antecedent (What happened before?) *</label>
        <select
          id="antecedent"
          value={antecedent}
          onChange={e => setAntecedent(e.target.value)}
        >
          <option value="">Select antecedent...</option>
          {ANTECEDENT_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="input-group">
        <label htmlFor="antecedentNote">Antecedent Notes (optional)</label>
        <textarea
          id="antecedentNote"
          value={antecedentNote}
          onChange={e => setAntecedentNote(e.target.value)}
          placeholder="Additional details about what happened before..."
          style={{ minHeight: 60 }}
        />
      </div>

      <div className="input-group">
        <label htmlFor="consequence">Consequence (What happened after?) *</label>
        <select
          id="consequence"
          value={consequence}
          onChange={e => setConsequence(e.target.value)}
        >
          <option value="">Select consequence...</option>
          {CONSEQUENCE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="input-group" style={{ marginBottom: 0 }}>
        <label htmlFor="consequenceNote">Consequence Notes (optional)</label>
        <textarea
          id="consequenceNote"
          value={consequenceNote}
          onChange={e => setConsequenceNote(e.target.value)}
          placeholder="Additional details about what happened after..."
          style={{ minHeight: 60 }}
        />
      </div>
    </Modal>
  )
}
