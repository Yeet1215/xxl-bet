import Link from 'next/link'
import { type ComponentProps } from 'react'

type Variant = 'primary' | 'secondary'

// Link styled as a Button — keep the classes in sync with button.tsx.
const base =
  'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-[10px] ' +
  'text-sm font-semibold transition-[colors,transform] duration-150 ' +
  'active:scale-[0.97] active:duration-75 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-deep'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white font-bold hover:bg-accent-deep active:bg-accent-deep',
  secondary:
    'bg-bg text-text-primary border border-border hover:bg-surface-1 active:bg-surface-2',
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant }

export function ButtonLink({ variant = 'primary', className = '', ...rest }: ButtonLinkProps) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...rest} />
}
