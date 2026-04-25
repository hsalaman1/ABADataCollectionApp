import Dexie, { type EntityTable } from 'dexie';
import type {
  TreatmentPlan,
  TreatmentGoal,
  BehaviorDefinition,
  ParentTrainingProgram,
} from '../types/treatmentPlan';

export type DataType = 'frequency' | 'duration' | 'interval' | 'event' | 'deceleration' | 'task_analysis';
export type BehaviorCategory = 'acquisition' | 'deceleration';
export type PromptLevel = 'independent' | 'gestural' | 'verbal' | 'partial_physical' | 'full_physical';

export const PROMPT_LABELS: Record<PromptLevel, string> = {
  independent: 'Ind',
  gestural: 'Gest',
  verbal: 'Verbal',
  partial_physical: 'PP',
  full_physical: 'FP',
};

export const PROMPT_ORDER: PromptLevel[] = [
  'independent', 'gestural', 'verbal', 'partial_physical', 'full_physical'
];

export interface Trial {
  correct: boolean;
  prompt: PromptLevel;
  timestamp: string;
}

export interface TaskAnalysisStep {
  stepNumber: number;
  description: string;
}

export type ChainingType = 'forward' | 'backward' | 'total_task';

export interface TaskAnalysisStepResult {
  stepNumber: number;
  prompt: PromptLevel;
  correct: boolean;
}

export interface TaskAnalysisTrial {
  timestamp: string;
  stepResults: TaskAnalysisStepResult[];
}

// Predefined ABC options
export const ANTECEDENT_OPTIONS = [
  'Demand placed',
  'Denied access',
  'Transition',
  'Low attention',
  'Task presented',
  'Alone/no interaction',
  'Change in routine',
  'Other'
] as const;

export const CONSEQUENCE_OPTIONS = [
  'Escape provided',
  'Attention given',
  'Access to item',
  'Ignored',
  'Redirected',
  'Physical guidance',
  'Verbal prompt',
  'Other'
] as const;

export interface ABCRecord {
  id: string;
  timestamp: string;
  antecedent: string;
  antecedentNote?: string;
  consequence: string;
  consequenceNote?: string;
}

export interface MasteryCriteria {
  percentage: number;           // 0–100
  consecutiveSessions: number;
  metric: 'independent' | 'correct';
}

export interface BehaviorSTO {
  id: string;
  description: string;
  criteria: MasteryCriteria;
  status: 'active' | 'mastered';
  masteredAt?: string;
}

export interface TargetBehavior {
  id: string;
  name: string;
  definition: string;
  dataType: DataType;
  category: BehaviorCategory;
  isActive?: boolean;
  // Task analysis config (dataType === 'task_analysis')
  taskAnalysis?: {
    steps: TaskAnalysisStep[];
    chainingType: ChainingType;
    currentStep?: number; // 1-indexed step currently being taught
  };
  // Mastery
  masteryCriteria?: MasteryCriteria;
  stos?: BehaviorSTO[];
  currentStoId?: string;
}

// Sync metadata applied to every cloud-synced row.
// Pages don't need to set these — Dexie hooks (see bottom of file) do.
export interface SyncMeta {
  ownerId?: string;        // Supabase auth.uid() of the owner; null until first sync
  _dirty?: number;         // 1 = needs upload, 0 = synced
  _deleted?: number;       // 1 = tombstone (soft delete), 0 = present
  _syncedAt?: string;      // ISO timestamp of last successful upload
}

export interface Client extends SyncMeta {
  id: string;
  name: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  location?: string;
  targetBehaviors: TargetBehavior[];
  createdAt: string;
  updatedAt: string;
}

export interface BehaviorData {
  behaviorId: string;
  behaviorName: string;
  dataType: DataType;
  category?: BehaviorCategory;
  // For frequency
  count?: number;
  // For duration
  totalDurationMs?: number;
  // For interval
  intervalLengthSec?: number;
  intervals?: boolean[]; // true = occurrence, false = non-occurrence
  // For event recording (legacy — kept for old sessions)
  trials?: boolean[]; // true = correct (+), false = incorrect (-)
  totalTrials?: number;
  correctTrials?: number;
  // For event recording (v2 — prompt-level trials)
  trialsV2?: Trial[];
  independentTrials?: number;
  // For task analysis
  taskAnalysisTrials?: TaskAnalysisTrial[];
  // For deceleration (combines frequency + duration + ABC)
  decelCount?: number;
  decelDurationMs?: number;
  abcRecords?: ABCRecord[];
}

