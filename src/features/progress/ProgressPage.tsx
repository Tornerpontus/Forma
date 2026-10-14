import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronRight, Dumbbell, Flame, LineChart as LineIcon, Trophy } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { PageHeader } from '@/components/layout/AppShell'
import { Badge, Card, EmptyState, PageLoader, SectionTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { CHART, ChartTooltip, RangePicker, rangeStart, type RangeKey } from '@/components/charts/ChartKit'
import { useExerciseStats, useSetHistory } from '@/lib/api/history'
import { useExerciseMap } from '@/lib/api/exercises'
import { MUSCLE_LABEL } from '@/lib/labels'
import { formatDate, formatShortDate, formatVolume } from '@/lib/format'
import { formatNum } from '@/lib/training/calc'
import { cn } from '@/lib/utils'
import { PR_LABEL } from '@/features/history/WorkoutDetailPage'
import { averagePerWeek, dayGrid, setsPerMuscle, weekStreak, weeklyBuckets } from './analytics'

export default function ProgressPage() {
  const { data: history, isLoading } = useSetHistory()
  const { data: stats } = useExerciseStats()
  const exMap = useExerciseMap()
  const [range, setRange] = useState<RangeKey>('90d')
  const start = rangeStart(range)

  const modeOf = (id: string) => exMap.get(id)?.weight_mode ?? 'total'

  const weeks = useMemo(() => weeklyBuckets(history ?? [], modeOf, start), [history, exMap, range]) // eslint-disable-line react-hooks/exhaustive-deps
  const muscles = useMemo(() => setsPerMuscle(history ?? [], (id) => exMap.get(id)?.muscle_group, start), [history, exMap, range]) // eslint-disable-line react-hooks/exhaustive-deps
  const grid = useMemo(() => dayGrid(history ?? [], 16), [history])
  const streak = useMemo(() => weekStreak(history ?? []), [history])

  const inRange = useMemo(() => (history ?? []).filter((s) => !start || new Date(s.started_at) >= start), [history, range]) // eslint-disable-line react-hooks/exhaustive-deps
  const workoutCount = new Set(inRange.map((s) => s.workout_id)).size
  const totalSets = weeks.reduce((n, w) => n + w.sets, 0)
  const totalVolume = weeks.reduce((n, w) => n + w.volume, 0)

  const prs = useMemo(() => {
    const out: { exercise_id: string; kind: keyof typeof PR_LABEL; value: number; date: string; previous: number | null }[] = []
    // Strength PRs only (volume records happen almost every session and drown the signal)
    for (const [id, st] of stats ?? []) for (const e of st.events) if ((e.kind === 'weight' || e.kind === 'e1rm' || e.kind === 'reps') && (!start || new Date(e.date) >= start)) out.push({ exercise_id: id, ...e })
    return out.sort((a, b) => b.date.localeCompare(a.date))
  }, [stats, range]) // eslint-disable-line react-hooks/exhaustive-deps

  // Most trained exercises (by sessions) for the strength chart
  const topExercises = useMemo(
    () =>
      [...(stats ?? [])]
        .filter(([id, st]) => exMap.get(id)?.weight_mode !== 'bodyweight' && st.sessions.some((s) => s.bestE1rm))
        .sort((a, b) => b[1].sessions.length - a[1].sessions.length || (b[1].records.bestE1rm?.value ?? 0) - (a[1].records.bestE1rm?.value ?? 0))
        .slice(0, 12)
        .map(([id]) => id),
    [stats, exMap],
  )
  const [strengthEx, setStrengthEx] = useState<string>('')
  const selectedEx = strengthEx || topExercises[0] || ''
  const strengthData = useMemo(() => {
    const st = stats?.get(selectedEx)
    return (st?.sessions ?? [])
      .filter((s) => s.bestE1rm && (!start || new Date(s.date) >= start))
      .map((s) => ({ date: new Date(s.date).getTime(), e1rm: s.bestE1rm, top: s.topWeight }))
  }, [stats, selectedEx, range]) // eslint-disable-line react-hooks/exhaustive-deps

  const strengthChange = useMemo(() => {
    return topExercises
      .slice(0, 5)
      .map((id) => {
        const ss = (stats?.get(id)?.sessions ?? []).filter((s) => s.bestE1rm && (!start || new Date(s.date) >= start))
        if (ss.length < 2) return null
        const first = ss[0].bestE1rm!
        const last = Math.max(...ss.slice(-3).map((s) => s.bestE1rm!))
        return { id, first, last, pct: ((last - first) / first) * 100 }
      })
      .filter(Boolean) as { id: string; first: number; last: number; pct: number }[]
  }, [topExercises, stats, range]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <PageLoader />

  const header = (
    <PageHeader
      title="Progress"
      subtitle="Din utveckling"
      action={
        <div className="flex gap-1.5">
          <Link to="/body" className="flex h-9 items-center gap-1 rounded-xl bg-surface-2 px-3 text-sm font-medium">
            Kropp & mål
          </Link>
          <Link to="/exercises" className="flex h-9 items-center gap-1 rounded-xl bg-surface-2 px-3 text-sm font-medium">
            Övningar <ChevronRight className="size-4" />
          </Link>
        </div>
      }
    />
  )

  if (!history?.length)
    return (
      <>
        {header}
        <EmptyState icon={<LineIcon />} title="Ingen data än" description="Avsluta ditt första pass så fylls diagrammen med din riktiga träningsdata." />
      </>
    )

  return (
    <div className="space-y-6 pb-6">
      {header}
      <div className="sticky top-0 z-20 -mx-4 bg-bg/90 px-4 py-2 backdrop-blur-lg">
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Kpi icon={<Dumbbell />} label="Pass" value={String(workoutCount)} sub={`${formatNum(averagePerWeek(workoutCount, start, history[0]?.started_at))} / vecka`} />
        <Kpi icon={<Flame />} label="Veckosvit" value={`${streak} v`} sub="veckor i rad med träning" />
        <Kpi label="Arbetsset" value={String(totalSets)} sub="i perioden" />
        <Kpi label="Volym" value={formatVolume(totalVolume)} sub="i perioden" />
      </div>

      {/* Strength */}
      <section>
        <SectionTitle>Styrkeutveckling</SectionTitle>
        <Card className="space-y-3">
          {topExercises.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Logga viktbelastade övningar för att se styrkeutveckling.</p>
          ) : (
            <>
              <Select value={selectedEx} onChange={(e) => setStrengthEx(e.target.value)} aria-label="Välj övning" className="h-10 text-sm">
                {topExercises.map((id) => (
                  <option key={id} value={id}>
                    {exMap.get(id)?.name}
                  </option>
                ))}
              </Select>
              <div className="h-52" data-testid="strength-chart">
                {strengthData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted">Ingen data i perioden</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={strengthData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => formatShortDate(new Date(t))} stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={44} />
                      <Tooltip content={<ChartTooltip format={(v) => `${formatNum(v)} kg`} labelFormat={(l) => formatDate(new Date(Number(l)))} />} />
                      <Line type="monotone" dataKey="e1rm" name="e1RM" stroke={CHART.accent} strokeWidth={2.5} dot={{ r: 3, fill: CHART.accent, strokeWidth: 0 }} isAnimationActive={false} />
                      <Line type="monotone" dataKey="top" name="Topvikt" stroke={CHART.palette[1]} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-accent" /> e1RM</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-info" /> Topvikt</span>
              </div>
            </>
          )}
          {strengthChange.length > 0 && (
            <ul className="divide-y divide-border/60 border-t border-border/60 pt-1">
              {strengthChange.map((s) => (
                <li key={s.id}>
                  <Link to={`/exercises/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="truncate">{exMap.get(s.id)?.name}</span>
                    <span className="tabular flex shrink-0 items-center gap-2">
                      <span className="text-muted">{formatNum(s.first)} → {formatNum(s.last)} kg</span>
                      <span className={cn('w-16 whitespace-nowrap text-right font-semibold', s.pct > 0 ? 'text-accent' : s.pct < 0 ? 'text-danger' : 'text-muted')}>
                        {s.pct > 0 ? '+' : ''}
                        {formatNum(s.pct)} %
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Frequency + volume */}
      <section>
        <SectionTitle>Träningsfrekvens</SectionTitle>
        <Card>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tickFormatter={(k) => formatShortDate(new Date(k))} stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis allowDecimals={false} stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} width={36} />
                <Tooltip cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} content={<ChartTooltip format={(v) => `${v} pass`} labelFormat={(l) => `Vecka från ${formatShortDate(new Date(String(l)))}`} />} />
                <Bar dataKey="workouts" name="Pass" fill={CHART.accent} radius={[6, 6, 2, 2]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Volym per vecka</SectionTitle>
        <Card>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tickFormatter={(k) => formatShortDate(new Date(k))} stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}t` : String(v))} />
                <Tooltip cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} content={<ChartTooltip format={(v) => formatVolume(v)} labelFormat={(l) => `Vecka från ${formatShortDate(new Date(String(l)))}`} />} />
                <Bar dataKey="volume" name="Volym" fill={CHART.palette[1]} radius={[6, 6, 2, 2]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Muscle sets */}
      <section>
        <SectionTitle>Arbetsset per muskelgrupp</SectionTitle>
        <Card>
          {muscles.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">Ingen data i perioden</p>
          ) : (
            <div style={{ height: Math.max(120, muscles.length * 34) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={muscles} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="muscle" tickFormatter={(m) => MUSCLE_LABEL[m] ?? m} stroke={CHART.muted} fontSize={12} tickLine={false} axisLine={false} width={96} />
                  <Tooltip cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} content={<ChartTooltip format={(v) => `${v} set`} labelFormat={(l) => MUSCLE_LABEL[String(l)] ?? l} />} />
                  <Bar dataKey="sets" name="Set" radius={[4, 6, 6, 4]} barSize={18} isAnimationActive={false} label={{ position: 'right', fill: CHART.muted, fontSize: 11 }}>
                    {muscles.map((m, i) => (
                      <Cell key={m.muscle} fill={i === 0 ? CHART.accent : '#3a3d44'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </section>

      {/* Consistency */}
      <section>
        <SectionTitle>Regelbundenhet · 16 veckor</SectionTitle>
        <Card>
          <div className="flex gap-[3px]" role="img" aria-label="Träningsdagar de senaste 16 veckorna">
            <div className="mr-1 flex flex-col gap-[3px] text-[9px] leading-none text-subtle">
              {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((d, i) => (
                <span key={i} className="flex aspect-square w-3 items-center">{i % 2 === 0 ? d : ''}</span>
              ))}
            </div>
            {grid.map((col, i) => (
              <div key={i} className="flex flex-1 flex-col gap-[3px]">
                {col.map((d) => (
                  <div
                    key={d.date.toISOString()}
                    title={`${format(d.date, 'd MMM', { locale: sv })}: ${d.count} pass`}
                    className={cn('aspect-square w-full rounded-[3px]', d.future ? 'bg-transparent' : d.count ? 'bg-accent' : 'bg-surface-3')}
                  />
                ))}
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* PRs */}
      <section>
        <SectionTitle>Personliga rekord i perioden · {prs.length}</SectionTitle>
        {prs.length === 0 ? (
          <Card className="text-center text-sm text-muted">Inga nya rekord i perioden – än.</Card>
        ) : (
          <Card className="divide-y divide-border/60 p-0">
            {prs.slice(0, 15).map((p, i) => (
              <Link key={i} to={`/exercises/${p.exercise_id}`} className="flex items-center gap-3 px-4 py-3">
                <Trophy className="size-4 shrink-0 text-warn" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{exMap.get(p.exercise_id)?.name}</div>
                  <div className="text-xs text-muted">{PR_LABEL[p.kind]} · {formatDate(p.date)}</div>
                </div>
                <Badge tone="warn">
                  {p.kind === 'reps' ? `${p.value} reps` : p.kind === 'volume' ? formatVolume(p.value) : `${formatNum(p.value)} kg`}
                </Badge>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}

function Kpi({ icon, label, value, sub }: { icon?: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="tabular mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </Card>
  )
}
