import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-[background-color,transform,opacity] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 select-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:bg-accent/90',
        secondary: 'bg-surface-2 text-fg hover:bg-surface-3',
        ghost: 'text-fg hover:bg-surface-2',
        outline: 'border border-border text-fg hover:bg-surface-2',
        danger: 'bg-danger-soft text-danger hover:bg-danger/20',
        subtle: 'bg-accent-soft text-accent hover:bg-accent/20',
      },
      size: {
        sm: 'h-9 px-3 text-sm [&_svg]:size-4',
        md: 'h-11 px-4 text-[15px] [&_svg]:size-[18px]',
        lg: 'h-14 px-6 text-base [&_svg]:size-5',
        icon: 'size-11 [&_svg]:size-5',
        'icon-sm': 'size-9 [&_svg]:size-[18px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

// eslint-disable-next-line react-refresh/only-export-components
export { buttonVariants }
