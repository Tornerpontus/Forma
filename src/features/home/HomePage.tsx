import { useShares } from '@/lib/api/partners'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Flame, Play, Plus, Scale, Target, Trophy, Users } from 'lucide-react'
import { startOfISOWeek } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge, Card, SectionTitle } from '@/components/ui/card'
import { useProfile } from '@/lib/api/profile'
import { usePrograms, type ProgramWorkout } from '@/lib/api/programs'
import { useWorkoutList } from '@/lib/api/workouts'
import { useExerciseMap } from '@/lib/api/exercises'
import { useExerciseStats } from '@/lib/api/history'
import { buildExercise } from '@/lib/training/draft'
import { formatDate, formatVolume } from '@/lib/format'
import { formatNum, setVolume } from '@/lib/training/calc'
import { useActiveWorkout } from '@/features/workout/ActiveWorkoutProvider'
import { useStrengthGoals, useWeights } from '@/lib/api/body'
import { trendChange, withMovingAverage } from '@/lib/body/calc'
import { goalProgress } from '@/features/body/goals'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'God natt'
  if (h < 10) return 'God morgon'
  if (h < 17) return 'Hej'
  return 'God kväll'
}

export function useStartWorkout() {
  const { start, draft } = useActiveWorkout()
  const { data: stats } = useExerciseStats()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function startFrom(template: ProgramWorkout | null) {
    if (draft) {
      navigate('/workout')
      return
    }
    setBusy(true)
    try {
      const exercises = (template?.program_exercises ?? []).map((pe) =>
        buildExercise({
          exercise_id: pe.exercise_id,
          previous: stats?.get(pe.exercise_id)?.last?.sets,
          target: { sets: pe.target_sets, rep_min: pe.rep_min, rep_max: pe.rep_max },
          warmups: pe.warmup_sets,
          rest_seconds: pe.rest_seconds,
          notes: pe.notes,
        }),
      )
      await start({ name: template?.name ?? 'Pass', program_workout_id: template?.id ?? null, exercises })
      navigate('/workout')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunde inte starta passet')
    } finally {
      setBusy(false)
    }
  }
  return { startFrom, busy }
}

