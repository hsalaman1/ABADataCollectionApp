import Dexie, { type EntityTable } from 'dexie';

export type DataType = 'frequency' | 'duration' | 'interval' | 'event' | 'deceleration';
export type BehaviorCategory = 'acquisition' | 'deceleration';

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

export interface TargetBehavior {
  id: string;
  name: string;
  definition: string;
  dataType: DataType;
  category: BehaviorCategory;
  isActive?: boolean;
}

export interface Client {
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
  // For event recording (acquisition skills)
  trials?: boolean[]; // true = correct (+), false = incorrect (-)
  totalTrials?: number;
  correctTrials?: number;
  // For deceleration (combines frequency + duration + ABC)
  decelCount?: number;
  decelDurationMs?: number;
  abcRecords?: ABCRecord[];
}

export interface Session {
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
};

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

export { db };
