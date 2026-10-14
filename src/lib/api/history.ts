import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchAll, supabase } from '@/lib/supabase'
import { useUserId } from '@/hooks/auth'
import { computeRecords, groupSessions, type ExerciseSession, type PrEvent } from '@/lib/training/calc'
import type { HistorySet } from '@/lib/training/types'
import { useExerciseMap } from './exercises'
import { qk } from './keys'

/** Every completed set the user has logged (paged). Used for previous performance, PRs and charts. */
export function useSetHistory() {
  const uid = useUserId()
  return useQuery({
    queryKey: qk.setHistory(uid),
    queryFn: async () => {
      const rows = await fetchAll<HistorySet>((from, to) =>
        supabase
          .from('set_history')
          .select('set_id, workout_id, workout_name, started_at, exercise_id, exercise_position, set_position, set_type, weight, reps, rir, completed, duration_seconds, distance_m')
          .eq('user_id', uid) // a partner's shared sets are readable too – never mix them into my own stats
          .order('started_at', { ascending: true })
          .order('set_id', { ascending: true })
          .range(from, to) as unknown as PromiseLike<{ data: HistorySet[] | null; error: { message: string } | null }>,
      )
      return rows.map((r) => ({ ...r, weight: r.weight == null ? null : Number(r.weight), rir: r.rir == null ? null : Number(r.rir), distance_m: r.distance_m == null ? null : Number(r.distance_m) }))
    },
    staleTime: 60_000,
  })
}

export interface ExerciseStats {
  sessions: ExerciseSession[]
  last: ExerciseSession | undefined
  records: ReturnType<typeof computeRecords>['records']
  events: PrEvent[]
}

/** Sessions + records for every exercise the user has trained. */
export function useExerciseStats() {
  const { data: history, ...rest } = useSetHistory()
  const exMap = useExerciseMap()
  const stats = useMemo(() => {
    const byExercise = new Map<string, HistorySet[]>()
    for (const s of history ?? []) {
      const arr = byExercise.get(s.exercise_id)
      if (arr) arr.push(s)
      else byExercise.set(s.exercise_id, [s])
    }
    const out = new Map<string, ExerciseStats>()
    for (const [exId, sets] of byExercise) {
      const mode = exMap.get(exId)?.weight_mode ?? 'total'
      const sessions = groupSessions(sets, mode)
      const { records, events } = computeRecords(sessions)
      out.set(exId, { sessions, last: sessions[sessions.length - 1], records, events })
    }
    return out
  }, [history, exMap])
  return { ...rest, data: history ? stats : undefined }
}

/** PR events grouped by workout id. */
export function usePrsByWorkout() {
  const { data } = useExerciseStats()
  return useMemo(() => {
    const m = new Map<string, (PrEvent & { exercise_id: string })[]>()
    for (const [exId, st] of data ?? []) {
      for (const e of st.events) {
        const arr = m.get(e.workout_id) ?? []
        arr.push({ ...e, exercise_id: exId })
        m.set(e.workout_id, arr)
      }
    }
    return m
  }, [data])
}
