import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import { CheckCircle2, Plus, Target, Trash2, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, SectionTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { ConfirmDialog, Sheet } from '@/components/ui/sheet'
import { CHART, ChartTooltip, RangePicker, rangeStart, type RangeKey } from '@/components/charts/ChartKit'
import { NumberCell } from '@/features/workout/NumberCell'
import { BackLink } from '@/features/programs/ProgramDetailPage'
import { ExercisePicker } from '@/features/exercises/ExercisePicker'
import { useGoalMutations, useMeasurementMutations, useMeasurements, useStrengthGoals, useWeightMutations, useWeights, type MeasurementInput } from '@/lib/api/body'
import { useProfile, useUpdateProfile } from '@/lib/api/profile'
import { useExerciseMap, type Exercise } from '@/lib/api/exercises'
import { useExerciseStats } from '@/lib/api/history'
import { trendChange, weeklyRate, withMovingAverage } from '@/lib/body/calc'
import { formatNum } from '@/lib/training/calc'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { dayKey } from '@/features/nutrition/NutritionPage'
import { goalProgress } from './goals'

type View = 'weight' | 'measurements' | 'goals'

export default function BodyPage() {
  const [params, setParams] = useSearchParams()
  const view = (params.get('view') as View | null) ?? 'weight'
  return (
    <div className="space-y-5 pb-6">
      <PageHeader back={<BackLink to="/progress" label="Progress" />} title="Kropp & mål" />
      <Segmented
        value={view}
        onChange={(v) => setParams(v === 'weight' ? {} : { view: v }, { replace: true })}
        options={[
          { value: 'weight', label: 'Vikt' },
          { value: 'measurements', label: 'Mått' },
          { value: 'goals', label: 'Mål' },
        ]}
      />
      {view === 'weight' && <WeightView />}
      {view === 'measurements' && <MeasurementsView />}
      {view === 'goals' && <GoalsView />}
    </div>
  )
}

function WeightView() {
  const { data: weights } = useWeights()
  const { data: profile } = useProfile()
  const { upsert, remove } = useWeightMutations()
  const [value, setValue] = useState<number | null>(null)
  const [day, setDay] = useState(dayKey(new Date()))
  const [range, setRange] = useState<RangeKey>('90d')
  const [toDelete, setToDelete] = useState<string | null>(null)
  const [targetOpen, setTargetOpen] = useState(false)

  const points = useMemo(() => withMovingAverage((weights ?? []).map((w) => ({ measured_on: w.measured_on, weight: Number(w.weight) }))), [weights])
  const start = rangeStart(range)
  const chart = points.filter((p) => !start || parseISO(p.measured_on) >= start).map((p) => ({ ...p, t: parseISO(p.measured_on).getTime() }))
  const last = points[points.length - 1]
  const target = profile?.target_weight != null ? Number(profile.target_weight) : null
  const ch7 = trendChange(points, 7)
  const ch30 = trendChange(points, 30)
  const rate = weeklyRate(points)
  const todays = weights?.find((w) => w.measured_on === day)

  return (
    <>
      <Card className="space-y-3">
        <div className="text-sm font-medium">Logga vikt</div>
        <div className="grid grid-cols-[1fr_8.5rem_auto] gap-2">
          <NumberCell decimal label="Vikt i kg" value={value} min={20} max={400} placeholder={last ? formatNum(last.weight) : 'kg'} onChange={setValue} className="h-12 text-xl" />
          <Input type="date" aria-label="Datum" value={day} max={dayKey(new Date())} onChange={(e) => e.target.value && setDay(e.target.value)} className="h-12 px-2 text-sm" />
          <Button
            className="h-12"
            disabled={value == null || value < 20 || upsert.isPending}
            onClick={async () => {
              await upsert.mutateAsync({ measured_on: day, weight: value! })
              toast.success(todays ? 'Vikten uppdaterad' : 'Vikten sparad')
              setValue(null)
            }}
          >
            Spara
          </Button>
        </div>
        {todays && <p className="text-xs text-muted">Du har redan loggat {formatNum(Number(todays.weight))} kg detta datum – att spara ersätter värdet.</p>}
      </Card>

      {!points.length ? (
        <EmptyState title="Ingen vikt loggad än" description="Väg dig gärna samma tid varje dag. Snittet över 7 dagar visar trenden bättre än enskilda dagar." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="7-dagarssnitt" value={`${formatNum(last.avg7)} kg`} sub={`senast ${formatNum(last.weight)} kg · ${formatDate(last.measured_on)}`} />
            <Kpi label="Takt" value={rate != null ? `${rate > 0 ? '+' : ''}${formatNum(rate, 2)} kg/v` : '–'} sub="senaste 4 veckorna" />
            <Kpi label="Förändring 7 d" value={ch7 != null ? `${ch7 > 0 ? '+' : ''}${formatNum(ch7)} kg` : '–'} sub={ch30 != null ? `30 d: ${ch30 > 0 ? '+' : ''}${formatNum(ch30)} kg` : undefined} />
            <button type="button" onClick={() => setTargetOpen(true)} className="text-left">
              <Kpi label="Målvikt" value={target ? `${formatNum(target)} kg` : 'Sätt mål'} sub={target ? `${formatNum(Math.abs(last.avg7 - target))} kg ${last.avg7 > target ? 'kvar ner' : last.avg7 < target ? 'kvar upp' : '– i mål!'}` : 'tryck för att ange'} />
            </button>
          </div>
          <Card className="space-y-3">
            <div className="h-56" data-testid="weight-chart">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => format(new Date(t), 'd MMM', { locale: sv })} stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} width={44} domain={[(min: number) => Math.floor(Math.min(min, target ?? min) - 1), (max: number) => Math.ceil(Math.max(max, target ?? max) + 1)]} />
                  <Tooltip content={<ChartTooltip format={(v, name) => `${formatNum(v)} kg ${name === 'avg7' ? '(snitt)' : ''}`} labelFormat={(l) => formatDate(new Date(Number(l)))} />} />
                  {target && <ReferenceLine y={target} stroke={CHART.palette[2]} strokeDasharray="4 4" />}
                  <Scatter dataKey="weight" name="weight" fill={CHART.muted} isAnimationActive={false} />
                  <Line type="monotone" dataKey="avg7" name="avg7" stroke={CHART.accent} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted" /> Vägning</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-accent" /> 7-dagarssnitt</span>
              {target && <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-warn" /> Mål</span>}
            </div>
            <RangePicker value={range} onChange={setRange} />
          </Card>
          <section>
            <SectionTitle>Vägningar</SectionTitle>
            <Card className="divide-y divide-border/60 p-0">
              {[...points].reverse().slice(0, 60).map((p) => {
                const row = weights!.find((w) => w.measured_on === p.measured_on)!
                return (
                  <div key={p.measured_on} className="flex items-center gap-3 py-1 pl-4 pr-2 text-sm">
                    <span className="flex-1 capitalize">{format(parseISO(p.measured_on), 'EEE d MMM yyyy', { locale: sv })}</span>
                    <span className="tabular font-medium">{formatNum(p.weight)} kg</span>
                    <span className="tabular w-16 text-right text-xs text-muted">⌀ {formatNum(p.avg7)}</span>
                    <Button variant="ghost" size="icon-sm" aria-label={`Ta bort vägning ${p.measured_on}`} onClick={() => setToDelete(row.id)}>
                      <Trash2 className="text-subtle" />
                    </Button>
                  </div>
                )
              })}
            </Card>
          </section>
        </>
      )}
      <TargetWeightSheet open={targetOpen} onOpenChange={setTargetOpen} />
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title="Ta bort vägningen?" confirmLabel="Ta bort" danger onConfirm={() => toDelete && remove.mutate(toDelete)} />
    </>
  )
}

function TargetWeightSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: profile } = useProfile()
  const update = useUpdateProfile()
  const [v, setV] = useState<number | null | undefined>(undefined)
  const cur = v === undefined ? (profile?.target_weight != null ? Number(profile.target_weight) : null) : v
  return (
    <Sheet open={open} onOpenChange={(o) => { setV(undefined); onOpenChange(o) }} title="Målvikt">
      <div className="space-y-3 pt-1">
        <NumberCell decimal label="Målvikt i kg" value={cur} min={20} max={400} placeholder="kg" onChange={setV} className="h-14 text-2xl" />
        <Button className="w-full" onClick={async () => { await update.mutateAsync({ target_weight: cur }); onOpenChange(false) }}>
          Spara
        </Button>
      </div>
    </Sheet>
  )
}

const MEASURES: { key: keyof MeasurementInput; label: string; unit: string }[] = [
  { key: 'waist', label: 'Midja', unit: 'cm' },
  { key: 'hips', label: 'Höft', unit: 'cm' },
  { key: 'chest', label: 'Bröst', unit: 'cm' },
  { key: 'arm', label: 'Överarm', unit: 'cm' },
  { key: 'thigh', label: 'Lår', unit: 'cm' },
  { key: 'calf', label: 'Vad', unit: 'cm' },
  { key: 'neck', label: 'Nacke', unit: 'cm' },
  { key: 'body_fat', label: 'Fettprocent', unit: '%' },
]

