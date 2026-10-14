/**
 * Integration tests against a running Supabase (local: `npx supabase start`).
 * Verifies account separation (RLS) and the save_workout RPC with two real users.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '../../src/lib/database.types'

const URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const KEY = process.env.VITE_SUPABASE_ANON_KEY!

type Client = SupabaseClient<Database>

async function newUser(name: string): Promise<{ c: Client; id: string }> {
  const c = createClient<Database>(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const email = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@forma.test`
  const { data, error } = await c.auth.signUp({ email, password: 'test-password-123', options: { data: { display_name: name } } })
  if (error) throw error
  if (!data.session) throw new Error('No session – email confirmation must be off locally')
  return { c, id: data.user!.id }
}

let A: { c: Client; id: string }
let B: { c: Client; id: string }
let benchId: string
let aExerciseId: string
let aProgramId: string
let aWorkoutId: string

beforeAll(async () => {
  A = await newUser('anna')
  B = await newUser('bertil')
  const { data } = await A.c.from('exercises').select('id').eq('name', 'Bänkpress').is('user_id', null).single()
  benchId = data!.id
})

describe('profiles', () => {
  it('are created on sign-up and only own profile is visible', async () => {
    const { data: pa } = await A.c.from('profiles').select('*')
    expect(pa).toHaveLength(1)
    expect(pa![0].id).toBe(A.id)
    expect(pa![0].display_name).toBe('anna')
    expect(pa![0].weight_unit).toBe('kg')
    const { data: cross } = await A.c.from('profiles').select('*').eq('id', B.id)
    expect(cross).toHaveLength(0)
  })
  it('cannot update someone else', async () => {
    await A.c.from('profiles').update({ display_name: 'hacked' }).eq('id', B.id)
    const { data } = await B.c.from('profiles').select('display_name').single()
    expect(data!.display_name).toBe('bertil')
  })
})

describe('exercises', () => {
  it('global library is visible to both', async () => {
    const { count: ca } = await A.c.from('exercises').select('*', { count: 'exact', head: true })
    const { count: cb } = await B.c.from('exercises').select('*', { count: 'exact', head: true })
    expect(ca).toBeGreaterThan(100)
    expect(ca).toBe(cb)
  })
  it('custom exercises are private', async () => {
    const { data, error } = await A.c
      .from('exercises')
      .insert({ user_id: A.id, name: 'Annas specialpress', muscle_group: 'chest', equipment: 'machine' })
      .select('id')
      .single()
    expect(error).toBeNull()
    aExerciseId = data!.id
    const { data: seenByB } = await B.c.from('exercises').select('id').eq('id', aExerciseId)
    expect(seenByB).toHaveLength(0)
  })
  it('cannot create exercises for someone else or edit the global library', async () => {
    const { error } = await B.c.from('exercises').insert({ user_id: A.id, name: 'x', muscle_group: 'chest', equipment: 'machine' })
    expect(error).not.toBeNull()
    const { error: e2 } = await B.c.from('exercises').insert({ user_id: null, name: 'Global hack', muscle_group: 'chest', equipment: 'machine' })
    expect(e2).not.toBeNull()
    await B.c.from('exercises').update({ name: 'Hacked' }).eq('id', benchId)
    const { data } = await A.c.from('exercises').select('name').eq('id', benchId).single()
    expect(data!.name).toBe('Bänkpress')
  })
})

describe('programs', () => {
  it('are private and child rows cannot be attached to another account', async () => {
    const { data: p } = await A.c.from('programs').insert({ user_id: A.id, name: 'PPL' }).select('id').single()
    aProgramId = p!.id
    const { data: w } = await A.c.from('program_workouts').insert({ user_id: A.id, program_id: aProgramId, name: 'Push' }).select('id').single()
    const { error: peErr } = await A.c
      .from('program_exercises')
      .insert({ user_id: A.id, program_workout_id: w!.id, exercise_id: aExerciseId, target_sets: 3, rep_min: 8, rep_max: 12 })
    expect(peErr).toBeNull()

    expect((await B.c.from('programs').select('id')).data).toHaveLength(0)
    expect((await B.c.from('program_workouts').select('id')).data).toHaveLength(0)
    // B tries to add a workout into A's program
    const { error } = await B.c.from('program_workouts').insert({ user_id: B.id, program_id: aProgramId, name: 'Intrång' })
    expect(error).not.toBeNull()
    // B cannot use A's private exercise in B's own program
    const { data: bp } = await B.c.from('programs').insert({ user_id: B.id, name: 'B' }).select('id').single()
    const { data: bw } = await B.c.from('program_workouts').insert({ user_id: B.id, program_id: bp!.id, name: 'B1' }).select('id').single()
    const { error: e3 } = await B.c.from('program_exercises').insert({ user_id: B.id, program_workout_id: bw!.id, exercise_id: aExerciseId })
    expect(e3).not.toBeNull()
    // B cannot delete A's program
    await B.c.from('programs').delete().eq('id', aProgramId)
    expect((await A.c.from('programs').select('id').eq('id', aProgramId)).data).toHaveLength(1)
  })
})

describe('workouts', () => {
  it('only one active workout per user', async () => {
    const { data } = await A.c.from('workouts').insert({ user_id: A.id, name: 'Push', draft: { v: 1 } }).select('id').single()
    aWorkoutId = data!.id
    const { error } = await A.c.from('workouts').insert({ user_id: A.id, name: 'Dubbel' })
    expect(error?.message).toContain('workouts_one_active_per_user')
  })

  it('save_workout normalises the draft into exercises and sets atomically', async () => {
    const payload = {
      name: 'Push A',
      notes: 'Bra pass',
      ended_at: new Date().toISOString(),
      exercises: [
        {
          exercise_id: benchId,
          notes: '',
          sets: [
            { set_type: 'warmup', weight: 40, reps: 10, completed: true },
            { set_type: 'normal', weight: 80, reps: 8, rir: 2, completed: true },
            { set_type: 'failure', weight: 80, reps: 7, completed: true },
          ],
        },
        { exercise_id: aExerciseId, notes: 'sits 4', sets: [{ set_type: 'normal', weight: 50, reps: 12, completed: true }] },
      ],
    }
    const { error } = await A.c.rpc('save_workout', { p_workout_id: aWorkoutId, p_payload: payload, p_complete: true })
    expect(error).toBeNull()
    const { data: w } = await A.c.from('workouts').select('*, workout_exercises(*, workout_sets(*))').eq('id', aWorkoutId).single()
    expect(w!.status).toBe('completed')
    expect(w!.draft).toBeNull()
    expect(w!.name).toBe('Push A')
    expect(w!.workout_exercises).toHaveLength(2)
    const sets = w!.workout_exercises.find((e) => e.exercise_id === benchId)!.workout_sets
    expect(sets).toHaveLength(3)
    expect(Number(sets.find((s) => s.set_type === 'normal')!.rir)).toBe(2)

    const { data: hist } = await A.c.from('set_history').select('*')
    expect(hist).toHaveLength(4)
  })

  it('editing a completed workout replaces its sets', async () => {
    const payload = { name: 'Push A', exercises: [{ exercise_id: benchId, sets: [{ set_type: 'normal', weight: 82.5, reps: 8, completed: true }] }] }
    const { error } = await A.c.rpc('save_workout', { p_workout_id: aWorkoutId, p_payload: payload, p_complete: true })
    expect(error).toBeNull()
    const { data: hist } = await A.c.from('set_history').select('weight')
    expect(hist).toHaveLength(1)
    expect(Number(hist![0].weight)).toBe(82.5)
  })

  it("another user cannot read, change or overwrite the workout", async () => {
    expect((await B.c.from('workouts').select('id')).data).toHaveLength(0)
    expect((await B.c.from('workout_sets').select('id')).data).toHaveLength(0)
    expect((await B.c.from('set_history').select('set_id')).data).toHaveLength(0)
    const { error } = await B.c.rpc('save_workout', {
      p_workout_id: aWorkoutId,
      p_payload: { exercises: [] },
      p_complete: true,
    })
    expect(error).not.toBeNull()
    // B cannot attach a workout_exercise to A's workout
    const { error: e2 } = await B.c.from('workout_exercises').insert({ user_id: B.id, workout_id: aWorkoutId, exercise_id: benchId })
    expect(e2).not.toBeNull()
    // A's data is intact
    expect((await A.c.from('set_history').select('set_id')).data).toHaveLength(1)
  })

  it('anonymous visitors see nothing', async () => {
    const anon = createClient<Database>(URL, KEY, { auth: { persistSession: false } })
    expect((await anon.from('workouts').select('id')).data ?? []).toHaveLength(0)
    expect((await anon.from('exercises').select('id')).data ?? []).toHaveLength(0)
    const { error } = await anon.rpc('save_workout', { p_workout_id: aWorkoutId, p_payload: {}, p_complete: true })
    expect(error).not.toBeNull()
  })
})

describe('nutrition and body data', () => {
  it('foods, logs, recipes, meals, weights and goals are private', async () => {
    const { data: food } = await A.c.from('foods').insert({ user_id: A.id, name: 'Kvarg', kcal: 60, protein: 11, carbs: 4, fat: 0.2 }).select('id').single()
    await A.c.from('food_logs').insert({ user_id: A.id, logged_on: '2026-10-14', meal: 'breakfast', food_id: food!.id, name: 'Kvarg', grams: 250, kcal: 150, protein: 27.5, carbs: 10, fat: 0.5 })
    const { data: recipe } = await A.c.from('recipes').insert({ user_id: A.id, name: 'Gröt' }).select('id').single()
    await A.c.from('recipe_items').insert({ user_id: A.id, recipe_id: recipe!.id, food_id: food!.id, grams: 100 })
    await A.c.from('body_weights').insert({ user_id: A.id, measured_on: '2026-10-14', weight: 64.2 })
    await A.c.from('strength_goals').insert({ user_id: A.id, exercise_id: benchId, target_weight: 60, target_reps: 1 })

    for (const table of ['foods', 'food_logs', 'recipes', 'recipe_items', 'saved_meals', 'body_weights', 'body_measurements', 'strength_goals'] as const) {
      const { data } = await B.c.from(table).select('id')
      expect(data, table).toHaveLength(0)
    }
    // B cannot log A's food or put it in B's recipe
    const { error: e1 } = await B.c.from('food_logs').insert({ user_id: B.id, logged_on: '2026-10-14', meal: 'lunch', food_id: food!.id, name: 'x', grams: 1, kcal: 1 })
    expect(e1).not.toBeNull()
    const { data: bRecipe } = await B.c.from('recipes').insert({ user_id: B.id, name: 'B' }).select('id').single()
    const { error: e2 } = await B.c.from('recipe_items').insert({ user_id: B.id, recipe_id: bRecipe!.id, food_id: food!.id, grams: 1 })
    expect(e2).not.toBeNull()
    // Profile targets are private too
    await A.c.from('profiles').update({ kcal_target: 2000, target_weight: 60 }).eq('id', A.id)
    const { data: bView } = await B.c.from('profiles').select('kcal_target').eq('id', A.id)
    expect(bView).toHaveLength(0)
  })
})
