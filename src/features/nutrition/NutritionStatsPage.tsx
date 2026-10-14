import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { eachDayOfInterval, format, parseISO, subDays } from 'date-fns'
import { sv } from 'date-fns/locale'
import { PageHeader } from '@/components/layout/AppShell'
import { Card, SectionTitle } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { CHART, ChartTooltip } from '@/components/charts/ChartKit'
import { useLogsRange } from '@/lib/api/nutrition'
import { useProfile } from '@/lib/api/profile'
import { formatNum } from '@/lib/training/calc'
import { BackLink } from '@/features/programs/ProgramDetailPage'
import { dayKey } from './NutritionPage'

type Span = 7 | 14 | 30 | 90

export default function NutritionStatsPage() {
  const [span, setSpan] = useState<Span>(7)
  const to = new Date()
  const from = subDays(to, span - 1)
  const { data: logs } = useLogsRange(dayKey(from), dayKey(to))
  const { data: p } = useProfile()

  const days = useMemo(() => {
    const m = new Map<string, { kcal: number; protein: number; carbs: number; fat: number; n: number }>()
    for (const l of logs ?? []) {
      const d = m.get(l.logged_on) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, n: 0 }
      d.kcal += Number(l.kcal)
      d.protein += Number(l.protein)
      d.carbs += Number(l.carbs)
      d.fat += Number(l.fat)
      d.n++
      m.set(l.logged_on, d)
    }
    return eachDayOfInterval({ start: from, end: to }).map((d) => {
      const k = dayKey(d)
      const v = m.get(k)
      return { key: k, kcal: Math.round(v?.kcal ?? 0), protein: Math.round(v?.protein ?? 0), carbs: Math.round(v?.carbs ?? 0), fat: Math.round(v?.fat ?? 0), logged: !!v }
    })
  }, [logs, span]) // eslint-disable-line react-hooks/exhaustive-deps

  const logged = days.filter((d) => d.logged)
  const avg = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => (logged.length ? logged.reduce((n, d) => n + d[k], 0) / logged.length : 0)
  const onTarget = p?.kcal_target ? logged.filter((d) => Math.abs(d.kcal - p.kcal_target!) <= p.kcal_target! * 0.1).length : null
  const proteinHit = p?.protein_target ? logged.filter((d) => d.protein >= p.protein_target!).length : null

  return (
    <div className="space-y-5 pb-6">
      <PageHeader back={<BackLink to="/nutrition" label="Kost" />} title="Koststatistik" subtitle="Snitt räknas på dagar där du loggat" />
      <Segmented value={String(span) as `${Span}`} onChange={(v) => setSpan(Number(v) as Span)} options={[{ value: '7', label: '7 d' }, { value: '14', label: '14 d' }, { value: '30', label: '30 d' }, { value: '90', label: '90 d' }]} size="sm" />
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Snitt kcal" value={formatNum(avg('kcal'), 0)} sub={p?.kcal_target ? `mål ${p.kcal_target}` : undefined} />
        <Stat label="Snitt protein" value={`${formatNum(avg('protein'), 0)} g`} sub={p?.protein_target ? `mål ${p.protein_target} g` : undefined} />
        <Stat label="Loggade dagar" value={`${logged.length}/${span}`} />
        <Stat label="Inom ±10 % kcal" value={onTarget != null ? `${onTarget} d` : '–'} sub={proteinHit != null ? `proteinmål nått ${proteinHit} d` : undefined} />
      </div>
      <section>
        <SectionTitle>Kalorier per dag</SectionTitle>
        <Card>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tickFormatter={(k) => format(parseISO(k), span <= 14 ? 'EEEEEE' : 'd/M', { locale: sv })} stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={8} />
                <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} width={44} />
                <Tooltip cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} content={<ChartTooltip format={(v) => `${v} kcal`} labelFormat={(l) => format(parseISO(String(l)), 'EEEE d MMM', { locale: sv })} />} />
                {p?.kcal_target && <ReferenceLine y={p.kcal_target} stroke={CHART.palette[2]} strokeDasharray="4 4" />}
                <Bar dataKey="kcal" name="Kcal" fill={CHART.accent} radius={[6, 6, 2, 2]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
      <section>
        <SectionTitle>Makron per dag (g)</SectionTitle>
        <Card>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tickFormatter={(k) => format(parseISO(k), span <= 14 ? 'EEEEEE' : 'd/M', { locale: sv })} stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={8} />
                <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} content={<ChartTooltip format={(v) => `${v} g`} labelFormat={(l) => format(parseISO(String(l)), 'EEEE d MMM', { locale: sv })} />} />
                <Bar dataKey="protein" name="Protein" stackId="m" fill={CHART.accent} isAnimationActive={false} />
                <Bar dataKey="carbs" name="Kolhydrater" stackId="m" fill={CHART.palette[1]} isAnimationActive={false} />
                <Bar dataKey="fat" name="Fett" stackId="m" fill={CHART.palette[2]} radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" />Protein</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-info" />Kolhydrater</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warn" />Fett</span>
          </div>
        </Card>
      </section>
      <section>
        <SectionTitle>Dagar</SectionTitle>
        <Card className="divide-y divide-border/60 p-0">
          {[...days].reverse().map((d) => (
            <Link key={d.key} to={`/nutrition?d=${d.key}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="capitalize">{format(parseISO(d.key), 'EEEE d MMM', { locale: sv })}</span>
              <span className="tabular text-muted">{d.logged ? `${d.kcal} kcal · P ${d.protein}` : '–'}</span>
            </Link>
          ))}
        </Card>
      </section>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{label}</div>
      <div className="tabular mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </Card>
  )
}
