import { startOfISOWeek, startOfMonth, format } from 'date-fns'
import type { HistorySet, SetType, WeightMode } from './types'

/** Estimated one-rep max (Epley). Only meaningful for 1–12 reps; returns null otherwise. */
export function e1rm(weight: number | null | undefined, reps: number | null | undefined): number | null {
  if (weight == null || reps == null || weight <= 0 || reps <= 0 || reps > 12) return null
  if (reps === 1) return weight
  return round1(weight * (1 + reps / 30))
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Load actually moved per rep. Dumbbell weights are logged per dumbbell, so both hands count. */
export function effectiveLoad(weight: number | null | undefined, mode: WeightMode = 'total'): number {
  if (weight == null || weight <= 0) return 0
  return mode === 'per_dumbbell' ? weight * 2 : weight
}

export function setVolume(weight: number | null | undefined, reps: number | null | undefined, mode: WeightMode = 'total'): number {
  if (reps == null || reps <= 0) return 0
  return effectiveLoad(weight, mode) * reps
}

export function isWorkingSet(s: { set_type: SetType; completed: boolean; reps: number | null }): boolean {
  return s.completed && s.set_type !== 'warmup' && (s.reps ?? 0) > 0
}

export interface ExerciseSession {
  workout_id: string
  workout_name: string
  date: string
  sets: HistorySet[]
  workingSets: HistorySet[]
  topWeight: number | null
  bestE1rm: number | null
  bestSet: HistorySet | null
  totalReps: number
  volume: number
}

/** Groups an exercise's set history into sessions, oldest first. */
export function groupSessions(history: HistorySet[], mode: WeightMode = 'total'): ExerciseSession[] {
  const byWorkout = new Map<string, HistorySet[]>()
  for (const s of history) {
    const arr = byWorkout.get(s.workout_id)
    if (arr) arr.push(s)
    else byWorkout.set(s.workout_id, [s])
  }
  const sessions: ExerciseSession[] = []
  for (const [workout_id, sets] of byWorkout) {
    sets.sort((a, b) => a.exercise_position - b.exercise_position || a.set_position - b.set_position)
    const working = sets.filter(isWorkingSet)
    let topWeight: number | null = null
    let bestE1rm: number | null = null
    let bestSet: HistorySet | null = null
    let totalReps = 0
    let volume = 0
    for (const s of working) {
      totalReps += s.reps ?? 0
      volume += setVolume(s.weight, s.reps, mode)
      if (s.weight != null && (topWeight == null || s.weight > topWeight)) topWeight = s.weight
      const est = e1rm(s.weight, s.reps)
      if (est != null && (bestE1rm == null || est > bestE1rm)) {
        bestE1rm = est
        bestSet = s
      }
    }
    if (!bestSet && working.length) {
      // No e1RM possible (e.g. bodyweight or high reps) – best set = most reps at top weight
      bestSet = [...working].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0]
    }
    sessions.push({
      workout_id,
      workout_name: sets[0].workout_name,
      date: sets[0].started_at,
      sets,
      workingSets: working,
      topWeight,
      bestE1rm,
      bestSet,
      totalReps,
      volume: round1(volume),
    })
  }
  sessions.sort((a, b) => a.date.localeCompare(b.date))
  return sessions
}

export type PrKind = 'weight' | 'e1rm' | 'volume' | 'reps'

export interface PrEvent {
  workout_id: string
  date: string
  kind: PrKind
  value: number
  previous: number | null
}

export interface ExerciseRecords {
  maxWeight: { value: number; reps: number; date: string } | null
  bestE1rm: { value: number; weight: number; reps: number; date: string } | null
  bestVolume: { value: number; date: string } | null
  maxReps: { value: number; weight: number | null; date: string } | null
}

/**
 * Walks sessions chronologically. A PR event is recorded only when a session beats an earlier
 * session (the very first session sets the baseline but is not flagged as a PR).
 */
export function computeRecords(sessions: ExerciseSession[]): { records: ExerciseRecords; events: PrEvent[] } {
  const records: ExerciseRecords = { maxWeight: null, bestE1rm: null, bestVolume: null, maxReps: null }
  const events: PrEvent[] = []
  sessions.forEach((s, i) => {
    const first = i === 0
    // heaviest weight
    for (const set of s.workingSets) {
      if (set.weight == null || set.weight <= 0) continue
      if (!records.maxWeight || set.weight > records.maxWeight.value) {
        if (!first && records.maxWeight) {
          pushUnique(events, { workout_id: s.workout_id, date: s.date, kind: 'weight', value: set.weight, previous: records.maxWeight.value })
        }
        records.maxWeight = { value: set.weight, reps: set.reps ?? 0, date: s.date }
      }
    }
    if (s.bestE1rm != null && s.bestSet) {
      if (!records.bestE1rm || s.bestE1rm > records.bestE1rm.value) {
        if (!first && records.bestE1rm) {
          pushUnique(events, { workout_id: s.workout_id, date: s.date, kind: 'e1rm', value: s.bestE1rm, previous: records.bestE1rm.value })
        }
        records.bestE1rm = { value: s.bestE1rm, weight: s.bestSet.weight ?? 0, reps: s.bestSet.reps ?? 0, date: s.date }
      }
    }
    if (s.volume > 0 && (!records.bestVolume || s.volume > records.bestVolume.value)) {
      if (!first && records.bestVolume) {
        pushUnique(events, { workout_id: s.workout_id, date: s.date, kind: 'volume', value: s.volume, previous: records.bestVolume.value })
      }
      records.bestVolume = { value: s.volume, date: s.date }
    }
    for (const set of s.workingSets) {
      const r = set.reps ?? 0
      if (!records.maxReps || r > records.maxReps.value) {
        // Rep PRs only matter for bodyweight-style sets (no load) – avoid noise for loaded lifts
        if (!first && records.maxReps && !(set.weight && set.weight > 0)) {
          pushUnique(events, { workout_id: s.workout_id, date: s.date, kind: 'reps', value: r, previous: records.maxReps.value })
        }
        records.maxReps = { value: r, weight: set.weight, date: s.date }
      }
    }
  })
  return { records, events }
}

