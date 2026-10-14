import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, PageLoader } from '@/components/ui/card'
import { Input, Label, Textarea } from '@/components/ui/input'
import { ConfirmDialog, Sheet } from '@/components/ui/sheet'
import { NumberCell } from '@/features/workout/NumberCell'
import { BackLink } from '@/features/programs/ProgramDetailPage'
import { normalize } from '@/features/exercises/ExercisePicker'
import { per100, useDeleteRecipe, useFoods, useRecipes, useSaveRecipe } from '@/lib/api/nutrition'
import { recipePer100 } from '@/lib/nutrition/calc'
import { formatNum } from '@/lib/training/calc'
import { FoodFormSheet } from './FoodForm'
import { MacroCell } from './AddFoodSheet'

export default function RecipeEditorPage() {
  const { recipeId } = useParams()
  const isNew = recipeId === 'new'
  const { data: recipes, isLoading } = useRecipes()
  const { data: foods } = useFoods()
  const recipe = recipes?.find((r) => r.id === recipeId)
  const save = useSaveRecipe()
  const del = useDeleteRecipe()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [servings, setServings] = useState<number | null>(1)
  const [cooked, setCooked] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<{ key: string; food_id: string; grams: number | null }[]>([])
  const [loaded, setLoaded] = useState(false)
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (loaded) return
    if (recipe) {
      setName(recipe.name)
      setServings(Number(recipe.servings))
      setCooked(recipe.cooked_weight_g == null ? null : Number(recipe.cooked_weight_g))
      setNotes(recipe.notes)
      setItems(recipe.recipe_items.map((i) => ({ key: i.id, food_id: i.food_id, grams: Number(i.grams) })))
      setLoaded(true)
    } else if (isNew) setLoaded(true)
  }, [recipe, isNew, loaded])

  const foodMap = useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods])
  // Ingredients may reference archived foods (not in the active list) – fall back to the recipe's join
  const lookup = (id: string) => foodMap.get(id) ?? recipe?.recipe_items.find((i) => i.food_id === id)?.foods ?? undefined
  const nut = recipePer100(
    items.filter((i) => i.grams && lookup(i.food_id)).map((i) => ({ food: per100(lookup(i.food_id)!), grams: i.grams! })),
    cooked,
  )
  const filtered = (foods ?? []).filter((f) => !query || normalize(`${f.name} ${f.brand}`).includes(normalize(query)))

  if (isLoading || !loaded) return <PageLoader />

  return (
    <div className="space-y-4 pb-8">
      <div className="pt-6">
        <BackLink to="/nutrition/foods?tab=recipes" label="Recept" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Receptets namn" aria-label="Receptets namn" className="h-14 border-transparent bg-transparent px-0 text-[26px] font-bold" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Portioner</Label>
          <NumberCell decimal label="Antal portioner" value={servings} min={0.5} max={100} onChange={setServings} />
        </div>
        <div>
          <Label>Vikt tillagad (g)</Label>
          <NumberCell decimal label="Vikt efter tillagning" value={cooked} min={0} max={50000} placeholder={nut.totalGrams ? `${Math.round(items.reduce((n, i) => n + (i.grams ?? 0), 0))}` : 'valfri'} onChange={setCooked} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted">Väg grytan efter tillagning för exakta värden per 100 g. Tomt = råvarornas vikt.</p>

      <Card className="grid grid-cols-4 gap-2 text-center">
        <MacroCell label="Kcal/100 g" value={formatNum(nut.kcal, 0)} />
        <MacroCell label="Protein" value={`${formatNum(nut.protein)} g`} />
        <MacroCell label="Kolh." value={`${formatNum(nut.carbs)} g`} />
        <MacroCell label="Fett" value={`${formatNum(nut.fat)} g`} />
      </Card>
      {servings ? <p className="text-sm text-muted">Per portion: {formatNum(nut.total.kcal / servings, 0)} kcal · {formatNum(nut.total.protein / servings, 0)} g protein ({formatNum(nut.totalGrams / servings, 0)} g)</p> : null}

      <Card className="divide-y divide-border/60 p-0">
        {items.map((i) => {
          const f = lookup(i.food_id)
          return (
            <div key={i.key} className="flex items-center gap-2 py-2 pl-4 pr-2">
              <div className="min-w-0 flex-1 truncate text-[15px]">{f?.name ?? 'Borttaget livsmedel'}</div>
              <div className="w-24">
                <NumberCell decimal label={`Gram ${f?.name ?? ''}`} value={i.grams} min={0} max={50000} onChange={(g) => setItems(items.map((x) => (x.key === i.key ? { ...x, grams: g } : x)))} />
              </div>
              <span className="text-xs text-muted">g</span>
              <Button variant="ghost" size="icon-sm" aria-label="Ta bort ingrediens" onClick={() => setItems(items.filter((x) => x.key !== i.key))}>
                <Trash2 className="text-subtle" />
              </Button>
            </div>
          )
        })}
        <button type="button" onClick={() => setPicking(true)} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-accent">
          <Plus className="size-4" /> Lägg till ingrediens
        </button>
      </Card>

      <div>
        <Label htmlFor="rnotes">Anteckningar</Label>
        <Textarea id="rnotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={!name.trim() || !servings || save.isPending}
        onClick={async () => {
          const valid = items.filter((i) => i.grams && i.grams > 0)
          try {
            await save.mutateAsync({ id: isNew ? undefined : recipeId, name: name.trim(), servings: servings!, cooked_weight_g: cooked, notes, items: valid.map((i) => ({ food_id: i.food_id, grams: i.grams! })) })
            toast.success('Receptet sparat')
            navigate('/nutrition/foods?tab=recipes', { replace: true })
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Kunde inte spara')
          }
        }}
      >
        Spara recept
      </Button>
      {!isNew && (
        <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
          <Trash2 /> Ta bort recept
        </Button>
      )}

      <Sheet open={picking} onOpenChange={setPicking} title="Lägg till ingrediens" fullHeight>
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök bland dina livsmedel" className="pl-10" aria-label="Sök" />
        </div>
        <ul className="divide-y divide-border/60">
          {filtered.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className="w-full py-3 text-left"
                onClick={() => {
                  setItems([...items, { key: crypto.randomUUID(), food_id: f.id, grams: f.portion_g ? Number(f.portion_g) : 100 }])
                  setPicking(false)
                  setQuery('')
                }}
              >
                <div className="text-[15px]">{f.name}</div>
                <div className="text-xs text-muted">{formatNum(Number(f.kcal), 0)} kcal /100 g</div>
              </button>
            </li>
          ))}
        </ul>
        <Button variant="secondary" className="mt-3 w-full" onClick={() => setCreating(true)}>
          <Plus /> Nytt livsmedel
        </Button>
      </Sheet>
      <FoodFormSheet
        open={creating}
        onOpenChange={setCreating}
        prefill={{ name: query }}
        onSaved={(f) => {
          setItems([...items, { key: crypto.randomUUID(), food_id: f.id, grams: 100 }])
          setPicking(false)
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Ta bort receptet?"
        description="Det du redan loggat påverkas inte."
        confirmLabel="Ta bort"
        danger
        onConfirm={async () => {
          await del.mutateAsync(recipeId!)
          navigate('/nutrition/foods?tab=recipes', { replace: true })
        }}
      />
    </div>
  )
}
