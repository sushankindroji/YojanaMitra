import clsx from 'clsx'

const variantStyles = {
  default: 'bg-white border border-stone-200 shadow-sm',
  elevated: 'bg-white border border-stone-100 shadow-lg shadow-stone-900/5',
  outlined: 'bg-white border-2 border-stone-300 shadow-none',
}

export default function Card({ variant = 'default', className, children, ...props }) {
  return (
    <section
      className={clsx('rounded-2xl p-5', variantStyles[variant], className)}
      {...props}
    >
      {children}
    </section>
  )
}
