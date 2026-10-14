import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, unwrap } from '@/lib/supabase'
import { useUserId } from '@/hooks/auth'
import type { Database } from '@/lib/database.types'
import { qk } from './keys'

type Tables = Database['public']['Tables']
export type ProgramExercise = Tables['program_exercises']['Row']
export type ProgramWorkout = Tables['program_workouts']['Row'] & { program_exercises: ProgramExercise[] }
export type Program = Tables['programs']['Row'] & { program_workouts: ProgramWorkout[] }

export type PlannedExerciseInput = Pick<
  ProgramExercise,
  'exercise_id' | 'target_sets' | 'rep_min' | 'rep_max' | 'warmup_sets' | 'rest_seconds' | 'notes'
>

function sortProgram(p: Program): Program {
  return {
    ...p,
    program_workouts: [...p.program_workouts]
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
      .map((w) => ({ ...w, program_exercises: [...w.program_exercises].sort((a, b) => a.position - b.position) })),
  }
}

export function usePrograms() {
  const uid = useUserId()
  return useQuery({
    queryKey: qk.programs(uid),
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('programs')
          .select('*, program_workouts(*, program_exercises(*))')
          .order('position')
          .order('created_at'),
      ) as Program[]
      return rows.map(sortProgram)
    },
  })
}

export function useProgramMutations() {
  const uid = useUserId()
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.programs(uid) })

  const saveProgram = useMutation({
    mutationFn: async ({ id, name, description }: { id?: string; name: string; description?: string }) => {
      if (id) return unwrap(await supabase.from('programs').update({ name, description }).eq('id', id).select('*').single())
      return unwrap(
        await supabase.from('programs').insert({ user_id: uid, name, description: description ?? '' }).select('*').single(),
      )
    },
    onSuccess: invalidate,
  })

  const deleteProgram = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('programs').delete().eq('id', id)),
    onSuccess: invalidate,
  })

  const saveWorkout = useMutation({
    mutationFn: async ({
      id,
      program_id,
      name,
      notes,
      position,
      exercises,
    }: {
      id?: string
      program_id: string
      name: string
      notes?: string
      position?: number
      exercises?: PlannedExerciseInput[]
    }) => {
      let workoutId = id
      if (workoutId) {
        unwrap(await supabase.from('program_workouts').update({ name, notes: notes ?? '' }).eq('id', workoutId))
      } else {
        const row = unwrap(
          await supabase
            .from('program_workouts')
            .insert({ user_id: uid, program_id, name, notes: notes ?? '', position: position ?? 0 })
            .select('id')
            .single(),
        )
        workoutId = row.id
      }
      if (exercises) await replacePlannedExercises(uid, workoutId!, exercises)
      return workoutId!
    },
    onSuccess: invalidate,
  })

  const deleteWorkout = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('program_workouts').delete().eq('id', id)),
    onSuccess: invalidate,
  })

  const duplicateWorkout = useMutation({
    mutationFn: async ({ source, targetProgramId, name }: { source: ProgramWorkout; targetProgramId?: string; name?: string }) => {
      const row = unwrap(
        await supabase
          .from('program_workouts')
          .insert({
            user_id: uid,
            program_id: targetProgramId ?? source.program_id,
            name: name ?? `${source.name} (kopia)`,
            notes: source.notes,
            position: source.position + 1,
          })
          .select('id')
          .single(),
      )
      await replacePlannedExercises(uid, row.id, source.program_exercises)
      return row.id
    },
    onSuccess: invalidate,
  })

  const duplicateProgram = useMutation({
    mutationFn: async (source: Program) => {
      const p = unwrap(
        await supabase
          .from('programs')
          .insert({ user_id: uid, name: `${source.name} (kopia)`, description: source.description })
          .select('id')
          .single(),
      )
      for (const w of source.program_workouts) {
        const nw = unwrap(
          await supabase
            .from('program_workouts')
            .insert({ user_id: uid, program_id: p.id, name: w.name, notes: w.notes, position: w.position })
            .select('id')
            .single(),
        )
        await replacePlannedExercises(uid, nw.id, w.program_exercises)
      }
      return p.id
    },
    onSuccess: invalidate,
  })

  const reorderWorkouts = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, i) => supabase.from('program_workouts').update({ position: i }).eq('id', id).then(unwrap)),
      )
    },
    onSuccess: invalidate,
  })

  return { saveProgram, deleteProgram, saveWorkout, deleteWorkout, duplicateWorkout, duplicateProgram, reorderWorkouts }
}

async function replacePlannedExercises(uid: string, workoutId: string, list: PlannedExerciseInput[]) {
  unwrap(await supabase.from('program_exercises').delete().eq('program_workout_id', workoutId))
  if (!list.length) return
  unwrap(
    await supabase.from('program_exercises').insert(
      list.map((e, i) => ({
        user_id: uid,
        program_workout_id: workoutId,
        exercise_id: e.exercise_id,
        position: i,
        target_sets: e.target_sets,
        rep_min: e.rep_min,
        rep_max: Math.max(e.rep_max, e.rep_min),
        warmup_sets: e.warmup_sets,
        rest_seconds: e.rest_seconds,
        notes: e.notes ?? '',
      })),
    ),
  )
}
