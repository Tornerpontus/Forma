export interface Per100 {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

const r1 = (n: number) => Math.round(n * 10) / 10

/** Nutrition for `grams` of a food given per-100 g values. */
export function forGrams(food: Per100, grams: number): Macros {
  const f = grams / 100
  return { kcal: r1(Number(food.kcal) * f), protein: r1(Number(food.protein) * f), carbs: r1(Number(food.carbs) * f), fat: r1(Number(food.fat) * f) }
}

export function sum(list: Macros[]): Macros {
  return list.reduce(
    (a, b) => ({ kcal: r1(a.kcal + Number(b.kcal)), protein: r1(a.protein + Number(b.protein)), carbs: r1(a.carbs + Number(b.carbs)), fat: r1(a.fat + Number(b.fat)) }),
    ZERO,
  )
}

/**
 * Per-100 g values of a recipe. Uses the cooked weight when given (water lost/gained while cooking),
 * otherwise the summed raw weight of the ingredients.
 */
export function recipePer100(items: { food: Per100; grams: number }[], cookedWeight?: number | null): Per100 & { totalGrams: number; total: Macros } {
  const total = sum(items.map((i) => forGrams(i.food, i.grams)))
  const rawWeight = items.reduce((n, i) => n + Number(i.grams), 0)
  const weight = cookedWeight && cookedWeight > 0 ? cookedWeight : rawWeight
  if (weight <= 0) return { ...ZERO, totalGrams: 0, total }
  const f = 100 / weight
  return { kcal: r1(total.kcal * f), protein: r1(total.protein * f), carbs: r1(total.carbs * f), fat: r1(total.fat * f), totalGrams: weight, total }
}

/** Energy implied by the macros (Atwater 4/4/9). Used to warn about likely typos. */
export function kcalFromMacros(m: Omit<Macros, 'kcal'>): number {
  return r1(m.protein * 4 + m.carbs * 4 + m.fat * 9)
}

/** True when entered kcal and the macro sum disagree by more than 20 % (and 20 kcal). */
export function looksInconsistent(p: Per100): boolean {
  const est = kcalFromMacros(p)
  const diff = Math.abs(est - p.kcal)
  return diff > 20 && diff > 0.2 * Math.max(p.kcal, est)
}

export function validatePer100(p: Per100): string | null {
  if ([p.kcal, p.protein, p.carbs, p.fat].some((v) => !Number.isFinite(v) || v < 0)) return 'Värdena måste vara positiva tal.'
  if (p.protein + p.carbs + p.fat > 100.5) return 'Protein + kolhydrater + fett kan inte vara mer än 100 g per 100 g.'
  if (p.kcal > 900) return 'Mer än 900 kcal per 100 g är inte möjligt.'
  return null
}

export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export const MEALS: { key: MealKey; label: string }[] = [
  { key: 'breakfast', label: 'Frukost' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Middag' },
  { key: 'snack', label: 'Mellanmål' },
]

/** Default meal for the current time of day. */
export function mealForNow(d = new Date()): MealKey {
  const h = d.getHours()
  if (h < 10) return 'breakfast'
  if (h < 14) return 'lunch'
  if (h >= 17 && h < 21) return 'dinner'
  return 'snack'
}