export function HomePage() {
  const { data: profile } = useProfile()
  const { data: programs } = usePrograms()
  const { data: workouts } = useWorkoutList()
  const { data: stats } = useExerciseStats()
  const exMap = useExerciseMap()
  const { startFrom, busy } = useStartWorkout()
  const { data: weights } = useWeights()
  const { data: goals } = useStrengthGoals()
  const partners = (useShares().data ?? []).filter((x) => x.direction === 'incoming')
  const weightTrend = useMemo(() => {
    const pts = withMovingAverage((weights ?? []).map((w) => ({ measured_on: w.measured_on, weight: Number(w.weight) })))
    return pts.length ? { last: pts[pts.length - 1], ch7: trendChange(pts, 7) } : null
  }, [weights])
  const openGoals = (goals ?? []).map((g) => ({ g, p: goalProgress(g, stats?.get(g.exercise_id)) })).filter((x) => !x.p.achieved)

  const lastDoneByTemplate = useMemo(() => {
    const m = new Map<string, string>()
    for (const w of workouts ?? []) if (w.program_workout_id && !m.has(w.program_workout_id)) m.set(w.program_workout_id, w.started_at)
    return m
  }, [workouts])

  const week = useMemo(() => {
    const since = startOfISOWeek(new Date()).toISOString()
    const ws = (workouts ?? []).filter((w) => w.started_at >= since)
    let sets = 0
    let volume = 0
    for (const w of ws)
      for (const e of w.workout_exercises) {
        const mode = exMap.get(e.exercise_id)?.weight_mode ?? 'total'
        for (const s of e.workout_sets)
          if (s.completed && s.set_type !== 'warmup') {
            sets++
            volume += setVolume(s.weight, s.reps, mode)
          }
      }
    return { count: ws.length, sets, volume }
  }, [workouts, exMap])

  const recentPrs = useMemo(() => {
    const all: { exercise_id: string; date: string; kind: string; value: number }[] = []
    for (const [exId, st] of stats ?? []) for (const e of st.events) if (e.kind === 'e1rm' || e.kind === 'weight') all.push({ exercise_id: exId, ...e })
    all.sort((a, b) => b.date.localeCompare(a.date))
    const seen = new Set<string>()
    return all.filter((p) => (seen.has(p.exercise_id) ? false : (seen.add(p.exercise_id), true))).slice(0, 4)
  }, [stats])

  const templates = (programs ?? []).flatMap((p) => p.program_workouts.map((w) => ({ ...w, programName: p.name })))
  // Suggest the template done longest ago first
  const sortedTemplates = [...templates].sort((a, b) => (lastDoneByTemplate.get(a.id) ?? '').localeCompare(lastDoneByTemplate.get(b.id) ?? ''))

  return (
    <div className="space-y-6">
      <header className="pt-6">
        <p className="text-sm text-muted">{greeting()}{profile?.display_name ? `, ${profile.display_name}` : ''}</p>
        <h1 className="text-[28px] font-bold tracking-tight">Dags att träna?</h1>
      </header>

      <Card className="grid grid-cols-3 divide-x divide-border p-0">
        <Stat label="Pass i veckan" value={profile?.weekly_workout_goal ? `${week.count}/${profile.weekly_workout_goal}` : String(week.count)} />
        <Stat label="Arbetsset" value={String(week.sets)} />
        <Stat label="Volym" value={formatVolume(week.volume)} />
      </Card>

      {profile?.weekly_workout_goal ? (
        <div className="-mt-3 flex gap-1.5 px-1" aria-label={`${week.count} av ${profile.weekly_workout_goal} pass denna vecka`}>
          {Array.from({ length: profile.weekly_workout_goal }, (_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < week.count ? 'bg-accent' : 'bg-surface-3'}`} />
          ))}
        </div>
      ) : null}

      <div>
        <Button size="lg" className="w-full" onClick={() => startFrom(null)} disabled={busy} data-testid="start-empty">
          <Plus /> Starta tomt pass
        </Button>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <SectionTitle>Starta från program</SectionTitle>
          <Link to="/programs" className="mb-3 text-sm text-muted hover:text-fg">
            Hantera
          </Link>
        </div>
        {sortedTemplates.length === 0 ? (
          <Card className="text-center">
            <p className="text-sm text-muted">Du har inga program än.</p>
            <Button asChild variant="secondary" className="mt-3">
              <Link to="/programs">Skapa ditt första program</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {sortedTemplates.map((t) => {
              const last = lastDoneByTemplate.get(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={busy}
                  onClick={() => startFrom(t)}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4 text-left transition-colors hover:bg-surface-2 active:scale-[0.99]"
                  data-testid="start-template"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{t.name}</div>
                    <div className="mt-0.5 truncate text-xs text-muted">
                      {t.programName} · {t.program_exercises.length} övningar · {last ? `senast ${formatDate(last)}` : 'aldrig kört'}
                    </div>
                    <div className="mt-1.5 truncate text-xs text-subtle">
                      {t.program_exercises.map((e) => exMap.get(e.exercise_id)?.name).filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Play className="size-4 fill-current" />
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {(
        <section className="grid grid-cols-2 gap-2">
          {weightTrend ? (
            <Link to="/body" className="rounded-[var(--radius-card)] bg-surface p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                <Scale className="size-3.5" /> Vikt (7 d snitt)
              </div>
              <div className="tabular mt-1 text-xl font-semibold">{formatNum(weightTrend.last.avg7)} kg</div>
              <div className="text-xs text-muted">{weightTrend.ch7 != null ? `${weightTrend.ch7 > 0 ? '+' : ''}${formatNum(weightTrend.ch7)} kg på en vecka` : 'logga fler dagar för trend'}</div>
            </Link>
          ) : (
            <Link to="/body" className="rounded-[var(--radius-card)] bg-surface p-3.5 text-sm text-muted">
              <Scale className="mb-1 size-4" /> Logga din vikt
            </Link>
          )}
          {openGoals[0] ? (
            <Link to="/body?view=goals" className="rounded-[var(--radius-card)] bg-surface p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                <Target className="size-3.5" /> Nästa mål
              </div>
              <div className="mt-1 truncate text-[15px] font-semibold">{exMap.get(openGoals[0].g.exercise_id)?.name}</div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-info" style={{ width: `${openGoals[0].p.pct * 100}%` }} />
              </div>
              <div className="mt-1 text-xs text-muted">
                {formatNum(Number(openGoals[0].g.target_weight))} kg × {openGoals[0].g.target_reps} · {Math.round(openGoals[0].p.pct * 100)} %
              </div>
            </Link>
          ) : (
            <Link to="/body?view=goals" className="rounded-[var(--radius-card)] bg-surface p-3.5 text-sm text-muted">
              <Target className="mb-1 size-4" /> Sätt ett styrkemål
            </Link>
          )}
        </section>
      )}

      {recentPrs.length > 0 && (
        <section>
          <SectionTitle>Senaste rekord</SectionTitle>
          <Card className="divide-y divide-border/60 p-0">
            {recentPrs.map((p) => (
              <Link key={p.exercise_id} to={`/exercises/${p.exercise_id}`} className="flex items-center gap-3 px-4 py-3">
                <Trophy className="size-4 text-warn" />
                <span className="min-w-0 flex-1 truncate text-[15px]">{exMap.get(p.exercise_id)?.name}</span>
                <Badge tone="warn">{p.kind === 'e1rm' ? `e1RM ${formatNum(p.value)} kg` : `${formatNum(p.value)} kg`}</Badge>
                <span className="text-xs text-subtle">{formatDate(p.date)}</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {(workouts?.length ?? 0) > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <SectionTitle>Senaste passen</SectionTitle>
            <Link to="/history" className="mb-3 text-sm text-muted hover:text-fg">
              Visa alla
            </Link>
          </div>
          <Card className="divide-y divide-border/60 p-0">
            {workouts!.slice(0, 3).map((w) => (
              <Link key={w.id} to={`/history/${w.id}`} className="flex items-center gap-3 px-4 py-3">
                <Flame className="size-4 text-muted" />
                <span className="min-w-0 flex-1 truncate text-[15px]">{w.name}</span>
                <span className="text-xs text-subtle">{formatDate(w.started_at)}</span>
                <ChevronRight className="size-4 text-subtle" />
              </Link>
            ))}
          </Card>
        </section>
      )}

      {partners.length > 0 && (
        <section>
          <SectionTitle>Partner</SectionTitle>
          <Card className="divide-y divide-border/60 p-0">
            {partners.map((p) => (
              <Link key={p.owner_id} to={`/partner/${p.owner_id}`} className="flex items-center gap-3 px-4 py-3" data-testid="home-partner">
                <Users className="size-4 text-muted" />
                <span className="min-w-0 flex-1 truncate text-[15px]">{p.other_name || 'Partner'}s träning</span>
                <ChevronRight className="size-4 text-subtle" />
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-4 text-center">
      <div className="tabular text-xl font-semibold">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-subtle">{label}</div>
    </div>
  )
}
