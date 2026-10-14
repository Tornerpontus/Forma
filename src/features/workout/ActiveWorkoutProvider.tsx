import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/auth'
import { createDraft } from '@/lib/training/draft'
import type { DraftExercise, WorkoutDraft } from '@/lib/training/types'
import {
  discardActiveWorkout,
  fetchActiveWorkout,
  finishWorkoutOnServer,
  insertActiveWorkout,
  saveDraftToServer,
} from '@/lib/api/workouts'
import { qk } from '@/lib/api/keys'

export type SyncState = 'saved' | 'saving' | 'pending' | 'offline'

interface LocalRecord {
  draft: WorkoutDraft
  /** Has the workout row been created on the server? */
  created: boolean
  /** Highest version confirmed saved on the server */
  synced_version: number
}

interface ActiveWorkoutCtx {
  draft: WorkoutDraft | null
  ready: boolean
  sync: SyncState
  start: (p: { name: string; program_workout_id?: string | null; exercises?: DraftExercise[] }) => Promise<void>
  update: (fn: (d: WorkoutDraft) => WorkoutDraft) => void
  finish: () => Promise<boolean>
  discard: () => Promise<void>
}

const Ctx = createContext<ActiveWorkoutCtx | null>(null)

const SAVE_DEBOUNCE_MS = 600
const RETRY_MS = 5000

function readLocal(key: string): LocalRecord | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as LocalRecord) : null
  } catch {
    return null
  }
}

function writeLocal(key: string, rec: LocalRecord | null) {
  try {
    if (rec) localStorage.setItem(key, JSON.stringify(rec))
    else localStorage.removeItem(key)
  } catch {
    /* storage full or blocked – server sync still runs */
  }
}

/**
 * Owns the in-progress workout. Every change is written to localStorage immediately (keyed by
 * user id, so the two accounts never share a draft) and saved to Supabase shortly after.
 * If the app is closed or crashes, the newest copy (local or server) is restored on next launch.
 */
