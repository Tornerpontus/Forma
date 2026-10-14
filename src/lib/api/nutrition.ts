import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, unwrap } from '@/lib/supabase'
import { useUserId } from '@/hooks/auth'
import type { Database } from '@/lib/database.types'
import { forGrams, recipePer100, type MealKey, type Per100 } from '@/lib/nutrition/calc'

type T = Database['public']['Tables']
export type Food = T['foods']['Row']
export type FoodLog = T['food_logs']['Row']
export type Recipe = T['recipes']['Row'] & { recipe_items: (T['recipe_items']['Row'] & { foods: Food | null })[] }
export type SavedMeal = T['saved_meals']['Row'] & { saved_meal_items: T['saved_meal_items']['Row'][] }
export type FoodInput = Omit<T['foods']['Insert'], 'user_id' | 'id' | 'created_at' | 'updated_at'>

const nk = {
  foods: (u: string) => ['foods', u] as const,
  day: (u: string, d: string) => ['food-logs', u, d] as const,
  range: (u: string, from: string, to: string) => ['food-logs', u, 'range', from, to] as const,
  recipes: (u: string) => ['recipes', u] as const,
  meals: (u: string) => ['saved-meals', u] as const,
}

const n = (v: unknown) => Number(v ?? 0)
export const per100 = (f: Pick<Food, 'kcal' | 'protein' | 'carbs' | 'fat'>): Per100 => ({ kcal: n(f.kcal), protein: n(f.protein), carbs: n(f.carbs), fat: n(f.fat) })

export function recipeNutrition(r: Recipe) {
  return recipePer100(
    r.recipe_items.filter((i) => i.foods).map((i) => ({ food: per100(i.foods!), grams: n(i.grams) })),
    r.cooked_weight_g == null ? null : n(r.cooked_weight_g),
  )
}

export function useFoods() {
  const uid = useUserId()
  return useQuery({
    queryKey: nk.foods(uid),
    queryFn: async () => unwrap(await supabase.from('foods').select('*').eq('archived', false).order('name')),
    staleTime: 5 * 60_000,
  })
}

export function useSaveFood() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: FoodInput & { id?: string }) => {
      if (id) return unwrap(await supabase.from('foods').update(input).eq('id', id).select('*').single())
      if (input.source_id) {
        // Same product imported before → reuse it
        const existing = unwrap(
          await supabase.from('foods').select('*').eq('source', input.source ?? 'manual').eq('source_id', input.source_id).limit(1),
        )
        if (existing[0]) {
          if (existing[0].archived) await supabase.from('foods').update({ archived: false }).eq('id', existing[0].id)
          return existing[0]
        }
      }
      return unwrap(await supabase.from('foods').insert({ ...input, user_id: uid }).select('*').single())
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: nk.foods(uid) }),
  })
}

export function useArchiveFood() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('foods').update({ archived: true }).eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: nk.foods(uid) }),
  })
}

export function useDayLogs(day: string) {
  const uid = useUserId()
  return useQuery({
    queryKey: nk.day(uid, day),
    queryFn: async () => unwrap(await supabase.from('food_logs').select('*').eq('logged_on', day).order('created_at')),
  })
}

export function useLogsRange(from: string, to: string) {
  const uid = useUserId()
  return useQuery({
    queryKey: nk.range(uid, from, to),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('food_logs')
          .select('logged_on, meal, kcal, protein, carbs, fat')
          .gte('logged_on', from)
          .lte('logged_on', to)
          .order('logged_on')
          .limit(5000),
      ),
  })
}

export interface LogInput {
  day: string
  meal: MealKey
  grams: number
  food?: Food
  recipe?: Recipe
}

function logRow(uid: string, { day, meal, grams, food, recipe }: LogInput) {
  const p = food ? per100(food) : recipeNutrition(recipe!)
  const m = forGrams(p, grams)
  return {
    user_id: uid,
    logged_on: day,
    meal,
    food_id: food?.id ?? null,
    recipe_id: recipe?.id ?? null,
    name: food ? (food.brand ? `${food.name} (${food.brand})` : food.name) : recipe!.name,
    grams,
    ...m,
  }
}

