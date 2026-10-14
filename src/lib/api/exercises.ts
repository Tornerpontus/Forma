import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase, unwrap } from '@/lib/supabase'
import { useUserId } from '@/hooks/auth'
import type { Database } from '@/lib/database.types'
import type { WeightMode } from '@/lib/training/types'
import { qk } from './keys'

export type Exercise = Database['public']['Tables']['exercises']['Row'] & { weight_mode: WeightMode }
export type ExerciseInput = Pick<Exercise, 'name' | 'muscle_group' | 'equipment' | 'weight_mode' | 'is_unilateral' | 'notes'> & {
  secondary_muscles?: string[]
  variation_of?: string | null
}

export function useExercises() {
  const uid = useUserId()
  return useQuery({
    queryKey: qk.exercises(uid),
    queryFn: async () => {
      const rows = unwrap(await supabase.from('exercises').select('*').order('name'))
      return rows as Exercise[]
    },
    staleTime: 10 * 60_000,
  })
}

/** Map id → exercise for quick lookups (includes archived ones so history still resolves). */
export function useExerciseMap() {
  const { data } = useExercises()
  return useMemo(() => new Map((data ?? []).map((e) => [e.id, e])), [data])
}

export function useSaveExercise() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: ExerciseInput & { id?: string }) => {
      if (id) {
        return unwrap(await supabase.from('exercises').update(input).eq('id', id).select('*').single()) as Exercise
      }
      return unwrap(await supabase.from('exercises').insert({ ...input, user_id: uid }).select('*').single()) as Exercise
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.exercises(uid) }),
  })
}

/** Deletes a custom exercise; if it has been used in history it is archived instead. */
export function useDeleteExercise() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').delete().eq('id', id)
      if (error) {
        if (error.code === '23503') {
          unwrap(await supabase.from('exercises').update({ archived: true }).eq('id', id))
          return 'archived' as const
        }
        throw new Error(error.message)
      }
      return 'deleted' as const
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.exercises(uid) }),
  })
}

export function useExerciseNotes() {
  const uid = useUserId()
  return useQuery({
    queryKey: qk.exerciseNotes(uid),
    queryFn: async () => {
      const rows = unwrap(await supabase.from('exercise_notes').select('exercise_id, notes'))
      return new Map(rows.map((r) => [r.exercise_id, r.notes]))
    },
    staleTime: 10 * 60_000,
  })
}

export function useSaveExerciseNote() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ exercise_id, notes }: { exercise_id: string; notes: string }) => {
      unwrap(
        await supabase
          .from('exercise_notes')
          .upsert({ user_id: uid, exercise_id, notes, updated_at: new Date().toISOString() }),
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.exerciseNotes(uid) }),
  })
}
