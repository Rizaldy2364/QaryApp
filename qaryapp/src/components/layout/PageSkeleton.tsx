import { Skeleton } from '../feedback/Skeleton'

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[720px] p-4 space-y-4 animate-pulse">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  )
}
