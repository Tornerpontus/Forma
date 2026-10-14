import { useEffect, useMemo, useRef, useState } from 'react'
import { Barcode, ChevronLeft, Globe, Loader2, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { NumberCell } from '@/features/workout/NumberCell'
import { normalize } from '@/features/exercises/ExercisePicker'
import {
  per100,
  recipeNutrition,
  useFoods,
  useLogMutations,
  useRecipes,
  useSaveFood,
  useSavedMeals,
  type Food,
  type Recipe,
} from '@/lib/api/nutrition'
import { forGrams, MEALS, type MealKey } from '@/lib/nutrition/calc'
import { lookupBarcode, searchOpenFoodFacts, type OffProduct } from '@/lib/nutrition/openfoodfacts'
import { formatNum } from '@/lib/training/calc'
import { FoodFormSheet } from './FoodForm'

type Tab = 'mine' | 'online' | 'meals' | 'recipes'
type Picked = { kind: 'food'; food: Food } | { kind: 'recipe'; recipe: Recipe }

export function AddFoodSheet({ open, onOpenChange, day, meal }: { open: boolean; onOpenChange: (o: boolean) => void; day: string; meal: MealKey }) {
  const [tab, setTab] = useState<Tab>('mine')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Picked | null>(null)
  const [creating, setCreating] = useState<Partial<Food> | null>(null)
  const { data: foods } = useFoods()
  const { data: recipes } = useRecipes()
  const { data: meals } = useSavedMeals()
  const { add } = useLogMutations()

  useEffect(() => {
    if (!open) {
      setPicked(null)
      setQuery('')
      setTab('mine')
    }
  }, [open])

  const mealLabel = MEALS.find((m) => m.key === meal)?.label ?? ''
  const filteredFoods = useMemo(() => {
    const q = normalize(query.trim())
    return (foods ?? []).filter((f) => !q || normalize(`${f.name} ${f.brand}`).includes(q))
  }, [foods, query])

  async function logSavedMeal(id: string) {
    const m = meals?.find((x) => x.id === id)
    if (!m) return
    const fMap = new Map((foods ?? []).map((f) => [f.id, f]))
    const rMap = new Map((recipes ?? []).map((r) => [r.id, r]))
    const items = m.saved_meal_items
      .map((i) => {
        const food = i.food_id ? fMap.get(i.food_id) : undefined
        const recipe = i.recipe_id ? rMap.get(i.recipe_id) : undefined
        return food || recipe ? { day, meal, grams: Number(i.grams), food, recipe } : null
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
    if (!items.length) {
      toast.error('Måltiden innehåller inga livsmedel som finns kvar.')
      return
    }
    await add.mutateAsync(items)
    toast.success(`${m.name} tillagd i ${mealLabel.toLowerCase()}`)
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title={picked ? 'Mängd' : `Lägg till i ${mealLabel.toLowerCase()}`} fullHeight>
        {picked ? (
          <PortionStep
            picked={picked}
            onBack={() => setPicked(null)}
            busy={add.isPending}
            onAdd={async (grams) => {
              await add.mutateAsync([{ day, meal, grams, ...(picked.kind === 'food' ? { food: picked.food } : { recipe: picked.recipe }) }])
              toast.success('Tillagt')
              onOpenChange(false)
            }}
          />
        ) : (
          <div className="space-y-3">
            <Segmented
              value={tab}
              onChange={setTab}
              size="sm"
              options={[
                { value: 'mine', label: 'Mina' },
                { value: 'online', label: 'Sök online' },
                { value: 'meals', label: 'Måltider' },
                { value: 'recipes', label: 'Recept' },
              ]}
            />
            {(tab === 'mine' || tab === 'online') && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-subtle" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === 'online' ? 'Sök produkt eller streckkod' : 'Sök bland dina livsmedel'} className="pl-10" aria-label="Sök livsmedel" />
              </div>
            )}

            {tab === 'mine' && (
              <>
                <ul className="divide-y divide-border/60">
                  {filteredFoods.map((f) => (
                    <li key={f.id}>
                      <button type="button" className="flex w-full items-center gap-3 py-3 text-left" onClick={() => setPicked({ kind: 'food', food: f })}>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-medium">{f.name}</div>
                          <div className="truncate text-xs text-muted">
                            {f.brand && `${f.brand} · `}
                            {formatNum(Number(f.kcal), 0)} kcal · P {formatNum(Number(f.protein))} · K {formatNum(Number(f.carbs))} · F {formatNum(Number(f.fat))} /100 g
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                {filteredFoods.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted">
                    {foods?.length ? 'Inget matchar.' : 'Du har inga sparade livsmedel än. Skapa ett eget eller sök online.'}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => setCreating({ name: query })}>
                    <Plus /> Nytt livsmedel
                  </Button>
                  <Button variant="secondary" onClick={() => setTab('online')}>
                    <Globe /> Sök online
                  </Button>
                </div>
              </>
            )}

            {tab === 'online' && <OnlineSearch query={query} onPick={(f) => setPicked({ kind: 'food', food: f })} onCreate={(p) => setCreating(p)} />}

            {tab === 'meals' && (
              <ul className="divide-y divide-border/60">
                {(meals ?? []).map((m) => (
                  <li key={m.id}>
                    <button type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={() => logSavedMeal(m.id)} disabled={add.isPending}>
                      <span className="text-[15px] font-medium">{m.name}</span>
                      <span className="text-xs text-muted">{m.saved_meal_items.length} delar</span>
                    </button>
                  </li>
                ))}
                {!meals?.length && <p className="py-6 text-center text-sm text-muted">Spara en måltid från dagsvyn (⋯ på en måltid) så hamnar den här.</p>}
              </ul>
            )}

            {tab === 'recipes' && (
              <ul className="divide-y divide-border/60">
                {(recipes ?? []).map((r) => {
                  const nut = recipeNutrition(r)
                  return (
                    <li key={r.id}>
                      <button type="button" className="flex w-full items-center gap-3 py-3 text-left" onClick={() => setPicked({ kind: 'recipe', recipe: r })}>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-medium">{r.name}</div>
                          <div className="text-xs text-muted">
                            {formatNum(nut.kcal, 0)} kcal /100 g · {formatNum(Number(r.servings), 0)} portioner
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
                {!recipes?.length && <p className="py-6 text-center text-sm text-muted">Inga recept än – skapa dem under Kost → Recept.</p>}
              </ul>
            )}
          </div>
        )}
      </Sheet>
      <FoodFormSheet
        open={!!creating}
        onOpenChange={(o) => !o && setCreating(null)}
        prefill={creating ?? undefined}
        onSaved={(f) => {
          setCreating(null)
          setPicked({ kind: 'food', food: f })
        }}
      />
    </>
  )
}

function OnlineSearch({ query, onPick, onCreate }: { query: string; onPick: (f: Food) => void; onCreate: (prefill: Partial<Food>) => void }) {
  const [results, setResults] = useState<OffProduct[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = useSaveFood()
  const ctrl = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults(null)
      return
    }
    const t = setTimeout(async () => {
      ctrl.current?.abort()
      const c = new AbortController()
      ctrl.current = c
      setLoading(true)
      setError(null)
      try {
        if (/^\d{8,14}$/.test(q)) {
          const p = await lookupBarcode(q, c.signal)
          setResults(p ? [p] : [])
        } else {
          setResults(await searchOpenFoodFacts(q, c.signal))
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError('Kunde inte nå Open Food Facts. Kontrollera anslutningen eller lägg in livsmedlet manuellt.')
      } finally {
        setLoading(false)
      }
    }, 450)
    return () => clearTimeout(t)
  }, [query])

  async function importProduct(p: OffProduct) {
    try {
      const f = await save.mutateAsync({
        name: p.name,
        brand: p.brand,
        kcal: p.kcal,
        protein: p.protein,
        carbs: p.carbs,
        fat: p.fat,
        fiber: p.fiber,
        portion_g: p.portion_g,
        portion_name: '',
        source: 'openfoodfacts',
        source_id: p.code,
      })
      onPick(f)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunde inte spara')
    }
  }

  return (
    <div>
      <p className="mb-2 flex items-start gap-2 text-xs text-muted">
        <Barcode className="mt-0.5 size-3.5 shrink-0" />
        Data från Open Food Facts (öppen databas). Värdena kommer från tillverkare och användare – jämför gärna med förpackningen.
      </p>
      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted" />
        </div>
      )}
      {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {results && !loading && (
        <ul className="divide-y divide-border/60">
          {results.map((p) => (
            <li key={p.code}>
              <button type="button" className="flex w-full items-center gap-3 py-3 text-left" onClick={() => importProduct(p)} disabled={save.isPending}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{p.name}</div>
                  <div className="truncate text-xs text-muted">
                    {p.brand && `${p.brand} · `}
                    {formatNum(p.kcal, 0)} kcal · P {formatNum(p.protein)} · K {formatNum(p.carbs)} · F {formatNum(p.fat)} /100 g
                  </div>
                </div>
                <Badge>OFF</Badge>
              </button>
            </li>
          ))}
          {results.length === 0 && <p className="py-4 text-center text-sm text-muted">Inga produkter med fullständiga näringsvärden hittades.</p>}
        </ul>
      )}
      <Button variant="secondary" className="mt-3 w-full" onClick={() => onCreate({ name: /^\d+$/.test(query) ? '' : query })}>
        <Plus /> Lägg in manuellt
      </Button>
    </div>
  )
}

function PortionStep({ picked, onBack, onAdd, busy }: { picked: Picked; onBack: () => void; onAdd: (grams: number) => void; busy: boolean }) {
  const isFood = picked.kind === 'food'
  const p = isFood ? per100(picked.food) : recipeNutrition(picked.recipe)
  const portion = isFood ? (picked.food.portion_g ? Number(picked.food.portion_g) : null) : recipeNutrition(picked.recipe).totalGrams / Number(picked.recipe.servings)
  const portionLabel = isFood ? picked.food.portion_name || 'portion' : 'portion'
  const [grams, setGrams] = useState<number | null>(portion ? Math.round(portion) : 100)
  const m = forGrams(p, grams ?? 0)
  const name = isFood ? picked.food.name : picked.recipe.name

  const quick = [
    ...(portion ? [{ label: `1 ${portionLabel} (${Math.round(portion)} g)`, g: Math.round(portion) }] : []),
    ...(portion ? [{ label: `½ ${portionLabel}`, g: Math.round(portion / 2) }] : []),
    { label: '50 g', g: 50 },
    { label: '100 g', g: 100 },
    { label: '150 g', g: 150 },
    { label: '200 g', g: 200 },
  ]

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="-ml-1 flex items-center gap-1 text-sm text-muted">
        <ChevronLeft className="size-4" /> Tillbaka
      </button>
      <div>
        <div className="text-lg font-semibold">{name}</div>
        <div className="text-xs text-muted">
          {formatNum(p.kcal, 0)} kcal per 100 g{!isFood && ' (beräknat från receptet)'}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <NumberCell decimal label="Gram" value={grams} min={0} max={10000} onChange={setGrams} className="h-14 text-2xl" />
        <span className="text-lg text-muted">gram</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <button key={q.label} type="button" onClick={() => setGrams(q.g)} className="h-9 rounded-full bg-surface-2 px-3 text-sm text-muted hover:text-fg">
            {q.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 rounded-2xl bg-surface-2 p-3 text-center">
        <MacroCell label="Kcal" value={formatNum(m.kcal, 0)} />
        <MacroCell label="Protein" value={`${formatNum(m.protein)} g`} />
        <MacroCell label="Kolh." value={`${formatNum(m.carbs)} g`} />
        <MacroCell label="Fett" value={`${formatNum(m.fat)} g`} />
      </div>
      <Button size="lg" className="w-full" disabled={!grams || grams <= 0 || busy} onClick={() => grams && onAdd(grams)}>
        Lägg till
      </Button>
    </div>
  )
}

export function MacroCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tabular text-[15px] font-semibold">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-subtle">{label}</div>
    </div>
  )
}
