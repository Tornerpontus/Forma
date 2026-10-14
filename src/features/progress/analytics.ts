import { addDays, differenceInCalendarWeeks, format, startOfDay, startOfISOWeek } from 'date-fns'
import { isWorkingSet, setVolume } from '@/lib/training/calc'
import type { HistorySet, WeightMode } from '@/lib/training/types'

export interface WeekBucket {
  key: string
  start: Date
  workouts: number
  sets: number
  volume: number
}

/** Weekly buckets from `start` (or first data point) to now, including empty weeks. */
export function weeklyBuckets(history: HistorySet[], modeOf: (exId: string) => WeightMode, start: Date | null): WeekBucket[] {
  const filtered = start ? history.filter((s) => new Date(s.started_at) >= start) : history
  if (!filtered.length && !start) return []
  const first = startOfISOWeek(start ?? new Date(filtered[0].started_at))
  const last = startOfISOWeek(new Date())
  const buckets = new Map<string, WeekBucket & { ids: Set<string> }>()
  for (let d = first; d <= last; d = addDays(d, 7)) {
    const key = format(d, 'yyyy-MM-dd')
    buckets.set(key, { key, start: d, workouts: 0, sets: 0, volume: 0, ids: new Set() })
  }
  for (const s of filtered) {
    const key = format(startOfISOWeek(new Date(s.started_at)), 'yyyy-MM-dd')
    const b = buckets.get(key)
    if (!b) continue
    b.ids.add(s.workout_id)
    if (isWorkingSet(s)) {
      b.sets++
      b.volume += setVolume(s.weight, s.reps, modeOf(s.exercise_id))
    }
  }
  return [...buckets.values()].map(({ ids, ...b }) => ({ ...b, workouts: ids.size, volume: Math.round(b.volume) }))
}

export function setsPerMuscle(history: HistorySet[], muscleOf: (exId: string) => string | undefined, start: Date | null) {
  const m = new Map<string, number>()
  for (const s of history) {
    if (start && new Date(s.started_at) < start) continue
    if (!isWorkingSet(s)) continue
    const g = muscleOf(s.exercise_id) ?? 'other'
    m.set(g, (m.get(g) ?? 0) + 1)
  }
  return [...m.entries()].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets)
}

/** Consecutive weeks (ending this or last week) with at least one workout. */
export function weekStreak(history: HistorySet[]): number {
  const weeks = new Set(history.map((s) => format(startOfISOWeek(new Date(s.started_at)), 'yyyy-MM-dd')))
  let d = startOfISOWeek(new Date())
  // The current week doesn't break the streak until it's over
  if (!weeks.has(format(d, 'yyyy-MM-dd'))) d = addDays(d, -7)
  let n = 0
  while (weeks.has(format(d, 'yyyy-MM-dd'))) {
    n++
    d = addDays(d, -7)
  }
  return n
}

/** Day grid for the consistency heatmap: last `weeks` ISO weeks, Monday-first. */
export function dayGrid(history: HistorySet[], weeks: number) {
  const days = new Map<string, number>()
  const perDay = new Map<string, Set<string>>()
  for (const s of history) {
    const k = format(startOfDay(new Date(s.started_at)), 'yyyy-MM-dd')
    const set = perDay.get(k) ?? new Set()
    set.add(s.workout_id)
    perDay.set(k, set)
  }
  for (const [k, v] of perDay) days.set(k, v.size)
  const start = addDays(startOfISOWeek(new Date()), -7 * (weeks - 1))
  const cols: { date: Date; count: number; future: boolean }[][] = []
  const today = startOfDay(new Date())
  for (let w = 0; w < weeks; w++) {
    const col = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d)
      col.push({ date, count: days.get(format(date, 'yyyy-MM-dd')) ?? 0, future: date > today })
    }
    cols.push(col)
  }
  return cols
}

export function averagePerWeek(workoutCount: number, start: Date | null, firstDate: string | undefined): number {
  const from = start ?? (firstDate ? new Date(firstDate) : null)
  if (!from) return 0
  const weeks = Math.max(1, differenceInCalendarWeeks(new Date(), from, { weekStartsOn: 1 }) + 1)
  return Math.round((workoutCount / weeks) * 10) / 10
}
