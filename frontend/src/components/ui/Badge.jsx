import clsx from 'clsx'

const variantStyles = {
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-stone-100 text-stone-700',
}

const dotStyles = {
  success: 'bg-emerald-600',
  warning: 'bg-amber-600',
  danger: 'bg-red-600',
  info: 'bg-blue-600',
  neutral: 'bg-stone-500',
}

export default function Badge({ variant = 'neutral', dot = false, className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-caption font-medium',
        variantStyles[variant],
        className
      )}
    >
      {dot ? <span className={clsx('h-1.5 w-1.5 rounded-full', dotStyles[variant])} aria-hidden="true" /> : null}
      {children}
    </span>
  )
}