function MeasurementsView() {
  const { data: rows } = useMeasurements()
  const { upsert, remove } = useMeasurementMutations()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, number | null>>({})
  const [day, setDay] = useState(dayKey(new Date()))
  const latest = rows?.[0]
  const first = rows?.[rows.length - 1]

  return (
    <>
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        <Plus /> Nya mått
      </Button>
      {!rows?.length ? (
        <EmptyState title="Inga mått än" description="Mät samma ställen på samma sätt varje gång, gärna var 2–4 vecka." />
      ) : (
        <>
          <section>
            <SectionTitle>Senaste · {formatDate(latest!.measured_on)}</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {MEASURES.filter((m) => latest![m.key] != null).map((m) => {
                const now = Number(latest![m.key])
                const base = rows.slice().reverse().find((r) => r[m.key] != null)
                const diff = base && base.id !== latest!.id ? now - Number(base[m.key]) : null
                return (
                  <Card key={m.key} className="p-3.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{m.label}</div>
                    <div className="tabular text-xl font-semibold">
                      {formatNum(now)} {m.unit}
                    </div>
                    {diff != null && (
                      <div className={cn('tabular text-xs', diff < 0 ? 'text-accent' : diff > 0 ? 'text-warn' : 'text-muted')}>
                        {diff > 0 ? '+' : ''}
                        {formatNum(diff)} sedan {formatDate(first!.measured_on)}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </section>
          <section>
            <SectionTitle>Historik</SectionTitle>
            <Card className="divide-y divide-border/60 p-0">
              {rows.map((r) => (
                <div key={r.id} className="flex items-start gap-2 py-2 pl-4 pr-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium capitalize">{format(parseISO(r.measured_on), 'EEE d MMM yyyy', { locale: sv })}</div>
                    <div className="tabular text-xs text-muted">
                      {MEASURES.filter((m) => r[m.key] != null).map((m) => `${m.label} ${formatNum(Number(r[m.key]))}`).join(' · ')}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label="Ta bort mätning" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="text-subtle" />
                  </Button>
                </div>
              ))}
            </Card>
          </section>
        </>
      )}
      <Sheet open={open} onOpenChange={setOpen} title="Nya mått" description="Fyll i det du har mätt – resten kan lämnas tomt">
        <div className="space-y-3 pt-1">
          <div>
            <Label htmlFor="mdate">Datum</Label>
            <Input id="mdate" type="date" value={day} max={dayKey(new Date())} onChange={(e) => e.target.value && setDay(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MEASURES.map((m) => (
              <div key={m.key}>
                <Label>
                  {m.label} ({m.unit})
                </Label>
                <NumberCell decimal label={m.label} value={form[m.key] ?? null} min={0} max={300} placeholder={latest?.[m.key] != null ? formatNum(Number(latest[m.key])) : '–'} onChange={(v) => setForm({ ...form, [m.key]: v })} />
              </div>
            ))}
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={!Object.values(form).some((v) => v != null) || upsert.isPending}
            onClick={async () => {
              try {
                await upsert.mutateAsync({ measured_on: day, ...form } as MeasurementInput)
                toast.success('Måtten sparade')
                setForm({})
                setOpen(false)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Kunde inte spara')
              }
            }}
          >
            Spara
          </Button>
        </div>
      </Sheet>
    </>
  )
}

function GoalsView() {
  const { data: profile } = useProfile()
  const update = useUpdateProfile()
  const { data: goals } = useStrengthGoals()
  const { create, remove } = useGoalMutations()
  const { data: stats } = useExerciseStats()
  const exMap = useExerciseMap()
  const [picker, setPicker] = useState(false)
  const [draft, setDraft] = useState<{ ex: Exercise; weight: number | null; reps: number | null; date: string } | null>(null)

  return (
    <>
      <section>
        <SectionTitle>Träningsfrekvens</SectionTitle>
        <Card className="flex items-center gap-3">
          <Target className="size-5 text-accent" />
          <div className="flex-1">
            <div className="text-[15px]">Pass per vecka</div>
            <div className="text-xs text-muted">Visas på startsidan</div>
          </div>
          <div className="flex items-center gap-1">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={profile?.weekly_workout_goal === n}
                onClick={() => update.mutate({ weekly_workout_goal: profile?.weekly_workout_goal === n ? null : n })}
                className={cn('size-10 rounded-xl text-sm font-semibold', profile?.weekly_workout_goal === n ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-muted')}
              >
                {n}
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <SectionTitle>Styrkemål</SectionTitle>
          <Button variant="ghost" size="sm" className="mb-2 text-accent" onClick={() => setPicker(true)}>
            <Plus /> Nytt mål
          </Button>
        </div>
        {!goals?.length ? (
          <Card className="text-center text-sm text-muted">Sätt ett mål, t.ex. bänkpress 60 kg × 5. Framstegen räknas från dina loggade set.</Card>
        ) : (
          <div className="space-y-2">
            {goals.map((g) => {
              const p = goalProgress(g, stats?.get(g.exercise_id))
              return (
                <Card key={g.id} data-testid="strength-goal">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Link to={`/exercises/${g.exercise_id}`} className="font-semibold hover:underline">
                        {exMap.get(g.exercise_id)?.name}
                      </Link>
                      <div className="text-sm text-muted">
                        Mål {formatNum(Number(g.target_weight))} kg × {g.target_reps}
                        {g.target_date && ` · senast ${formatDate(g.target_date)}`}
                      </div>
                    </div>
                    {p.achieved ? <CheckCircle2 className="size-5 text-accent" /> : null}
                    <Button variant="ghost" size="icon-sm" aria-label="Ta bort mål" onClick={() => remove.mutate(g.id)}>
                      <Trash2 className="text-subtle" />
                    </Button>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
                    <div className={cn('h-full rounded-full', p.achieved ? 'bg-accent' : 'bg-info')} style={{ width: `${p.pct * 100}%` }} />
                  </div>
                  <div className="mt-1.5 text-xs text-muted">
                    {p.achieved ? (
                      <span className="flex items-center gap-1 text-accent"><Trophy className="size-3" /> Uppnått {formatDate(p.best!.date)}</span>
                    ) : p.best ? (
                      `Bästa hittills: ${formatNum(p.best.weight)} kg × ${g.target_reps}+ (${Math.round(p.pct * 100)} %)`
                    ) : (
                      `Inget set med ${g.target_reps}+ reps loggat än`
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <ExercisePicker open={picker} onOpenChange={setPicker} multi={false} title="Välj övning" onPick={([ex]) => ex && setDraft({ ex, weight: null, reps: 1, date: '' })} />
      <Sheet open={!!draft} onOpenChange={(o) => !o && setDraft(null)} title={draft ? `Mål: ${draft.ex.name}` : ''}>
        {draft && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Vikt (kg)</Label>
                <NumberCell decimal label="Målvikt" value={draft.weight} min={0} max={2000} placeholder={stats?.get(draft.ex.id)?.records.maxWeight ? formatNum(stats.get(draft.ex.id)!.records.maxWeight!.value) : 'kg'} onChange={(w) => setDraft({ ...draft, weight: w })} />
              </div>
              <div>
                <Label>Reps</Label>
                <NumberCell label="Målreps" value={draft.reps} min={1} max={100} onChange={(r) => setDraft({ ...draft, reps: r })} />
              </div>
            </div>
            <div>
              <Label htmlFor="gdate">Måldatum (valfritt)</Label>
              <Input id="gdate" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={!draft.weight || !draft.reps}
              onClick={async () => {
                await create.mutateAsync({ exercise_id: draft.ex.id, target_weight: draft.weight!, target_reps: draft.reps!, target_date: draft.date || null })
                toast.success('Målet sparat')
                setDraft(null)
              }}
            >
              Spara mål
            </Button>
          </div>
        )}
      </Sheet>
    </>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="h-full p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{label}</div>
      <div className="tabular mt-1 text-xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </Card>
  )
}
