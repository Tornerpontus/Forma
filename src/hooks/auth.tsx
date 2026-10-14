import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/** True after the user pressed "Logga ut" – then the login page should not bounce back to the old page. */
let explicitSignOut = false
// eslint-disable-next-line react-refresh/only-export-components
export const wasExplicitSignOut = () => explicitSignOut

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const qc = useQueryClient()

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession((prev) => {
        // Different account → never show cached data from the previous one
        if (prev?.user.id !== s?.user.id) qc.clear()
        return s
      })
      if (event === 'SIGNED_OUT') qc.clear()
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [qc])

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signIn(email, password) {
        explicitSignOut = false
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw new Error(translateAuthError(error.message))
      },
      async signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() }, emailRedirectTo: window.location.origin },
        })
        if (error) throw new Error(translateAuthError(error.message))
        return { needsConfirmation: !data.session }
      },
      async signOut() {
        explicitSignOut = true
        const uid = session?.user.id
        await supabase.auth.signOut()
        if (uid) {
          try {
            localStorage.removeItem(`forma:draft:${uid}`)
          } catch {
            /* ignore */
          }
        }
        qc.clear()
      },
      async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
        if (error) throw new Error(translateAuthError(error.message))
      },
    }),
    [session, loading, qc],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** Signed-in user id. Only use inside authenticated routes. */
// eslint-disable-next-line react-refresh/only-export-components
export function useUserId(): string {
  const { user } = useAuth()
  if (!user) throw new Error('Not signed in')
  return user.id
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Fel e-post eller lösenord.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'Det finns redan ett konto med den e-postadressen.'
  if (m.includes('password should be at least')) return 'Lösenordet måste vara minst 6 tecken.'
  if (m.includes('email not confirmed')) return 'Bekräfta din e-post först – kolla inkorgen.'
  if (m.includes('rate limit')) return 'För många försök. Vänta en stund och försök igen.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Ingen anslutning till servern.'
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'Registrering är avstängd.'
  return msg
}