export function ActiveWorkoutProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.id ?? null
  const qc = useQueryClient()
  const [draft, setDraft] = useState<WorkoutDraft | null>(null)
  const [ready, setReady] = useState(false)
  const [sync, setSync] = useState<SyncState>('saved')

  const rec = useRef<LocalRecord | null>(null)
  const saving = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localKey = uid ? `forma:draft:${uid}` : null

  const persistLocal = useCallback(() => {
    if (localKey) writeLocal(localKey, rec.current)
  }, [localKey])

  const pushToServer = useCallback(async () => {
    const r = rec.current
    if (!r || !uid || saving.current) return
    if (r.created && r.synced_version >= r.draft.version) {
      setSync('saved')
      return
    }
    saving.current = true
    setSync('saving')
    const snapshot = r.draft
    try {
      if (!r.created) {
        await insertActiveWorkout(uid, snapshot)
        r.created = true
      } else {
        const stillActive = await saveDraftToServer(snapshot)
        if (!stillActive) {
          // Finished or discarded on another device – drop the local copy
          rec.current = null
          persistLocal()
          setDraft(null)
          setSync('saved')
          toast('Passet avslutades på en annan enhet.')
          return
        }
      }
      if (rec.current === r) {
        r.synced_version = Math.max(r.synced_version, snapshot.version)
        persistLocal()
      }
      setSync(rec.current && rec.current.synced_version < rec.current.draft.version ? 'pending' : 'saved')
    } catch (e) {
      if (e instanceof Error && e.message.includes('workouts_one_active_per_user')) {
        // Another device already has an active workout – adopt the server one instead
        saving.current = false
        const server = uid ? await fetchActiveWorkout(uid).catch(() => null) : null
        const sd = (server?.draft as unknown as WorkoutDraft | null) ?? null
        rec.current = server && sd ? { draft: sd, created: true, synced_version: server.draft_version } : null
        persistLocal()
        setDraft(rec.current?.draft ?? null)
        setSync('saved')
        toast('Du har redan ett pågående pass – det har öppnats.')
        return
      }
      setSync('offline')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void pushToServer(), RETRY_MS)
    } finally {
      saving.current = false
    }
    // Changes made while saving
    const cur = rec.current
    if (cur && cur.created && cur.synced_version < cur.draft.version) {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void pushToServer(), SAVE_DEBOUNCE_MS)
    }
  }, [uid, persistLocal])

  const schedule = useCallback(
    (delay = SAVE_DEBOUNCE_MS) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void pushToServer(), delay)
    },
    [pushToServer],
  )

  // Restore on login / launch
  useEffect(() => {
    let cancelled = false
    setReady(false)
    setDraft(null)
    rec.current = null
    if (!uid || !localKey) {
      setReady(true)
      return
    }
    const local = readLocal(localKey)
    ;(async () => {
      try {
        const server = await fetchActiveWorkout(uid)
        if (cancelled) return
        const serverDraft = (server?.draft as unknown as WorkoutDraft | null) ?? null
        if (server && serverDraft) {
          if (local && local.draft.workout_id === server.id && local.draft.version > (server.draft_version ?? 0)) {
            rec.current = { draft: local.draft, created: true, synced_version: server.draft_version ?? 0 }
          } else {
            rec.current = { draft: serverDraft, created: true, synced_version: server.draft_version ?? serverDraft.version }
          }
        } else if (local && !local.created) {
          rec.current = local // started offline, never reached the server
        } else {
          rec.current = null // finished elsewhere or nothing active
        }
      } catch {
        // Offline: trust the local copy
        rec.current = local
      }
      if (cancelled) return
      persistLocal()
      setDraft(rec.current?.draft ?? null)
      setReady(true)
      if (rec.current && (rec.current.synced_version < rec.current.draft.version || !rec.current.created)) schedule(0)
    })()
    return () => {
      cancelled = true
    }
  }, [uid, localKey, persistLocal, schedule])

  // Flush when the app goes to background, and retry when back online
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') void pushToServer()
    }
    const online = () => void pushToServer()
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', online)
    window.addEventListener('online', online)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', online)
      window.removeEventListener('online', online)
    }
  }, [pushToServer])

  const update = useCallback(
    (fn: (d: WorkoutDraft) => WorkoutDraft) => {
      const r = rec.current
      if (!r) return
      const next = fn(r.draft)
      if (next === r.draft) return
      r.draft = next
      persistLocal()
      setDraft(next)
      setSync('pending')
      schedule()
    },
    [persistLocal, schedule],
  )

  const start = useCallback<ActiveWorkoutCtx['start']>(
    async ({ name, program_workout_id, exercises }) => {
      if (!uid) return
      if (rec.current) throw new Error('Du har redan ett pågående pass.')
      const d = createDraft({ workout_id: crypto.randomUUID(), name, program_workout_id })
      d.exercises = exercises ?? []
      rec.current = { draft: d, created: false, synced_version: 0 }
      persistLocal()
      setDraft(d)
      await pushToServer()
    },
    [uid, persistLocal, pushToServer],
  )

  const finish = useCallback(async () => {
    const r = rec.current
    if (!r || !uid) return false
    if (timer.current) clearTimeout(timer.current)
    try {
      if (!r.created) {
        await insertActiveWorkout(uid, r.draft)
        r.created = true
      }
      await finishWorkoutOnServer(r.draft)
    } catch (e) {
      toast.error('Kunde inte spara passet. Kontrollera anslutningen och försök igen – inget har försvunnit.')
      console.error(e)
      return false
    }
    rec.current = null
    persistLocal()
    setDraft(null)
    setSync('saved')
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.workouts(uid) }),
      qc.invalidateQueries({ queryKey: qk.setHistory(uid) }),
    ])
    return true
  }, [uid, persistLocal, qc])

  const discard = useCallback(async () => {
    const r = rec.current
    if (!r) return
    if (timer.current) clearTimeout(timer.current)
    if (r.created) {
      try {
        await discardActiveWorkout(r.draft.workout_id)
      } catch {
        toast.error('Kunde inte ta bort passet på servern. Försök igen.')
        return
      }
    }
    rec.current = null
    persistLocal()
    setDraft(null)
    setSync('saved')
  }, [persistLocal])

  const value = useMemo(() => ({ draft, ready, sync, start, update, finish, discard }), [draft, ready, sync, start, update, finish, discard])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActiveWorkout() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useActiveWorkout outside provider')
  return c
}
