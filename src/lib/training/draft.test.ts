import { describe, expect, it } from 'vitest'
import { buildExercise, createDraft, draftToPayload, ops, previousForSet } from './draft'
import type { HistorySet } from './types'

const prev = (type: HistorySet['set_type'], weight: number, reps: number): HistorySet => ({
  set_id: crypto.randomUUID(),
  workout_id: 'w0',
  workout_name: 'Push',
  started_at: '2026-10-01T10:00:00Z',
  exercise_id: 'ex1',
  exercise_position: 0,
  set_position: 0,
  set_type: type,
  weight,
  reps,
  rir: null,
  completed: true,
  duration_seconds: null,
  distance_m: null,
})

describe('workout draft', () => {
  it('builds as many sets as last time (or planned, whichever is larger)', () => {
    const ex = buildExercise({ exercise_id: 'ex1', previous: [prev('warmup', 20, 10), prev('normal', 45, 8), prev('normal', 40, 6)], target: { sets: 3, rep_min: 6, rep_max: 10 } })
    expect(ex.sets.map((s) => s.set_type)).toEqual(['warmup', 'normal', 'normal', 'normal'])
  })

  it('aligns previous values by set kind', () => {
    const history = [prev('warmup', 20, 10), prev('normal', 45, 8), prev('normal', 40, 6)]
    const ex = buildExercise({ exercise_id: 'ex1', previous: history })
    expect(previousForSet(ex, 0, history)?.weight).toBe(20)
    expect(previousForSet(ex, 1, history)?.weight).toBe(45)
    expect(previousForSet(ex, 2, history)?.weight).toBe(40)
  })

  it('one-tap completion fills empty values from the fallback and keeps typed values', () => {
    let d = createDraft({ workout_id: 'w1', name: 'Push' })
    const ex = buildExercise({ exercise_id: 'ex1', target: { sets: 2, rep_min: 8, rep_max: 12 } })
    d = ops.addExercise(ex)(d)
    const [s1, s2] = d.exercises[0].sets
    d = ops.toggleSet(ex.id, s1.id, { weight: 45, reps: 8 })(d)
    d = ops.updateSet(ex.id, s2.id, { weight: 42.5 })(d)
    d = ops.toggleSet(ex.id, s2.id, { weight: 40, reps: 6 })(d)
    const sets = d.exercises[0].sets
    expect(sets[0]).toMatchObject({ weight: 45, reps: 8, completed: true })
    expect(sets[1]).toMatchObject({ weight: 42.5, reps: 6, completed: true })
    d = ops.toggleSet(ex.id, s1.id)(d)
    expect(d.exercises[0].sets[0]).toMatchObject({ weight: 45, completed: false })
  })

  it('reorders, duplicates and removes', () => {
    let d = createDraft({ workout_id: 'w1', name: 'Pass' })
    const a = buildExercise({ exercise_id: 'a' })
    const b = buildExercise({ exercise_id: 'b' })
    d = ops.addExercise(a)(ops.addExercise(b)(d))
    expect(d.exercises.map((e) => e.exercise_id)).toEqual(['b', 'a'])
    d = ops.moveExercise(a.id, -1)(d)
    expect(d.exercises.map((e) => e.exercise_id)).toEqual(['a', 'b'])
    d = ops.moveExercise(a.id, -1)(d) // no-op at the top
    expect(d.exercises[0].exercise_id).toBe('a')
    d = ops.updateSet(a.id, d.exercises[0].sets[0].id, { weight: 50, reps: 5 })(d)
    d = ops.duplicateLastSet(a.id)(d)
    expect(d.exercises[0].sets).toHaveLength(2)
    expect(d.exercises[0].sets[1]).toMatchObject({ weight: 50, reps: 5, completed: false })
    d = ops.removeExercise(b.id)(d)
    expect(d.exercises).toHaveLength(1)
  })

  it('inserts warm-ups before working sets', () => {
    let d = createDraft({ workout_id: 'w1', name: 'Pass' })
    const a = buildExercise({ exercise_id: 'a', target: { sets: 2, rep_min: 5, rep_max: 5 } })
    d = ops.addExercise(a)(d)
    d = ops.addSet(a.id, 'warmup')(d)
    expect(d.exercises[0].sets.map((s) => s.set_type)).toEqual(['warmup', 'normal', 'normal'])
  })

  it('payload keeps only completed sets and drops empty exercises', () => {
    let d = createDraft({ workout_id: 'w1', name: 'Pass' })
    const a = buildExercise({ exercise_id: 'a', target: { sets: 2, rep_min: 5, rep_max: 5 } })
    const b = buildExercise({ exercise_id: 'b' })
    d = ops.addExercise(b)(ops.addExercise(a)(d))
    d = ops.toggleSet(a.id, a.sets[0].id, { weight: 100, reps: 5 })(d)
    const p = draftToPayload(d)
    expect(p.exercises).toHaveLength(1)
    expect(p.exercises[0].sets).toHaveLength(1)
  })

  it('version increases with every change', () => {
    let d = createDraft({ workout_id: 'w1', name: 'Pass' })
    const v = d.version
    d = ops.rename('Ben')(d)
    expect(d.version).toBe(v + 1)
  })
})
