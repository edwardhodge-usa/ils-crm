interface FormFieldProps {
  label: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, htmlFor, children, className = '' }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-label)]"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

// Shared input className for consistent styling across forms
export const inputClass =
  'bg-[var(--bg-input)] border border-[var(--separator-strong)] rounded-[var(--radius-md)] ' +
  'px-3 py-1.5 text-[13px] text-[var(--text-primary)] w-full ' +
  'placeholder:text-[var(--text-placeholder)] ' +
  'focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_var(--color-accent-translucent)] focus:outline-none ' +
  'transition-[border-color,box-shadow] duration-150'
