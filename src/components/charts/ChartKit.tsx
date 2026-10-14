import type { ReactNode } from 'react'
import { Segmented } from '@/components/ui/segmented'

export const CHART = {
  accent: '#c8f560',
  grid: '#2a2c31',
  axis: '#7d818b',
  muted: '#9a9ea7',
  palette: ['#c8f560', '#7cb7ff', '#f5b860', '#ff8fa3', '#b69cff', '#5fd4c4', '#ffd166', '#9a9ea7'],
}

export type RangeKey = '7d' | '30d' | '90d' | '6m' | 'all'
export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '7d', label: '7 d' },
  { value: '30d', label: '30 d' },
  { value: '90d', label: '90 d' },
  { value: '6m', label: '6 mån' },
  { value: 'all', label: 'Allt' },
]

export function rangeStart(r: RangeKey): Date | null {
  const d = new Date()
  switch (r) {
    case '7d':
      d.setDate(d.getDate() - 7)
      return d
    case '30d':
      d.setDate(d.getDate() - 30)
      return d
    case '90d':
      d.setDate(d.getDate() - 90)
      return d
    case '6m':
      d.setMonth(d.getMonth() - 6)
      return d
    default:
      return null
  }
}

export function RangePicker({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  return <Segmented value={value} onChange={onChange} options={RANGE_OPTIONS} size="sm" />
}

export function ChartTooltip({
  active,
  payload,
  label,
  format,
  labelFormat,
}: {
  active?: boolean
  payload?: { value: number; name: string; color?: string }[]
  label?: string | number
  format?: (v: number, name: string) => ReactNode
  labelFormat?: (l: string | number) => ReactNode
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs shadow-xl">
      {label != null && <div className="mb-1 text-muted">{labelFormat ? labelFormat(label) : label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          {payload.length > 1 && <span className="size-2 rounded-full" style={{ background: p.color }} />}
          <span className="tabular font-semibold text-fg">{format ? format(p.value, p.name) : p.value}</span>
          {payload.length > 1 && <span className="text-muted">{p.name}</span>}
        </div>
      ))}
    </div>
  )
}
