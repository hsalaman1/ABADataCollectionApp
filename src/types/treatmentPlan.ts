// Treatment Plan Types for ABA Data Collection App
// Based on BIP (Behavior Intervention Plan) specification

// ============================================================================
// Core Enums and Types
// ============================================================================

export type GoalCategory =
  | 'Behavior Reduction'
  | 'Social Skills'
  | 'Safety Behaviors'
  | 'Communication'
  | 'Daily Living Skills'
  | 'Parent Training';

export type MeasurementType = 'count' | 'percentage' | 'duration' | 'trials';

export type ProgressionMethod =
  | 'halving'           // For decrease behaviors - halve until reaching mastery
  | 'standard_ladder'   // 0% → 50% → 75% → 80% → 90%
  | 'duration_progression' // For duration increases (e.g., waiting, parallel play)
  | 'custom';

export type GoalStatus = 'not_started' | 'in_progress' | 'mastered' | 'on_hold' | 'discontinued';

export type BehaviorType = 'problem' | 'replacement' | 'target';

export type BehaviorFunction =
  | 'Escape/Avoidance'
  | 'Attention'
  | 'Tangible/Access'
  | 'Automatic/Sensory';

// ============================================================================
// Client Information
// ============================================================================

export interface Diagnosis {
  id: string;
  code: string;
  description: string;
  level?: string;
  diagnosingProvider?: string;
  dateOfDiagnosis?: string;
}

export interface Provider {
  name: string;
  taxId?: string;
  npi?: string;
}

export interface Analyst {
  name: string;
  bcbaNumber?: string;
  phone?: string;
  email?: string;
}

export interface PlanDates {
  initialAssessment?: string;
  secondAssessment?: string;
  authorizationPeriod?: string;
  planStartDate?: string;
  planEndDate?: string;
}

export interface ClientTreatmentInfo {
  clientId: string;
  beneficiaryDOD?: string;
  benefitsNumber?: string;
  primaryCareProvider?: string;
  diagnoses: Diagnosis[];
  planDates: PlanDates;
  leadAnalyst?: Analyst;
  provider?: Provider;
}

// ============================================================================
// Outcome Assessments
// ============================================================================

export interface AssessmentScore {
  standardScore?: number;
  tScore?: number;
  level?: string;
  interpretation?: string;
  percentile?: string;
}

export interface Vineland3Assessment {
  testDate: string;
  respondent: string;
  adaptiveBehavior: {
    communicationSkills?: AssessmentScore;
    dailyLivingSkills?: AssessmentScore;
    socialSkillsRelationships?: AssessmentScore;
    motorSkills?: AssessmentScore;
    overallSummary?: AssessmentScore;
  };
  maladaptiveBehavior?: {
    externalizingBehaviors?: string;
    internalizedBehaviors?: string;
    criticalItems?: string[];
  };
}

export interface PddbiAssessment {
  testDate: string;
  rater: string;
  domains: Record<string, AssessmentScore>;
}

export interface Srs2Assessment {
  testDate: string;
  rater: string;
  totalTScore: number;
  interpretation: string;
  domains: Record<string, AssessmentScore | number>;
}

export interface OutcomeAssessments {
  vineland3?: Vineland3Assessment;
  pddbi?: PddbiAssessment;
  srs2?: Srs2Assessment;
  other?: Record<string, unknown>;
}

// ============================================================================
// Behavior Definitions (for FBA)
// ============================================================================

