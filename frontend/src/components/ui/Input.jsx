import clsx from 'clsx'

export default function Input({
  id,
  label,
  helperText,
  error,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  className,
  inputClassName,
  ...props
}) {
  const inputId = id || props.name

  return (
    <div className={clsx('w-full', className)}>
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-label font-medium text-stone-700">
          {label}
        </label>
      ) : null}

      <div
        className={clsx(
          'group flex items-center rounded-xl border bg-white px-3 transition-colors duration-150 ease-in-out focus-within:ring-[3px] focus-within:ring-orange-500/20',
          error
            ? 'border-red-500 focus-within:border-red-500'
            : 'border-stone-300 focus-within:border-orange-500'
        )}
      >
        {LeadingIcon ? <LeadingIcon className="mr-2 h-4 w-4 text-stone-500" aria-hidden="true" /> : null}

        <input
          id={inputId}
          className={clsx(
            'h-10 w-full bg-transparent text-body text-stone-900 placeholder:text-stone-400',
            'focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            inputClassName
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />

        {TrailingIcon ? <TrailingIcon className="ml-2 h-4 w-4 text-stone-500" aria-hidden="true" /> : null}
      </div>

      {error ? (
        <p className="mt-1 text-caption font-medium text-red-700">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-caption text-stone-500">{helperText}</p>
      ) : null}
    </div>
  )
}