function pushUnique(events: PrEvent[], e: PrEvent) {
  const existing = events.find((x) => x.workout_id === e.workout_id && x.kind === e.kind)
  if (existing) {
    existing.value = Math.max(existing.value, e.value)
  } else {
    events.push(e)
  }
}

export interface PeriodPoint {
  key: string
  start: Date
  topWeight: number | null
  bestE1rm: number | null
  volume: number
  sets: number
  reps: number
  sessions: number
}

/** Aggregates sessions into ISO weeks or calendar months. */
export function aggregateByPeriod(sessions: ExerciseSession[], period: 'week' | 'month'): PeriodPoint[] {
  const map = new Map<string, PeriodPoint>()
  for (const s of sessions) {
    const d = new Date(s.date)
    const start = period === 'week' ? startOfISOWeek(d) : startOfMonth(d)
    const key = format(start, 'yyyy-MM-dd')
    let p = map.get(key)
    if (!p) {
      p = { key, start, topWeight: null, bestE1rm: null, volume: 0, sets: 0, reps: 0, sessions: 0 }
      map.set(key, p)
    }
    p.sessions += 1
    p.volume = round1(p.volume + s.volume)
    p.sets += s.workingSets.length
    p.reps += s.totalReps
    if (s.topWeight != null && (p.topWeight == null || s.topWeight > p.topWeight)) p.topWeight = s.topWeight
    if (s.bestE1rm != null && (p.bestE1rm == null || s.bestE1rm > p.bestE1rm)) p.bestE1rm = s.bestE1rm
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

/** Difference between the latest and the previous period for a metric. */
export function periodDelta(points: PeriodPoint[], metric: 'bestE1rm' | 'topWeight' | 'volume'): {
  current: number | null
  previous: number | null
  delta: number | null
} {
  if (!points.length) return { current: null, previous: null, delta: null }
  const current = points[points.length - 1][metric]
  const previous = points.length > 1 ? points[points.length - 2][metric] : null
  const delta = current != null && previous != null ? round1(current - previous) : null
  return { current, previous, delta }
}

export function weightIncrement(equipment: string, mode: WeightMode): number {
  if (mode === 'per_dumbbell' || equipment === 'dumbbell') return 2
  if (equipment === 'kettlebell') return 4
  if (equipment === 'machine' || equipment === 'cable') return 2.5
  return 2.5
}

export interface Suggestion {
  weight: number | null
  reps: number
  reason: string
}

/**
 * Double progression based on the last session's working sets.
 * - With a rep range: all working sets at/above rep_max → add one increment and aim for rep_min.
 *   Otherwise keep the weight and aim for one more rep (capped at rep_max).
 * - Without a rep range: keep the top weight and aim to beat the top set by one rep.
 * Returns null when there is no history (no fabricated targets).
 */
export function suggestNext(
  last: ExerciseSession | undefined,
  target: { rep_min: number; rep_max: number } | null,
  equipment: string,
  mode: WeightMode,
): Suggestion | null {
  if (!last || !last.workingSets.length) return null
  const sets = last.workingSets
  const topWeight = last.topWeight
  const topSets = sets.filter((s) => (s.weight ?? 0) === (topWeight ?? 0))
  const minRepsAtTop = Math.min(...topSets.map((s) => s.reps ?? 0))
  const maxRepsAtTop = Math.max(...topSets.map((s) => s.reps ?? 0))

  if (mode === 'bodyweight' || topWeight == null || topWeight <= 0) {
    return { weight: topWeight, reps: maxRepsAtTop + 1, reason: `Förra: ${maxRepsAtTop} reps – sikta på en till` }
  }
  if (target) {
    if (minRepsAtTop >= target.rep_max) {
      const inc = weightIncrement(equipment, mode)
      return {
        weight: round1(topWeight + inc),
        reps: target.rep_min,
        reason: `Alla set nådde ${target.rep_max} reps – öka ${formatNum(inc)} kg`,
      }
    }
    const reps = Math.min(Math.max(minRepsAtTop + 1, target.rep_min), target.rep_max)
    return { weight: topWeight, reps, reason: `Samma vikt, sikta på ${reps} reps (${target.rep_min}–${target.rep_max})` }
  }
  return { weight: topWeight, reps: maxRepsAtTop + 1, reason: `Slå förra: ${formatNum(topWeight)} kg × ${maxRepsAtTop}` }
}

export function formatNum(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '–'
  const r = Math.round(n * 10 ** digits) / 10 ** digits
  return r.toLocaleString('sv-SE', { maximumFractionDigits: digits })
}
