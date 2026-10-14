import { format, formatDistanceToNowStrict, isThisYear, isToday, isYesterday } from 'date-fns'
import { sv } from 'date-fns/locale'

export function formatDate(iso: string | Date, opts: { withWeekday?: boolean } = {}): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (isToday(d)) return 'Idag'
  if (isYesterday(d)) return 'Igår'
  const base = isThisYear(d) ? 'd MMM' : 'd MMM yyyy'
  return format(d, opts.withWeekday ? `EEEE ${base}` : base, { locale: sv })
}

export function formatDateLong(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return format(d, "EEEE d MMMM yyyy 'kl.' HH:mm", { locale: sv })
}

export function formatShortDate(d: Date): string {
  return format(d, 'd MMM', { locale: sv })
}

export function formatTime(iso: string): string {
  return format(new Date(iso), 'HH:mm')
}

export function relative(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { locale: sv, addSuffix: true })
}

/** 3725 → "1:02:05", 125 → "2:05" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

/** Minutes → "1 h 05 min" / "45 min" */
export function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return '–'
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')} min`
}

export function formatKg(n: number | null | undefined): string {
  if (n == null) return '–'
  return `${n.toLocaleString('sv-SE', { maximumFractionDigits: 2 })} kg`
}

export function formatVolume(n: number): string {
  if (n >= 10000) return `${(n / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} ton`
  return `${Math.round(n).toLocaleString('sv-SE')} kg`
}

/** Parses Swedish-style decimals ("42,5") as well as "42.5". */
export function parseDecimal(v: string): number | null {
  const t = v.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
