import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, PageLoader } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { useExercises } from '@/lib/api/exercises'
import { useExerciseStats } from '@/lib/api/history'
import { EQUIPMENT, EQUIPMENT_LABEL, MUSCLE_GROUPS, MUSCLE_LABEL } from '@/lib/labels'
import { formatDate } from '@/lib/format'
import { formatNum } from '@/lib/training/calc'
import { BackLink } from '@/features/programs/ProgramDetailPage'
import { Chip, filterExercises } from './ExercisePicker'
import { ExerciseFormSheet } from './ExerciseForm'

export function ExerciseLibraryPage() {
  const { data: exercises, isLoading } = useExercises()
  const { data: stats } = useExerciseStats()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<string>('')
  const [onlyMine, setOnlyMine] = useState(false)
  const [onlyTrained, setOnlyTrained] = useState(false)
  const [creating, setCreating] = useState(false)

  const list = useMemo(() => {
    let l = filterExercises(exercises ?? [], query, muscle, equipment || null)
    if (onlyMine) l = l.filter((e) => e.user_id)
    if (onlyTrained) l = l.filter((e) => stats?.has(e.id))
    return l
  }, [exercises, query, muscle, equipment, onlyMine, onlyTrained, stats])

  return (
    <>
      <PageHeader
        back={<BackLink to="/progress" label="Progress" />}
        title="Övningar"
        subtitle={exercises ? `${exercises.filter((e) => !e.archived).length} övningar` : undefined}
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus /> Egen
          </Button>
        }
      />
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök övning" className="pl-10" aria-label="Sök övning" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip active={!muscle} onClick={() => setMuscle(null)}>Alla</Chip>
          {MUSCLE_GROUPS.map((m) => (
            <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
              {MUSCLE_LABEL[m]}
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <Select value={equipment} onChange={(e) => setEquipment(e.target.value)} aria-label="Utrustning" className="h-10 text-sm">
            <option value="">All utrustning</option>
            {EQUIPMENT.map((e) => (
              <option key={e} value={e}>{EQUIPMENT_LABEL[e]}</option>
            ))}
          </Select>
          <Chip active={onlyTrained} onClick={() => setOnlyTrained(!onlyTrained)}>Tränade</Chip>
          <Chip active={onlyMine} onClick={() => setOnlyMine(!onlyMine)}>Egna</Chip>
        </div>
      </div>
      {isLoading ? (
        <PageLoader />
      ) : (
        <Card className="mt-4 divide-y divide-border/60 p-0">
          {list.map((e) => {
            const st = stats?.get(e.id)
            return (
              <Link key={e.id} to={`/exercises/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{e.name}</div>
                  <div className="truncate text-xs text-muted">
                    {MUSCLE_LABEL[e.muscle_group]} · {EQUIPMENT_LABEL[e.equipment]}
                    {e.user_id && ' · Egen'}
                  </div>
                </div>
                {st?.records.bestE1rm ? (
                  <div className="text-right">
                    <div className="tabular text-sm font-semibold">{formatNum(st.records.bestE1rm.value)} kg</div>
                    <div className="text-[11px] text-subtle">e1RM · {formatDate(st.last!.date)}</div>
                  </div>
                ) : st ? (
                  <div className="text-[11px] text-subtle">{formatDate(st.last!.date)}</div>
                ) : null}
                <ChevronRight className="size-4 text-subtle" />
              </Link>
            )
          })}
          {list.length === 0 && <p className="p-6 text-center text-sm text-muted">Inga övningar matchar.</p>}
        </Card>
      )}
      <ExerciseFormSheet open={creating} onOpenChange={setCreating} defaultName={query} />
    </>
  )
}
