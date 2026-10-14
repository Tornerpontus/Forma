import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, GitBranch, Minus, Pencil, Trash2, TrendingUp, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge, Card, EmptyState, PageLoader, SectionTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { ConfirmDialog } from '@/components/ui/sheet'
import { CHART, ChartTooltip, RangePicker, rangeStart, type RangeKey } from '@/components/charts/ChartKit'
import { useDeleteExercise, useExerciseNotes, useExercises, useSaveExerciseNote } from '@/lib/api/exercises'
import { useExerciseStats } from '@/lib/api/history'
import { EQUIPMENT_LABEL, MUSCLE_LABEL, WEIGHT_MODE_LABEL } from '@/lib/labels'
import { formatDate, formatShortDate, formatVolume } from '@/lib/format'
import { aggregateByPeriod, e1rm, formatNum, periodDelta, suggestNext } from '@/lib/training/calc'
import { cn } from '@/lib/utils'
import { BackLink } from '@/features/programs/ProgramDetailPage'
import { PR_LABEL } from '@/features/history/WorkoutDetailPage'
import { ExerciseFormSheet } from './ExerciseForm'
import { CardioStats } from './CardioStats'

type Metric = 'bestE1rm' | 'topWeight' | 'volume' | 'totalReps'
const METRICS: { value: Metric; label: string }[] = [
  { value: 'bestE1rm', label: 'e1RM' },
  { value: 'topWeight', label: 'Vikt' },
  { value: 'totalReps', label: 'Reps' },
  { value: 'volume', label: 'Volym' },
]

