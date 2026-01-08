// STO (Short-Term Objective) Generation Utilities
// Based on BIP implementation specification

import type {
  ShortTermObjective,
  ProgressionMethod,
  GoalStatus,
  MeasurementType,
} from '../types/treatmentPlan';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate Short-Term Objectives based on progression method
 */
export function generateSTOs(
  baseline: number,
  masteryCriteria: number,
  method: ProgressionMethod,
  _measurementType: MeasurementType,
  unit?: string
): ShortTermObjective[] {
  switch (method) {
    case 'halving':
      return generateHalvingSTOs(baseline, masteryCriteria, unit);
    case 'standard_ladder':
      return generateStandardLadderSTOs(baseline, masteryCriteria, unit);
    case 'duration_progression':
      return generateDurationSTOs(baseline, masteryCriteria, unit);
    case 'custom':
    default:
      return [];
  }
}

/**
 * Generate STOs using halving method
 * For decrease behaviors - halve until reaching mastery
 */
function generateHalvingSTOs(
  baseline: number,
  masteryCriteria: number,
  unit?: string
): ShortTermObjective[] {
  const stos: ShortTermObjective[] = [];
  let currentTarget = Math.round(baseline / 2);
  let stoNum = 1;
  let previousValue = baseline;

  while (currentTarget > masteryCriteria) {
    stos.push({
      id: uuidv4(),
      stoNumber: stoNum,
      description: `Value will decrease from ${previousValue} to ${currentTarget}${unit ? ' ' + unit : ''} for three consecutive months`,
      target: currentTarget,
      unit,
      status: 'not_started' as GoalStatus,
    });
    previousValue = currentTarget;
    currentTarget = Math.round(currentTarget / 2);
    stoNum++;
  }

  // Final STO to mastery
  stos.push({
    id: uuidv4(),
    stoNumber: stoNum,
    description: `Value will decrease from ${previousValue} to ${masteryCriteria} or less${unit ? ' ' + unit : ''} for three consecutive months`,
    target: masteryCriteria,
    unit,
    status: 'not_started' as GoalStatus,
  });

  return stos;
}

/**
 * Generate STOs using standard ladder method
 * Standard progression: 0% → 50% → 75% → 80% → 90%
 */
function generateStandardLadderSTOs(
  baseline: number,
  masteryCriteria: number,
  unit?: string
): ShortTermObjective[] {
  const ladder = [50, 75, 80, 90];
  const stos: ShortTermObjective[] = [];
  let startVal = baseline;
  let stoNum = 1;

  for (const target of ladder) {
    if (target > baseline && target <= masteryCriteria) {
      stos.push({
        id: uuidv4(),
        stoNumber: stoNum,
        description: `Percentage will increase from ${startVal}% to ${target}%${unit ? ' ' + unit : ''} for three consecutive months`,
        target,
        unit,
        status: 'not_started' as GoalStatus,
      });
      startVal = target;
      stoNum++;
    }
  }

  // If mastery criteria is higher than 90, add final STO
  if (masteryCriteria > 90) {
    stos.push({
      id: uuidv4(),
      stoNumber: stoNum,
      description: `Percentage will increase from ${startVal}% to ${masteryCriteria}%${unit ? ' ' + unit : ''} for three consecutive months`,
      target: masteryCriteria,
      unit,
      status: 'not_started' as GoalStatus,
    });
  }

  return stos;
}

/**
 * Generate STOs for duration progression
 * For increasing duration skills (e.g., waiting, parallel play)
 */
function generateDurationSTOs(
  baseline: number,
  masteryCriteria: number,
  unit?: string
): ShortTermObjective[] {
  const milestones = calculateDurationMilestones(baseline, masteryCriteria);
  const stos: ShortTermObjective[] = [];
  let previousValue = baseline;

  milestones.forEach((milestone, index) => {
    const formattedPrev = formatDuration(previousValue, unit);
    const formattedTarget = formatDuration(milestone, unit);

    stos.push({
      id: uuidv4(),
      stoNumber: index + 1,
      description: `Duration will increase from ${formattedPrev} to ${formattedTarget} without problem behaviors for three consecutive months`,
      target: milestone,
      unit,
      status: 'not_started' as GoalStatus,
    });
    previousValue = milestone;
  });

  return stos;
}

/**
 * Calculate sensible duration milestones
 * Standard milestones: 15s, 30s, 1min, 2min, 2.5min, 3min, 5min, 7min, 10min
 */
function calculateDurationMilestones(start: number, end: number): number[] {
  // Standard milestones in seconds
  const standardMilestones = [15, 30, 60, 120, 150, 180, 300, 420, 600, 900, 1200];
  const milestones: number[] = [];

  for (const milestone of standardMilestones) {
    if (milestone > start && milestone <= end) {
      milestones.push(milestone);
    }
  }

  // Ensure the final target is included
  if (milestones.length === 0 || milestones[milestones.length - 1] !== end) {
    milestones.push(end);
  }

  return milestones;
}

