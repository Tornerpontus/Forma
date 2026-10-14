import { useMemo, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/card'
import { useExercises, type Exercise } from '@/lib/api/exercises'
import { useExerciseStats } from '@/lib/api/history'
import { EQUIPMENT_LABEL, MUSCLE_GROUPS, MUSCLE_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { ExerciseFormSheet } from './ExerciseForm'

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function filterExercises(list: Exercise[], query: string, muscle: string | null, equipment: string | null = null) {
  const q = normalize(query.trim())
  const terms = q.split(/\s+/).filter(Boolean)
  return list.filter((e) => {
    if (e.archived) return false
    if (muscle && e.muscle_group !== muscle && !e.secondary_muscles.includes(muscle)) return false
    if (equipment && e.equipment !== equipment) return false
    if (!terms.length) return true
    const hay = normalize(`${e.name} ${MUSCLE_LABEL[e.muscle_group] ?? ''} ${EQUIPMENT_LABEL[e.equipment] ?? ''}`)
    return terms.every((t) => hay.includes(t))
  })
}

/** Searchable exercise picker. Supports picking several at once. */
export function ExercisePicker({
  open,
  onOpenChange,
  onPick,
  multi = true,
  title = 'Lägg till övning',
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onPick: (exercises: Exercise[]) => void
  multi?: boolean
  title?: string
}) {
  const { data: exercises, isLoading } = useExercises()
  const { data: stats } = useExerciseStats()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const list = useMemo(() => {
    const filtered = filterExercises(exercises ?? [], query, muscle)
    // Recently used first when not searching
    if (!query && stats) {
      return [...filtered].sort((a, b) => {
        const la = stats.get(a.id)?.last?.date ?? ''
        const lb = stats.get(b.id)?.last?.date ?? ''
        if (la !== lb) return lb.localeCompare(la)
        return a.name.localeCompare(b.name, 'sv')
      })
    }
    return filtered
  }, [exercises, query, muscle, stats])

  function close(o: boolean) {
    if (!o) {
      setSelected([])
      setQuery('')
    }
    onOpenChange(o)
  }

  function toggle(e: Exercise) {
    if (!multi) {
      onPick([e])
      close(false)
      return
    }
    setSelected((s) => (s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id]))
  }

  function confirm() {
    const map = new Map((exercises ?? []).map((e) => [e.id, e]))
    onPick(selected.map((id) => map.get(id)!).filter(Boolean))
    close(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={close} title={title} fullHeight>
        <div className="sticky top-0 z-10 -mx-5 space-y-3 bg-surface px-5 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-subtle" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök övning" className="pl-10" aria-label="Sök övning" />
          </div>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            <Chip active={!muscle} onClick={() => setMuscle(null)}>
              Alla
            </Chip>
            {MUSCLE_GROUPS.map((m) => (
              <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
                {MUSCLE_LABEL[m]}
              </Chip>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {list.map((e) => {
              const isSel = selected.includes(e.id)
              const last = stats?.get(e.id)?.last
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => toggle(e)}
                    className="flex w-full items-center gap-3 py-3 text-left"
                    aria-pressed={multi ? isSel : undefined}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium">{e.name}</div>
                      <div className="truncate text-xs text-muted">
                        {MUSCLE_LABEL[e.muscle_group]} · {EQUIPMENT_LABEL[e.equipment]}
                        {e.user_id ? ' · Egen' : ''}
                        {last ? ` · senast ${new Date(last.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}` : ''}
                      </div>
                    </div>
                    {multi && (
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-full border',
                          isSel ? 'border-accent bg-accent text-accent-fg' : 'border-border',
                        )}
                      >
                        {isSel && <Check className="size-4" />}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {!isLoading && list.length === 0 && <p className="py-8 text-center text-sm text-muted">Ingen övning matchar “{query}”.</p>}
        <Button variant="secondary" className="mt-3 w-full" onClick={() => setCreating(true)}>
          <Plus /> Skapa egen övning{query ? ` “${query}”` : ''}
        </Button>
        {multi && selected.length > 0 && (
          <div className="sticky bottom-0 -mx-5 mt-3 bg-gradient-to-t from-surface via-surface to-transparent px-5 pt-4">
            <Button size="lg" className="w-full" onClick={confirm}>
              Lägg till {selected.length} {selected.length === 1 ? 'övning' : 'övningar'}
            </Button>
          </div>
        )}
      </Sheet>
      <ExerciseFormSheet
        open={creating}
        onOpenChange={setCreating}
        defaultName={query}
        onSaved={(e) => {
          if (multi) setSelected((s) => [...s, e.id])
          else {
            onPick([e])
            close(false)
          }
        }}
      />
    </>
  )
}

export function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-9 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors',
        active ? 'bg-fg text-bg' : 'bg-surface-2 text-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