export interface BehaviorDefinition {
  id: string;
  clientId: string;
  behaviorName: string;
  behaviorType: BehaviorType;
  operationalDefinition: string;
  measurementMethod: string;
  functions: BehaviorFunction[];
  baseline: string;
  antecedents?: string[];
  consequences?: string[];
  replacementBehaviors?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Short-Term Objectives (STOs)
// ============================================================================

export interface ShortTermObjective {
  id: string;
  stoNumber: number;
  description: string;
  target: number;
  unit?: string;
  status: GoalStatus;
  masteryDate?: string;
  startDate?: string;
  notes?: string;
}

// ============================================================================
// Monthly Progress Data
// ============================================================================

export interface MonthlyProgress {
  id: string;
  month: string; // 'Nov 25', 'Dec 25', etc.
  monthKey: string; // 'nov25', 'dec25', etc.
  value: number | null;
  notes?: string;
  recordedAt: string;
  recordedBy?: string;
}

// ============================================================================
// Treatment Goals
// ============================================================================

export interface TreatmentGoal {
  id: string;
  clientId: string;
  goalId: string; // e.g., 'PA-001', 'TR-001'
  category: GoalCategory;
  goalName: string;
  behaviorDefinition?: string;
  measurementType: MeasurementType;
  measurementUnit: string;
  baseline: number;
  baselineUnit?: string;
  dischargeGoal: string;
  masteryCriteria: string;
  shortTermObjectives: ShortTermObjective[];
  progressionMethod: ProgressionMethod;
  progressData: MonthlyProgress[];
  progressNotes?: string;
  status: GoalStatus;
  linkedBehaviorId?: string; // Link to BehaviorDefinition
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Parent Training Programs
// ============================================================================

export interface ProtocolSection {
  sectionName: string;
  steps: string[];
}

export interface TaskAnalysisStep {
  stepNumber: number;
  action: string;
  completed: boolean;
}

export interface ParentTrainingProgram {
  id: string;
  clientId: string;
  programId: string; // e.g., 'PT-001'
  programName: string;
  baseline: number;
  dischargeGoal: string;
  stoProgression: number[];
  shortTermObjectives: ShortTermObjective[];
  protocols: ProtocolSection[];
  taskAnalysis?: TaskAnalysisStep[];
  progressData: MonthlyProgress[];
  progressNotes?: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Interventions & Service Delivery
// ============================================================================

export interface ServiceCode {
  code: string;
  description: string;
  location: string;
  unitsPerWeek?: string;
  unitsPerMonth?: string;
  units6Months?: string;
}

export interface ServiceDelivery {
  recommendedIntensity?: {
    directBCBA?: string;
    parentTraining?: string;
    totalWeekly?: string;
  };
  locations?: string[];
  supervisionRequirements?: string;
  serviceCodes?: ServiceCode[];
  totalUnitsRequested?: {
    weekly?: number;
    monthly?: number;
    sixMonths?: number;
  };
}

export interface Interventions {
  teachingStrategies?: string[];
  reinforcementSchedule?: string;
  promptingHierarchy?: string[];
  generalizationPlan?: string;
  crisisManagement?: {
    priority?: string;
    steps?: string[];
  };
  preferences?: {
    highlyPreferred?: string[];
    noted?: string[];
  };
}

// ============================================================================
// Discharge Criteria
// ============================================================================

export interface ServiceFadingPhase {
  phase: number;
  name: string;
  trigger?: string;
  action?: string;
  hours?: string;
}

export interface DischargeCriteria {
  criteria?: string[];
  serviceFadingPlan?: ServiceFadingPhase[];
  aftercare?: {
    initial?: string;
    followUp?: string;
    boosterSessions?: string;
  };
}

// ============================================================================
// Complete Treatment Plan
// ============================================================================

export interface TreatmentPlan {
  id: string;
  clientId: string;
  planName: string;
  version: number;

  // Extraction metadata (if imported from document)
  extractionMetadata?: {
    sourceDocument?: string;
    extractedBy?: string;
    extractionDate?: string;
    author?: string;
  };

  // Client treatment info
  clientTreatmentInfo?: ClientTreatmentInfo;

  // Assessments
  outcomeAssessments?: OutcomeAssessments;

  // Behaviors
  behaviors: BehaviorDefinition[];

  // Goals
  goals: TreatmentGoal[];

  // Parent Training
  parentTrainingPrograms: ParentTrainingProgram[];

  // Service Information
  interventions?: Interventions;
  serviceDelivery?: ServiceDelivery;
  dischargeCriteria?: DischargeCriteria;

  // Plan status
  status: 'draft' | 'active' | 'completed' | 'archived';

  // Timestamps
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

// ============================================================================
// Table Configuration (for customizable tables)
// ============================================================================

export interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'progress';
  width: string | number;
  editable: boolean;
  required: boolean;
  options?: { value: string; label: string }[];
  format?: string;
}

export interface TableConfiguration {
  id: string;
  name: string;
  description: string;
  columns: ColumnConfig[];
  features: {
    sortable: boolean;
    filterable: boolean;
    groupable: boolean;
    exportable: ('csv' | 'pdf' | 'docx' | 'html' | 'print')[];
    inlineEditing: boolean;
  };
  styling: {
    headerBackground: string;
    headerTextColor?: string;
    alternateRowColors: boolean;
    borderStyle: 'single' | 'double' | 'none';
    fontSize: string;
  };
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  severity?: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportOptions {
  format: 'docx' | 'pdf' | 'html' | 'csv';
  includeCoverPage: boolean;
  includeSignatures: boolean;
  includeWatermark: boolean;
  watermarkText?: string;
  orientation?: 'portrait' | 'landscape';
  pageFormat?: 'letter' | 'a4';
}

export interface TreatmentPlanExportData {
  client: {
    firstName: string;
    middleInitial?: string;
    lastName: string;
    dateOfBirth: string;
    age?: string;
    gender?: string;
    parentGuardians?: string[];
    address?: string;
  };
  goals: TreatmentGoal[];
  behaviors: BehaviorDefinition[];
  parentTraining: ParentTrainingProgram[];
  serviceDelivery?: ServiceDelivery;
  leadAnalyst?: Analyst;
}

// ============================================================================
// Progress Report Types
// ============================================================================

export interface GoalProgressSummary {
  goalId: string;
  goalName: string;
  category: GoalCategory;
  baseline: number;
  currentValue: number | null;
  targetValue: number;
  percentProgress: number;
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  currentSTO: ShortTermObjective | null;
  masteredSTOs: number;
  totalSTOs: number;
}

export interface ProgressReport {
  clientId: string;
  reportDate: string;
  reportPeriod: {
    start: string;
    end: string;
  };
  goalSummaries: GoalProgressSummary[];
  parentTrainingSummaries: {
    programId: string;
    programName: string;
    currentAccuracy: number;
    targetAccuracy: number;
    trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  }[];
  overallProgress: {
    goalsOnTrack: number;
    goalsBehind: number;
    goalsMastered: number;
    totalGoals: number;
  };
  recommendations?: string[];
  generatedAt: string;
}
