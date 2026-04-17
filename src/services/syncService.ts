import { db } from '../db/database'
import { supabase } from '../lib/supabase'

const TABLES = ['clients', 'sessions', 'treatmentPlans', 'treatmentGoals', 'behaviorDefinitions', 'parentTrainingPrograms'] as const

type SyncableTable = typeof TABLES[number]

let syncing = false
let retryCount = 0
const MAX_RETRIES = 4

async function syncTable(tableName: SyncableTable) {
  const userId = (await supabase.auth.getUser()).data.user?.id
  if (!userId) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (db as any)[tableName]
  const unsynced = await table.filter((row: { syncedAt?: string | null }) => !row.syncedAt).toArray()

  for (const row of unsynced) {
    const { error } = await supabase
      .from(tableName)
      .upsert({ ...row, user_id: userId }, { onConflict: 'id' })

    if (error) throw error

    await table.update(row.id, { syncedAt: new Date().toISOString() })
  }
}

async function runSync() {
  if (syncing) return
  syncing = true
  try {
    for (const tableName of TABLES) {
      await syncTable(tableName)
    }
    retryCount = 0
    dispatchSyncStatus('synced')
  } catch (err) {
    console.warn('Sync error:', err)
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000
      retryCount++
      setTimeout(runSync, delay)
    } else {
      dispatchSyncStatus('error')
    }
  } finally {
    syncing = false
  }
}

function dispatchSyncStatus(status: 'synced' | 'error' | 'offline') {
  window.dispatchEvent(new CustomEvent('syncStatus', { detail: status }))
}

export function initSync() {
  if (navigator.onLine) {
    runSync()
  } else {
    dispatchSyncStatus('offline')
  }

  window.addEventListener('online', () => {
    retryCount = 0
    runSync()
  })

  window.addEventListener('offline', () => {
    dispatchSyncStatus('offline')
  })
}

export function triggerSync() {
  if (navigator.onLine) runSync()
}
