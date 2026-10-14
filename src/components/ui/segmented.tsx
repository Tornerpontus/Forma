import { cn } from '@/lib/utils'

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="tablist" className={cn('flex gap-1 rounded-xl bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 whitespace-nowrap rounded-lg px-2 font-medium transition-colors',
            size === 'sm' ? 'h-8 text-xs' : 'h-9 text-sm',
            value === o.value ? 'bg-surface-3 text-fg shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
