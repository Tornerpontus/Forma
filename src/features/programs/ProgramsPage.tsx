import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, ListChecks, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, PageLoader } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { usePrograms, useProgramMutations } from '@/lib/api/programs'
import { useExercises } from '@/lib/api/exercises'
import { PRESETS } from './presets'

export function ProgramsPage() {
  const { data: programs, isLoading } = usePrograms()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageHeader
        title="Program"
        subtitle="Dina rutiner och passmallar"
        action={
          <Button size="sm" onClick={() => setCreating(true)} data-testid="new-program">
            <Plus /> Nytt
          </Button>
        }
      />
      {isLoading ? (
        <PageLoader />
      ) : !programs?.length ? (
        <EmptyState
          icon={<ListChecks />}
          title="Inga program än"
          description="Skapa ett eget program eller börja från Push/Pull/Ben, Över/Under eller Helkropp."
          action={<Button onClick={() => setCreating(true)}>Skapa program</Button>}
        />
      ) : (
        <div className="space-y-2">
          {programs.map((p) => (
            <Link key={p.id} to={`/programs/${p.id}`} className="block">
              <Card className="flex items-center gap-3 transition-colors hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-semibold">{p.name}</div>
                  <div className="mt-0.5 truncate text-sm text-muted">
                    {p.program_workouts.length} pass · {p.program_workouts.map((w) => w.name).join(' · ') || 'inga pass än'}
                  </div>
                </div>
                <ChevronRight className="size-5 text-subtle" />
              </Card>
            </Link>
          ))}
        </div>
      )}
      <NewProgramSheet open={creating} onOpenChange={setCreating} />
    </>
  )
}

function NewProgramSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState('')
  const [preset, setPreset] = useState<string>('empty')
  const { saveProgram, saveWorkout } = useProgramMutations()
  const { data: exercises } = useExercises()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const p = PRESETS.find((x) => x.id === preset)
    const finalName = name.trim() || p?.name || 'Mitt program'
    setBusy(true)
    try {
      const program = await saveProgram.mutateAsync({ name: finalName, description: p?.description ?? '' })
      if (p) {
        const byName = new Map((exercises ?? []).filter((x) => !x.user_id).map((x) => [x.name, x.id]))
        for (const [i, w] of p.workouts.entries()) {
          await saveWorkout.mutateAsync({
            program_id: program.id,
            name: w.name,
            position: i,
            exercises: w.exercises
              .filter((x) => byName.has(x.name))
              .map((x) => ({
                exercise_id: byName.get(x.name)!,
                target_sets: x.sets,
                rep_min: x.rep_min,
                rep_max: x.rep_max,
                warmup_sets: x.warmups ?? 0,
                rest_seconds: null,
                notes: '',
              })),
          })
        }
      }
      onOpenChange(false)
      setName('')
      navigate(`/programs/${program.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kunde inte skapa programmet')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Nytt program">
      <form onSubmit={create} className="space-y-4 pt-1">
        <div>
          <Label htmlFor="program-name">Namn</Label>
          <Input id="program-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="t.ex. Höstens styrka" maxLength={120} />
        </div>
        <div>
          <Label>Börja från</Label>
          <div className="grid gap-2">
            {[{ id: 'empty', name: 'Tomt program', description: 'Bygg helt själv, utan fasta dagar.' }, ...PRESETS].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                aria-pressed={preset === p.id}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left transition-colors',
                  preset === p.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2',
                )}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted">{p.description}</div>
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          Skapa program
        </Button>
      </form>
    </Sheet>
  )
}
