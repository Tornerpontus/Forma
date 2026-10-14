import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Copy, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, SectionTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/sheet'
import { useAcceptInvite, useCreateInvite, useEndShare, useShares, type TrainingShare } from '@/lib/api/partners'

/** Settings section: invite a partner (explicit, revocable, read-only training access). */
export function SharingSection() {
  const { data: shares } = useShares()
  const create = useCreateInvite()
  const accept = useAcceptInvite()
  const end = useEndShare()
  const [invite, setInvite] = useState<{ code: string; expires_at: string } | null>(null)
  const [code, setCode] = useState('')
  const [ending, setEnding] = useState<TrainingShare | null>(null)
  const outgoing = (shares ?? []).filter((s) => s.direction === 'outgoing')
  const incoming = (shares ?? []).filter((s) => s.direction === 'incoming')
  const endingOut = ending?.direction === 'outgoing'
  const endingName = ending?.other_name || 'partnern'

  return (
    <section>
      <SectionTitle>Dela träning med partner</SectionTitle>
      <Card className="space-y-4">
        <p className="text-sm text-muted">
          Den du ger din kod till kan <span className="text-fg">se</span> dina avslutade pass, set och rekord, men inte ändra något. Kost, vikt, mått, mål och program
          delas aldrig. Du kan sluta dela när som helst.
        </p>

        {invite ? (
          <div className="rounded-xl bg-surface-2 p-4 text-center" data-testid="invite-code">
            <div className="text-xs uppercase tracking-wider text-subtle">Din kod</div>
            <div className="tabular my-1 select-all font-mono text-2xl font-bold tracking-widest text-accent" data-testid="invite-code-value">
              {invite.code}
            </div>
            <div className="text-xs text-muted">
              Gäller en gång, till {new Date(invite.expires_at).toLocaleString('sv-SE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(invite.code)
                  toast.success('Koden kopierad')
                } catch {
                  toast('Markera koden och kopiera den manuellt')
                }
              }}
            >
              <Copy /> Kopiera
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            disabled={create.isPending}
            onClick={async () => {
              try {
                setInvite(await create.mutateAsync())
              } catch {
                toast.error('Kunde inte skapa en kod')
              }
            }}
          >
            {create.isPending ? <Loader2 className="animate-spin" /> : <Users />} Skapa inbjudningskod
          </Button>
        )}

        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!code.trim()) return
            try {
              const name = await accept.mutateAsync(code)
              toast.success(`Du kan nu se ${name ? `${name}s` : 'din partners'} träning`)
              setCode('')
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Kunde inte ansluta')
            }
          }}
        >
          <Label htmlFor="invite">Har du fått en kod?</Label>
          <div className="flex gap-2">
            <Input
              id="invite"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              autoComplete="off"
              className="font-mono"
            />
            <Button type="submit" disabled={accept.isPending || !code.trim()}>
              Anslut
            </Button>
          </div>
        </form>

        {incoming.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-subtle">Delar med dig</div>
            <div className="divide-y divide-border/60">
              {incoming.map((s) => (
                <div key={s.owner_id} className="flex items-center gap-2 py-1.5">
                  <Link to={`/partner/${s.owner_id}`} className="flex min-h-11 flex-1 items-center gap-2 text-[15px]">
                    <span className="flex-1">{s.other_name || 'Partner'}</span>
                    <ChevronRight className="size-4 text-subtle" />
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => setEnding(s)}>
                    Ta bort
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        {outgoing.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-subtle">Du delar med</div>
            <div className="divide-y divide-border/60">
              {outgoing.map((s) => (
                <div key={s.viewer_id} className="flex min-h-11 items-center gap-2 py-1.5">
                  <span className="flex-1 text-[15px]">{s.other_name || 'Partner'}</span>
                  <Button variant="ghost" size="sm" className="text-danger" onClick={() => setEnding(s)}>
                    Sluta dela
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!ending}
        onOpenChange={(o) => !o && setEnding(null)}
        title={endingOut ? `Sluta dela med ${endingName}?` : `Sluta se ${endingName}s träning?`}
        description={endingOut ? 'Personen ser inte längre din träning. Du kan bjuda in igen senare.' : 'För att se den igen behöver du en ny kod.'}
        confirmLabel={endingOut ? 'Sluta dela' : 'Ta bort'}
        danger
        onConfirm={async () => {
          if (!ending) return
          await end.mutateAsync(ending)
          toast.success('Delningen är avslutad')
          setEnding(null)
        }}
      />
    </section>
  )
}
