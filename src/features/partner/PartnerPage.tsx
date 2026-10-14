import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Lock, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Card, EmptyState, PageLoader, SectionTitle } from '@/components/ui/card'
import { useExerciseMap, type Exercise } from '@/lib/api/exercises'
import { usePartnerTraining, useShares } from '@/lib/api/partners'
import type { WorkoutWithDetails } from '@/lib/api/workouts'
import { formatDate, formatDateLong, formatDuration } from '@/lib/format'
import { computeRecords, formatDurationShort, formatKm, formatNum, groupSessions } from '@/lib/training/calc'
import type { HistorySet } from '@/lib/training/types'
import { cn } from '@/lib/utils'
import { BackLink } from '@/features/programs/ProgramDetailPage'

/** Global library + the partner's own custom exercises (readable only while they share). */
function usePartnerExerciseMap(extra: Exercise[] | undefined) {
  const mine = useExerciseMap()
  return useMemo(() => {
    const m = new Map(mine)
    for (const e of extra ?? []) m.set(e.id, e)
    return m
  }, [mine, extra])
}

function usePartnerName(ownerId: string | undefined) {
  const { data: shares, isLoading } = useShares()
  const share = shares?.find((s) => s.direction === 'incoming' && s.owner_id === ownerId)
  return { share, name: share?.other_name || 'Partner', isLoading }
}

export function PartnerPage() {
  const { ownerId } = useParams()
  const { share, name, isLoading: sharesLoading } = usePartnerName(ownerId)
  const { data, isLoading } = usePartnerTraining(share ? ownerId : undefined)
  const exMap = usePartnerExerciseMap(data?.exercises)

  const best = useMemo(() => {
    const by = new Map<string, HistorySet[]>()
    for (const s of data?.sets ?? []) by.set(s.exercise_id, [...(by.get(s.exercise_id) ?? []), s])
    const out: { id: string; name: string; e1rm: number; weight: number; reps: number; date: string }[] = []
    for (const [id, sets] of by) {
      const info = exMap.get(id)
      if (!info || info.weight_mode === 'bodyweight' || info.muscle_group === 'cardio') continue
      const r = computeRecords(groupSessions(sets, info.weight_mode)).records.bestE1rm
      if (r) out.push({ id, name: info.name, e1rm: r.value, weight: r.weight, reps: r.reps, date: r.date })
    }
    return out.sort((a, b) => b.e1rm - a.e1rm).slice(0, 6)
  }, [data, exMap])

  if (sharesLoading || isLoading) return <PageLoader />
  if (!share)
    return (
      <div className="pt-6">
        <BackLink to="/settings" label="Profil" />
        <EmptyState icon={<Lock />} title="Ingen åtkomst" description="Den här personen delar inte sin träning med dig, eller har slutat dela." />
      </div>
    )

  const workouts = data?.workouts ?? []
  const since30 = Date.now() - 30 * 86400_000
  const last30 = workouts.filter((w) => new Date(w.started_at).getTime() >= since30).length

  return (
    <div className="pb-8">
      <PageHeader back={<BackLink to="/settings" label="Profil" />} title={name} subtitle="Delad träning · endast läsning" />

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3.5">
          <div className="tabular text-2xl font-semibold">{last30}</div>
          <div className="text-xs text-muted">Pass senaste 30 dagarna</div>
        </Card>
        <Card className="p-3.5">
          <div className="tabular text-2xl font-semibold">{workouts.length}</div>
          <div className="text-xs text-muted">Pass totalt{workouts.length >= 100 ? ' (senaste 100)' : ''}</div>
        </Card>
      </div>

      {best.length > 0 && (
        <section className="mt-6">
          <SectionTitle>Bästa lyft (e1RM)</SectionTitle>
          <Card className="divide-y divide-border/60 p-0">
            {best.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                <Trophy className="size-4 shrink-0 text-warn" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px]">{b.name}</div>
                  <div className="text-xs text-muted">
                    {formatNum(b.weight)} kg × {b.reps} · {formatDate(b.date)}
                  </div>
                </div>
                <div className="tabular font-semibold">{formatNum(b.e1rm)} kg</div>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section className="mt-6">
        <SectionTitle>Senaste passen</SectionTitle>
        {workouts.length === 0 ? (
          <EmptyState title="Inga pass än" description={`${name} har inte avslutat något pass ännu.`} />
        ) : (
          <div className="space-y-2">
            {workouts.map((w) => (
              <Link key={w.id} to={`/partner/${ownerId}/workouts/${w.id}`} className="block" data-testid="partner-workout">
                <Card className="transition-colors hover:bg-surface-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="truncate font-semibold">{w.name}</div>
                    <div className="shrink-0 text-xs first-letter:uppercase text-muted">{formatDate(w.started_at, { withWeekday: true })}</div>
                  </div>
                  <div className="mt-1 truncate text-sm text-muted">{w.workout_exercises.map((e) => exMap.get(e.exercise_id)?.name ?? 'Övning').join(' · ')}</div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export function PartnerWorkoutPage() {
  const { ownerId, workoutId } = useParams()
  const { share, name, isLoading: sharesLoading } = usePartnerName(ownerId)
  const { data, isLoading } = usePartnerTraining(share ? ownerId : undefined)
  const exMap = usePartnerExerciseMap(data?.exercises)
  const workout: WorkoutWithDetails | undefined = data?.workouts.find((w) => w.id === workoutId)

  if (sharesLoading || isLoading) return <PageLoader />
  if (!share || !workout)
    return (
      <div className="pt-6">
        <BackLink to={share ? `/partner/${ownerId}` : '/settings'} label={share ? name : 'Profil'} />
        <EmptyState icon={<Lock />} title="Passet är inte tillgängligt" description="Det kan ha tagits bort, eller så delas det inte längre med dig." />
      </div>
    )

  return (
    <div className="pb-8">
      <PageHeader back={<BackLink to={`/partner/${ownerId}`} label={name} />} title={workout.name} subtitle={`${formatDateLong(workout.started_at)} · ${formatDuration(workout.started_at, workout.ended_at)}`} />
      {workout.notes && <p className="whitespace-pre-wrap rounded-xl bg-surface p-4 text-sm text-muted">{workout.notes}</p>}
      <div className="mt-4 space-y-3">
        {workout.workout_exercises.map((e) => {
          const info = exMap.get(e.exercise_id)
          const cardio = info?.muscle_group === 'cardio'
          let n = 0
          return (
            <Card key={e.id} data-testid="partner-exercise">
              <div className="font-semibold">{info?.name ?? 'Övning'}</div>
              {e.notes && <p className="mt-1 text-xs text-warn">{e.notes}</p>}
              <div className="tabular mt-2 space-y-0.5 text-sm">
                {e.workout_sets.map((s) => {
                  if (s.set_type !== 'warmup') n++
                  const label = s.set_type === 'warmup' ? 'U' : String(n)
                  const text = cardio
                    ? [s.duration_seconds != null ? formatDurationShort(s.duration_seconds) : null, s.distance_m != null ? formatKm(Number(s.distance_m)) : null].filter(Boolean).join(' · ') || '–'
                    : `${formatNum(s.weight == null ? null : Number(s.weight))} kg × ${s.reps ?? '–'}`
                  return (
                    <div key={s.id} className={cn('flex gap-3', s.set_type === 'warmup' && 'text-muted')}>
                      <span className={cn('w-6 font-semibold', s.set_type === 'warmup' && 'text-warn', s.set_type === 'failure' && 'text-danger')}>{label}</span>
                      <span>{text}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
