import clsx from 'clsx'

const sizeStyles = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

const palette = [
  'from-orange-500 to-orange-700',
  'from-green-500 to-emerald-700',
  'from-blue-500 to-indigo-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-yellow-700',
]

const hashName = (name = '') =>
  name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

const getInitials = (name = '') => {
  const words = String(name).trim().split(/\s+/)
  if (!words[0]) {
    return 'U'
  }
  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase()
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

export default function Avatar({ src, name = '', size = 'md', className }) {
  const gradient = palette[hashName(name) % palette.length]

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'User avatar'}
        className={clsx('rounded-full object-cover', sizeStyles[size], className)}
      />
    )
  }

  return (
    <span
      aria-label={name || 'User avatar'}
      className={clsx(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white',
        gradient,
        sizeStyles[size],
        className
      )}
    >
      {getInitials(name)}
    </span>
  )
}
