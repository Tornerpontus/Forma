import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { parseDecimal } from '@/lib/format'

function fmt(v: number | null): string {
  if (v == null) return ''
  return String(v).replace('.', ',')
}

/** Compact numeric input for set rows. Accepts "42,5" and "42.5". Selects all on focus. */
export function NumberCell({
  value,
  placeholder,
  onChange,
  decimal,
  label,
  min,
  max,
  className,
  muted,
}: {
  value: number | null
  placeholder?: string
  onChange: (v: number | null) => void
  decimal?: boolean
  label: string
  min: number
  max: number
  className?: string
  muted?: boolean
}) {
  const [text, setText] = useState(fmt(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(fmt(value))
  }, [value])

  function handle(raw: string) {
    const cleaned = decimal ? raw.replace(/[^\d.,-]/g, '') : raw.replace(/[^\d]/g, '')
    setText(cleaned)
    if (cleaned === '' ) return onChange(null)
    if (/[.,]$/.test(cleaned) || cleaned === '-') return
    const n = decimal ? parseDecimal(cleaned) : parseInt(cleaned, 10)
    if (n == null || Number.isNaN(n)) return
    const clamped = Math.min(max, Math.max(min, decimal ? Math.round(n * 100) / 100 : Math.round(n)))
    onChange(clamped)
  }

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      autoComplete="off"
      aria-label={label}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true
        e.currentTarget.select()
      }}
      onBlur={() => {
        focused.current = false
        setText(fmt(value))
      }}
      onChange={(e) => handle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
      }}
      className={cn(
        'tabular h-11 w-full min-w-0 rounded-lg bg-surface-2 text-center text-[17px] font-semibold text-fg outline-none transition-colors placeholder:font-medium placeholder:text-subtle focus:bg-surface-3 focus:ring-2 focus:ring-accent/50',
        muted && 'bg-transparent',
        className,
      )}
    />
  )
}
