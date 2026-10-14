import type { DraftExercise, DraftSet, DraftTarget, HistorySet, SetType, WeightMode, WorkoutDraft } from './types'
import { setVolume } from './calc'

const newId = () => crypto.randomUUID()

export function emptySet(type: SetType = 'normal'): DraftSet {
  return { id: newId(), set_type: type, weight: null, reps: null, rir: null, completed: false, completed_at: null }
}

export function createDraft(params: {
  workout_id: string
  name: string
  started_at?: string
  program_workout_id?: string | null
}): WorkoutDraft {
  const now = new Date().toISOString()
  return {
    workout_id: params.workout_id,
    name: params.name,
    notes: '',
    started_at: params.started_at ?? now,
    program_workout_id: params.program_workout_id ?? null,
    exercises: [],
    rest_timer: null,
    version: 1,
    updated_at: now,
  }
}

/**
 * Builds the sets for a newly added exercise. The number of sets is the larger of the
 * planned set count and what was done last time, so nothing from the previous session is lost.
 */
export function buildExercise(params: {
  exercise_id: string
  previous?: HistorySet[]
  target?: DraftTarget | null
  warmups?: number
  rest_seconds?: number | null
  notes?: string
}): DraftExercise {
  const prev = (params.previous ?? []).filter((s) => s.completed)
  const warmups = params.warmups ?? prev.filter((s) => s.set_type === 'warmup').length
  const prevWorking = prev.filter((s) => s.set_type !== 'warmup')
  const working = Math.max(params.target?.sets ?? 0, prevWorking.length, params.target ? 0 : 1)
  const sets: DraftSet[] = []
  for (let i = 0; i < warmups; i++) sets.push(emptySet('warmup'))
  for (let i = 0; i < working; i++) {
    const p = prevWorking[i]
    sets.push(emptySet(p && p.set_type !== 'warmup' ? p.set_type : 'normal'))
  }
  return {
    id: newId(),
    exercise_id: params.exercise_id,
    notes: params.notes ?? '',
    rest_seconds: params.rest_seconds ?? null,
    target: params.target ?? null,
    sets,
  }
}

/**
 * Previous-session value shown for a set (placeholder). Warm-ups are aligned with warm-ups,
 * working sets with working sets, by order.
 */
export function previousForSet(
  exercise: DraftExercise,
  setIndex: number,
  previous: HistorySet[] | undefined,
): HistorySet | undefined {
  if (!previous?.length) return undefined
  const set = exercise.sets[setIndex]
  if (!set) return undefined
  const isWarm = set.set_type === 'warmup'
  const sameKindBefore = exercise.sets.slice(0, setIndex).filter((s) => (s.set_type === 'warmup') === isWarm).length
  const prevSameKind = previous.filter((s) => s.completed && (s.set_type === 'warmup') === isWarm)
  return prevSameKind[sameKindBefore]
}

type Updater = (d: WorkoutDraft) => WorkoutDraft

function bump(d: WorkoutDraft): WorkoutDraft {
  return { ...d, version: d.version + 1, updated_at: new Date().toISOString() }
}

function mapExercise(d: WorkoutDraft, exId: string, fn: (e: DraftExercise) => DraftExercise): WorkoutDraft {
  return bump({ ...d, exercises: d.exercises.map((e) => (e.id === exId ? fn(e) : e)) })
}

