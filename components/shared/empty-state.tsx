import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

/** Real empty-state copy — never a bare "no data". */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed bg-surface/50 p-10 text-center",
        className
      )}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
