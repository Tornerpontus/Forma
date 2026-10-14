import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { CalendarDays, Clock, Dumbbell, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Badge, Card, EmptyState, PageLoader, SectionTitle } from '@/components/ui/card'
import { useWorkoutList } from '@/lib/api/workouts'
import { useExerciseMap } from '@/lib/api/exercises'
import { usePrsByWorkout } from '@/lib/api/history'
import { formatDate, formatDuration, formatVolume } from '@/lib/format'
import { setVolume } from '@/lib/training/calc'

export function HistoryPage() {
  const { data: workouts, isLoading } = useWorkoutList()
  const exMap = useExerciseMap()
  const prs = usePrsByWorkout()

  const months = useMemo(() => {
    const groups: { key: string; label: string; items: NonNullable<typeof workouts> }[] = []
    for (const w of workouts ?? []) {
      const key = w.started_at.slice(0, 7)
      let g = groups[groups.length - 1]
      if (!g || g.key !== key) {
        g = { key, label: format(new Date(w.started_at), 'LLLL yyyy', { locale: sv }), items: [] }
        groups.push(g)
      }
      g.items.push(w)
    }
    return groups
  }, [workouts])

  return (
    <>
      <PageHeader title="Historik" subtitle={workouts ? `${workouts.length} pass loggade` : undefined} />
      {isLoading ? (
        <PageLoader />
      ) : !workouts?.length ? (
        <EmptyState icon={<CalendarDays />} title="Inga pass än" description="När du avslutar ett pass hamnar det här." />
      ) : (
        <div className="space-y-6">
          {months.map((m) => (
            <section key={m.key}>
              <SectionTitle className="first-letter:uppercase">
                {m.label} · {m.items.length} pass
              </SectionTitle>
              <div className="space-y-2">
                {m.items.map((w) => {
                  let sets = 0
                  let volume = 0
                  const exs = [...w.workout_exercises].sort((a, b) => a.position - b.position)
                  for (const e of exs) {
                    const mode = exMap.get(e.exercise_id)?.weight_mode ?? 'total'
                    for (const s of e.workout_sets)
                      if (s.completed && s.set_type !== 'warmup') {
                        sets++
                        volume += setVolume(s.weight == null ? null : Number(s.weight), s.reps, mode)
                      }
                  }
                  const prCount = prs.get(w.id)?.length ?? 0
                  return (
                    <Link key={w.id} to={`/history/${w.id}`} className="block" data-testid="history-item">
                      <Card className="transition-colors hover:bg-surface-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-[17px] font-semibold">{w.name}</div>
                            <div className="text-sm first-letter:uppercase text-muted">{formatDate(w.started_at, { withWeekday: true })}</div>
                          </div>
                          {prCount > 0 && (
                            <Badge tone="warn">
                              <Trophy className="size-3" /> {prCount} PR
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 flex gap-4 text-sm text-muted">
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-4 text-subtle" />
                            {formatDuration(w.started_at, w.ended_at)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Dumbbell className="size-4 text-subtle" />
                            {formatVolume(volume)}
                          </span>
                          <span>{sets} set</span>
                        </div>
                        <ul className="mt-3 space-y-0.5 text-sm">
                          {exs.slice(0, 5).map((e) => (
                            <li key={e.id} className="flex justify-between gap-3">
                              <span className="truncate text-fg/85">
                                {e.workout_sets.filter((s) => s.set_type !== 'warmup').length} × {exMap.get(e.exercise_id)?.name ?? '…'}
                              </span>
                            </li>
                          ))}
                          {exs.length > 5 && <li className="text-subtle">+ {exs.length - 5} till</li>}
                        </ul>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
