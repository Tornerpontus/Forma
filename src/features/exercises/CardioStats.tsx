import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, SectionTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { CHART, ChartTooltip, RangePicker, rangeStart, type RangeKey } from '@/components/charts/ChartKit'
import { formatDate, formatShortDate } from '@/lib/format'
import { cardioSessions, formatDurationShort, formatKm, formatNum, formatPace } from '@/lib/training/calc'
import type { HistorySet } from '@/lib/training/types'

type Metric = 'minutes' | 'km'

/** Time/distance statistics for a cardio exercise. Only shows what was actually logged. */
export function CardioStats({ sets, names }: { sets: HistorySet[]; names: Map<string, string> }) {
  const sessions = useMemo(() => cardioSessions(sets), [sets])
  const hasDistance = sessions.some((s) => s.meters > 0)
  const [metric, setMetric] = useState<Metric>('minutes')
  const [range, setRange] = useState<RangeKey>('90d')

  const longest = sessions.reduce<(typeof sessions)[number] | null>((b, s) => (!b || s.seconds > b.seconds ? s : b), null)
  const farthest = sessions.reduce<(typeof sessions)[number] | null>((b, s) => (s.meters > 0 && (!b || s.meters > b.meters) ? s : b), null)
  const fastest = sessions.reduce<(typeof sessions)[number] | null>(
    (b, s) => (s.paceSecPerKm != null && s.meters >= 1000 && (!b || s.paceSecPerKm < (b.paceSecPerKm ?? Infinity)) ? s : b),
    null,
  )

  const data = useMemo(() => {
    const start = rangeStart(range)
    return sessions
      .filter((s) => !start || new Date(s.date) >= start)
      .map((s) => ({ date: formatShortDate(new Date(s.date)), full: s.date, value: metric === 'minutes' ? Math.round(s.seconds / 6) / 10 : Math.round(s.meters / 10) / 100 }))
      .filter((p) => p.value > 0)
  }, [sessions, metric, range])

  if (!sessions.length) return null

  return (
    <>
      <section className="mt-6">
        <SectionTitle>Rekord</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {longest && longest.seconds > 0 && <Stat label="Längsta pass" value={formatDurationShort(longest.seconds)} sub={formatDate(longest.date)} />}
          {farthest && <Stat label="Längsta distans" value={formatKm(farthest.meters)} sub={formatDate(farthest.date)} />}
          {fastest && <Stat label="Bästa tempo (≥ 1 km)" value={formatPace(fastest.paceSecPerKm)} sub={formatDate(fastest.date)} />}
          <Stat label="Totalt" value={formatDurationShort(sessions.reduce((n, s) => n + s.seconds, 0))} sub={`${sessions.length} pass${hasDistance ? ` · ${formatKm(sessions.reduce((n, s) => n + s.meters, 0))}` : ''}`} />
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle>Utveckling</SectionTitle>
        <Card className="space-y-3">
          {hasDistance && (
            <Segmented value={metric} onChange={setMetric} options={[{ value: 'minutes', label: 'Tid' }, { value: 'km', label: 'Distans' }]} size="sm" />
          )}
          <div className="h-52" data-testid="cardio-chart">
            {data.length < 1 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">Ingen data i perioden</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
                  <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} width={40} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip format={(v) => `${formatNum(v, 2)} ${metric === 'minutes' ? 'min' : 'km'}`} />} />
                  <Bar dataKey="value" fill={CHART.accent} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <RangePicker value={range} onChange={setRange} />
        </Card>
      </section>

      <section className="mt-6">
        <SectionTitle>All historik · {sessions.length} pass</SectionTitle>
        <div className="space-y-2">
          {[...sessions].reverse().map((s) => (
            <Link key={s.workout_id} to={`/history/${s.workout_id}`} className="block">
              <Card className="flex items-center justify-between gap-3 transition-colors hover:bg-surface-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{names.get(s.workout_id) ?? 'Pass'}</div>
                  <div className="text-xs first-letter:uppercase text-muted">{formatDate(s.date, { withWeekday: true })}</div>
                </div>
                <div className="tabular text-right text-sm">
                  <div>
                    {s.seconds > 0 ? formatDurationShort(s.seconds) : ''}
                    {s.seconds > 0 && s.meters > 0 ? ' · ' : ''}
                    {s.meters > 0 ? formatKm(s.meters) : ''}
                  </div>
                  {s.paceSecPerKm != null && <div className="text-xs text-subtle">{formatPace(s.paceSecPerKm)}</div>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{label}</div>
      <div className="tabular mt-1 text-xl font-semibold">{value}</div>
      <div className="truncate text-xs text-muted">{sub}</div>
    </Card>
  )
}
