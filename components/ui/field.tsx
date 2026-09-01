import { type InputHTMLAttributes } from 'react'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
}

// Labeled input per DESIGN.md: white bg, 1px border, accent focus, label above.
export function Field({ label, name, id, className = '', ...rest }: FieldProps) {
  const inputId = id ?? name
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-semibold text-text-secondary">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className={`w-full min-h-[44px] px-3 rounded-[10px] bg-bg border border-border text-text-primary placeholder:text-text-muted text-sm transition-colors focus:outline-none focus:border-accent ${className}`}
        {...rest}
      />
    </div>
  )
}