export interface Session extends SyncMeta {
  id: string;
  clientId: string;
  clientName: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  behaviorData: BehaviorData[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const db = new Dexie('ABADataApp') as Dexie & {
  clients: EntityTable<Client, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  treatmentPlans: EntityTable<TreatmentPlan, 'id'>;
  treatmentGoals: EntityTable<TreatmentGoal, 'id'>;
  behaviorDefinitions: EntityTable<BehaviorDefinition, 'id'>;
  parentTrainingPrograms: EntityTable<ParentTrainingProgram, 'id'>;
};

// Version 2: Added behavior category field
db.version(2).stores({
  clients: 'id, name, createdAt, updatedAt',
  sessions: 'id, clientId, startTime, createdAt'
}).upgrade(tx => {
  // Migrate existing behaviors to have category field
  return tx.table('clients').toCollection().modify(client => {
    client.targetBehaviors = client.targetBehaviors.map((behavior: TargetBehavior) => ({
      ...behavior,
      category: behavior.category || 'acquisition',
      isActive: behavior.isActive ?? true
    }));
  });
});

// Version 3: Added treatment plan tables
db.version(3).stores({
  clients: 'id, name, createdAt, updatedAt',
  sessions: 'id, clientId, startTime, createdAt',
  treatmentPlans: 'id, clientId, status, createdAt, updatedAt',
  treatmentGoals: 'id, clientId, goalId, category, status, createdAt',
  behaviorDefinitions: 'id, clientId, behaviorName, behaviorType, createdAt',
  parentTrainingPrograms: 'id, clientId, programId, status, createdAt'
});

// Version 4: Sync metadata for Supabase cloud sync.
// _dirty=1 marks rows that still need to be pushed; ownerId scopes per user.
// Existing rows are marked dirty so they upload on first sign-in.
const SYNCED_TABLE_NAMES = [
  'clients',
  'sessions',
  'treatmentPlans',
  'treatmentGoals',
  'behaviorDefinitions',
  'parentTrainingPrograms',
] as const;

db.version(4).stores({
  clients: 'id, name, createdAt, updatedAt, ownerId, _dirty, _deleted',
  sessions: 'id, clientId, startTime, createdAt, updatedAt, ownerId, _dirty, _deleted',
  treatmentPlans: 'id, clientId, status, createdAt, updatedAt, ownerId, _dirty, _deleted',
  treatmentGoals: 'id, clientId, goalId, category, status, createdAt, updatedAt, ownerId, _dirty, _deleted',
  behaviorDefinitions: 'id, clientId, behaviorName, behaviorType, createdAt, updatedAt, ownerId, _dirty, _deleted',
  parentTrainingPrograms: 'id, clientId, programId, status, createdAt, updatedAt, ownerId, _dirty, _deleted',
}).upgrade(async tx => {
  for (const name of SYNCED_TABLE_NAMES) {
    await tx.table(name).toCollection().modify((row: Record<string, unknown>) => {
      row._dirty = 1;
      row._deleted = 0;
      if (!row.updatedAt) row.updatedAt = row.createdAt ?? new Date().toISOString();
    });
  }
});

// ----------------------------------------------------------------------------
// Sync hooks
// ----------------------------------------------------------------------------
// Every create/update on a synced table is automatically tagged with _dirty=1
// so the sync service knows to push it. The sync service itself sets
// `suspendSyncHooks(true)` while clearing dirty flags so it doesn't loop.

let syncHooksSuspended = false;
let currentOwnerId: string | null = null;

export function suspendSyncHooks(suspend: boolean) {
  syncHooksSuspended = suspend;
}

export function setCurrentOwnerId(ownerId: string | null) {
  currentOwnerId = ownerId;
}

export function getCurrentOwnerId(): string | null {
  return currentOwnerId;
}

export const SYNCED_TABLES = SYNCED_TABLE_NAMES;

for (const name of SYNCED_TABLE_NAMES) {
  const table = db.table(name);
  table.hook('creating', (_pk, obj) => {
    if (syncHooksSuspended) return;
    const row = obj as Record<string, unknown>;
    if (currentOwnerId && !row.ownerId) row.ownerId = currentOwnerId;
    if (row._dirty === undefined) row._dirty = 1;
    if (row._deleted === undefined) row._deleted = 0;
    if (!row.updatedAt) row.updatedAt = new Date().toISOString();
  });
  table.hook('updating', mods => {
    if (syncHooksSuspended) return; // leave the update untouched
    const next: Record<string, unknown> = { ...mods, _dirty: 1 };
    if (!('updatedAt' in next)) next.updatedAt = new Date().toISOString();
    return next;
  });
}

export { db };

// Re-export types for convenience
export type {
  TreatmentPlan,
  TreatmentGoal,
  BehaviorDefinition,
  ParentTrainingProgram,
} from '../types/treatmentPlan';
