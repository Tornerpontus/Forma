import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAll, supabase, unwrap } from '@/lib/supabase'
import { useUserId } from '@/hooks/auth'
import type { HistorySet } from '@/lib/training/types'
import type { Exercise } from './exercises'
import type { WorkoutWithDetails } from './workouts'
import { qk } from './keys'

export interface TrainingShare {
  owner_id: string
  viewer_id: string
  other_name: string
  direction: 'outgoing' | 'incoming'
  created_at: string
}

export function useShares() {
  const uid = useUserId()
  return useQuery({
    queryKey: qk.shares(uid),
    queryFn: async () => unwrap(await supabase.rpc('list_training_shares')) as TrainingShare[],
    staleTime: 60_000,
  })
}

export function useCreateInvite() {
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('create_share_invite').single()),
  })
}

const INVITE_ERRORS: Record<string, string> = {
  invalid_or_expired_code: 'Koden är ogiltig, redan använd eller har gått ut.',
  own_code: 'Det där är din egen kod – ge den till din partner i stället.',
}

export function useAcceptInvite() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('accept_share_invite', { p_code: code })
      if (error) {
        const key = Object.keys(INVITE_ERRORS).find((k) => error.message.includes(k))
        throw new Error(key ? INVITE_ERRORS[key] : 'Kunde inte ansluta. Försök igen.')
      }
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.shares(uid) }),
  })
}

export function useEndShare() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (s: Pick<TrainingShare, 'owner_id' | 'viewer_id'>) =>
      unwrap(await supabase.from('training_shares').delete().eq('owner_id', s.owner_id).eq('viewer_id', s.viewer_id).select('owner_id')),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.shares(uid) })
      qc.removeQueries({ queryKey: ['partner', uid] })
    },
  })
}

/** Everything shown on a partner's page. RLS only returns rows if they shared with me. */
export function usePartnerTraining(ownerId: string | undefined) {
  const uid = useUserId()
  return useQuery({
    queryKey: qk.partner(uid, ownerId ?? ''),
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const [workouts, sets, exercises] = await Promise.all([
        supabase
          .from('workouts')
          .select('*, workout_exercises(*, workout_sets(*))')
          .eq('user_id', ownerId!)
          .eq('status', 'completed')
          .order('started_at', { ascending: false })
          .limit(100)
          .then((r) => unwrap(r) as WorkoutWithDetails[]),
        fetchAll<HistorySet>((from, to) =>
          supabase
            .from('set_history')
            .select('set_id, workout_id, workout_name, started_at, exercise_id, exercise_position, set_position, set_type, weight, reps, rir, completed, duration_seconds, distance_m')
            .eq('user_id', ownerId!)
            .order('started_at', { ascending: true })
            .order('set_id', { ascending: true })
            .range(from, to) as unknown as PromiseLike<{ data: HistorySet[] | null; error: { message: string } | null }>,
        ),
        supabase
          .from('exercises')
          .select('*')
          .eq('user_id', ownerId!)
          .then((r) => unwrap(r) as Exercise[]),
      ])
      for (const w of workouts) {
        w.workout_exercises.sort((a, b) => a.position - b.position)
        for (const e of w.workout_exercises) e.workout_sets.sort((a, b) => a.position - b.position)
      }
      return {
        workouts,
        sets: sets.map((r) => ({ ...r, weight: r.weight == null ? null : Number(r.weight), rir: r.rir == null ? null : Number(r.rir), distance_m: r.distance_m == null ? null : Number(r.distance_m) })),
        exercises,
      }
    },
    staleTime: 60_000,
  })
}
