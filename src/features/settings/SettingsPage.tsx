import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Dumbbell, LogOut, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, PageLoader, SectionTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { useAuth } from '@/hooks/auth'
import { useProfile, useUpdateProfile } from '@/lib/api/profile'
import { supabase } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/ui/sheet'
import { useActiveWorkout } from '@/features/workout/ActiveWorkoutProvider'
import { SharingSection } from '@/features/partner/SharingSection'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const update = useUpdateProfile()
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const { draft, sync } = useActiveWorkout()
  const [confirmLogout, setConfirmLogout] = useState(false)

  useEffect(() => {
    if (profile) setName(profile.display_name)
  }, [profile])

  if (isLoading || !profile) return <PageLoader />

  async function patch(p: Parameters<typeof update.mutateAsync>[0]) {
    try {
      await update.mutateAsync(p)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunde inte spara')
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Profil" subtitle={user?.email} />

      <section>
        <SectionTitle>Profil</SectionTitle>
        <Card className="space-y-3">
          <div>
            <Label htmlFor="dn">Namn</Label>
            <Input
              id="dn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== profile.display_name && patch({ display_name: name.trim() })}
            />
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Träning</SectionTitle>
        <Card className="divide-y divide-border/60 p-0">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="text-[15px]">Standard vilotid</div>
              <div className="text-xs text-muted">Används när övningen saknar egen vilotid</div>
            </div>
            <select
              aria-label="Standard vilotid"
              value={profile.default_rest_seconds}
              onChange={(e) => patch({ default_rest_seconds: Number(e.target.value) })}
              className="h-10 rounded-lg bg-surface-2 px-3 text-sm"
            >
              {[30, 45, 60, 90, 120, 150, 180, 240, 300].map((s) => (
                <option key={s} value={s}>
                  {s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`}
                </option>
              ))}
            </select>
          </div>
          <Toggle label="Starta vilotimer automatiskt" hint="När du bockar av ett set" checked={profile.auto_start_rest_timer} onChange={(v) => patch({ auto_start_rest_timer: v })} />
          <Toggle label="Visa RIR-kolumn" hint="Reps in reserve – hur många reps du hade kvar" checked={profile.show_rir} onChange={(v) => patch({ show_rir: v })} />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px]">Viktenhet</span>
            <span className="text-sm text-muted">kg</span>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Bibliotek</SectionTitle>
        <Card className="p-0">
          <Link to="/exercises" className="flex items-center gap-3 px-4 py-3.5">
            <Dumbbell className="size-5 text-muted" />
            <span className="flex-1 text-[15px]">Övningsbibliotek</span>
            <ChevronRight className="size-4 text-subtle" />
          </Link>
        </Card>
      </section>

      <SharingSection />

      <section>
        <SectionTitle>Installera på telefonen</SectionTitle>
        <Card className="space-y-2 text-sm text-muted">
          <div className="flex items-center gap-2 font-medium text-fg">
            <Smartphone className="size-4" /> Lägg FORMA på hemskärmen
          </div>
          <p>
            <span className="text-fg">iPhone (Safari):</span> tryck på dela-knappen → ”Lägg till på hemskärmen”.
          </p>
          <p>
            <span className="text-fg">Android (Chrome):</span> menyn ⋮ → ”Installera app” / ”Lägg till på startskärmen”.
          </p>
        </Card>
      </section>

      <section>
        <SectionTitle>Konto</SectionTitle>
        <Card className="space-y-3">
          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (pw.length < 8) {
                toast.error('Minst 8 tecken')
                return
              }
              const { error } = await supabase.auth.updateUser({ password: pw })
              if (error) toast.error(error.message)
              else {
                toast.success('Lösenordet är bytt')
                setPw('')
              }
            }}
          >
            <Label htmlFor="newpw">Nytt lösenord</Label>
            <div className="flex gap-2">
              <Input id="newpw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Minst 8 tecken" />
              <Button type="submit" variant="secondary" className="h-12">
                Byt
              </Button>
            </div>
          </form>
          <Button variant="danger" className="w-full" onClick={() => (draft ? setConfirmLogout(true) : signOut())}>
            <LogOut /> Logga ut
          </Button>
        </Card>
      </section>
      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Du har ett pågående pass"
        description={
          sync === 'saved'
            ? 'Passet är sparat på servern och finns kvar när du loggar in igen.'
            : 'Passet har ändringar som inte hunnit sparas (ingen anslutning). Loggar du ut nu försvinner de. Vänta tills det står ”Sparat”.'
        }
        confirmLabel="Logga ut ändå"
        danger
        onConfirm={() => signOut()}
      />
      <p className="text-center text-xs text-subtle">FORMA · version {__APP_VERSION__}</p>
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
      <span>
        <span className="block text-[15px]">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className="relative inline-flex">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-surface-3 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent" />
        <span className="absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}
