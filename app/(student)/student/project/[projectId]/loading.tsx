import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-9 w-56" />
      <ListSkeleton rows={5} />
    </div>
  );
}
