import { describe, it, expect } from 'vitest'
import { formatDuration } from '../utils/time'
import { getBehaviorValue } from '../utils/export'
import type { BehaviorData } from '../db/database'

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(45000)).toBe('0:45')
  })
  it('formats minutes and seconds', () => {
    expect(formatDuration(90000)).toBe('1:30')
  })
  it('formats hours', () => {
    expect(formatDuration(3661000)).toBe('1:01:01')
  })
  it('returns 0:00 for zero', () => {
    expect(formatDuration(0)).toBe('0:00')
  })
})

describe('getBehaviorValue', () => {
  it('returns frequency count', () => {
    const data: BehaviorData = { behaviorId: '1', behaviorName: 'Hitting', dataType: 'frequency', count: 7 }
    expect(getBehaviorValue(data)).toBe('7')
  })

  it('returns duration formatted', () => {
    const data: BehaviorData = { behaviorId: '1', behaviorName: 'Tantrum', dataType: 'duration', totalDurationMs: 120000 }
    expect(getBehaviorValue(data)).toBe('2:00')
  })

  it('returns interval percentage', () => {
    const data: BehaviorData = { behaviorId: '1', behaviorName: 'On-task', dataType: 'interval', intervals: [true, false, true, true] }
    expect(getBehaviorValue(data)).toContain('75%')
  })

  it('returns event trial summary', () => {
    const data: BehaviorData = { behaviorId: '1', behaviorName: 'Labeling', dataType: 'event', trials: [true, true, false, true] }
    expect(getBehaviorValue(data)).toContain('3/4')
    expect(getBehaviorValue(data)).toContain('75%')
  })

  it('handles empty interval', () => {
    const data: BehaviorData = { behaviorId: '1', behaviorName: 'X', dataType: 'interval', intervals: [] }
    expect(getBehaviorValue(data)).toBe('0%')
  })
})
