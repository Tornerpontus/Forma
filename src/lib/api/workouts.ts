import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, unwrap } from '@/lib/supabase'
import { useUserId } from '@/hooks/auth'
import type { Database, Json } from '@/lib/database.types'
import type { WorkoutDraft } from '@/lib/training/types'
import { draftToPayload } from '@/lib/training/draft'
import { qk } from './keys'

type Tables = Database['public']['Tables']
export type WorkoutRow = Tables['workouts']['Row']
export type WorkoutSetRow = Tables['workout_sets']['Row']
export type WorkoutExerciseRow = Tables['workout_exercises']['Row'] & { workout_sets: WorkoutSetRow[] }
export type WorkoutWithDetails = WorkoutRow & { workout_exercises: WorkoutExerciseRow[] }

export const ACTIVE_COLUMNS = 'id, name, started_at, program_workout_id, status, draft, draft_version, updated_at'

export async function fetchActiveWorkout(uid: string) {
  const res = await supabase.from('workouts').select(ACTIVE_COLUMNS).eq('user_id', uid).eq('status', 'active').maybeSingle()
  if (res.error) throw new Error(res.error.message)
  return res.data
}

export async function insertActiveWorkout(uid: string, draft: WorkoutDraft) {
  return unwrap(
    await supabase
      .from('workouts')
      .insert({
        id: draft.workout_id,
        user_id: uid,
        name: draft.name,
        started_at: draft.started_at,
        program_workout_id: draft.program_workout_id,
        status: 'active',
        draft: draft as unknown as Json,
        draft_version: draft.version,
      })
      .select(ACTIVE_COLUMNS)
      .single(),
  )
}

/** Persists the in-progress draft. Returns false if the workout no longer is active (finished elsewhere). */
export async function saveDraftToServer(draft: WorkoutDraft): Promise<boolean> {
  const { data, error } = await supabase
    .from('workouts')
    .update({ draft: draft as unknown as Json, draft_version: draft.version, name: draft.name })
    .eq('id', draft.workout_id)
    .eq('status', 'active')
    .select('id')
  if (error) throw new Error(error.message)
  return (data?.length ?? 0) > 0
}

export async function finishWorkoutOnServer(draft: WorkoutDraft) {
  const payload = draftToPayload(draft, new Date().toISOString())
  unwrap(
    await supabase.rpc('save_workout', {
      p_workout_id: draft.workout_id,
      p_payload: payload as unknown as Json,
      p_complete: true,
    }),
  )
}

export async function discardActiveWorkout(id: string) {
  unwrap(await supabase.from('workouts').delete().eq('id', id).eq('status', 'active'))
}

export function useWorkoutList() {
  const uid = useUserId()
  return useQuery({
    queryKey: qk.workouts(uid),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('workouts')
          .select('id, name, started_at, ended_at, notes, program_workout_id, workout_exercises(id, exercise_id, position, workout_sets(id, set_type, weight, reps, completed))')
          .eq('status', 'completed')
          .order('started_at', { ascending: false })
          .limit(500),
      ),
  })
}

export function useWorkout(id: string | undefined) {
  const uid = useUserId()
  return useQuery({
    queryKey: qk.workout(uid, id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const w = unwrap(
        await supabase
          .from('workouts')
          .select('*, workout_exercises(*, workout_sets(*))')
          .eq('id', id!)
          .maybeSingle(),
      ) as WorkoutWithDetails | null
      if (!w) return null
      w.workout_exercises.sort((a, b) => a.position - b.position)
      for (const e of w.workout_exercises) e.workout_sets.sort((a, b) => a.position - b.position)
      return w
    },
  })
}

export function useInvalidateTraining() {
  const uid = useUserId()
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.workouts(uid) }),
      qc.invalidateQueries({ queryKey: qk.setHistory(uid) }),
      qc.invalidateQueries({ queryKey: ['workout', uid] }),
    ])
}

/** Saves edits to an already completed workout (replaces its exercises/sets atomically). */
export function useUpdateCompletedWorkout() {
  const invalidate = useInvalidateTraining()
  return useMutation({
    mutationFn: async ({ draft, ended_at }: { draft: WorkoutDraft; ended_at: string | null }) => {
      const payload = draftToPayload(draft, ended_at ?? undefined)
      unwrap(
        await supabase.rpc('save_workout', {
          p_workout_id: draft.workout_id,
          p_payload: payload as unknown as Json,
          p_complete: true,
        }),
      )
    },
    onSuccess: invalidate,
  })
}

export function useDeleteWorkout() {
  const invalidate = useInvalidateTraining()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('workouts').delete().eq('id', id)),
    onSuccess: invalidate,
  })
}

/** Converts a stored workout into an editable draft (all sets completed). */
export function workoutToDraft(w: WorkoutWithDetails): WorkoutDraft {
  return {
    workout_id: w.id,
    name: w.name,
    notes: w.notes,
    started_at: w.started_at,
    program_workout_id: w.program_workout_id,
    rest_timer: null,
    version: 1,
    updated_at: w.updated_at,
    exercises: w.workout_exercises.map((e) => ({
      id: e.id,
      exercise_id: e.exercise_id,
      notes: e.notes,
      rest_seconds: null,
      target: null,
      sets: e.workout_sets.map((s) => ({
        id: s.id,
        set_type: s.set_type as WorkoutDraft['exercises'][number]['sets'][number]['set_type'],
        weight: s.weight == null ? null : Number(s.weight),
        reps: s.reps,
        rir: s.rir == null ? null : Number(s.rir),
        completed: s.completed,
        completed_at: s.completed_at,
      })),
    })),
  }
}
