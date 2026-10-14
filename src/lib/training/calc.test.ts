import { describe, expect, it } from 'vitest'
import { aggregateByPeriod, cardioSessions, computeRecords, e1rm, formatDurationShort, formatKm, formatPace, groupSessions, periodDelta, setVolume, suggestNext } from './calc'
import type { HistorySet } from './types'

let n = 0
function s(workout: string, date: string, weight: number | null, reps: number | null, extra: Partial<HistorySet> = {}): HistorySet {
  return {
    set_id: `s${n++}`,
    workout_id: workout,
    workout_name: 'Push',
    started_at: date,
    exercise_id: 'ex1',
    exercise_position: 0,
    set_position: n,
    set_type: 'normal',
    weight,
    reps,
    rir: null,
    completed: true,
    duration_seconds: null,
    distance_m: null,
    ...extra,
  }
}

describe('e1rm', () => {
  it('uses Epley and returns weight for singles', () => {
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(100, 5)).toBeCloseTo(116.7, 1)
  })
  it('is null for invalid or high-rep sets', () => {
    expect(e1rm(0, 5)).toBeNull()
    expect(e1rm(100, 0)).toBeNull()
    expect(e1rm(100, 15)).toBeNull()
    expect(e1rm(null, 5)).toBeNull()
  })
})

describe('setVolume', () => {
  it('doubles per-dumbbell weight', () => {
    expect(setVolume(20, 10, 'per_dumbbell')).toBe(400)
    expect(setVolume(20, 10, 'total')).toBe(200)
    expect(setVolume(20, null)).toBe(0)
  })
})

describe('groupSessions', () => {
  it('ignores warm-ups and uncompleted sets in working stats', () => {
    const hist = [
      s('w1', '2026-10-01T10:00:00Z', 40, 10, { set_type: 'warmup' }),
      s('w1', '2026-10-01T10:00:00Z', 80, 8),
      s('w1', '2026-10-01T10:00:00Z', 85, 6),
      s('w1', '2026-10-01T10:00:00Z', 200, 6, { completed: false }),
    ]
    const [sess] = groupSessions(hist)
    expect(sess.workingSets).toHaveLength(2)
    expect(sess.topWeight).toBe(85)
    expect(sess.volume).toBe(80 * 8 + 85 * 6)
    expect(sess.bestE1rm).toBeCloseTo(102, 0)
  })
  it('sorts sessions chronologically', () => {
    const hist = [s('b', '2026-10-05T10:00:00Z', 50, 5), s('a', '2026-10-01T10:00:00Z', 50, 5)]
    expect(groupSessions(hist).map((x) => x.workout_id)).toEqual(['a', 'b'])
  })
})

describe('computeRecords', () => {
  it('does not flag the first session, flags later improvements', () => {
    const sessions = groupSessions([
      s('a', '2026-09-01T10:00:00Z', 80, 8),
      s('b', '2026-09-08T10:00:00Z', 80, 8),
      s('c', '2026-09-15T10:00:00Z', 85, 6),
    ])
    const { records, events } = computeRecords(sessions)
    expect(events.filter((e) => e.workout_id === 'a')).toHaveLength(0)
    expect(events.filter((e) => e.workout_id === 'b')).toHaveLength(0)
    const c = events.filter((e) => e.workout_id === 'c').map((e) => e.kind).sort()
    expect(c).toEqual(['e1rm', 'weight'])
    expect(records.maxWeight?.value).toBe(85)
    expect(records.bestVolume?.value).toBe(640)
  })
})

describe('aggregateByPeriod', () => {
  it('buckets into ISO weeks and computes deltas', () => {
    const sessions = groupSessions([
      s('a', '2026-09-01T10:00:00Z', 80, 8), // Tue week 36
      s('b', '2026-09-03T10:00:00Z', 82.5, 8), // Thu week 36
      s('c', '2026-09-08T10:00:00Z', 85, 8), // Tue week 37
    ])
    const weeks = aggregateByPeriod(sessions, 'week')
    expect(weeks).toHaveLength(2)
    expect(weeks[0].sessions).toBe(2)
    expect(weeks[0].topWeight).toBe(82.5)
    expect(periodDelta(weeks, 'topWeight').delta).toBe(2.5)
  })
})

