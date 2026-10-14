import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { ConfirmDialog } from '@/components/ui/sheet'
import { recipeNutrition, useArchiveFood, useFoods, useRecipes, useSavedMealMutations, useSavedMeals, type Food } from '@/lib/api/nutrition'
import { formatNum } from '@/lib/training/calc'
import { BackLink } from '@/features/programs/ProgramDetailPage'
import { normalize } from '@/features/exercises/ExercisePicker'
import { FoodFormSheet } from './FoodForm'

export default function FoodsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as 'foods' | 'recipes' | 'meals' | null) ?? 'foods'
  const setTab = (t: 'foods' | 'recipes' | 'meals') => setParams(t === 'foods' ? {} : { tab: t }, { replace: true })
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Food | 'new' | null>(null)
  const [toDelete, setToDelete] = useState<{ id: string; name: string; kind: 'food' | 'meal' } | null>(null)
  const { data: foods } = useFoods()
  const { data: recipes } = useRecipes()
  const { data: meals } = useSavedMeals()
  const archive = useArchiveFood()
  const mealMut = useSavedMealMutations()
  const navigate = useNavigate()

  const list = useMemo(() => {
    const q = normalize(query)
    return (foods ?? []).filter((f) => !q || normalize(`${f.name} ${f.brand}`).includes(q))
  }, [foods, query])

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        back={<BackLink to="/nutrition" label="Kost" />}
        title="Livsmedel"
        action={
          tab === 'foods' ? (
            <Button size="sm" onClick={() => setEditing('new')}><Plus /> Nytt</Button>
          ) : tab === 'recipes' ? (
            <Button size="sm" onClick={() => navigate('/nutrition/recipes/new')}><Plus /> Recept</Button>
          ) : undefined
        }
      />
      <Segmented value={tab} onChange={setTab} options={[{ value: 'foods', label: 'Livsmedel' }, { value: 'recipes', label: 'Recept' }, { value: 'meals', label: 'Måltider' }]} />
      {tab === 'foods' && (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-subtle" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök" className="pl-10" aria-label="Sök livsmedel" />
          </div>
          <Card className="divide-y divide-border/60 p-0">
            {list.map((f) => (
              <div key={f.id} className="flex items-center gap-2 pr-2">
                <button type="button" className="min-w-0 flex-1 px-4 py-3 text-left" onClick={() => setEditing(f)}>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-medium">{f.name}</span>
                    {f.source === 'openfoodfacts' && <Badge>OFF</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {f.brand && `${f.brand} · `}
                    {formatNum(Number(f.kcal), 0)} kcal · P {formatNum(Number(f.protein))} · K {formatNum(Number(f.carbs))} · F {formatNum(Number(f.fat))} /100 g
                  </div>
                </button>
                <Button variant="ghost" size="icon-sm" aria-label={`Ta bort ${f.name}`} onClick={() => setToDelete({ id: f.id, name: f.name, kind: 'food' })}>
                  <Trash2 className="text-subtle" />
                </Button>
              </div>
            ))}
            {list.length === 0 && <p className="p-6 text-center text-sm text-muted">Inga livsmedel än. Lägg in egna eller hämta från Open Food Facts när du loggar.</p>}
          </Card>
        </>
      )}
      {tab === 'recipes' && (
        <Card className="divide-y divide-border/60 p-0">
          {(recipes ?? []).map((r) => {
            const n = recipeNutrition(r)
            return (
              <Link key={r.id} to={`/nutrition/recipes/${r.id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{r.name}</div>
                  <div className="text-xs text-muted">
                    {r.recipe_items.length} ingredienser · {formatNum(n.kcal, 0)} kcal/100 g · {formatNum(n.total.kcal / Number(r.servings), 0)} kcal/portion
                  </div>
                </div>
                <ChevronRight className="size-4 text-subtle" />
              </Link>
            )
          })}
          {!recipes?.length && <p className="p-6 text-center text-sm text-muted">Inga recept än.</p>}
        </Card>
      )}
      {tab === 'meals' && (
        <Card className="divide-y divide-border/60 p-0">
          {(meals ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-2 py-1 pl-4 pr-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{m.name}</div>
                <div className="text-xs text-muted">{m.saved_meal_items.length} delar</div>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Ta bort ${m.name}`} onClick={() => setToDelete({ id: m.id, name: m.name, kind: 'meal' })}>
                <Trash2 className="text-subtle" />
              </Button>
            </div>
          ))}
          {!meals?.length && <p className="p-6 text-center text-sm text-muted">Spara en måltid från dagsvyn via ⋯ på måltiden.</p>}
        </Card>
      )}
      <FoodFormSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} initial={editing && editing !== 'new' ? editing : undefined} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Ta bort ${toDelete?.name ?? ''}?`}
        description={toDelete?.kind === 'food' ? 'Det du redan loggat påverkas inte.' : undefined}
        confirmLabel="Ta bort"
        danger
        onConfirm={async () => {
          if (!toDelete) return
          if (toDelete.kind === 'food') await archive.mutateAsync(toDelete.id)
          else await mealMut.remove.mutateAsync(toDelete.id)
          toast.success('Borttaget')
        }}
      />
    </div>
  )
}
