// Offline-first sync engine for Supabase.
//
// Writes always go to Dexie first (so the UI is fast and works offline).
// Dexie hooks (in src/db/database.ts) automatically tag every write with
// _dirty=1 and ownerId. This service:
//   - flushes dirty rows to Supabase ("push")
//   - pulls newer remote rows back ("pull")
//   - re-runs both on a timer / when the network reconnects
//
// Pages don't need to know any of this beyond using `softDelete()` instead
// of `db.<table>.delete()`.

import {
  db,
  suspendSyncHooks,
  setCurrentOwnerId,
  SYNCED_TABLES,
  type Client,
  type Session,
} from '../db/database'
import type {
  TreatmentPlan,
  TreatmentGoal,
  BehaviorDefinition,
  ParentTrainingProgram,
} from '../types/treatmentPlan'
import { supabase, isSupabaseConfigured } from './supabase'

type SyncedTableName = (typeof SYNCED_TABLES)[number]

const REMOTE_TABLE: Record<SyncedTableName, string> = {
  clients: 'clients',
  sessions: 'sessions',
  treatmentPlans: 'treatment_plans',
  treatmentGoals: 'treatment_goals',
  behaviorDefinitions: 'behavior_definitions',
  parentTrainingPrograms: 'parent_training_programs',
}

// ----------------------------------------------------------------------------
// Sync status (subscribable for UI)
// ----------------------------------------------------------------------------

export interface SyncStatus {
  enabled: boolean
  online: boolean
  syncing: boolean
  pending: number
  lastSyncAt: string | null
  error: string | null
}

let status: SyncStatus = {
  enabled: false,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncing: false,
  pending: 0,
  lastSyncAt: null,
  error: null,
}

const listeners = new Set<(s: SyncStatus) => void>()

function emit(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch }
  listeners.forEach(l => l(status))
}

export function getSyncStatus(): SyncStatus {
  return status
}

export function subscribeSyncStatus(listener: (s: SyncStatus) => void): () => void {
  listeners.add(listener)
  listener(status)
  return () => listeners.delete(listener)
}

// ----------------------------------------------------------------------------
// Last sync timestamp persistence (per user)
// ----------------------------------------------------------------------------

function lastSyncKey(userId: string, table: SyncedTableName) {
  return `aba.lastSyncAt.${userId}.${table}`
}

function getLastSyncAt(userId: string, table: SyncedTableName): string | null {
  return localStorage.getItem(lastSyncKey(userId, table))
}

function setLastSyncAt(userId: string, table: SyncedTableName, iso: string) {
  localStorage.setItem(lastSyncKey(userId, table), iso)
}

// ----------------------------------------------------------------------------
// Local <-> Remote row converters
// ----------------------------------------------------------------------------

type SyncedRow = {
  id: string
  ownerId?: string
  createdAt: string
  updatedAt: string
  _dirty?: number
  _deleted?: number
  _syncedAt?: string
}

function tombstoneTimestamp(row: { _deleted?: number; updatedAt: string }) {
  return row._deleted ? row.updatedAt : null
}

function stripSyncMeta<T extends Record<string, unknown>>(row: T): T {
  const copy = { ...row }
  delete (copy as Record<string, unknown>).ownerId
  delete (copy as Record<string, unknown>)._dirty
  delete (copy as Record<string, unknown>)._deleted
  delete (copy as Record<string, unknown>)._syncedAt
  return copy
}

// Clients
function clientToRemote(c: Client) {
  return {
    id: c.id,
    owner_id: c.ownerId,
    name: c.name,
    date_of_birth: c.dateOfBirth ?? null,
    phone: c.phone ?? null,
    address: c.address ?? null,
    location: c.location ?? null,
    target_behaviors: c.targetBehaviors ?? [],
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    deleted_at: tombstoneTimestamp(c),
  }
}

interface RemoteClient {
  id: string
  owner_id: string
  name: string
  date_of_birth: string | null
  phone: string | null
  address: string | null
  location: string | null
  target_behaviors: unknown
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function clientFromRemote(r: RemoteClient): Client {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    dateOfBirth: r.date_of_birth ?? undefined,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    location: r.location ?? undefined,
    targetBehaviors: (r.target_behaviors as Client['targetBehaviors']) ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    _dirty: 0,
    _deleted: r.deleted_at ? 1 : 0,
    _syncedAt: new Date().toISOString(),
  }
}

// Sessions
function sessionToRemote(s: Session) {
  return {
    id: s.id,
    owner_id: s.ownerId,
    client_id: s.clientId,
    client_name: s.clientName,
    start_time: s.startTime,
    end_time: s.endTime ?? null,
    duration_ms: s.durationMs ?? null,
    behavior_data: s.behaviorData ?? [],
    notes: s.notes ?? '',
    created_at: s.createdAt,
    updated_at: s.updatedAt,
    deleted_at: tombstoneTimestamp(s),
  }
}

