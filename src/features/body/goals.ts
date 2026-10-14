import type { ExerciseStats } from '@/lib/api/history'
import type { StrengthGoal } from '@/lib/api/body'

/** Best weight lifted for at least the goal's reps, and whether the goal is reached. Uses logged history only. */
export function goalProgress(goal: Pick<StrengthGoal, 'target_weight' | 'target_reps'>, stats: ExerciseStats | undefined) {
  let best: { weight: number; date: string } | null = null
  for (const s of stats?.sessions ?? [])
    for (const set of s.workingSets)
      if ((set.reps ?? 0) >= goal.target_reps && set.weight != null && (!best || set.weight > best.weight)) best = { weight: set.weight, date: s.date }
  const target = Number(goal.target_weight)
  return { best, pct: best ? Math.min(1, best.weight / target) : 0, achieved: !!best && best.weight >= target }
}
