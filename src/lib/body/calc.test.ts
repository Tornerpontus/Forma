import { describe, expect, it } from 'vitest'
import { trendChange, weeklyRate, withMovingAverage } from './calc'

describe('body weight calc', () => {
  it('computes a 7-calendar-day moving average', () => {
    const pts = withMovingAverage([
      { measured_on: '2026-10-01', weight: 80 },
      { measured_on: '2026-10-02', weight: 82 },
      { measured_on: '2026-10-07', weight: 81 },
      { measured_on: '2026-10-08', weight: 79 }, // 10-01 drops out (8 days)
    ])
    expect(pts.map((p) => p.avg7)).toEqual([80, 81, 81, 80.67])
  })
  it('sorts input and handles gaps', () => {
    const pts = withMovingAverage([
      { measured_on: '2026-10-20', weight: 70 },
      { measured_on: '2026-10-01', weight: 72 },
    ])
    expect(pts[0].measured_on).toBe('2026-10-01')
    expect(pts[1].avg7).toBe(70)
  })
  it('reports trend change and weekly rate', () => {
    const entries = Array.from({ length: 29 }, (_, i) => ({
      measured_on: `2026-09-${String(i + 1).padStart(2, '0')}`,
      weight: 80 - i * 0.1, // -0.7 kg / week
    }))
    const pts = withMovingAverage(entries)
    expect(trendChange(pts, 7)).toBeCloseTo(-0.7, 1)
    expect(weeklyRate(pts)).toBeCloseTo(-0.7, 1)
    expect(trendChange(pts.slice(0, 3), 7)).toBeNull()
  })
})
