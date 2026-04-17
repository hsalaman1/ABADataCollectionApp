import type { Session, BehaviorData, TargetBehavior, BehaviorSTO, MasteryCriteria } from '../db/database'

export interface SessionMetrics {
  total: number
  correct: number
  independent: number
  correctPct: number
  independentPct: number
}

export function computeSessionMetrics(bd: BehaviorData): SessionMetrics {
  if (bd.dataType === 'event') {
    const trials = bd.trialsV2 ?? bd.trials?.map(c => ({ correct: c, prompt: 'independent' as const })) ?? []
    const total = trials.length
    const correct = trials.filter(t => t.correct).length
    const independent = trials.filter(t => t.correct && t.prompt === 'independent').length
    return {
      total,
      correct,
      independent,
      correctPct: total > 0 ? Math.round((correct / total) * 100) : 0,
      independentPct: total > 0 ? Math.round((independent / total) * 100) : 0,
    }
  }
  if (bd.dataType === 'task_analysis') {
    const trials = bd.taskAnalysisTrials ?? []
    if (trials.length === 0) return { total: 0, correct: 0, independent: 0, correctPct: 0, independentPct: 0 }
    const lastTrial = trials[trials.length - 1]
    const steps = lastTrial.stepResults.length
    const correct = lastTrial.stepResults.filter(r => r.correct).length
    const independent = lastTrial.stepResults.filter(r => r.correct && r.prompt === 'independent').length
    return {
      total: steps,
      correct,
      independent,
      correctPct: steps > 0 ? Math.round((correct / steps) * 100) : 0,
      independentPct: steps > 0 ? Math.round((independent / steps) * 100) : 0,
    }
  }
  return { total: 0, correct: 0, independent: 0, correctPct: 0, independentPct: 0 }
}

export interface MasteryStatus {
  met: boolean
  streak: number           // consecutive sessions meeting criteria
  recentPcts: number[]     // last N session percentages (most recent last)
}

export function checkBehaviorMastery(
  sessions: Session[],
  behaviorId: string,
  criteria: MasteryCriteria,
): MasteryStatus {
  // Sessions sorted oldest → newest
  const sorted = [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const pcts: number[] = []
  for (const session of sorted) {
    const bd = session.behaviorData.find(d => d.behaviorId === behaviorId)
    if (!bd) continue
    const m = computeSessionMetrics(bd)
    if (m.total === 0) continue
    pcts.push(criteria.metric === 'independent' ? m.independentPct : m.correctPct)
  }

  const n = criteria.consecutiveSessions
  if (pcts.length < n) {
    return { met: false, streak: 0, recentPcts: pcts.slice(-n) }
  }

  // Count the current streak of sessions meeting the threshold
  let streak = 0
  for (let i = pcts.length - 1; i >= 0; i--) {
    if (pcts[i] >= criteria.percentage) streak++
    else break
  }

  return {
    met: streak >= n,
    streak,
    recentPcts: pcts.slice(-n),
  }
}

export interface AdvanceResult {
  advanced: boolean
  mastered?: BehaviorSTO
  nextSto?: BehaviorSTO
  updatedBehavior: TargetBehavior
}

export function advanceSTOIfMastered(
  behavior: TargetBehavior,
  sessions: Session[],
): AdvanceResult {
  const stos = behavior.stos ?? []
  const criteria = behavior.masteryCriteria
  if (!criteria || stos.length === 0) {
    return { advanced: false, updatedBehavior: behavior }
  }

  const activeSto = stos.find(s => s.id === behavior.currentStoId && s.status === 'active')
    ?? stos.find(s => s.status === 'active')
  if (!activeSto) return { advanced: false, updatedBehavior: behavior }

  const effectiveCriteria = activeSto.criteria ?? criteria
  const status = checkBehaviorMastery(sessions, behavior.id, effectiveCriteria)
  if (!status.met) return { advanced: false, updatedBehavior: behavior }

  const now = new Date().toISOString()
  const updatedStos = stos.map(s =>
    s.id === activeSto.id ? { ...s, status: 'mastered' as const, masteredAt: now } : s
  )

  const activeIndex = stos.findIndex(s => s.id === activeSto.id)
  const nextSto = stos[activeIndex + 1]
  if (nextSto) {
    updatedStos[activeIndex + 1] = { ...nextSto, status: 'active' }
  }

  return {
    advanced: true,
    mastered: activeSto,
    nextSto,
    updatedBehavior: {
      ...behavior,
      stos: updatedStos,
      currentStoId: nextSto?.id ?? behavior.currentStoId,
    },
  }
}
