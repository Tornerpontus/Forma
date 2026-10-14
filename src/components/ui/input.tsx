import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-fg placeholder:text-subtle outline-none transition-colors focus:border-accent/60 focus-visible:outline-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-20 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg placeholder:text-subtle outline-none transition-colors focus:border-accent/60 focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-medium text-muted', className)} {...props} />
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-12 w-full appearance-none rounded-xl border border-border bg-surface-2 bg-[length:16px] bg-[right_1rem_center] bg-no-repeat px-4 pr-10 text-fg outline-none focus:border-accent/60',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239a9ea7' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    />
  )
}
