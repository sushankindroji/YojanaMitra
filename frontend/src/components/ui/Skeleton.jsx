import clsx from 'clsx'

export function SkeletonLine({ className }) {
  return <div className={clsx('h-3 rounded-md animate-shimmer', className)} />
}

export function SkeletonCard({ className }) {
  return (
    <div className={clsx('rounded-2xl border border-stone-200 bg-white p-4', className)}>
      <SkeletonLine className="mb-3 h-4 w-2/3" />
      <SkeletonLine className="mb-2 w-full" />
      <SkeletonLine className="mb-2 w-11/12" />
      <SkeletonLine className="w-1/2" />
    </div>
  )
}

export function SkeletonImage({ className }) {
  return <div className={clsx('rounded-xl animate-shimmer', className)} />
}

export default function Skeleton({ className }) {
  return <div className={clsx('h-4 rounded-md animate-shimmer', className)} />
}
