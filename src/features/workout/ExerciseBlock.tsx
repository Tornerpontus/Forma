import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Check, Copy, History, MoreHorizontal, Plus, Repeat, StickyNote, Timer, Trash2, TrendingUp } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EQUIPMENT_LABEL, MUSCLE_LABEL, SET_TYPE_LABEL } from '@/lib/labels'
import { formatDate } from '@/lib/format'
import { formatNum, type Suggestion } from '@/lib/training/calc'
import { ops, previousForSet } from '@/lib/training/draft'
import type { DraftExercise, DraftSet, HistorySet, SetType, WorkoutDraft } from '@/lib/training/types'
import type { Exercise } from '@/lib/api/exercises'
import { NumberCell } from './NumberCell'

type Dispatch = (fn: (d: WorkoutDraft) => WorkoutDraft) => void

export interface ExerciseBlockProps {
  exercise: DraftExercise
  info: Exercise | undefined
  index: number
  count: number
  previous: HistorySet[] | undefined
  previousDate: string | undefined
  suggestion: Suggestion | null
  showRir: boolean
  live: boolean
  dispatch: Dispatch
  onSetCompleted?: (exercise: DraftExercise) => void
  onReplace?: (exercise: DraftExercise) => void
}

const TYPE_STYLE: Record<SetType, string> = {
  warmup: 'text-warn',
  normal: 'text-fg',
  failure: 'text-danger',
  drop: 'text-info',
}

