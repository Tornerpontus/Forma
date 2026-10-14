import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Clock, Dumbbell, Loader2, Pencil, Plus, Trash2, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge, Card, EmptyState, PageLoader } from '@/components/ui/card'
import { Input, Label, Textarea } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/sheet'
import { useDeleteWorkout, useUpdateCompletedWorkout, useWorkout, workoutToDraft } from '@/lib/api/workouts'
import { useExerciseMap, type Exercise } from '@/lib/api/exercises'
import { useExerciseStats, usePrsByWorkout } from '@/lib/api/history'
import { useProfile } from '@/lib/api/profile'
import { formatDateLong, formatDuration, formatVolume } from '@/lib/format'
import { e1rm, formatNum, setVolume, type PrKind } from '@/lib/training/calc'
import { buildExercise, ops } from '@/lib/training/draft'
import type { WorkoutDraft } from '@/lib/training/types'
import { SET_TYPE_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { BackLink } from '@/features/programs/ProgramDetailPage'
import { ExerciseBlock } from '@/features/workout/ExerciseBlock'
import { ExercisePicker } from '@/features/exercises/ExercisePicker'

export const PR_LABEL: Record<PrKind, string> = {
  weight: 'Tyngsta vikt',
  e1rm: 'Bästa e1RM',
  volume: 'Mest volym',
  reps: 'Flest reps',
}

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function WorkoutDetailPage() {
  const { workoutId } = useParams()
  const [params] = useSearchParams()
  const justFinished = params.get('done') === '1'
  const { data: workout, isLoading } = useWorkout(workoutId)
  const exMap = useExerciseMap()
  const prs = usePrsByWorkout().get(workoutId ?? '') ?? []
  const { data: stats } = useExerciseStats()
  const { data: profile } = useProfile()
  const del = useDeleteWorkout()
  const save = useUpdateCompletedWorkout()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<WorkoutDraft | null>(null)
  const [endedAt, setEndedAt] = useState<string>('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [picker, setPicker] = useState(false)

  const totals = useMemo(() => {
    let sets = 0
    let volume = 0
    let reps = 0
    for (const e of workout?.workout_exercises ?? []) {
      const mode = exMap.get(e.exercise_id)?.weight_mode ?? 'total'
      for (const s of e.workout_sets)
        if (s.completed && s.set_type !== 'warmup') {
          sets++
          reps += s.reps ?? 0
          volume += setVolume(s.weight == null ? null : Number(s.weight), s.reps, mode)
        }
    }
    return { sets, volume, reps }
  }, [workout, exMap])

  if (isLoading) return <PageLoader />
  if (!workout) return <EmptyState title="Passet hittades inte" action={<Button asChild><Link to="/history">Till historiken</Link></Button>} />
  if (workout.status === 'active') return <Navigate to="/workout" replace />

  /** Previous session for an exercise, strictly before this workout. */
  function previousBefore(exerciseId: string) {
    const sessions = stats?.get(exerciseId)?.sessions ?? []
    const before = sessions.filter((s) => s.date < workout!.started_at)
    return before[before.length - 1]
  }

  if (editing) {
    return (
      <div className="pb-8">
        <div className="pt-6">
          <Label htmlFor="wn" className="sr-only">Namn</Label>
          <Input id="wn" value={editing.name} onChange={(e) => setEditing(ops.rename(e.target.value)(editing))} className="h-14 border-transparent bg-transparent px-0 text-[26px] font-bold" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="ws">Start</Label>
              <Input
                id="ws"
                type="datetime-local"
                value={toLocalInput(editing.started_at)}
                onChange={(e) => e.target.value && setEditing({ ...editing, started_at: new Date(e.target.value).toISOString() })}
              />
            </div>
            <div>
              <Label htmlFor="we">Slut</Label>
              <Input id="we" type="datetime-local" value={endedAt ? toLocalInput(endedAt) : ''} onChange={(e) => e.target.value && setEndedAt(new Date(e.target.value).toISOString())} />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {editing.exercises.map((ex, i) => {
            const prev = previousBefore(ex.exercise_id)
            return (
              <ExerciseBlock
                key={ex.id}
                exercise={ex}
                info={exMap.get(ex.exercise_id)}
                index={i}
                count={editing.exercises.length}
                previous={prev?.sets}
                previousDate={prev?.date}
                suggestion={null}
                showRir={profile?.show_rir ?? false}
                live={false}
                dispatch={(fn) => setEditing((d) => (d ? fn(d) : d))}
              />
            )
          })}
          <Button variant="subtle" className="w-full" onClick={() => setPicker(true)}>
            <Plus /> Lägg till övning
          </Button>
          <div>
            <Label htmlFor="wnotes">Anteckningar</Label>
            <Textarea id="wnotes" value={editing.notes} onChange={(e) => setEditing(ops.setNotes(e.target.value)(editing))} />
          </div>
          <p className="text-xs text-muted">Endast avbockade set sparas.</p>
        </div>
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-20 mt-6 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" onClick={() => setEditing(null)}>
            Avbryt
          </Button>
          <Button
            size="lg"
            disabled={save.isPending}
            onClick={async () => {
              try {
                if (endedAt && endedAt < editing.started_at) {
                  toast.error('Sluttiden måste vara efter starttiden')
                  return
                }
                await save.mutateAsync({ draft: editing, ended_at: endedAt || null })
                toast.success('Ändringarna sparade')
                setEditing(null)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Kunde inte spara')
              }
            }}
          >
            {save.isPending && <Loader2 className="animate-spin" />} Spara
          </Button>
        </div>
        <ExercisePicker
          open={picker}
          onOpenChange={setPicker}
          onPick={(list: Exercise[]) =>
            setEditing((d) => {
              let next = d!
              for (const e of list) next = ops.addExercise(buildExercise({ exercise_id: e.id }))(next)
              return next
            })
          }
        />
      </div>
    )
  }

  return (
    <div className="pb-8">
      <div className="pt-6">
        <BackLink to="/history" label="Historik" />
        {justFinished && (
          <div className="mb-4 rounded-[var(--radius-card)] bg-accent-soft p-4 text-accent">
            <div className="text-lg font-semibold">Bra jobbat! 💪</div>
            <div className="text-sm text-accent/80">
              Passet är sparat{prs.length ? ` – och du satte ${prs.length} ${prs.length === 1 ? 'rekord' : 'rekord'}!` : '.'}
            </div>
          </div>
        )}
        <h1 className="text-[28px] font-bold tracking-tight" data-testid="workout-title">{workout.name}</h1>
        <p className="text-sm first-letter:uppercase text-muted">{formatDateLong(workout.started_at)}</p>
      </div>

      <Card className="mt-4 grid grid-cols-3 divide-x divide-border p-0">
        <Metric icon={<Clock />} label="Tid" value={formatDuration(workout.started_at, workout.ended_at)} />
        <Metric icon={<Dumbbell />} label="Volym" value={formatVolume(totals.volume)} />
        <Metric icon={<Trophy />} label="Rekord" value={String(prs.length)} />
      </Card>

      {workout.notes && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-surface p-4 text-sm text-muted">{workout.notes}</p>}

      <div className="mt-4 space-y-3">
        {workout.workout_exercises.map((e) => {
          const info = exMap.get(e.exercise_id)
          const exPrs = prs.filter((p) => p.exercise_id === e.exercise_id)
          const mode = info?.weight_mode ?? 'total'
          let n = 0
          return (
            <Card key={e.id} data-testid="detail-exercise">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/exercises/${e.exercise_id}`} className="font-semibold hover:underline">
                  {info?.name ?? '…'}
                </Link>
                <div className="flex flex-wrap justify-end gap-1">
                  {exPrs.map((p) => (
                    <Badge key={p.kind} tone="warn">
                      <Trophy className="size-3" /> {PR_LABEL[p.kind]}
                    </Badge>
                  ))}
                </div>
              </div>
              {e.notes && <p className="mt-1 text-xs text-warn">{e.notes}</p>}
              <table className="mt-2 w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-subtle">
                  <tr>
                    <th className="w-10 py-1 text-left font-semibold">Set</th>
                    <th className="py-1 text-left font-semibold">Vikt × reps</th>
                    <th className="py-1 text-right font-semibold">e1RM</th>
                    <th className="py-1 text-right font-semibold">Volym</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {e.workout_sets.map((s) => {
                    const w = s.weight == null ? null : Number(s.weight)
                    if (s.set_type !== 'warmup') n++
                    const est = s.set_type !== 'warmup' ? e1rm(w, s.reps) : null
                    return (
                      <tr key={s.id} className={cn(s.set_type === 'warmup' && 'text-muted')}>
                        <td className="py-1">
                          <span title={SET_TYPE_LABEL[s.set_type]} className={cn('font-semibold', s.set_type === 'warmup' && 'text-warn', s.set_type === 'failure' && 'text-danger', s.set_type === 'drop' && 'text-info')}>
                            {s.set_type === 'warmup' ? 'U' : s.set_type === 'failure' ? `${n}F` : s.set_type === 'drop' ? `${n}D` : n}
                          </span>
                        </td>
                        <td className="py-1">
                          {formatNum(w)} kg × {s.reps ?? '–'}
                          {s.rir != null && <span className="text-subtle"> · RIR {formatNum(Number(s.rir))}</span>}
                        </td>
                        <td className="py-1 text-right text-muted">{est ? formatNum(est) : ''}</td>
                        <td className="py-1 text-right text-muted">{s.set_type !== 'warmup' ? Math.round(setVolume(w, s.reps, mode)) : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            setEditing(workoutToDraft(workout))
            setEndedAt(workout.ended_at ?? '')
          }}
        >
          <Pencil /> Redigera
        </Button>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          <Trash2 /> Ta bort
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Ta bort passet?"
        description="Passet och alla dess set raderas permanent."
        confirmLabel="Ta bort"
        danger
        onConfirm={async () => {
          await del.mutateAsync(workout.id)
          toast.success('Passet borttaget')
          navigate('/history', { replace: true })
        }}
      />
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-4 text-center [&_svg]:size-4 [&_svg]:text-subtle">
      {icon}
      <div className="tabular text-[15px] font-semibold">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-subtle">{label}</div>
    </div>
  )
}
