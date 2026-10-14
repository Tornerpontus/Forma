import { useCallback, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ChevronDown, Cloud, CloudOff, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Sheet } from '@/components/ui/sheet'
import { Input, Textarea } from '@/components/ui/input'
import { PageLoader } from '@/components/ui/card'
import { useExerciseMap, type Exercise } from '@/lib/api/exercises'
import { useExerciseStats } from '@/lib/api/history'
import { useProfile } from '@/lib/api/profile'
import { usePrograms } from '@/lib/api/programs'
import { formatClock, formatVolume } from '@/lib/format'
import { buildExercise, draftStats, ops } from '@/lib/training/draft'
import { suggestNext } from '@/lib/training/calc'
import type { DraftExercise } from '@/lib/training/types'
import { ExercisePicker } from '@/features/exercises/ExercisePicker'
import { useActiveWorkout, type SyncState } from './ActiveWorkoutProvider'
import { ExerciseBlock } from './ExerciseBlock'
import { primeAudio, RestTimerBar, useNow } from './RestTimer'

export function ActiveWorkoutPage() {
  const { draft, ready, sync, update, finish, discard } = useActiveWorkout()
  const exMap = useExerciseMap()
  const { data: stats } = useExerciseStats()
  const { data: profile } = useProfile()
  const { data: programs } = usePrograms()
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [replacing, setReplacing] = useState<DraftExercise | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)

  const plannedById = useMemo(() => {
    const m = new Map<string, { rep_min: number; rep_max: number }>()
    for (const p of programs ?? []) for (const w of p.program_workouts) if (w.id === draft?.program_workout_id) for (const e of w.program_exercises) m.set(e.exercise_id, e)
    return m
  }, [programs, draft?.program_workout_id])

  const onSetCompleted = useCallback(
    (ex: DraftExercise) => {
      primeAudio()
      if (profile?.auto_start_rest_timer === false) return
      const secs = ex.rest_seconds ?? profile?.default_rest_seconds ?? 120
      if (secs > 0) update(ops.startRest(secs))
    },
    [profile, update],
  )

  const stopRest = useCallback(() => update(ops.stopRest()), [update])
  const adjustRest = useCallback((d: number) => update(ops.adjustRest(d)), [update])

  if (!ready) return <PageLoader />
  if (!draft) return <Navigate to="/" replace />

  const stats_ = draftStats(draft, (id) => exMap.get(id)?.weight_mode ?? 'total')
  const incomplete = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.completed && (s.weight != null || s.reps != null || s.duration_s != null || s.distance_m != null)).length, 0)

  function addExercises(list: Exercise[]) {
    update((d) => {
      let next = d
      for (const e of list) {
        const last = stats?.get(e.id)?.last
        next = ops.addExercise(buildExercise({ exercise_id: e.id, previous: last?.sets, target: null }))(next)
      }
      return next
    })
    if (list.length) setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50)
  }

  async function doFinish() {
    setFinishing(true)
    const id = draft!.workout_id
    const ok = await finish()
    setFinishing(false)
    if (ok) {
      toast.success('Passet sparat 💪')
      navigate(`/history/${id}?done=1`, { replace: true })
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-40">
      <header className="pt-safe sticky top-0 z-30 border-b border-border/60 bg-bg/90 backdrop-blur-lg">
        <div className="flex items-center gap-2 px-3 py-2">
          <Button variant="ghost" size="icon" aria-label="Minimera passet" onClick={() => navigate('/')}>
            <ChevronDown />
          </Button>
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setRenameOpen(true)}>
            <div className="truncate text-[15px] font-semibold" data-testid="workout-name">{draft.name}</div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <ElapsedClock startedAt={draft.started_at} />
              <span>·</span>
              <span className="tabular">{stats_.completed}/{stats_.total} set</span>
              <span>·</span>
              <SyncBadge sync={sync} />
            </div>
          </button>
          <Button size="sm" className="h-10 px-4" onClick={() => setConfirmFinish(true)} disabled={finishing}>
            {finishing ? <Loader2 className="animate-spin" /> : 'Avsluta'}
          </Button>
        </div>
      </header>

      <div className="space-y-3 px-3 pt-3">
        {draft.exercises.length === 0 && (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border px-6 py-10 text-center">
            <p className="font-semibold">Tomt pass</p>
            <p className="mt-1 text-sm text-muted">Lägg till din första övning för att börja logga.</p>
          </div>
        )}
        {draft.exercises.map((ex, i) => {
          const st = stats?.get(ex.exercise_id)
          const info = exMap.get(ex.exercise_id)
          const range = ex.target ?? plannedById.get(ex.exercise_id) ?? null
          return (
            <ExerciseBlock
              key={ex.id}
              exercise={ex}
              info={info}
              index={i}
              count={draft.exercises.length}
              previous={st?.last?.sets}
              previousDate={st?.last?.date}
              suggestion={suggestNext(st?.last, range, info?.equipment ?? 'other', info?.weight_mode ?? 'total')}
              showRir={profile?.show_rir ?? false}
              live
              dispatch={update}
              onSetCompleted={onSetCompleted}
              onReplace={setReplacing}
            />
          )
        })}

        <Button variant="subtle" size="lg" className="w-full" onClick={() => setPickerOpen(true)}>
          <Plus /> Lägg till övning
        </Button>

        <div className="pt-4">
          <label htmlFor="workout-notes" className="mb-1.5 block px-1 text-sm text-muted">
            Anteckningar för passet
          </label>
          <Textarea id="workout-notes" value={draft.notes} onChange={(e) => update(ops.setNotes(e.target.value))} placeholder="Hur kändes det?" />
        </div>

        <Button variant="danger" className="w-full" onClick={() => setConfirmDiscard(true)}>
          <Trash2 /> Avbryt och radera passet
        </Button>
      </div>

      {draft.rest_timer && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <RestTimerBar timer={draft.rest_timer} onAdjust={adjustRest} onStop={stopRest} />
        </div>
      )}

      <ExercisePicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={addExercises} />
      <ExercisePicker
        open={!!replacing}
        onOpenChange={(o) => !o && setReplacing(null)}
        multi={false}
        title="Byt övning"
        onPick={([e]) => {
          if (replacing && e) update(ops.replaceExercise(replacing.id, e.id))
          setReplacing(null)
        }}
      />

      <ConfirmDialog
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        title={stats_.completed === 0 ? 'Inga avbockade set' : 'Avsluta passet?'}
        description={
          stats_.completed === 0
            ? 'Bocka av minst ett set för att spara passet, eller avbryt passet.'
            : `${stats_.completed} set · ${formatVolume(stats_.volume)} volym.${incomplete ? ` ${incomplete} ifyllda set är inte avbockade och sparas inte.` : ''}`
        }
        confirmLabel={stats_.completed === 0 ? 'OK' : 'Spara passet'}
        onConfirm={() => {
          if (stats_.completed > 0) void doFinish()
        }}
      />
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Radera passet?"
        description="Allt du loggat i det här passet tas bort. Det går inte att ångra."
        confirmLabel="Radera"
        danger
        onConfirm={async () => {
          await discard()
          navigate('/', { replace: true })
        }}
      />
      <Sheet open={renameOpen} onOpenChange={setRenameOpen} title="Byt namn på passet">
        <RenameForm initial={draft.name} onSave={(n) => { update(ops.rename(n)); setRenameOpen(false) }} />
      </Sheet>
    </div>
  )
}