export const ExerciseBlock = memo(function ExerciseBlock({
  exercise,
  info,
  index,
  count,
  previous,
  previousDate,
  suggestion,
  showRir,
  live,
  dispatch,
  onSetCompleted,
  onReplace,
}: ExerciseBlockProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [setMenu, setSetMenu] = useState<DraftSet | null>(null)
  const [restOpen, setRestOpen] = useState(false)
  const perDb = info?.weight_mode === 'per_dumbbell'
  const bodyweight = info?.weight_mode === 'bodyweight'
  const unilateral = info?.is_unilateral

  const prevCompleted = previous?.filter((s) => s.completed) ?? []
  let workingNo = 0

  return (
    <section className="rounded-[var(--radius-card)] bg-surface" aria-label={info?.name ?? 'Övning'} data-testid="exercise-block">
      <header className="flex items-start gap-2 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold leading-snug text-fg">
            {info ? (
              <Link to={`/exercises/${info.id}`} className="hover:underline">
                {info.name}
              </Link>
            ) : (
              'Okänd övning'
            )}
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            {info && `${MUSCLE_LABEL[info.muscle_group]} · ${EQUIPMENT_LABEL[info.equipment]}`}
            {perDb && ' · kg per hantel'}
            {unilateral && ' · reps per sida'}
            {exercise.target && ` · mål ${exercise.target.sets}×${exercise.target.rep_min === exercise.target.rep_max ? exercise.target.rep_min : `${exercise.target.rep_min}–${exercise.target.rep_max}`}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="-mr-2 -mt-1 flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
          aria-label={`Fler val för ${info?.name ?? 'övning'}`}
        >
          <MoreHorizontal className="size-5" />
        </button>
      </header>

      {(prevCompleted.length > 0 || suggestion) && (
        <div className="mx-4 mt-3 space-y-1.5 rounded-xl bg-surface-2/60 px-3 py-2.5 text-[13px]" data-testid="previous-performance">
          {prevCompleted.length > 0 && (
            <div className="flex items-start gap-2 text-muted">
              <History className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <span className="text-subtle">Förra {previousDate ? formatDate(previousDate) : ''}: </span>
                {prevCompleted
                  .filter((s) => s.set_type !== 'warmup')
                  .map((s) => `${formatNum(s.weight)} kg × ${s.reps ?? '–'}`)
                  .join(' · ')}
              </span>
            </div>
          )}
          {suggestion && live && (
            <button
              type="button"
              className="flex w-full items-start gap-2 text-left text-accent"
              onClick={() =>
                dispatch((d) => {
                  let next = d
                  for (const s of exercise.sets) {
                    if (s.set_type === 'warmup' || s.completed) continue
                    next = ops.updateSet(exercise.id, s.id, { weight: suggestion.weight, reps: suggestion.reps })(next)
                  }
                  return next
                })
              }
            >
              <TrendingUp className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <span className="font-semibold">
                  Förslag: {suggestion.weight != null && suggestion.weight > 0 ? `${formatNum(suggestion.weight)} kg × ` : ''}
                  {suggestion.reps}
                </span>
                <span className="text-accent/70"> – {suggestion.reason}. Tryck för att fylla i.</span>
              </span>
            </button>
          )}
        </div>
      )}

      {exercise.notes && (
        <button type="button" onClick={() => setNotesOpen(true)} className="mx-4 mt-2 flex items-start gap-2 text-left text-[13px] text-warn">
          <StickyNote className="mt-0.5 size-3.5 shrink-0" /> <span className="whitespace-pre-wrap">{exercise.notes}</span>
        </button>
      )}

      <div className="mt-3 px-2 pb-2">
        <div
          className={cn(
            'grid items-center gap-1.5 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle',
            showRir ? 'grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_3rem]' : 'grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_3rem]',
          )}
        >
          <span className="text-center">Set</span>
          <span className="text-center">Förra</span>
          <span className="text-center">{bodyweight ? '+kg' : perDb ? 'kg/st' : 'kg'}</span>
          <span className="text-center">{unilateral ? 'reps/s' : 'reps'}</span>
          {showRir && <span className="text-center">RIR</span>}
          <span className="sr-only">Klar</span>
        </div>
        <ul className="space-y-1">
          {exercise.sets.map((s, i) => {
            const prev = previousForSet(exercise, i, previous)
            if (s.set_type !== 'warmup') workingNo++
            const label = s.set_type === 'warmup' ? 'U' : s.set_type === 'failure' ? 'F' : s.set_type === 'drop' ? 'D' : String(workingNo)
            // Grey placeholders = what was done last time (one tap repeats it). Typed values are white.
            const useSuggestion = !prev && s.set_type !== 'warmup' && live && suggestion
            const placeholderWeight = prev ? prev.weight : useSuggestion ? suggestion.weight : null
            const placeholderReps = prev ? prev.reps : useSuggestion ? suggestion.reps : null
            return (
              <li
                key={s.id}
                data-testid="set-row"
                data-completed={s.completed}
                className={cn(
                  'grid items-center gap-1.5 rounded-xl px-2 py-1 transition-colors',
                  showRir ? 'grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_3rem]' : 'grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_3rem]',
                  s.completed && 'bg-accent/[0.08]',
                )}
              >
                <button
                  type="button"
                  onClick={() => setSetMenu(s)}
                  className={cn('flex h-11 items-center justify-center rounded-lg text-[15px] font-bold hover:bg-surface-2', TYPE_STYLE[s.set_type])}
                  aria-label={`Set ${label}, ${SET_TYPE_LABEL[s.set_type]}. Ändra typ eller ta bort`}
                >
                  {label}
                </button>
                <span className="tabular truncate text-center text-[13px] text-subtle" aria-label="Förra gången">
                  {prev ? `${formatNum(prev.weight)}×${prev.reps ?? '–'}` : '–'}
                </span>
                <NumberCell
                  decimal
                  label={`Vikt set ${label}`}
                  value={s.weight}
                  min={-500}
                  max={2000}
                  placeholder={placeholderWeight != null ? formatNum(placeholderWeight) : bodyweight ? '0' : 'kg'}
                  muted={s.completed}
                  onChange={(v) => dispatch(ops.updateSet(exercise.id, s.id, { weight: v }))}
                />
                <NumberCell
                  label={`Reps set ${label}`}
                  value={s.reps}
                  min={0}
                  max={1000}
                  placeholder={placeholderReps != null ? String(placeholderReps) : 'reps'}
                  muted={s.completed}
                  onChange={(v) => dispatch(ops.updateSet(exercise.id, s.id, { reps: v }))}
                />
                {showRir && (
                  <NumberCell
                    decimal
                    label={`RIR set ${label}`}
                    value={s.rir}
                    min={0}
                    max={10}
                    placeholder="–"
                    muted={s.completed}
                    onChange={(v) => dispatch(ops.updateSet(exercise.id, s.id, { rir: v }))}
                  />
                )}
                <button
                  type="button"
                  aria-label={s.completed ? `Ångra set ${label}` : `Markera set ${label} som klart`}
                  aria-pressed={s.completed}
                  onClick={() => {
                    const fallback = { weight: placeholderWeight ?? (bodyweight ? 0 : null), reps: placeholderReps }
                    dispatch(ops.toggleSet(exercise.id, s.id, fallback))
                    if (!s.completed) onSetCompleted?.(exercise)
                  }}
                  className={cn(
                    'flex h-11 w-12 items-center justify-center rounded-lg transition-[background-color,transform] active:scale-90',
                    s.completed ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-subtle hover:text-fg',
                  )}
                >
                  <Check className="size-5" strokeWidth={3} />
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mt-2 grid grid-cols-2 gap-2 px-1">
          <Button variant="secondary" size="sm" className="h-10" onClick={() => dispatch(ops.addSet(exercise.id))}>
            <Plus /> Lägg till set
          </Button>
          <Button variant="secondary" size="sm" className="h-10" onClick={() => dispatch(ops.duplicateLastSet(exercise.id))} disabled={!exercise.sets.length}>
            <Copy /> Kopiera senaste
          </Button>
        </div>
      </div>

      {/* Exercise menu */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen} title={info?.name ?? 'Övning'}>
        <div className="grid gap-1 pt-1">
          <MenuItem icon={<StickyNote />} onClick={() => { setMenuOpen(false); setNotesOpen(true) }}>
            {exercise.notes ? 'Redigera anteckning' : 'Lägg till anteckning'}
          </MenuItem>
          <MenuItem icon={<Plus />} onClick={() => { dispatch(ops.addSet(exercise.id, 'warmup')); setMenuOpen(false) }}>
            Lägg till uppvärmningsset
          </MenuItem>
          {live && (
            <MenuItem icon={<Timer />} onClick={() => { setMenuOpen(false); setRestOpen(true) }}>
              Vilotid {exercise.rest_seconds != null ? `(${exercise.rest_seconds} s)` : ''}
            </MenuItem>
          )}
          {onReplace && (
            <MenuItem icon={<Repeat />} onClick={() => { setMenuOpen(false); onReplace(exercise) }}>
              Byt övning
            </MenuItem>
          )}
          <MenuItem icon={<ArrowUp />} disabled={index === 0} onClick={() => { dispatch(ops.moveExercise(exercise.id, -1)); setMenuOpen(false) }}>
            Flytta upp
          </MenuItem>
          <MenuItem icon={<ArrowDown />} disabled={index === count - 1} onClick={() => { dispatch(ops.moveExercise(exercise.id, 1)); setMenuOpen(false) }}>
            Flytta ner
          </MenuItem>
          <MenuItem icon={<Trash2 />} danger onClick={() => { dispatch(ops.removeExercise(exercise.id)); setMenuOpen(false) }}>
            Ta bort övning
          </MenuItem>
        </div>
      </Sheet>

      {/* Notes */}
      <Sheet open={notesOpen} onOpenChange={setNotesOpen} title="Anteckning" description="Sparas med det här passet">
        <NotesEditor
          initial={exercise.notes}
          onSave={(v) => {
            dispatch(ops.setExerciseNotes(exercise.id, v))
            setNotesOpen(false)
          }}
        />
      </Sheet>

      {/* Set menu */}
      <Sheet open={!!setMenu} onOpenChange={(o) => !o && setSetMenu(null)} title="Set">
        {setMenu && (
          <div className="grid gap-1 pt-1">
            {(['warmup', 'normal', 'failure', 'drop'] as SetType[]).map((t) => (
              <MenuItem
                key={t}
                icon={<span className={cn('text-sm font-bold', TYPE_STYLE[t])}>{t === 'normal' ? '1' : t === 'warmup' ? 'U' : t === 'failure' ? 'F' : 'D'}</span>}
                active={setMenu.set_type === t}
                onClick={() => {
                  dispatch(ops.updateSet(exercise.id, setMenu.id, { set_type: t }))
                  setSetMenu(null)
                }}
              >
                {SET_TYPE_LABEL[t]}
              </MenuItem>
            ))}
            <MenuItem
              icon={<Trash2 />}
              danger
              onClick={() => {
                dispatch(ops.removeSet(exercise.id, setMenu.id))
                setSetMenu(null)
              }}
            >
              Ta bort set
            </MenuItem>
          </div>
        )}
      </Sheet>

      {/* Rest time */}
      <Sheet open={restOpen} onOpenChange={setRestOpen} title="Vilotid för övningen">
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[null, 30, 60, 90, 120, 150, 180, 240, 300].map((sec) => (
            <Button
              key={String(sec)}
              variant={exercise.rest_seconds === sec ? 'primary' : 'secondary'}
              onClick={() => {
                dispatch(ops.setExerciseRest(exercise.id, sec))
                setRestOpen(false)
              }}
            >
              {sec == null ? 'Standard' : sec < 60 ? `${sec} s` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`}
            </Button>
          ))}
        </div>
      </Sheet>
    </section>
  )
})

function NotesEditor({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial)
  return (
    <div className="space-y-3 pt-1">
      <Textarea value={v} onChange={(e) => setV(e.target.value)} autoFocus placeholder="t.ex. sits på 4, smalt grepp" />
      <Button className="w-full" onClick={() => onSave(v.trim())}>
        Spara
      </Button>
    </div>
  )
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  disabled,
  active,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] hover:bg-surface-2 disabled:opacity-35 [&>span:first-child_svg]:size-5',
        danger && 'text-danger',
        active && 'bg-surface-2',
      )}
    >
      <span className="flex w-6 justify-center text-muted">{icon}</span>
      <span className="flex-1">{children}</span>
      {active && <Check className="size-4 text-accent" />}
    </button>
  )
}
