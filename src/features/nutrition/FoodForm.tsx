import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { NumberCell } from '@/features/workout/NumberCell'
import { useSaveFood, type Food, type FoodInput } from '@/lib/api/nutrition'
import { kcalFromMacros, looksInconsistent, validatePer100 } from '@/lib/nutrition/calc'

export function FoodFormSheet({
  open,
  onOpenChange,
  initial,
  prefill,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial?: Food
  prefill?: Partial<FoodInput>
  onSaved?: (f: Food) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={initial ? 'Redigera livsmedel' : 'Nytt livsmedel'} description="Näringsvärden per 100 g – skriv av förpackningen">
      {open && (
        <FoodForm
          initial={initial}
          prefill={prefill}
          onSaved={(f) => {
            onSaved?.(f)
            onOpenChange(false)
          }}
        />
      )}
    </Sheet>
  )
}

function FoodForm({ initial, prefill, onSaved }: { initial?: Food; prefill?: Partial<FoodInput>; onSaved: (f: Food) => void }) {
  const src = initial ?? prefill
  const num = (v: unknown) => (v == null || v === '' ? null : Number(v))
  const [name, setName] = useState(src?.name ?? '')
  const [brand, setBrand] = useState(src?.brand ?? '')
  const [kcal, setKcal] = useState<number | null>(num(src?.kcal))
  const [protein, setProtein] = useState<number | null>(num(src?.protein))
  const [carbs, setCarbs] = useState<number | null>(num(src?.carbs))
  const [fat, setFat] = useState<number | null>(num(src?.fat))
  const [portion, setPortion] = useState<number | null>(num(src?.portion_g))
  const [portionName, setPortionName] = useState(src?.portion_name ?? '')
  const save = useSaveFood()

  const values = { kcal: kcal ?? 0, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 }
  const error = kcal == null ? null : validatePer100(values)
  const warn = kcal != null && protein != null && carbs != null && fat != null && looksInconsistent(values)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || kcal == null || error) return
    try {
      const f = await save.mutateAsync({
        id: initial?.id,
        name: name.trim(),
        brand: brand.trim(),
        kcal,
        protein: protein ?? 0,
        carbs: carbs ?? 0,
        fat: fat ?? 0,
        portion_g: portion,
        portion_name: portionName.trim(),
        source: initial?.source ?? prefill?.source ?? 'manual',
        source_id: initial?.source_id ?? prefill?.source_id ?? null,
        fiber: initial?.fiber ?? prefill?.fiber ?? null,
      })
      toast.success('Livsmedlet sparat')
      onSaved(f)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte spara')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 pt-1">
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <div>
          <Label htmlFor="food-name">Namn</Label>
          <Input id="food-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={160} placeholder="t.ex. Kvarg naturell" autoFocus={!initial} />
        </div>
        <div>
          <Label htmlFor="food-brand">Märke</Label>
          <Input id="food-brand" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={80} placeholder="valfritt" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            ['kcal', 'Kcal', kcal, setKcal],
            ['protein', 'Protein', protein, setProtein],
            ['carbs', 'Kolh.', carbs, setCarbs],
            ['fat', 'Fett', fat, setFat],
          ] as const
        ).map(([key, label, v, set]) => (
          <div key={key}>
            <div className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-subtle">{label}</div>
            <NumberCell decimal label={`${label} per 100 g`} value={v} min={0} max={key === 'kcal' ? 1000 : 100} placeholder={key === 'kcal' ? 'kcal' : 'g'} onChange={set} />
          </div>
        ))}
      </div>
      {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {!error && warn && (
        <p className="flex gap-2 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Makronas energi blir ca {kcalFromMacros(values)} kcal. Dubbelkolla att värdena stämmer med förpackningen.
        </p>
      )}
      <div className="grid grid-cols-[7rem_1fr] gap-2">
        <div>
          <Label>Portion (g)</Label>
          <NumberCell decimal label="Portionsstorlek i gram" value={portion} min={0} max={5000} placeholder="valfri" onChange={setPortion} />
        </div>
        <div>
          <Label htmlFor="pname">Portionsnamn</Label>
          <Input id="pname" value={portionName} onChange={(e) => setPortionName(e.target.value)} placeholder="t.ex. 1 burk, 1 skiva" maxLength={40} />
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={!name.trim() || kcal == null || !!error || save.isPending}>
        Spara
      </Button>
    </form>
  )
}
