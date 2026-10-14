import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/auth'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'

export function LoginPage() {
  const { user, signIn, signUp, resetPassword } = useAuth()
  const loc = useLocation()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  if (user) return <Navigate to={(loc.state as { from?: string } | null)?.from ?? '/'} replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'login') await signIn(email, password)
      else {
        const r = await signUp(email, password, name)
        if (r.needsConfirmation) setInfo('Kontot är skapat. Bekräfta din e-post via länken vi skickade och logga sedan in.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
    } finally {
      setBusy(false)
    }
  }

  async function forgot() {
    if (!email) {
      setError('Skriv din e-postadress först.')
      return
    }
    try {
      await resetPassword(email)
      setInfo('Om adressen finns har vi skickat en länk för att återställa lösenordet.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
    }
  }

  return (
    <div className="pt-safe flex min-h-dvh flex-col px-6">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
        <div className="mb-10">
          <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-surface-2">
            <svg viewBox="0 0 512 512" className="size-8" aria-hidden>
              <path d="M164 132h196v52H224v52h116v50H224v94h-60z" fill="#c8f560" />
            </svg>
          </div>
          <h1 className="text-[34px] font-bold tracking-tight">FORMA</h1>
          <p className="mt-1 text-muted">Träna. Logga. Bli starkare.</p>
        </div>

        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m)
            setError(null)
          }}
          options={[
            { value: 'login', label: 'Logga in' },
            { value: 'signup', label: 'Skapa konto' },
          ]}
          className="mb-6"
        />

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <Label htmlFor="name">Namn</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required placeholder="Ditt förnamn" />
            </div>
          )}
          <div>
            <Label htmlFor="email">E-post</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required inputMode="email" placeholder="namn@exempel.se" />
          </div>
          <div>
            <Label htmlFor="password">Lösenord</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              placeholder={mode === 'signup' ? 'Minst 8 tecken' : ''}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}
          {info && <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{info}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {mode === 'login' ? 'Logga in' : 'Skapa konto'}
          </Button>
          {mode === 'login' && (
            <button type="button" onClick={forgot} className="w-full py-2 text-sm text-muted hover:text-fg">
              Glömt lösenordet?
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
