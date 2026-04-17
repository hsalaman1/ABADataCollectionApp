import { useRef, useState } from 'react'
import { downloadBackup, restoreFromFile } from '../utils/backup'
import { useToast } from './Toast'
import ConfirmDialog from './ConfirmDialog'

interface BackupInfo {
  clients: number
  sessions: number
  exportedAt: string
}

export default function BackupMenu() {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<{ file: File; info: BackupInfo } | null>(null)
  const [busy, setBusy] = useState(false)

  const handleBackupNow = async () => {
    setOpen(false)
    try {
      await downloadBackup()
      toast.success('Backup downloaded')
    } catch {
      toast.error('Backup failed — check storage permissions')
    }
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      setPendingRestore({
        file,
        info: {
          clients: data.clients?.length ?? 0,
          sessions: data.sessions?.length ?? 0,
          exportedAt: data.exportedAt ?? 'unknown',
        }
      })
      setOpen(false)
    } catch {
      toast.error('Could not read backup file — is it a valid JSON backup?')
    }
  }

  const confirmRestore = async () => {
    if (!pendingRestore) return
    setBusy(true)
    try {
      const report = await restoreFromFile(pendingRestore.file)
      toast.success(`Restored ${report.clients} client${report.clients !== 1 ? 's' : ''} and ${report.sessions} session${report.sessions !== 1 ? 's' : ''}`)
      setPendingRestore(null)
      window.location.reload()
    } catch (err) {
      toast.error(`Restore failed: ${err instanceof Error ? err.message : 'unknown error'}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Backup & Restore"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        {open && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 200 }}
              onClick={() => setOpen(false)}
            />
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              minWidth: 180,
              zIndex: 201,
              overflow: 'hidden',
            }}>
              <button
                onClick={handleBackupNow}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 14, textAlign: 'left' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Backup Now
              </button>
              <div style={{ borderTop: '1px solid var(--border)' }} />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 14, textAlign: 'left' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Restore from File
              </button>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <ConfirmDialog
        isOpen={!!pendingRestore}
        onClose={() => setPendingRestore(null)}
        onConfirm={confirmRestore}
        title="Restore from Backup"
        message={
          pendingRestore
            ? `This will replace ALL current data with the backup from ${new Date(pendingRestore.info.exportedAt).toLocaleDateString()} (${pendingRestore.info.clients} client${pendingRestore.info.clients !== 1 ? 's' : ''}, ${pendingRestore.info.sessions} session${pendingRestore.info.sessions !== 1 ? 's' : ''}). This cannot be undone.`
            : ''
        }
        confirmText={busy ? 'Restoring…' : 'Restore'}
        danger
      />
    </>
  )
}
