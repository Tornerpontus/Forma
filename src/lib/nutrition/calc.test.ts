import { describe, expect, it } from 'vitest'
import { forGrams, looksInconsistent, recipePer100, sum, validatePer100 } from './calc'

const oats = { kcal: 370, protein: 13, carbs: 59, fat: 7 }
const milk = { kcal: 46, protein: 3.5, carbs: 4.8, fat: 1.5 }

describe('nutrition calc', () => {
  it('scales per 100 g', () => {
    expect(forGrams(oats, 60)).toEqual({ kcal: 222, protein: 7.8, carbs: 35.4, fat: 4.2 })
  })
  it('sums', () => {
    expect(sum([forGrams(oats, 100), forGrams(milk, 200)])).toEqual({ kcal: 462, protein: 20, carbs: 68.6, fat: 10 })
  })
  it('computes recipe per 100 g with raw and cooked weight', () => {
    const items = [{ food: oats, grams: 100 }, { food: milk, grams: 200 }]
    const raw = recipePer100(items)
    expect(raw.totalGrams).toBe(300)
    expect(raw.kcal).toBe(154)
    const cooked = recipePer100(items, 250)
    expect(cooked.kcal).toBeCloseTo(184.8, 1)
  })
  it('validates impossible values and flags inconsistent kcal', () => {
    expect(validatePer100({ kcal: 100, protein: 60, carbs: 50, fat: 0 })).toMatch(/100 g/)
    expect(validatePer100(oats)).toBeNull()
    expect(looksInconsistent(oats)).toBe(false)
    expect(looksInconsistent({ kcal: 37, protein: 13, carbs: 59, fat: 7 })).toBe(true)
  })
})
