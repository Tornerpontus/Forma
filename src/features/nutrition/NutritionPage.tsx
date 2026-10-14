import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { addDays, format, isToday, parseISO, subDays } from 'date-fns'
import { sv } from 'date-fns/locale'
import { BarChart3, BookOpen, ChevronLeft, ChevronRight, Copy, MoreHorizontal, Plus, Save, Settings2, Trash2, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { NumberCell } from '@/features/workout/NumberCell'
import { MenuItem } from '@/features/workout/ExerciseBlock'
import { useDayLogs, useLogMutations, useSavedMealMutations, type FoodLog } from '@/lib/api/nutrition'
import { useProfile, useUpdateProfile } from '@/lib/api/profile'
import { MEALS, mealForNow, sum, type MealKey } from '@/lib/nutrition/calc'
import { formatNum } from '@/lib/training/calc'
import { cn } from '@/lib/utils'
import { AddFoodSheet } from './AddFoodSheet'

export const dayKey = (d: Date) => format(d, 'yyyy-MM-dd')

export function NutritionPage() {
  const [params, setParams] = useSearchParams()
  const day = params.get('d') ?? dayKey(new Date())
  const date = parseISO(day)
  const { data: logs } = useDayLogs(day)
  const { data: profile } = useProfile()
  const [adding, setAdding] = useState<MealKey | null>(null)
  const [editing, setEditing] = useState<FoodLog | null>(null)
  const [mealMenu, setMealMenu] = useState<MealKey | null>(null)
  const [targetsOpen, setTargetsOpen] = useState(false)

  const totals = useMemo(() => sum((logs ?? []).map((l) => ({ kcal: Number(l.kcal), protein: Number(l.protein), carbs: Number(l.carbs), fat: Number(l.fat) }))), [logs])
  const go = (d: Date) => setParams(isToday(d) ? {} : { d: dayKey(d) }, { replace: true })

  return (
    <div className="space-y-5 pb-6">
      <header className="flex items-end justify-between pt-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Kost</h1>
        </div>
        <div className="flex gap-1">
          <Button asChild variant="secondary" size="icon-sm" aria-label="Statistik">
            <Link to="/nutrition/stats"><BarChart3 /></Link>
          </Button>
          <Button asChild variant="secondary" size="icon-sm" aria-label="Livsmedel och recept">
            <Link to="/nutrition/foods"><BookOpen /></Link>
          </Button>
          <Button variant="secondary" size="icon-sm" aria-label="Kostmål" onClick={() => setTargetsOpen(true)}>
            <Settings2 />
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-between rounded-2xl bg-surface p-1">
        <Button variant="ghost" size="icon" aria-label="Föregående dag" onClick={() => go(subDays(date, 1))}>
          <ChevronLeft />
        </Button>
        <div className="text-center">
          <div className="text-[15px] font-semibold first-letter:uppercase">{isToday(date) ? 'Idag' : format(date, 'EEEE', { locale: sv })}</div>
          <div className="text-xs text-muted">{format(date, 'd MMMM yyyy', { locale: sv })}</div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Nästa dag" onClick={() => go(addDays(date, 1))} disabled={isToday(date)}>
          <ChevronRight />
        </Button>
      </div>

      <DaySummary totals={totals} profile={profile} onSetTargets={() => setTargetsOpen(true)} />

      {MEALS.map((m) => {
        const items = (logs ?? []).filter((l) => l.meal === m.key)
        const mt = sum(items.map((l) => ({ kcal: Number(l.kcal), protein: Number(l.protein), carbs: Number(l.carbs), fat: Number(l.fat) })))
        return (
          <Card key={m.key} className="p-0" data-testid={`meal-${m.key}`}>
            <div className="flex items-center gap-2 px-4 pb-1 pt-3">
              <div className="flex-1">
                <div className="font-semibold">{m.label}</div>
                <div className="tabular text-xs text-muted">
                  {formatNum(mt.kcal, 0)} kcal · P {formatNum(mt.protein, 0)} g
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Fler val för ${m.label}`} onClick={() => setMealMenu(m.key)}>
                <MoreHorizontal />
              </Button>
              <Button variant="subtle" size="icon-sm" aria-label={`Lägg till i ${m.label}`} onClick={() => setAdding(m.key)}>
                <Plus />
              </Button>
            </div>
            {items.length > 0 && (
              <ul className="divide-y divide-border/50 px-4 pb-1">
                {items.map((l) => (
                  <li key={l.id}>
                    <button type="button" className="flex w-full items-center gap-3 py-2.5 text-left" onClick={() => setEditing(l)}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px]">{l.name}</div>
                        <div className="tabular text-xs text-muted">
                          {formatNum(Number(l.grams), 0)} g · P {formatNum(Number(l.protein))} · K {formatNum(Number(l.carbs))} · F {formatNum(Number(l.fat))}
                        </div>
                      </div>
                      <div className="tabular text-sm font-medium">{formatNum(Number(l.kcal), 0)}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {items.length === 0 && <div className="px-4 pb-3 text-sm text-subtle">Inget loggat</div>}
          </Card>
        )
      })}

      <Button size="lg" className="w-full" onClick={() => setAdding(mealForNow())}>
        <Plus /> Logga mat
      </Button>

      <AddFoodSheet open={!!adding} onOpenChange={(o) => !o && setAdding(null)} day={day} meal={adding ?? 'snack'} />
      <EditLogSheet log={editing} onClose={() => setEditing(null)} />
      <MealMenu meal={mealMenu} day={day} logs={(logs ?? []).filter((l) => l.meal === mealMenu)} onClose={() => setMealMenu(null)} />
      <TargetsSheet open={targetsOpen} onOpenChange={setTargetsOpen} />
    </div>
  )
}

function DaySummary({
  totals,
  profile,
  onSetTargets,
}: {
  totals: ReturnType<typeof sum>
  profile: ReturnType<typeof useProfile>['data']
  onSetTargets: () => void
}) {
  const target = profile?.kcal_target ?? null
  const pct = target ? Math.min(1, totals.kcal / target) : 0
  const left = target ? Math.round(target - totals.kcal) : null
  const R = 52
  const C = 2 * Math.PI * R
  return (
    <Card className="flex items-center gap-5">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-surface-3)" strokeWidth="10" />
          {target ? (
            <circle cx="60" cy="60" r={R} fill="none" stroke={left != null && left < 0 ? 'var(--color-warn)' : 'var(--color-accent)'} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} className="transition-[stroke-dashoffset] duration-500" />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="tabular text-2xl font-bold" data-testid="kcal-total">{formatNum(totals.kcal, 0)}</div>
          <div className="text-[11px] text-muted">{target ? `av ${target} kcal` : 'kcal'}</div>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {target ? (
          <div className={cn('text-sm font-medium', left! < 0 ? 'text-warn' : 'text-accent')}>{left! >= 0 ? `${left} kcal kvar` : `${-left!} kcal över`}</div>
        ) : (
          <button type="button" onClick={onSetTargets} className="text-sm font-medium text-accent">
            Sätt dina mål →
          </button>
        )}
        <MacroBar label="Protein" value={totals.protein} target={profile?.protein_target ?? null} color="var(--color-accent)" />
        <MacroBar label="Kolhydrater" value={totals.carbs} target={profile?.carbs_target ?? null} color="var(--color-info)" />
        <MacroBar label="Fett" value={totals.fat} target={profile?.fat_target ?? null} color="var(--color-warn)" />
      </div>
    </Card>
  )
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number | null; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular">
          {formatNum(value, 0)}
          {target ? <span className="text-subtle"> / {target} g</span> : ' g'}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${target ? Math.min(100, (value / target) * 100) : 0}%`, background: color }} />
      </div>
    </div>
  )
}

function EditLogSheet({ log, onClose }: { log: FoodLog | null; onClose: () => void }) {
  const { updateGrams, remove } = useLogMutations()
  const [grams, setGrams] = useState<number | null>(null)
  const [meal, setMeal] = useState<MealKey | null>(null)
  const g = grams ?? (log ? Number(log.grams) : null)
  const mk = meal ?? (log?.meal as MealKey | undefined) ?? 'snack'
  const close = () => {
    setGrams(null)
    setMeal(null)
    onClose()
  }
  return (
    <Sheet open={!!log} onOpenChange={(o) => !o && close()} title={log?.name ?? ''}>
      {log && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <NumberCell decimal label="Gram" value={g} min={0} max={10000} onChange={setGrams} className="h-14 text-2xl" />
            <span className="text-muted">gram</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {MEALS.map((m) => (
              <button key={m.key} type="button" onClick={() => setMeal(m.key)} className={cn('h-9 rounded-lg text-xs font-medium', mk === m.key ? 'bg-fg text-bg' : 'bg-surface-2 text-muted')}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="danger"
              onClick={async () => {
                await remove.mutateAsync(log.id)
                close()
              }}
            >
              <Trash2 /> Ta bort
            </Button>
            <Button
              disabled={!g || g <= 0}
              onClick={async () => {
                await updateGrams.mutateAsync({ log, grams: g!, meal: mk })
                close()
              }}
            >
              Spara
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function MealMenu({ meal, day, logs, onClose }: { meal: MealKey | null; day: string; logs: FoodLog[]; onClose: () => void }) {
  const { copyMeal } = useLogMutations()
  const { saveFromLogs } = useSavedMealMutations()
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const label = MEALS.find((m) => m.key === meal)?.label ?? ''
  const close = () => {
    setNaming(false)
    setName('')
    onClose()
  }
  return (
    <Sheet open={!!meal} onOpenChange={(o) => !o && close()} title={label}>
      {meal && !naming && (
        <div className="grid gap-1 pt-1">
          <MenuItem
            icon={<Copy />}
            onClick={async () => {
              const prev = dayKey(subDays(parseISO(day), 1))
              const n = await copyMeal.mutateAsync({ fromDay: prev, toDay: day, meal })
              toast[n ? 'success' : 'info'](n ? `${n} rader kopierade från igår` : 'Inget att kopiera från igår')
              close()
            }}
          >
            Kopiera {label.toLowerCase()} från dagen innan
          </MenuItem>
          <MenuItem icon={<Save />} disabled={!logs.some((l) => l.food_id || l.recipe_id)} onClick={() => { setName(label); setNaming(true) }}>
            Spara som måltid
          </MenuItem>
          <MenuItem icon={<UtensilsCrossed />} onClick={close}>
            Stäng
          </MenuItem>
        </div>
      )}
      {meal && naming && (
        <form
          className="space-y-3 pt-1"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!name.trim()) return
            await saveFromLogs.mutateAsync({ name: name.trim(), logs })
            toast.success('Måltiden sparad')
            close()
          }}
        >
          <Label htmlFor="mealname">Namn på måltiden</Label>
          <Input id="mealname" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={160} />
          <Button type="submit" className="w-full">Spara</Button>
        </form>
      )}
    </Sheet>
  )
}

export function TargetsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: p } = useProfile()
  const update = useUpdateProfile()
  const [v, setV] = useState<{ kcal: number | null; protein: number | null; carbs: number | null; fat: number | null } | null>(null)
  const cur = v ?? { kcal: p?.kcal_target ?? null, protein: p?.protein_target ?? null, carbs: p?.carbs_target ?? null, fat: p?.fat_target ?? null }
  const macroKcal = (cur.protein ?? 0) * 4 + (cur.carbs ?? 0) * 4 + (cur.fat ?? 0) * 9
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) setV(null); onOpenChange(o) }} title="Dagliga mål" description="Lämna tomt för att inte ha ett mål">
      <div className="space-y-4 pt-1">
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ['kcal', 'Kcal', 20000],
              ['protein', 'Protein g', 1000],
              ['carbs', 'Kolh. g', 2000],
              ['fat', 'Fett g', 1000],
            ] as const
          ).map(([k, label, max]) => (
            <div key={k}>
              <div className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-subtle">{label}</div>
              <NumberCell label={`Mål ${label}`} value={cur[k]} min={0} max={max} placeholder="–" onChange={(x) => setV({ ...cur, [k]: x })} />
            </div>
          ))}
        </div>
        {macroKcal > 0 && (
          <p className="text-xs text-muted">
            Makronas mål motsvarar {Math.round(macroKcal)} kcal{cur.kcal ? ` (kalorimålet är ${cur.kcal})` : ''}.
          </p>
        )}
        <Button
          className="w-full"
          size="lg"
          onClick={async () => {
            await update.mutateAsync({ kcal_target: cur.kcal, protein_target: cur.protein, carbs_target: cur.carbs, fat_target: cur.fat })
            toast.success('Målen sparade')
            setV(null)
            onOpenChange(false)
          }}
        >
          Spara mål
        </Button>
      </div>
    </Sheet>
  )
}
