import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { EQUIPMENT, EQUIPMENT_LABEL, MUSCLE_GROUPS, MUSCLE_LABEL, WEIGHT_MODE_LABEL } from '@/lib/labels'
import { useSaveExercise, type Exercise } from '@/lib/api/exercises'
import type { WeightMode } from '@/lib/training/types'

export function ExerciseFormSheet({
  open,
  onOpenChange,
  initial,
  variationOf,
  defaultName,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial?: Exercise
  variationOf?: Exercise
  defaultName?: string
  onSaved?: (e: Exercise) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={initial ? 'Redigera övning' : variationOf ? 'Ny variant' : 'Ny övning'}>
      {open && (
        <ExerciseForm
          initial={initial}
          variationOf={variationOf}
          defaultName={defaultName}
          onSaved={(e) => {
            onSaved?.(e)
            onOpenChange(false)
          }}
        />
      )}
    </Sheet>
  )
}

function ExerciseForm({
  initial,
  variationOf,
  defaultName,
  onSaved,
}: {
  initial?: Exercise
  variationOf?: Exercise
  defaultName?: string
  onSaved: (e: Exercise) => void
}) {
  const base = initial ?? variationOf
  const [name, setName] = useState(initial?.name ?? (variationOf ? `${variationOf.name} – variant` : (defaultName ?? '')))
  const [muscle, setMuscle] = useState(base?.muscle_group ?? 'chest')
  const [equipment, setEquipment] = useState(base?.equipment ?? 'barbell')
  const [mode, setMode] = useState<WeightMode>(base?.weight_mode ?? 'total')
  const [unilateral, setUnilateral] = useState(base?.is_unilateral ?? false)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const save = useSaveExercise()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      const saved = await save.mutateAsync({
        id: initial?.id,
        name: name.trim(),
        muscle_group: muscle,
        equipment,
        weight_mode: mode,
        is_unilateral: unilateral,
        notes,
        variation_of: initial ? initial.variation_of : (variationOf?.id ?? null),
      })
      toast.success(initial ? 'Övningen uppdaterad' : 'Övningen skapad')
      onSaved(saved)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte spara')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 pt-2">
      <div>
        <Label htmlFor="ex-name">Namn</Label>
        <Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="t.ex. Lutande hantelpress" autoFocus required maxLength={120} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ex-muscle">Muskelgrupp</Label>
          <Select id="ex-muscle" value={muscle} onChange={(e) => setMuscle(e.target.value)}>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABEL[m]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ex-eq">Utrustning</Label>
          <Select
            id="ex-eq"
            value={equipment}
            onChange={(e) => {
              setEquipment(e.target.value)
              if (e.target.value === 'dumbbell') setMode('per_dumbbell')
              else if (e.target.value === 'bodyweight') setMode('bodyweight')
              else if (mode !== 'total') setMode('total')
            }}
          >
            {EQUIPMENT.map((m) => (
              <option key={m} value={m}>
                {EQUIPMENT_LABEL[m]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="ex-mode">Hur vikten loggas</Label>
        <Select id="ex-mode" value={mode} onChange={(e) => setMode(e.target.value as WeightMode)}>
          {Object.entries(WEIGHT_MODE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>
      <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-surface-2 px-4">
        <span>
          <span className="block text-[15px]">Unilateral</span>
          <span className="block text-xs text-muted">En sida i taget – reps loggas per sida</span>
        </span>
        <input type="checkbox" className="size-5 accent-[var(--color-accent)]" checked={unilateral} onChange={(e) => setUnilateral(e.target.checked)} />
      </label>
      <div>
        <Label htmlFor="ex-notes">Anteckningar</Label>
        <Textarea id="ex-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Teknik, inställningar, sitsläge …" />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={save.isPending || !name.trim()}>
        {initial ? 'Spara' : 'Skapa övning'}
      </Button>
    </form>
  )
}
