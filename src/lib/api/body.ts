import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, unwrap } from '@/lib/supabase'
import { useUserId } from '@/hooks/auth'
import type { Database } from '@/lib/database.types'

type T = Database['public']['Tables']
export type BodyWeight = T['body_weights']['Row']
export type Measurement = T['body_measurements']['Row']
export type StrengthGoal = T['strength_goals']['Row']
export type MeasurementInput = Omit<T['body_measurements']['Insert'], 'user_id' | 'id' | 'created_at'>

const bk = {
  weights: (u: string) => ['body-weights', u] as const,
  measurements: (u: string) => ['body-measurements', u] as const,
  goals: (u: string) => ['strength-goals', u] as const,
}

export function useWeights() {
  const uid = useUserId()
  return useQuery({
    queryKey: bk.weights(uid),
    queryFn: async () => unwrap(await supabase.from('body_weights').select('*').order('measured_on').limit(5000)),
  })
}

export function useWeightMutations() {
  const uid = useUserId()
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: bk.weights(uid) })
  /** One weight per day – logging again the same day replaces it. */
  const upsert = useMutation({
    mutationFn: async ({ measured_on, weight, note }: { measured_on: string; weight: number; note?: string }) =>
      unwrap(await supabase.from('body_weights').upsert({ user_id: uid, measured_on, weight, note: note ?? '' }, { onConflict: 'user_id,measured_on' })),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('body_weights').delete().eq('id', id)),
    onSuccess: invalidate,
  })
  return { upsert, remove }
}

export function useMeasurements() {
  const uid = useUserId()
  return useQuery({
    queryKey: bk.measurements(uid),
    queryFn: async () => unwrap(await supabase.from('body_measurements').select('*').order('measured_on', { ascending: false })),
  })
}

export function useMeasurementMutations() {
  const uid = useUserId()
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: bk.measurements(uid) })
  const upsert = useMutation({
    mutationFn: async (m: MeasurementInput) =>
      unwrap(await supabase.from('body_measurements').upsert({ ...m, user_id: uid }, { onConflict: 'user_id,measured_on' })),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('body_measurements').delete().eq('id', id)),
    onSuccess: invalidate,
  })
  return { upsert, remove }
}

export function useStrengthGoals() {
  const uid = useUserId()
  return useQuery({
    queryKey: bk.goals(uid),
    queryFn: async () => unwrap(await supabase.from('strength_goals').select('*').order('created_at')),
  })
}

export function useGoalMutations() {
  const uid = useUserId()
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: bk.goals(uid) })
  const create = useMutation({
    mutationFn: async (g: { exercise_id: string; target_weight: number; target_reps: number; target_date: string | null }) =>
      unwrap(await supabase.from('strength_goals').insert({ ...g, user_id: uid })),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('strength_goals').delete().eq('id', id)),
    onSuccess: invalidate,
  })
  return { create, remove }
}