function RenameForm({ initial, onSave }: { initial: string; onSave: (n: string) => void }) {
  const [v, setV] = useState(initial)
  return (
    <form
      className="space-y-3 pt-1"
      onSubmit={(e) => {
        e.preventDefault()
        if (v.trim()) onSave(v.trim())
      }}
    >
      <Input value={v} onChange={(e) => setV(e.target.value)} autoFocus maxLength={120} />
      <Button type="submit" className="w-full">Spara</Button>
    </form>
  )
}

export function ElapsedClock({ startedAt }: { startedAt: string }) {
  const now = useNow(1000)
  return <span className="tabular">{formatClock((now - new Date(startedAt).getTime()) / 1000)}</span>
}

function SyncBadge({ sync }: { sync: SyncState }) {
  if (sync === 'offline')
    return (
      <span className="flex items-center gap-1 text-warn" data-testid="sync-state" data-state="offline">
        <CloudOff className="size-3.5" /> Sparat lokalt
      </span>
    )
  if (sync === 'saving' || sync === 'pending')
    return (
      <span className="flex items-center gap-1" data-testid="sync-state" data-state="saving">
        <Loader2 className="size-3.5 animate-spin" /> Sparar
      </span>
    )
  return (
    <span className="flex items-center gap-1" data-testid="sync-state" data-state="saved">
      <Cloud className="size-3.5" /> Sparat
    </span>
  )
}
