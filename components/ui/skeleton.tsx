import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md border-2 border-border/20 bg-secondary", className)}
      {...props}
    />
  );
}

export { Skeleton };
