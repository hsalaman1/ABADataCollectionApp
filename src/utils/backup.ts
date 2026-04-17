import { db } from '../db/database'

const LAST_BACKUP_KEY = 'lastBackupAt'
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface BackupData {
  version: number
  exportedAt: string
  clients: unknown[]
  sessions: unknown[]
  treatmentPlans: unknown[]
  treatmentGoals: unknown[]
  behaviorDefinitions: unknown[]
  parentTrainingPrograms: unknown[]
}

export async function exportAllData(): Promise<Blob> {
  const [clients, sessions, treatmentPlans, treatmentGoals, behaviorDefinitions, parentTrainingPrograms] =
    await Promise.all([
      db.clients.toArray(),
      db.sessions.toArray(),
      db.treatmentPlans.toArray(),
      db.treatmentGoals.toArray(),
      db.behaviorDefinitions.toArray(),
      db.parentTrainingPrograms.toArray(),
    ])

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    clients,
    sessions,
    treatmentPlans,
    treatmentGoals,
    behaviorDefinitions,
    parentTrainingPrograms,
  }

  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadBackup() {
  const blob = await exportAllData()
  const date = new Date().toISOString().split('T')[0]
  triggerDownload(blob, `aba-backup-${date}.json`)
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
}

export interface RestoreReport {
  clients: number
  sessions: number
}

export async function restoreFromFile(file: File): Promise<RestoreReport> {
  const text = await file.text()
  const data: BackupData = JSON.parse(text)

  if (data.version !== 1) throw new Error(`Unsupported backup version: ${data.version}`)

  // Clear then repopulate
  await db.clients.clear()
  await db.sessions.clear()
  await db.treatmentPlans.clear()
  await db.treatmentGoals.clear()
  await db.behaviorDefinitions.clear()
  await db.parentTrainingPrograms.clear()

  if (data.clients?.length) await db.clients.bulkAdd(data.clients as never[])
  if (data.sessions?.length) await db.sessions.bulkAdd(data.sessions as never[])
  if (data.treatmentPlans?.length) await db.treatmentPlans.bulkAdd(data.treatmentPlans as never[])
  if (data.treatmentGoals?.length) await db.treatmentGoals.bulkAdd(data.treatmentGoals as never[])
  if (data.behaviorDefinitions?.length) await db.behaviorDefinitions.bulkAdd(data.behaviorDefinitions as never[])
  if (data.parentTrainingPrograms?.length) await db.parentTrainingPrograms.bulkAdd(data.parentTrainingPrograms as never[])

  return {
    clients: data.clients?.length ?? 0,
    sessions: data.sessions?.length ?? 0,
  }
}

export function isBackupDue(): boolean {
  const last = localStorage.getItem(LAST_BACKUP_KEY)
  if (!last) return true
  return Date.now() - new Date(last).getTime() > BACKUP_INTERVAL_MS
}
