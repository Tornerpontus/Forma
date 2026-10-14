import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[var(--radius-card)] bg-surface p-4', className)} {...props} />
}

export function SectionTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('mb-3 px-1 text-[13px] font-semibold uppercase tracking-wider text-subtle', className)} {...props} />
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'accent' | 'warn' | 'danger' | 'info' }) {
  const tones = {
    neutral: 'bg-surface-3 text-muted',
    accent: 'bg-accent-soft text-accent',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-info-soft text-info',
  }
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}
      {...props}
    />
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-4 rounded-2xl bg-surface-2 p-4 text-muted [&_svg]:size-7">{icon}</div>}
      <p className="text-base font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Laddar"
      className={cn('size-6 animate-spin rounded-full border-2 border-surface-3 border-t-accent', className)}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner />
    </div>
  )
}
