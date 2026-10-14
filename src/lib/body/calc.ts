import { differenceInCalendarDays, parseISO } from 'date-fns'

export interface WeightEntry {
  measured_on: string // yyyy-MM-dd
  weight: number
}

export interface WeightPoint extends WeightEntry {
  avg7: number
}

/**
 * Seven-day moving average: for each entry, the mean of all entries in the 7 calendar days ending
 * that day (gaps are fine – only logged days count).
 */
export function withMovingAverage(entries: WeightEntry[]): WeightPoint[] {
  const sorted = [...entries].sort((a, b) => a.measured_on.localeCompare(b.measured_on))
  return sorted.map((e, i) => {
    const day = parseISO(e.measured_on)
    let sum = 0
    let n = 0
    for (let j = i; j >= 0; j--) {
      if (differenceInCalendarDays(day, parseISO(sorted[j].measured_on)) > 6) break
      sum += sorted[j].weight
      n++
    }
    return { ...e, avg7: Math.round((sum / n) * 100) / 100 }
  })
}

/** Change of the 7-day average over the last `days` days (null without enough data). */
export function trendChange(points: WeightPoint[], days: number): number | null {
  if (points.length < 2) return null
  const last = points[points.length - 1]
  const lastDay = parseISO(last.measured_on)
  // Latest point at least `days` before the last one
  let ref: WeightPoint | undefined
  for (let i = points.length - 2; i >= 0; i--) {
    if (differenceInCalendarDays(lastDay, parseISO(points[i].measured_on)) >= days) {
      ref = points[i]
      break
    }
  }
  if (!ref) return null
  return Math.round((last.avg7 - ref.avg7) * 100) / 100
}

/** Average weekly change (kg/week) of the 7-day average over the last 28 days, using linear regression. */
export function weeklyRate(points: WeightPoint[]): number | null {
  if (points.length < 3) return null
  const lastDay = parseISO(points[points.length - 1].measured_on)
  const recent = points.filter((p) => differenceInCalendarDays(lastDay, parseISO(p.measured_on)) <= 28)
  if (recent.length < 3) return null
  const xs = recent.map((p) => -differenceInCalendarDays(lastDay, parseISO(p.measured_on)))
  const ys = recent.map((p) => p.avg7)
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = ys.reduce((a, b) => a + b, 0) / ys.length
  let num = 0
  let den = 0
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  if (den === 0) return null
  return Math.round((num / den) * 7 * 100) / 100
}