interface RemoteSession {
  id: string
  owner_id: string
  client_id: string
  client_name: string
  start_time: string
  end_time: string | null
  duration_ms: number | null
  behavior_data: unknown
  notes: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function sessionFromRemote(r: RemoteSession): Session {
  return {
    id: r.id,
    ownerId: r.owner_id,
    clientId: r.client_id,
    clientName: r.client_name,
    startTime: r.start_time,
    endTime: r.end_time ?? undefined,
    durationMs: r.duration_ms ?? undefined,
    behaviorData: (r.behavior_data as Session['behaviorData']) ?? [],
    notes: r.notes ?? '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    _dirty: 0,
    _deleted: r.deleted_at ? 1 : 0,
    _syncedAt: new Date().toISOString(),
  }
}

// Treatment plan / goal / behavior definition / parent training:
// schema is jsonb-blob style (id, owner_id, client_id, data, ...)
type BlobLocal =
  | TreatmentPlan
  | TreatmentGoal
  | BehaviorDefinition
  | ParentTrainingProgram
type LocalBlobRow = BlobLocal & SyncedRow & { clientId: string }

function blobToRemote(row: LocalBlobRow) {
  return {
    id: row.id,
    owner_id: row.ownerId,
    client_id: row.clientId,
    data: stripSyncMeta(row as unknown as Record<string, unknown>),
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: tombstoneTimestamp(row),
  }
}

interface RemoteBlob {
  id: string
  owner_id: string
  client_id: string
  data: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function blobFromRemote(r: RemoteBlob): LocalBlobRow {
  const local = {
    ...(r.data ?? {}),
    id: r.id,
    ownerId: r.owner_id,
    clientId: r.client_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    _dirty: 0,
    _deleted: r.deleted_at ? 1 : 0,
    _syncedAt: new Date().toISOString(),
  }
  return local as unknown as LocalBlobRow
}

// ----------------------------------------------------------------------------
// Per-table push/pull
// ----------------------------------------------------------------------------

async function withSuspendedHooks<T>(fn: () => Promise<T>): Promise<T> {
  suspendSyncHooks(true)
  try {
    return await fn()
  } finally {
    suspendSyncHooks(false)
  }
}

async function pushTable(table: SyncedTableName, ownerId: string): Promise<number> {
  if (!supabase) return 0
  const dirty = await db.table(table).where('_dirty').equals(1).toArray()
  if (dirty.length === 0) return 0

  // Make sure every row has the current ownerId stamped (handles initial
  // upload of pre-auth local data).
  for (const row of dirty) {
    if (!row.ownerId) row.ownerId = ownerId
  }

  let remoteRows: unknown[]
  switch (table) {
    case 'clients':
      remoteRows = (dirty as Client[]).map(clientToRemote)
      break
    case 'sessions':
      remoteRows = (dirty as Session[]).map(sessionToRemote)
      break
    default:
      remoteRows = (dirty as LocalBlobRow[]).map(blobToRemote)
  }

  const { error } = await supabase
    .from(REMOTE_TABLE[table])
    .upsert(remoteRows, { onConflict: 'id' })
  if (error) throw error

  const now = new Date().toISOString()
  await withSuspendedHooks(async () => {
    // Hard-delete tombstones locally; clear dirty flag on the rest.
    const tombstoneIds = dirty.filter(r => r._deleted).map(r => r.id)
    if (tombstoneIds.length) {
      await db.table(table).bulkDelete(tombstoneIds)
    }
    const liveIds = dirty.filter(r => !r._deleted).map(r => r.id)
    if (liveIds.length) {
      await db
        .table(table)
        .where('id')
        .anyOf(liveIds)
        .modify({ _dirty: 0, _syncedAt: now, ownerId })
    }
  })

  return dirty.length
}

async function pullTable(table: SyncedTableName, ownerId: string): Promise<number> {
  if (!supabase) return 0
  const since = getLastSyncAt(ownerId, table) ?? '1970-01-01T00:00:00Z'

  const { data, error } = await supabase
    .from(REMOTE_TABLE[table])
    .select('*')
    .eq('owner_id', ownerId)
    .gt('updated_at', since)
    .order('updated_at', { ascending: true })
    .limit(1000)
  if (error) throw error
  if (!data || data.length === 0) return 0

  let maxUpdatedAt = since
  await withSuspendedHooks(async () => {
    for (const remote of data) {
      const r = remote as { id: string; updated_at: string; deleted_at: string | null }
      if (r.updated_at > maxUpdatedAt) maxUpdatedAt = r.updated_at

      // Hard delete locally if remote is tombstoned.
      if (r.deleted_at) {
        await db.table(table).delete(r.id)
        continue
      }

      // Last-write-wins: skip if local is newer.
      const local = await db.table(table).get(r.id)
      if (local && (local as { updatedAt?: string }).updatedAt && (local as { updatedAt: string }).updatedAt >= r.updated_at) {
        continue
      }

      let localRow: unknown
      switch (table) {
        case 'clients':
          localRow = clientFromRemote(remote as RemoteClient)
          break
        case 'sessions':
          localRow = sessionFromRemote(remote as RemoteSession)
          break
        default:
          localRow = blobFromRemote(remote as RemoteBlob)
      }
      await db.table(table).put(localRow as never)
    }
  })

  setLastSyncAt(ownerId, table, maxUpdatedAt)
  return data.length
}

async function countPending(): Promise<number> {
  let total = 0
  for (const t of SYNCED_TABLES) {
    total += await db.table(t).where('_dirty').equals(1).count()
  }
  return total
}

// ----------------------------------------------------------------------------
// Public API: softDelete + manual sync
// ----------------------------------------------------------------------------

export async function softDelete(table: SyncedTableName, id: string) {
  await db.table(table).update(id, {
    _deleted: 1,
    _dirty: 1,
    updatedAt: new Date().toISOString(),
  })
  scheduleFlush()
}

export async function softDeleteWhere(
  table: SyncedTableName,
  field: string,
  value: string | number,
) {
  const ids = (await db.table(table).where(field).equals(value).primaryKeys()) as string[]
  for (const id of ids) await softDelete(table, id)
}

// ----------------------------------------------------------------------------
// Sync orchestration
// ----------------------------------------------------------------------------

let currentOwnerId: string | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null
let pullTimer: ReturnType<typeof setInterval> | null = null
const PULL_INTERVAL_MS = 60_000
const FLUSH_DEBOUNCE_MS = 1_000

export function scheduleFlush() {
  if (!currentOwnerId || !supabase || !status.online) return
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    void runSync({ pull: false })
  }, FLUSH_DEBOUNCE_MS)
}

