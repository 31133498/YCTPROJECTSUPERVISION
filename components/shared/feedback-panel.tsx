"use client";

import { useEffect, useState } from "react";
import { MessagesSquare } from "lucide-react";

import { getSubmissionsPage } from "@/lib/firestore";
import { useAsyncData } from "@/hooks/use-async-data";
import { QueryState } from "./query-state";
import { EmptyState } from "./empty-state";
import { CommentThread } from "./comment-thread";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { SubmissionDoc } from "@/lib/types";

/** Pick a submission, read/continue its comment thread. Shared student/supervisor. */
export function FeedbackPanel({ projectId }: { projectId: string }) {
  const subs = useAsyncData<SubmissionDoc[]>(async () => {
    const page = await getSubmissionsPage(projectId, { pageSize: 50 });
    return page.items;
  }, [projectId]);

  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (!selected && subs.data && subs.data.length > 0) {
      setSelected(subs.data[0].id);
    }
  }, [subs.data, selected]);

  return (
    <QueryState
      phase={subs.phase}
      error={subs.error}
      onRetry={subs.retry}
      skeleton={
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      }
      empty={
        <EmptyState
          icon={MessagesSquare}
          title="No submissions to discuss"
          description="Feedback threads open up once a submission is uploaded."
        />
      }
    >
      <div className="space-y-4">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue placeholder="Choose a submission" />
          </SelectTrigger>
          <SelectContent>
            {(subs.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title} · v{s.version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && (
          <div className="rounded-lg border p-4">
            <CommentThread
              key={selected}
              projectId={projectId}
              submissionId={selected}
            />
          </div>
        )}
      </div>
    </QueryState>
  );
}
