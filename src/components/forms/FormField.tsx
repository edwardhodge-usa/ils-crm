interface FormFieldProps {
  label: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
  /** Use vertical layout for wide children like textarea or multiSelect */
  stacked?: boolean
}

export function FormField({ label, htmlFor, children, className = '', stacked = false }: FormFieldProps) {
  if (stacked) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-normal text-[var(--text-primary)]"
        >
          {label}
        </label>
        {children}
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-between min-h-[36px] ${className}`}>
      <label
        htmlFor={htmlFor}
        className="text-[13px] font-normal text-[var(--text-primary)] flex-shrink-0"
      >
        {label}
      </label>
      <div className="flex-1 flex justify-end ml-4 min-w-0">
        {children}
      </div>
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
