import { useEffect, useRef, useState } from 'react'
import { Minus, Plus, Timer, X } from 'lucide-react'
import { formatClock } from '@/lib/format'
import type { RestTimerState } from '@/lib/training/types'
import { cn } from '@/lib/utils'

let audioCtx: AudioContext | null = null
function beep() {
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    const t = ctx.currentTime
    for (const [i, f] of [880, 1320].entries()) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t + i * 0.18)
      g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.18 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.16)
      o.connect(g).connect(ctx.destination)
      o.start(t + i * 0.18)
      o.stop(t + i * 0.18 + 0.17)
    }
  } catch {
    /* audio not available */
  }
}

/** Unlock audio on iOS – must be called from a user gesture (e.g. completing a set). */
export function primeAudio() {
  try {
    audioCtx ??= new AudioContext()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
  } catch {
    /* ignore */
  }
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function RestTimerBar({
  timer,
  onAdjust,
  onStop,
}: {
  timer: RestTimerState
  onAdjust: (delta: number) => void
  onStop: () => void
}) {
  const now = useNow(250)
  const ends = new Date(timer.ends_at).getTime()
  const remaining = Math.ceil((ends - now) / 1000)
  const done = remaining <= 0
  const notified = useRef<string | null>(null)

  useEffect(() => {
    if (done && notified.current !== timer.ends_at) {
      notified.current = timer.ends_at
      // Only alert if the timer just ran out (not when reopening the app long after)
      if (now - ends < 5000) {
        beep()
        navigator.vibrate?.([200, 100, 200])
      }
    }
  }, [done, timer.ends_at, now, ends])

  useEffect(() => {
    if (!done) return
    const id = setTimeout(onStop, 8000)
    return () => clearTimeout(id)
  }, [done, onStop])

  const progress = timer.duration > 0 ? Math.min(1, Math.max(0, 1 - (ends - now) / (timer.duration * 1000))) : 1

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-surface-2/95 shadow-2xl backdrop-blur',
        done && 'border-accent/60',
      )}
      role="timer"
      aria-live="polite"
    >
      <div className="absolute inset-y-0 left-0 bg-accent/10 transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
      <div className="relative flex items-center gap-2 p-2 pl-4">
        <Timer className={cn('size-5', done ? 'text-accent' : 'text-muted')} />
        <div className="flex-1">
          <div className="text-xs text-muted">{done ? 'Vila klar' : 'Vila'}</div>
          <div className="tabular text-xl font-semibold leading-tight">{done ? 'Kör!' : formatClock(remaining)}</div>
        </div>
        {!done && (
          <>
            <button type="button" aria-label="15 sekunder mindre" onClick={() => onAdjust(-15)} className="flex h-11 items-center gap-0.5 rounded-xl bg-surface-3 px-3 text-sm font-medium">
              <Minus className="size-4" />15
            </button>
            <button type="button" aria-label="15 sekunder mer" onClick={() => onAdjust(15)} className="flex h-11 items-center gap-0.5 rounded-xl bg-surface-3 px-3 text-sm font-medium">
              <Plus className="size-4" />15
            </button>
          </>
        )}
        <button type="button" aria-label="Stäng vilotimer" onClick={onStop} className="flex size-11 items-center justify-center rounded-xl bg-surface-3">
          <X className="size-5" />
        </button>
      </div>
    </div>
  )
}