describe('suggestNext', () => {
  const range = { rep_min: 8, rep_max: 12 }
  it('returns null without history', () => {
    expect(suggestNext(undefined, range, 'barbell', 'total')).toBeNull()
  })
  it('adds weight when every set hit the top of the range', () => {
    const [last] = groupSessions([s('a', '2026-09-01T10:00:00Z', 60, 12), s('a', '2026-09-01T10:00:00Z', 60, 12)])
    expect(suggestNext(last, range, 'barbell', 'total')).toMatchObject({ weight: 62.5, reps: 8 })
  })
  it('keeps weight and adds a rep otherwise', () => {
    const [last] = groupSessions([s('a', '2026-09-01T10:00:00Z', 60, 10), s('a', '2026-09-01T10:00:00Z', 60, 9)])
    expect(suggestNext(last, range, 'barbell', 'total')).toMatchObject({ weight: 60, reps: 10 })
  })
  it('uses dumbbell increments', () => {
    const [last] = groupSessions([s('a', '2026-09-01T10:00:00Z', 20, 12)])
    expect(suggestNext(last, range, 'dumbbell', 'per_dumbbell')?.weight).toBe(22)
  })
  it('without a range beats the top set by one rep', () => {
    const [last] = groupSessions([s('a', '2026-09-01T10:00:00Z', 100, 5)])
    expect(suggestNext(last, null, 'barbell', 'total')).toMatchObject({ weight: 100, reps: 6 })
  })
})

describe('cardio', () => {
  const base = { workout_name: 'Pass', exercise_id: 'run', exercise_position: 0, set_type: 'normal' as const, weight: null, reps: null, rir: null }
  it('sums time and distance per workout and computes pace', () => {
    const rows = [
      { ...base, set_id: '1', workout_id: 'w1', started_at: '2026-10-01T10:00:00Z', set_position: 0, completed: true, duration_seconds: 1500, distance_m: 5000 },
      { ...base, set_id: '2', workout_id: 'w1', started_at: '2026-10-01T10:00:00Z', set_position: 1, completed: true, duration_seconds: 300, distance_m: 1000 },
      { ...base, set_id: '3', workout_id: 'w2', started_at: '2026-10-05T10:00:00Z', set_position: 0, completed: true, duration_seconds: 1200, distance_m: null },
      { ...base, set_id: '4', workout_id: 'w3', started_at: '2026-10-06T10:00:00Z', set_position: 0, completed: true, duration_seconds: null, distance_m: null },
    ]
    const s = cardioSessions(rows)
    expect(s).toHaveLength(2)
    expect(s[0]).toMatchObject({ workout_id: 'w1', seconds: 1800, meters: 6000, paceSecPerKm: 300 })
    expect(s[1]).toMatchObject({ workout_id: 'w2', seconds: 1200, meters: 0, paceSecPerKm: null })
  })
  it('formats durations, distance and pace', () => {
    expect(formatDurationShort(1500)).toBe('25:00')
    expect(formatDurationShort(3930)).toBe('1:05:30')
    expect(formatKm(5250)).toBe('5,25 km')
    expect(formatPace(330)).toBe('5:30 /km')
  })
  it('cardio sets never count as strength working sets', () => {
    const rows = [{ ...base, set_id: '1', workout_id: 'w1', started_at: '2026-10-01T10:00:00Z', set_position: 0, completed: true, duration_seconds: 1500, distance_m: 5000 }]
    const [sess] = groupSessions(rows)
    expect(sess.workingSets).toHaveLength(0)
    expect(sess.bestE1rm).toBeNull()
  })
})
