import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

const variantStyles = {
  primary: 'bg-orange-600 text-white hover:bg-orange-700 focus-visible:ring-orange-300',
  secondary: 'bg-green-700 text-white hover:bg-green-800 focus-visible:ring-green-300',
  ghost: 'bg-transparent text-stone-700 hover:bg-stone-100 focus-visible:ring-stone-300',
  danger: 'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-300',
}

const sizeStyles = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      className={clsx(
        'inline-flex min-w-[6rem] items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-70',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      <span className={clsx(loading && 'opacity-90')}>{children}</span>
    </button>
  )
}
