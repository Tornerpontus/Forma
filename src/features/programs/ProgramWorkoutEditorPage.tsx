import { useEffect, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, PageLoader } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/sheet'
import { usePrograms, useProgramMutations, type PlannedExerciseInput } from '@/lib/api/programs'
import { useExerciseMap } from '@/lib/api/exercises'
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '@/lib/labels'
import { ExercisePicker } from '@/features/exercises/ExercisePicker'
import { NumberCell } from '@/features/workout/NumberCell'
import { BackLink } from './ProgramDetailPage'

type Row = PlannedExerciseInput & { key: string }

export function ProgramWorkoutEditorPage() {
  const { programId, workoutId } = useParams()
  const { data: programs, isLoading } = usePrograms()
  const program = programs?.find((p) => p.id === programId)
  const workout = program?.program_workouts.find((w) => w.id === workoutId)
  const exMap = useExerciseMap()
  const { saveWorkout } = useProgramMutations()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [dirty, setDirty] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [picker, setPicker] = useState(false)

  useEffect(() => {
    if (workout && !loaded) {
      setName(workout.name)
      setRows(
        workout.program_exercises.map((e) => ({
          key: e.id,
          exercise_id: e.exercise_id,
          target_sets: e.target_sets,
          rep_min: e.rep_min,
          rep_max: e.rep_max,
          warmup_sets: e.warmup_sets,
          rest_seconds: e.rest_seconds,
          notes: e.notes,
        })),
      )
      setLoaded(true)
    }
  }, [workout, loaded])

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)

  if (isLoading) return <PageLoader />
  if (!workout || !program) return <EmptyState title="Passet finns inte" />

  function change(next: Row[]) {
    setRows(next)
    setDirty(true)
  }
  function patch(key: string, p: Partial<Row>) {
    change(rows.map((r) => (r.key === key ? { ...r, ...p } : r)))
  }
  function move(i: number, d: number) {
    const j = i + d
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    change(next)
  }

  async function save() {
    if (!name.trim()) {
      toast.error('Passet behöver ett namn')
      return
    }
    try {
      await saveWorkout.mutateAsync({
        id: workout!.id,
        program_id: program!.id,
        name: name.trim(),
        exercises: rows.map((r) => ({ ...r, rep_max: Math.max(r.rep_max, r.rep_min) })),
      })
      setDirty(false)
      toast.success('Passet sparat')
      setTimeout(() => navigate(`/programs/${program!.id}`), 0)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunde inte spara')
    }
  }

  return (
    <div className="pb-8">
      <div className="pt-6">
        <BackLink to={`/programs/${program.id}`} label={program.name} />
        <Label htmlFor="wname" className="sr-only">
          Passets namn
        </Label>
        <Input
          id="wname"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setDirty(true)
          }}
          className="h-14 border-transparent bg-transparent px-0 text-[28px] font-bold tracking-tight focus:border-transparent"
          maxLength={120}
        />
      </div>

      <div className="mt-2 space-y-2">
        {rows.map((r, i) => {
          const ex = exMap.get(r.exercise_id)
          return (
            <Card key={r.key} data-testid="planned-exercise">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{ex?.name ?? '…'}</div>
                  <div className="text-xs text-muted">{ex && `${MUSCLE_LABEL[ex.muscle_group]} · ${EQUIPMENT_LABEL[ex.equipment]}`}</div>
                </div>
                <div className="-mr-2 -mt-1 flex">
                  <Button variant="ghost" size="icon-sm" aria-label="Flytta upp" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Flytta ner" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Ta bort" className="text-danger" onClick={() => change(rows.filter((x) => x.key !== r.key))}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <Field label="Set">
                  <NumberCell label="Antal set" value={r.target_sets} min={1} max={20} onChange={(v) => patch(r.key, { target_sets: v ?? 1 })} />
                </Field>
                <Field label="Reps från">
                  <NumberCell label="Reps minst" value={r.rep_min} min={1} max={100} onChange={(v) => patch(r.key, { rep_min: v ?? 1 })} />
                </Field>
                <Field label="Reps till">
                  <NumberCell label="Reps högst" value={r.rep_max} min={1} max={100} onChange={(v) => patch(r.key, { rep_max: v ?? r.rep_min })} />
                </Field>
                <Field label="Uppv.">
                  <NumberCell label="Uppvärmningsset" value={r.warmup_sets} min={0} max={10} onChange={(v) => patch(r.key, { warmup_sets: v ?? 0 })} />
                </Field>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_7rem] items-center gap-2">
                <span className="text-xs text-muted">Vila (sekunder, tomt = standard)</span>
                <NumberCell label="Vila i sekunder" value={r.rest_seconds} min={0} max={1800} placeholder="std" onChange={(v) => patch(r.key, { rest_seconds: v })} />
              </div>
            </Card>
          )
        })}
      </div>

      <Button variant="subtle" size="lg" className="mt-3 w-full" onClick={() => setPicker(true)}>
        <Plus /> Lägg till övningar
      </Button>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-20 mt-6">
        <Button size="lg" className="w-full shadow-xl" onClick={save} disabled={saveWorkout.isPending || !dirty} data-testid="save-program-workout">
          {saveWorkout.isPending && <Loader2 className="animate-spin" />}
          {dirty ? 'Spara passet' : 'Sparat'}
        </Button>
      </div>

      <ExercisePicker
        open={picker}
        onOpenChange={setPicker}
        onPick={(list) =>
          change([
            ...rows,
            ...list.map((e) => ({
              key: crypto.randomUUID(),
              exercise_id: e.id,
              target_sets: 3,
              rep_min: 8,
              rep_max: 12,
              warmup_sets: 0,
              rest_seconds: null,
              notes: '',
            })),
          ])
        }
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(o) => !o && blocker.state === 'blocked' && blocker.reset()}
        title="Osparade ändringar"
        description="Vill du lämna utan att spara?"
        confirmLabel="Lämna"
        danger
        onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-center text-[11px] font-medium uppercase tracking-wider text-subtle">{label}</div>
      {children}
    </div>
  )
}