export function useLogMutations() {
  const uid = useUserId()
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['food-logs', uid] })

  const add = useMutation({
    mutationFn: async (items: LogInput[]) => unwrap(await supabase.from('food_logs').insert(items.map((i) => logRow(uid, i))).select('*')),
    onSuccess: invalidate,
  })
  /** Changes the portion; nutrition is rescaled from the logged values (keeps the original snapshot). */
  const updateGrams = useMutation({
    mutationFn: async ({ log, grams, meal }: { log: FoodLog; grams: number; meal?: MealKey }) => {
      const f = grams / n(log.grams)
      const r = (v: unknown) => Math.round(n(v) * f * 10) / 10
      return unwrap(
        await supabase
          .from('food_logs')
          .update({ grams, kcal: r(log.kcal), protein: r(log.protein), carbs: r(log.carbs), fat: r(log.fat), meal: meal ?? (log.meal as MealKey) })
          .eq('id', log.id),
      )
    },
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('food_logs').delete().eq('id', id)),
    onSuccess: invalidate,
  })
  /** Copies every entry of one meal from another day. */
  const copyMeal = useMutation({
    mutationFn: async ({ fromDay, toDay, meal }: { fromDay: string; toDay: string; meal: MealKey }) => {
      const src = unwrap(await supabase.from('food_logs').select('*').eq('logged_on', fromDay).eq('meal', meal))
      if (!src.length) return 0
      unwrap(
        await supabase.from('food_logs').insert(
          src.map(({ food_id, recipe_id, name, grams, kcal, protein, carbs, fat }) => ({
            user_id: uid, logged_on: toDay, meal, food_id, recipe_id, name, grams, kcal, protein, carbs, fat,
          })),
        ),
      )
      return src.length
    },
    onSuccess: invalidate,
  })
  return { add, updateGrams, remove, copyMeal }
}

export function useRecipes() {
  const uid = useUserId()
  return useQuery({
    queryKey: nk.recipes(uid),
    queryFn: async () => {
      const rows = unwrap(await supabase.from('recipes').select('*, recipe_items(*, foods(*))').order('name')) as Recipe[]
      for (const r of rows) r.recipe_items.sort((a, b) => a.position - b.position)
      return rows
    },
  })
}

export function useSaveRecipe() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (r: { id?: string; name: string; servings: number; cooked_weight_g: number | null; notes: string; items: { food_id: string; grams: number }[] }) => {
      let id = r.id
      const fields = { name: r.name, servings: r.servings, cooked_weight_g: r.cooked_weight_g, notes: r.notes }
      if (id) unwrap(await supabase.from('recipes').update(fields).eq('id', id))
      else id = unwrap(await supabase.from('recipes').insert({ ...fields, user_id: uid }).select('id').single()).id
      unwrap(await supabase.from('recipe_items').delete().eq('recipe_id', id!))
      if (r.items.length)
        unwrap(await supabase.from('recipe_items').insert(r.items.map((i, position) => ({ user_id: uid, recipe_id: id!, food_id: i.food_id, grams: i.grams, position }))))
      return id!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: nk.recipes(uid) }),
  })
}

export function useDeleteRecipe() {
  const uid = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('recipes').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: nk.recipes(uid) }),
  })
}

export function useSavedMeals() {
  const uid = useUserId()
  return useQuery({
    queryKey: nk.meals(uid),
    queryFn: async () => unwrap(await supabase.from('saved_meals').select('*, saved_meal_items(*)').order('name')) as SavedMeal[],
  })
}

export function useSavedMealMutations() {
  const uid = useUserId()
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: nk.meals(uid) })
  const saveFromLogs = useMutation({
    mutationFn: async ({ name, logs }: { name: string; logs: FoodLog[] }) => {
      const usable = logs.filter((l) => l.food_id || l.recipe_id)
      const m = unwrap(await supabase.from('saved_meals').insert({ user_id: uid, name }).select('id').single())
      unwrap(
        await supabase.from('saved_meal_items').insert(
          usable.map((l, position) => ({ user_id: uid, meal_id: m.id, food_id: l.food_id, recipe_id: l.food_id ? null : l.recipe_id, grams: l.grams, position })),
        ),
      )
      return m.id
    },
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('saved_meals').delete().eq('id', id)),
    onSuccess: invalidate,
  })
  return { saveFromLogs, remove }
}
