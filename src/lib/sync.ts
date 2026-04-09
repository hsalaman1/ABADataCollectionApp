import { supabase, isSupabaseConfigured } from './supabase'
import { db, type Client, type Session, type SyncQueueItem } from '../db/database'

// ---------------- row mapping ----------------
// Dexie uses camelCase; Supabase columns are snake_case.

interface ClientRow {
  id: string
  user_id: string
  name: string
  date_of_birth: string | null
  phone: string | null
  address: string | null
  location: string | null
  target_behaviors: Client['targetBehaviors']
  created_at: string
  updated_at: string
}

interface SessionRow {
  id: string
  user_id: string
  client_id: string
  client_name: string
  start_time: string
  end_time: string | null
  duration_ms: number | null
  behavior_data: Session['behaviorData']
  notes: string
  created_at: string
  updated_at: string
}

function clientToRow(client: Client, userId: string): ClientRow {
  return {
    id: client.id,
    user_id: userId,
    name: client.name,
    date_of_birth: client.dateOfBirth ?? null,
    phone: client.phone ?? null,
    address: client.address ?? null,
    location: client.location ?? null,
    target_behaviors: client.targetBehaviors,
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  }
}

function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    dateOfBirth: row.date_of_birth ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    location: row.location ?? undefined,
    targetBehaviors: row.target_behaviors ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function sessionToRow(session: Session, userId: string): SessionRow {
  return {
    id: session.id,
    user_id: userId,
    client_id: session.clientId,
    client_name: session.clientName,
    start_time: session.startTime,
    end_time: session.endTime ?? null,
    duration_ms: session.durationMs ?? null,
    behavior_data: session.behaviorData,
    notes: session.notes ?? '',
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  }
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    startTime: row.start_time,
    endTime: row.end_time ?? undefined,
    durationMs: row.duration_ms ?? undefined,
    behaviorData: row.behavior_data ?? [],
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ---------------- current user helper ----------------

async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

// ---------------- sync queue ----------------

async function enqueue(item: Omit<SyncQueueItem, 'id' | 'createdAt'>) {
  await db.syncQueue.add({
    ...item,
    createdAt: new Date().toISOString(),
  })
}

export async function flushQueue(): Promise<void> {
  if (!isSupabaseConfigured) return
  const userId = await currentUserId()
  if (!userId) return

  const items = await db.syncQueue.orderBy('createdAt').toArray()
  for (const item of items) {
    try {
      if (item.entity === 'client' && item.opType === 'upsert') {
        const row = clientToRow(item.payload as Client, userId)
        const { error } = await supabase.from('clients').upsert(row)
        if (error) throw error
      } else if (item.entity === 'client' && item.opType === 'delete') {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', item.payload as string)
        if (error) throw error
      } else if (item.entity === 'session' && item.opType === 'upsert') {
        const row = sessionToRow(item.payload as Session, userId)
        const { error } = await supabase.from('sessions').upsert(row)
        if (error) throw error
      } else if (item.entity === 'session' && item.opType === 'delete') {
        const { error } = await supabase
          .from('sessions')
          .delete()
          .eq('id', item.payload as string)
        if (error) throw error
      }
      if (item.id !== undefined) {
        await db.syncQueue.delete(item.id)
      }
    } catch (err) {
      // Leave this item (and everything after it) in the queue for the next
      // flush attempt. Stop here so ordering is preserved.
      console.warn('[sync] flushQueue stopped on error', err)
      return
    }
  }
}

// ---------------- push (write path) ----------------

export async function pushClient(client: Client): Promise<void> {
  if (!isSupabaseConfigured) return
  const userId = await currentUserId()
  if (!userId) return

  if (!navigator.onLine) {
    await enqueue({ entity: 'client', opType: 'upsert', payload: client })
    return
  }

  try {
    const { error } = await supabase.from('clients').upsert(clientToRow(client, userId))
    if (error) throw error
  } catch (err) {
    console.warn('[sync] pushClient failed, queuing', err)
    await enqueue({ entity: 'client', opType: 'upsert', payload: client })
  }
}

export async function deleteClientRemote(clientId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  const userId = await currentUserId()
  if (!userId) return

  if (!navigator.onLine) {
    await enqueue({ entity: 'client', opType: 'delete', payload: clientId })
    return
  }

  try {
    const { error } = await supabase.from('clients').delete().eq('id', clientId)
    if (error) throw error
  } catch (err) {
    console.warn('[sync] deleteClientRemote failed, queuing', err)
    await enqueue({ entity: 'client', opType: 'delete', payload: clientId })
  }
}

export async function pushSession(session: Session): Promise<void> {
  if (!isSupabaseConfigured) return
  const userId = await currentUserId()
  if (!userId) return

  if (!navigator.onLine) {
    await enqueue({ entity: 'session', opType: 'upsert', payload: session })
    return
  }

  try {
    const { error } = await supabase.from('sessions').upsert(sessionToRow(session, userId))
    if (error) throw error
  } catch (err) {
    // Never let a failing push block an in-progress session auto-save.
    console.warn('[sync] pushSession failed, queuing', err)
    await enqueue({ entity: 'session', opType: 'upsert', payload: session })
  }
}

export async function deleteSessionRemote(sessionId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  const userId = await currentUserId()
  if (!userId) return

  if (!navigator.onLine) {
    await enqueue({ entity: 'session', opType: 'delete', payload: sessionId })
    return
  }

  try {
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
    if (error) throw error
  } catch (err) {
    console.warn('[sync] deleteSessionRemote failed, queuing', err)
    await enqueue({ entity: 'session', opType: 'delete', payload: sessionId })
  }
}

// ---------------- pull (read path) ----------------

export async function pullAll(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  if (!navigator.onLine) return

  try {
    const [clientsRes, sessionsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', userId),
      supabase.from('sessions').select('*').eq('user_id', userId),
    ])

    if (clientsRes.error) throw clientsRes.error
    if (sessionsRes.error) throw sessionsRes.error

    const remoteClients = (clientsRes.data ?? []).map((row) => rowToClient(row as ClientRow))
    const remoteSessions = (sessionsRes.data ?? []).map((row) => rowToSession(row as SessionRow))

    // Merge: remote wins when its updated_at is newer than the local copy,
    // so we don't clobber a session currently being auto-saved.
    const localClients = await db.clients.toArray()
    const localClientById = new Map(localClients.map((c) => [c.id, c]))
    const clientsToWrite: Client[] = []
    for (const remote of remoteClients) {
      const local = localClientById.get(remote.id)
      if (!local || new Date(remote.updatedAt).getTime() >= new Date(local.updatedAt).getTime()) {
        clientsToWrite.push(remote)
      }
    }
    if (clientsToWrite.length > 0) {
      await db.clients.bulkPut(clientsToWrite)
    }

    const localSessions = await db.sessions.toArray()
    const localSessionById = new Map(localSessions.map((s) => [s.id, s]))
    const sessionsToWrite: Session[] = []
    for (const remote of remoteSessions) {
      const local = localSessionById.get(remote.id)
      if (!local || new Date(remote.updatedAt).getTime() >= new Date(local.updatedAt).getTime()) {
        sessionsToWrite.push(remote)
      }
    }
    if (sessionsToWrite.length > 0) {
      await db.sessions.bulkPut(sessionsToWrite)
    }
  } catch (err) {
    console.warn('[sync] pullAll failed', err)
  }
}

// ---------------- first-login migration ----------------

const migrationFlagKey = (userId: string) => `aba.migratedUserId.${userId}`

export async function migrateLocalToCloud(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  if (typeof localStorage !== 'undefined' && localStorage.getItem(migrationFlagKey(userId))) {
    return
  }
  if (!navigator.onLine) return

  try {
    const localClients = await db.clients.toArray()
    const localSessions = await db.sessions.toArray()

    if (localClients.length > 0) {
      const rows = localClients.map((c) => clientToRow(c, userId))
      const { error } = await supabase.from('clients').upsert(rows)
      if (error) throw error
    }

    if (localSessions.length > 0) {
      const rows = localSessions.map((s) => sessionToRow(s, userId))
      const { error } = await supabase.from('sessions').upsert(rows)
      if (error) throw error
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(migrationFlagKey(userId), 'true')
    }
  } catch (err) {
    console.warn('[sync] migrateLocalToCloud failed', err)
  }
}
