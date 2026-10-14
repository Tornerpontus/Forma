import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronLeft, Copy, MoreHorizontal, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, PageLoader } from '@/components/ui/card'
import { Input, Label, Textarea } from '@/components/ui/input'
import { ConfirmDialog, Sheet } from '@/components/ui/sheet'
import { usePrograms, useProgramMutations, type ProgramWorkout } from '@/lib/api/programs'
import { useExerciseMap } from '@/lib/api/exercises'
import { MenuItem } from '@/features/workout/ExerciseBlock'
import { useStartWorkout } from '@/features/home/HomePage'

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="-ml-1 mb-2 inline-flex h-9 items-center gap-1 text-sm text-muted hover:text-fg">
      <ChevronLeft className="size-4" /> {label}
    </Link>
  )
}

export function ProgramDetailPage() {
  const { programId } = useParams()
  const { data: programs, isLoading } = usePrograms()
  const program = programs?.find((p) => p.id === programId)
  const m = useProgramMutations()
  const exMap = useExerciseMap()
  const navigate = useNavigate()
  const { startFrom, busy } = useStartWorkout()
  const [editOpen, setEditOpen] = useState(false)
  const [menuFor, setMenuFor] = useState<ProgramWorkout | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDeleteWorkout, setConfirmDeleteWorkout] = useState<ProgramWorkout | null>(null)

  if (isLoading) return <PageLoader />
  if (!program) return <EmptyState title="Programmet finns inte" action={<Button asChild><Link to="/programs">Tillbaka</Link></Button>} />

  const workouts = program.program_workouts

  async function addWorkout() {
    try {
      const id = await m.saveWorkout.mutateAsync({ program_id: program!.id, name: `Pass ${workouts.length + 1}`, position: workouts.length, exercises: [] })
      navigate(`/programs/${program!.id}/workouts/${id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunde inte skapa passet')
    }
  }

  function move(w: ProgramWorkout, delta: number) {
    const ids = workouts.map((x) => x.id)
    const i = ids.indexOf(w.id)
    const j = i + delta
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    m.reorderWorkouts.mutate(ids)
  }

  return (
    <>
      <PageHeader
        back={<BackLink to="/programs" label="Program" />}
        title={program.name}
        subtitle={program.description || `${workouts.length} pass`}
        action={
          <Button variant="secondary" size="icon-sm" aria-label="Redigera program" onClick={() => setEditOpen(true)}>
            <Pencil />
          </Button>
        }
      />

      <div className="space-y-2">
        {workouts.map((w) => (
          <Card key={w.id} className="p-0">
            <div className="flex items-center gap-2 p-4 pb-2">
              <Link to={`/programs/${program.id}/workouts/${w.id}`} className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-semibold">{w.name}</div>
                <div className="text-xs text-muted">{w.program_exercises.length} övningar</div>
              </Link>
              <Button variant="ghost" size="icon-sm" aria-label={`Fler val för ${w.name}`} onClick={() => setMenuFor(w)}>
                <MoreHorizontal />
              </Button>
            </div>
            <Link to={`/programs/${program.id}/workouts/${w.id}`} className="block px-4 pb-3">
              <ul className="space-y-1">
                {w.program_exercises.map((pe) => (
                  <li key={pe.id} className="flex justify-between gap-3 text-sm">
                    <span className="truncate text-muted">{exMap.get(pe.exercise_id)?.name ?? '…'}</span>
                    <span className="tabular shrink-0 text-subtle">
                      {pe.target_sets} × {pe.rep_min === pe.rep_max ? pe.rep_min : `${pe.rep_min}–${pe.rep_max}`}
                    </span>
                  </li>
                ))}
                {w.program_exercises.length === 0 && <li className="text-sm text-subtle">Tryck för att lägga till övningar</li>}
              </ul>
            </Link>
            <div className="border-t border-border/60 p-2">
              <Button variant="ghost" className="w-full text-accent" disabled={busy} onClick={() => startFrom(w)}>
                <Play className="fill-current" /> Starta passet
              </Button>
            </div>
          </Card>
        ))}
        <Button variant="subtle" size="lg" className="w-full" onClick={addWorkout} data-testid="add-program-workout">
          <Plus /> Lägg till pass
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            const id = await m.duplicateProgram.mutateAsync(program)
            toast.success('Programmet kopierat')
            navigate(`/programs/${id}`)
          }}
        >
          <Copy /> Kopiera program
        </Button>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          <Trash2 /> Ta bort
        </Button>
      </div>

      <Sheet open={editOpen} onOpenChange={setEditOpen} title="Redigera program">
        <ProgramForm
          initialName={program.name}
          initialDescription={program.description}
          onSave={async (name, description) => {
            await m.saveProgram.mutateAsync({ id: program.id, name, description })
            setEditOpen(false)
          }}
        />
      </Sheet>

      <Sheet open={!!menuFor} onOpenChange={(o) => !o && setMenuFor(null)} title={menuFor?.name ?? ''}>
        {menuFor && (
          <div className="grid gap-1 pt-1">
            <MenuItem icon={<Pencil />} onClick={() => navigate(`/programs/${program.id}/workouts/${menuFor.id}`)}>
              Redigera
            </MenuItem>
            <MenuItem
              icon={<Copy />}
              onClick={async () => {
                await m.duplicateWorkout.mutateAsync({ source: menuFor })
                toast.success('Passet kopierat')
                setMenuFor(null)
              }}
            >
              Duplicera pass
            </MenuItem>
            <MenuItem icon={<ArrowUp />} disabled={workouts[0]?.id === menuFor.id} onClick={() => { move(menuFor, -1); setMenuFor(null) }}>
              Flytta upp
            </MenuItem>
            <MenuItem icon={<ArrowDown />} disabled={workouts[workouts.length - 1]?.id === menuFor.id} onClick={() => { move(menuFor, 1); setMenuFor(null) }}>
              Flytta ner
            </MenuItem>
            <MenuItem icon={<Trash2 />} danger onClick={() => { setConfirmDeleteWorkout(menuFor); setMenuFor(null) }}>
              Ta bort pass
            </MenuItem>
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Ta bort programmet?"
        description="Passmallarna tas bort. Din träningshistorik påverkas inte."
        confirmLabel="Ta bort"
        danger
        onConfirm={async () => {
          await m.deleteProgram.mutateAsync(program.id)
          navigate('/programs', { replace: true })
        }}
      />
      <ConfirmDialog
        open={!!confirmDeleteWorkout}
        onOpenChange={(o) => !o && setConfirmDeleteWorkout(null)}
        title={`Ta bort ${confirmDeleteWorkout?.name ?? 'passet'}?`}
        description="Din träningshistorik påverkas inte."
        confirmLabel="Ta bort"
        danger
        onConfirm={() => confirmDeleteWorkout && m.deleteWorkout.mutate(confirmDeleteWorkout.id)}
      />
    </>
  )
}

function ProgramForm({ initialName, initialDescription, onSave }: { initialName: string; initialDescription: string; onSave: (n: string, d: string) => Promise<void> }) {
  const [name, setName] = useState(initialName)
  const [desc, setDesc] = useState(initialDescription)
  return (
    <form
      className="space-y-4 pt-1"
      onSubmit={async (e) => {
        e.preventDefault()
        if (name.trim()) await onSave(name.trim(), desc.trim())
      }}
    >
      <div>
        <Label htmlFor="pname">Namn</Label>
        <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </div>
      <div>
        <Label htmlFor="pdesc">Beskrivning</Label>
        <Textarea id="pdesc" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <Button type="submit" className="w-full">
        Spara
      </Button>
    </form>
  )
}