export const ops = {
  rename: (name: string): Updater => (d) => bump({ ...d, name }),
  setNotes: (notes: string): Updater => (d) => bump({ ...d, notes }),

  addExercise: (ex: DraftExercise): Updater => (d) => bump({ ...d, exercises: [...d.exercises, ex] }),

  removeExercise: (exId: string): Updater => (d) => bump({ ...d, exercises: d.exercises.filter((e) => e.id !== exId) }),

  replaceExercise: (exId: string, exercise_id: string): Updater => (d) =>
    mapExercise(d, exId, (e) => ({ ...e, exercise_id, sets: e.sets.map((s) => ({ ...s, weight: null, reps: null, completed: false, completed_at: null })) })),

  moveExercise: (exId: string, delta: number): Updater => (d) => {
    const i = d.exercises.findIndex((e) => e.id === exId)
    const j = i + delta
    if (i < 0 || j < 0 || j >= d.exercises.length) return d
    const arr = [...d.exercises]
    const [item] = arr.splice(i, 1)
    arr.splice(j, 0, item)
    return bump({ ...d, exercises: arr })
  },

  setExerciseNotes: (exId: string, notes: string): Updater => (d) => mapExercise(d, exId, (e) => ({ ...e, notes })),

  setExerciseRest: (exId: string, rest_seconds: number | null): Updater => (d) =>
    mapExercise(d, exId, (e) => ({ ...e, rest_seconds })),

  addSet: (exId: string, type: SetType = 'normal'): Updater => (d) =>
    mapExercise(d, exId, (e) => {
      if (type === 'warmup') {
        // Warm-ups go after the last existing warm-up
        const lastWarm = e.sets.map((s) => s.set_type).lastIndexOf('warmup')
        const sets = [...e.sets]
        sets.splice(lastWarm + 1, 0, emptySet('warmup'))
        return { ...e, sets }
      }
      return { ...e, sets: [...e.sets, emptySet(type)] }
    }),

  /** Copies the values of the last set into a new, not yet completed set. */
  duplicateLastSet: (exId: string): Updater => (d) =>
    mapExercise(d, exId, (e) => {
      const last = e.sets[e.sets.length - 1]
      if (!last) return { ...e, sets: [emptySet()] }
      return {
        ...e,
        sets: [...e.sets, { ...emptySet(last.set_type === 'warmup' ? 'normal' : last.set_type), weight: last.weight, reps: last.reps, rir: last.rir }],
      }
    }),

  removeSet: (exId: string, setId: string): Updater => (d) =>
    mapExercise(d, exId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) })),

  updateSet: (exId: string, setId: string, patch: Partial<Omit<DraftSet, 'id'>>): Updater => (d) =>
    mapExercise(d, exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) })),

  /**
   * One-tap completion. Empty fields are filled from the placeholder (previous session / suggestion),
   * so a repeat of last time is a single tap. Un-completing keeps the values.
   */
  toggleSet: (exId: string, setId: string, fallback?: { weight: number | null; reps: number | null }): Updater => (d) =>
    mapExercise(d, exId, (e) => ({
      ...e,
      sets: e.sets.map((s) => {
        if (s.id !== setId) return s
        if (s.completed) return { ...s, completed: false, completed_at: null }
        return {
          ...s,
          weight: s.weight ?? fallback?.weight ?? null,
          reps: s.reps ?? fallback?.reps ?? null,
          completed: true,
          completed_at: new Date().toISOString(),
        }
      }),
    })),

  startRest: (seconds: number): Updater => (d) => {
    const now = Date.now()
    return bump({
      ...d,
      rest_timer: { started_at: new Date(now).toISOString(), ends_at: new Date(now + seconds * 1000).toISOString(), duration: seconds },
    })
  },
  adjustRest: (deltaSeconds: number): Updater => (d) => {
    if (!d.rest_timer) return d
    const ends = new Date(d.rest_timer.ends_at).getTime() + deltaSeconds * 1000
    return bump({ ...d, rest_timer: { ...d.rest_timer, ends_at: new Date(ends).toISOString(), duration: Math.max(0, d.rest_timer.duration + deltaSeconds) } })
  },
  stopRest: (): Updater => (d) => bump({ ...d, rest_timer: null }),
}

/** Payload for the save_workout RPC. Sets without reps that were never completed are dropped. */
export function draftToPayload(d: WorkoutDraft, ended_at?: string) {
  return {
    name: d.name,
    notes: d.notes,
    started_at: d.started_at,
    ended_at: ended_at ?? null,
    program_workout_id: d.program_workout_id,
    exercises: d.exercises
      .map((e) => ({
        exercise_id: e.exercise_id,
        notes: e.notes,
        sets: e.sets
          .filter((s) => s.completed)
          .map((s) => ({
            set_type: s.set_type,
            weight: s.weight,
            reps: s.reps,
            rir: s.rir,
            completed: true,
            completed_at: s.completed_at,
          })),
      }))
      .filter((e) => e.sets.length > 0),
  }
}

export function draftStats(d: WorkoutDraft, modeOf?: (exerciseId: string) => WeightMode) {
  let completed = 0
  let total = 0
  let volume = 0
  for (const e of d.exercises) {
    for (const s of e.sets) {
      total++
      if (s.completed) {
        completed++
        if (s.set_type !== 'warmup') volume += setVolume(s.weight, s.reps, modeOf?.(e.exercise_id) ?? 'total')
      }
    }
  }
  return { completed, total, volume }
}
