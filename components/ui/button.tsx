import { type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const base =
  'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-[10px] ' +
  'text-sm font-semibold transition-[colors,transform] duration-150 ' +
  'active:scale-[0.97] active:duration-75 cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-deep ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white font-bold hover:bg-accent-deep active:bg-accent-deep',
  secondary:
    'bg-bg text-text-primary border border-border hover:bg-surface-1 active:bg-surface-2',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-1',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return <button type={type} className={`${base} ${variants[variant]} ${className}`} {...rest} />
}