export function ExerciseDetailPage() {
  const { exerciseId } = useParams()
  const { data: exercises, isLoading } = useExercises()
  const { data: allStats } = useExerciseStats()
  const exercise = exercises?.find((e) => e.id === exerciseId)
  const st = allStats?.get(exerciseId ?? '')
  const [metric, setMetric] = useState<Metric>('bestE1rm')
  const [range, setRange] = useState<RangeKey>('all')
  const [editOpen, setEditOpen] = useState(false)
  const [variantOpen, setVariantOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const del = useDeleteExercise()
  const navigate = useNavigate()

  const chartData = useMemo(() => {
    const start = rangeStart(range)
    return (st?.sessions ?? [])
      .filter((s) => !start || new Date(s.date) >= start)
      .map((s) => ({ date: new Date(s.date).getTime(), value: s[metric] ?? null }))
      .filter((p) => p.value != null && p.value > 0)
  }, [st, metric, range])

  const weeks = useMemo(() => aggregateByPeriod(st?.sessions ?? [], 'week'), [st])
  const months = useMemo(() => aggregateByPeriod(st?.sessions ?? [], 'month'), [st])

  if (isLoading) return <PageLoader />
  if (!exercise) return <EmptyState title="Övningen finns inte" />

  const bodyweight = exercise.weight_mode === 'bodyweight'
  const suggestion = suggestNext(st?.last, null, exercise.equipment, exercise.weight_mode)
  const unit = metric === 'totalReps' ? 'reps' : 'kg'

  return (
    <div className="pb-8">
      <PageHeader
        back={<BackLink to="/exercises" label="Övningar" />}
        title={exercise.name}
        subtitle={`${MUSCLE_LABEL[exercise.muscle_group]} · ${EQUIPMENT_LABEL[exercise.equipment]} ${exercise.muscle_group === 'cardio' ? '' : ` · ${WEIGHT_MODE_LABEL[exercise.weight_mode]}`}${exercise.is_unilateral ? ' · unilateral' : ''}`}
      />

      <div className="flex flex-wrap gap-2">
        {exercise.user_id && (
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil /> Redigera
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => setVariantOpen(true)}>
          <GitBranch /> Skapa variant
        </Button>
        {exercise.user_id && (
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Ta bort
          </Button>
        )}
      </div>

      {exercise.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{exercise.notes}</p>}
      <PersonalNote exerciseId={exercise.id} />

      {!st ? (
        <EmptyState icon={<TrendingUp />} title="Ingen historik än" description="Logga övningen i ett pass så visas rekord och utveckling här." />
      ) : exercise.muscle_group === 'cardio' ? (
        <CardioStats sets={st.sessions.flatMap((s) => s.sets)} names={new Map(st.sessions.map((s) => [s.workout_id, s.workout_name]))} />
      ) : (
        <>
          {/* Records */}
          <section className="mt-6">
            <SectionTitle>Personliga rekord</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {!bodyweight && st.records.bestE1rm && (
                <RecordCard label="Bästa e1RM" value={`${formatNum(st.records.bestE1rm.value)} kg`} sub={`${formatNum(st.records.bestE1rm.weight)} × ${st.records.bestE1rm.reps} · ${formatDate(st.records.bestE1rm.date)}`} />
              )}
              {!bodyweight && st.records.maxWeight && (
                <RecordCard label="Tyngsta vikt" value={`${formatNum(st.records.maxWeight.value)} kg`} sub={`× ${st.records.maxWeight.reps} · ${formatDate(st.records.maxWeight.date)}`} />
              )}
              {st.records.maxReps && (
                <RecordCard label="Flest reps i ett set" value={`${st.records.maxReps.value}`} sub={`${st.records.maxReps.weight ? `${formatNum(st.records.maxReps.weight)} kg · ` : ''}${formatDate(st.records.maxReps.date)}`} />
              )}
              {st.records.bestVolume && !bodyweight && (
                <RecordCard label="Mest volym / pass" value={formatVolume(st.records.bestVolume.value)} sub={formatDate(st.records.bestVolume.date)} />
              )}
            </div>
          </section>

          {/* Next target */}
          {suggestion && (
            <Card className="mt-3 flex items-start gap-3 bg-accent-soft">
              <TrendingUp className="mt-0.5 size-5 text-accent" />
              <div>
                <div className="text-sm font-semibold text-accent">
                  Nästa mål: {suggestion.weight ? `${formatNum(suggestion.weight)} kg × ` : ''}
                  {suggestion.reps}
                </div>
                <div className="text-xs text-accent/75">{suggestion.reason}. Baserat på ditt senaste pass ({formatDate(st.last!.date)}).</div>
              </div>
            </Card>
          )}

          {/* Chart */}
          <section className="mt-6">
            <SectionTitle>Utveckling</SectionTitle>
            <Card className="space-y-3">
              <Segmented value={metric} onChange={setMetric} options={bodyweight ? METRICS.filter((m) => m.value === 'totalReps') : METRICS} size="sm" />
              <div className="h-56" data-testid="exercise-chart">
                {chartData.length < 1 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted">Ingen data i perioden</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillAccent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART.accent} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={CHART.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => formatShortDate(new Date(t))} stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={44} />
                      <Tooltip
                        cursor={{ stroke: CHART.axis, strokeDasharray: 3 }}
                        content={<ChartTooltip format={(v) => `${formatNum(v)} ${unit}`} labelFormat={(l) => formatDate(new Date(Number(l)))} />}
                      />
                      <Area type="monotone" dataKey="value" name={metric} stroke={CHART.accent} strokeWidth={2.5} fill="url(#fillAccent)" dot={{ r: 3, fill: CHART.accent, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              <RangePicker value={range} onChange={setRange} />
            </Card>
          </section>

          {/* Comparisons */}
          <section className="mt-6">
            <SectionTitle>Jämförelse</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <CompareCard title="Vecka mot förra veckan" points={weeks} bodyweight={bodyweight} />
              <CompareCard title="Månad mot förra månaden" points={months} bodyweight={bodyweight} />
            </div>
          </section>

          {/* Full history */}
          <section className="mt-6">
            <SectionTitle>All historik · {st.sessions.length} pass</SectionTitle>
            <div className="space-y-2">
              {[...st.sessions].reverse().map((s) => {
                const evs = st.events.filter((e) => e.workout_id === s.workout_id)
                return (
                  <Link key={s.workout_id} to={`/history/${s.workout_id}`} className="block">
                    <Card className="transition-colors hover:bg-surface-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{s.workout_name}</div>
                          <div className="text-xs first-letter:uppercase text-muted">{formatDate(s.date, { withWeekday: true })}</div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1">
                          {evs.map((e) => (
                            <Badge key={e.kind} tone="warn">
                              <Trophy className="size-3" /> {PR_LABEL[e.kind]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="tabular mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        {s.sets.map((x) => (
                          <span key={x.set_id} className={cn(x.set_type === 'warmup' ? 'text-subtle' : 'text-fg/90')}>
                            {formatNum(x.weight)}×{x.reps}
                            {x.set_type === 'failure' && <span className="text-danger">F</span>}
                            {x.set_type === 'drop' && <span className="text-info">D</span>}
                          </span>
                        ))}
                      </div>
                      {s.bestSet && s.bestE1rm && (
                        <div className="mt-1 text-xs text-subtle">
                          e1RM {formatNum(e1rm(s.bestSet.weight, s.bestSet.reps))} kg · volym {formatVolume(s.volume)}
                        </div>
                      )}
                    </Card>
                  </Link>
                )
              })}
            </div>
          </section>
        </>
      )}

      <ExerciseFormSheet open={editOpen} onOpenChange={setEditOpen} initial={exercise} />
      <ExerciseFormSheet open={variantOpen} onOpenChange={setVariantOpen} variationOf={exercise} onSaved={(e) => navigate(`/exercises/${e.id}`)} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Ta bort övningen?"
        description="Om övningen finns i din historik arkiveras den i stället, så att inget försvinner."
        confirmLabel="Ta bort"
        danger
        onConfirm={async () => {
          const r = await del.mutateAsync(exercise.id)
          toast.success(r === 'archived' ? 'Övningen arkiverad (finns i historiken)' : 'Övningen borttagen')
          navigate('/exercises', { replace: true })
        }}
      />
    </div>
  )
}

function RecordCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">
        <Trophy className="size-3 text-warn" /> {label}
      </div>
      <div className="tabular mt-1 text-xl font-semibold">{value}</div>
      <div className="truncate text-xs text-muted">{sub}</div>
    </Card>
  )
}

function CompareCard({ title, points, bodyweight }: { title: string; points: ReturnType<typeof aggregateByPeriod>; bodyweight: boolean }) {
  const metric = bodyweight ? null : periodDelta(points, 'bestE1rm')
  const vol = periodDelta(points, 'volume')
  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  return (
    <Card className="p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{title}</div>
      {!last ? (
        <div className="mt-2 text-sm text-muted">Ingen data</div>
      ) : (
        <div className="mt-2 space-y-1.5 text-sm">
          {metric && <Delta label="e1RM" delta={metric.delta} unit="kg" current={metric.current} />}
          {!bodyweight && <Delta label="Volym" delta={vol.delta} unit="" current={vol.current} digits={0} />}
          <Delta label="Set" delta={prev ? last.sets - prev.sets : null} unit="" current={last.sets} />
          <div className="text-[11px] text-subtle">Senaste period: {formatShortDate(last.start)}</div>
        </div>
      )}
    </Card>
  )
}

function Delta({ label, delta, unit, current, digits = 1 }: { label: string; delta: number | null; unit: string; current: number | null; digits?: number }) {
  const Icon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="tabular flex items-center gap-1 whitespace-nowrap font-medium">
        {formatNum(current, digits)}
        {unit && ` ${unit}`}
        {delta != null && (
          <span className={cn('flex items-center text-xs', delta > 0 ? 'text-accent' : delta < 0 ? 'text-danger' : 'text-subtle')}>
            <Icon className="size-3.5" />
            {formatNum(Math.abs(delta), digits)}
          </span>
        )}
      </span>
    </div>
  )
}

function PersonalNote({ exerciseId }: { exerciseId: string }) {
  const { data: notes } = useExerciseNotes()
  const save = useSaveExerciseNote()
  const current = notes?.get(exerciseId) ?? ''
  const [value, setValue] = useState<string | null>(null)
  const v = value ?? current
  return (
    <div className="mt-4">
      <label htmlFor="pnote" className="mb-1.5 block px-1 text-sm text-muted">
        Mina anteckningar
      </label>
      <Textarea
        id="pnote"
        value={v}
        onChange={(e) => setValue(e.target.value)}
        onBlur={async () => {
          if (value != null && value !== current) {
            await save.mutateAsync({ exercise_id: exerciseId, notes: value })
            toast.success('Anteckning sparad')
          }
        }}
        placeholder="Inställningar, grepp, tips till dig själv …"
        className="min-h-16"
      />
    </div>
  )
}
