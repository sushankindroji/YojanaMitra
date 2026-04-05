/**
 * Loading Skeleton Components for better loading state UX
 * Provides skeleton loaders for various content types
 */

export function SkeletonLoader({ className = '' }) {
  return (
    <div className={`bg-gray-200 rounded-lg animate-pulse ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="card">
      <SkeletonLoader className="h-4 w-3/4 mb-4" />
      <SkeletonLoader className="h-3 w-full mb-2" />
      <SkeletonLoader className="h-3 w-5/6" />
      <div className="flex gap-2 mt-4">
        <SkeletonLoader className="h-8 flex-1" />
        <SkeletonLoader className="h-8 flex-1" />
      </div>
    </div>
  );
}

export function SchemesListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="card space-y-6">
      <SkeletonLoader className="h-6 w-1/2 mb-4" />
      <div className="space-y-3">
        <SkeletonLoader className="h-4 w-1/3" />
        <SkeletonLoader className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <SkeletonLoader className="h-4 w-1/3" />
            <SkeletonLoader className="h-10 w-full" />
          </div>
        ))}
      </div>
      <SkeletonLoader className="h-10 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="w-full space-y-2">
      <div className="flex gap-2 mb-4">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: columns }).map((_, j) => (
            <SkeletonLoader key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <SkeletonLoader className="h-8 w-1/3 mb-6" />
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Content sections */}
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="card space-y-4">
      <SkeletonLoader className="h-6 w-1/2 mb-6" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <SkeletonLoader className="h-4 w-1/4 mb-2" />
          <SkeletonLoader className="h-10 w-full" />
        </div>
      ))}
      <SkeletonLoader className="h-10 w-full mt-6" />
    </div>
  );
}

export function SchemeDetailSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonLoader className="h-8 w-2/3" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="card space-y-3">
        <SkeletonLoader className="h-6 w-1/4 mb-4" />
        <SkeletonLoader className="h-4 w-full" />
        <SkeletonLoader className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function PulsingSkeleton({ className = '' }) {
  return (
    <div className={`bg-gray-200 animate-pulse rounded-lg ${className}`} />
  );
}
