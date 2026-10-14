import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Bottom sheet on mobile, centered dialog on larger screens. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  fullHeight,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  fullHeight?: boolean
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t border-border bg-surface pb-safe outline-none',
            'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border',
            'data-[state=open]:animate-[sheet-up_220ms_cubic-bezier(0.2,0.9,0.3,1)]',
            fullHeight ? 'h-[92dvh] sm:h-[80dvh]' : 'max-h-[92dvh]',
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-surface-3 sm:hidden" />
          <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-lg font-semibold">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-sm text-muted">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted hover:text-fg"
              aria-label="Stäng"
            >
              <X className="size-[18px]" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Small confirm dialog */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Bekräfta',
  danger,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-surface p-5 outline-none">
          <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className={cn('mt-1 text-sm text-muted', !description && 'sr-only')}>
            {description ?? title}
          </DialogPrimitive.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <DialogPrimitive.Close className="h-11 rounded-xl bg-surface-2 font-medium">Avbryt</DialogPrimitive.Close>
            <button
              type="button"
              className={cn(
                'h-11 rounded-xl font-medium',
                danger ? 'bg-danger text-white' : 'bg-accent text-accent-fg',
              )}
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