export async function runSync(opts: { pull?: boolean } = {}): Promise<void> {
  const ownerId = currentOwnerId
  if (!ownerId || !supabase) return
  if (status.syncing) return
  if (!status.online) return

  emit({ syncing: true, error: null })
  try {
    for (const t of SYNCED_TABLES) {
      await pushTable(t, ownerId)
    }
    if (opts.pull !== false) {
      for (const t of SYNCED_TABLES) {
        await pullTable(t, ownerId)
      }
    }
    const pending = await countPending()
    emit({
      syncing: false,
      pending,
      lastSyncAt: new Date().toISOString(),
      error: null,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed'
    emit({ syncing: false, error: message, pending: await countPending() })
  }
}

export async function startSync(ownerId: string) {
  if (!isSupabaseConfigured) return
  currentOwnerId = ownerId
  setCurrentOwnerId(ownerId)

  // Mark any pre-auth local rows (no ownerId) so they upload on first push.
  await withSuspendedHooks(async () => {
    for (const t of SYNCED_TABLES) {
      await db.table(t).filter((r: { ownerId?: string }) => !r.ownerId).modify({
        ownerId,
        _dirty: 1,
      })
    }
  })

  emit({ enabled: true, pending: await countPending() })

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('focus', handleFocus)
  }

  if (pullTimer) clearInterval(pullTimer)
  pullTimer = setInterval(() => void runSync(), PULL_INTERVAL_MS)

  void runSync()
}

export function stopSync() {
  currentOwnerId = null
  setCurrentOwnerId(null)
  if (flushTimer) clearTimeout(flushTimer)
  if (pullTimer) clearInterval(pullTimer)
  flushTimer = null
  pullTimer = null
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    window.removeEventListener('focus', handleFocus)
  }
  emit({ enabled: false, syncing: false, pending: 0, lastSyncAt: null, error: null })
}

function handleOnline() {
  emit({ online: true })
  void runSync()
}
function handleOffline() {
  emit({ online: false })
}
function handleFocus() {
  void runSync()
}

// Re-emit pending count whenever Dexie changes a synced table so the UI badge
// stays accurate without polling.
if (typeof window !== 'undefined') {
  for (const t of SYNCED_TABLES) {
    db.table(t).hook('creating', () => {
      if (currentOwnerId) void recomputePending()
    })
    db.table(t).hook('updating', mods => {
      if (currentOwnerId) void recomputePending()
      return mods
    })
    db.table(t).hook('deleting', () => {
      if (currentOwnerId) void recomputePending()
    })
  }
}

let pendingDebounce: ReturnType<typeof setTimeout> | null = null
function recomputePending() {
  if (pendingDebounce) clearTimeout(pendingDebounce)
  pendingDebounce = setTimeout(async () => {
    pendingDebounce = null
    emit({ pending: await countPending() })
    scheduleFlush()
  }, 200)
}