/**
 * Format duration value for display
 */
function formatDuration(seconds: number, unit?: string): string {
  if (unit === 'minutes' || unit === 'minutes per month') {
    return `${seconds} minutes`;
  }

  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 120) {
    return seconds === 60 ? '1 minute' : `${seconds} seconds`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minutes`;
    }
    return `${minutes} minutes ${remainingSeconds} seconds`;
  }
}

/**
 * Calculate progress percentage for a goal
 */
export function calculateProgressPercentage(
  baseline: number,
  current: number | null,
  target: number,
  measurementType: MeasurementType
): number {
  if (current === null) return 0;

  if (measurementType === 'count' || measurementType === 'duration') {
    // For decrease goals: higher progress = lower current value
    if (target < baseline) {
      const totalReduction = baseline - target;
      const currentReduction = baseline - current;
      return Math.min(100, Math.max(0, (currentReduction / totalReduction) * 100));
    }
    // For increase goals
    const totalIncrease = target - baseline;
    const currentIncrease = current - baseline;
    return Math.min(100, Math.max(0, (currentIncrease / totalIncrease) * 100));
  }

  if (measurementType === 'percentage') {
    // For percentage-based goals (usually increasing)
    const totalIncrease = target - baseline;
    const currentIncrease = current - baseline;
    return Math.min(100, Math.max(0, (currentIncrease / totalIncrease) * 100));
  }

  return 0;
}

/**
 * Determine trend from progress data
 */
export function calculateTrend(
  progressData: { value: number | null }[],
  measurementType: MeasurementType
): 'improving' | 'stable' | 'declining' | 'insufficient_data' {
  const validData = progressData
    .filter((d) => d.value !== null)
    .map((d) => d.value as number);

  if (validData.length < 3) {
    return 'insufficient_data';
  }

  // Take last 3 data points
  const recent = validData.slice(-3);
  const first = recent[0];
  const last = recent[recent.length - 1];

  const isDecreaseGoal =
    measurementType === 'count' || measurementType === 'duration';

  const change = last - first;
  const threshold = Math.abs(first * 0.1); // 10% change threshold

  if (Math.abs(change) < threshold) {
    return 'stable';
  }

  if (isDecreaseGoal) {
    return change < 0 ? 'improving' : 'declining';
  } else {
    return change > 0 ? 'improving' : 'declining';
  }
}

/**
 * Find the current active STO based on progress
 */
export function findCurrentSTO(
  stos: ShortTermObjective[],
  _currentValue: number | null,
  _baseline: number,
  _measurementType: MeasurementType
): ShortTermObjective | null {
  if (!stos.length) return null;

  // Find first non-mastered STO
  const activeSTOs = stos.filter((sto) => sto.status !== 'mastered');
  if (activeSTOs.length === 0) return null;

  return activeSTOs[0];
}

/**
 * Check if an STO is mastered based on current value
 */
export function checkSTOMastery(
  sto: ShortTermObjective,
  progressData: { value: number | null; month: string }[],
  measurementType: MeasurementType
): boolean {
  // Need 3 consecutive months of meeting criteria
  const validData = progressData
    .filter((d) => d.value !== null)
    .slice(-3);

  if (validData.length < 3) return false;

  const isDecreaseGoal =
    measurementType === 'count' || measurementType === 'duration';

  return validData.every((d) => {
    const value = d.value as number;
    if (isDecreaseGoal) {
      return value <= sto.target;
    } else {
      return value >= sto.target;
    }
  });
}

/**
 * Generate monthly progress column labels
 */
export function generateMonthColumns(startDate: Date, months: number = 12): { key: string; label: string }[] {
  const columns: { key: string; label: string }[] = [];
  for (let i = 0; i < months; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
    const yearShort = date.toLocaleDateString('en-US', { year: '2-digit' });
    const label = `${monthShort} ${yearShort}`;
    const key = `${monthShort.toLowerCase()}${yearShort}`;
    columns.push({ key, label });
  }
  return columns;
}

/**
 * Get STO progression suggestion based on goal parameters
 */
export function suggestProgressionMethod(
  measurementType: MeasurementType,
  baseline: number,
  target: number
): ProgressionMethod {
  // For count/frequency behaviors targeting decrease
  if (measurementType === 'count' && target < baseline) {
    return 'halving';
  }

  // For percentage-based goals
  if (measurementType === 'percentage') {
    return 'standard_ladder';
  }

  // For duration goals (usually increasing)
  if (measurementType === 'duration') {
    if (target > baseline) {
      return 'duration_progression';
    }
    return 'halving';
  }

  // Default to standard ladder
  return 'standard_ladder';
}
