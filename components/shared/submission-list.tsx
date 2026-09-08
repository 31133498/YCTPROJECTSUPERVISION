"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getSubmissionsPage } from "@/lib/firestore";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { QueryState } from "./query-state";
import { EmptyState } from "./empty-state";
import { ListSkeleton } from "./skeletons";
import { StatusBadge } from "./status-badge";
import { UploadSubmissionDialog } from "./upload-submission-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { getSubmissionDownloadUrl } from "@/lib/storage/submissions";
import { formatDate, formatFileSize } from "@/lib/format";
import type { SubmissionDoc, SubmissionStatus } from "@/lib/types";

export function SubmissionList({
  projectId,
  canUpload = false,
  canReview = false,
}: {
  projectId: string;
  canUpload?: boolean;
  canReview?: boolean;
}) {
  const [nonce, setNonce] = useState(0);
  const query = usePaginatedQuery(
    (params) => getSubmissionsPage(projectId, params),
    [projectId, nonce]
  );
  const refresh = () => setNonce((n) => n + 1);

  return (
    <div className="space-y-3">
      {canUpload && (
        <div className="flex justify-end">
          <UploadSubmissionDialog projectId={projectId} onCreated={refresh} />
        </div>
      )}
      <QueryState
        phase={query.phase}
        error={query.error}
        onRetry={query.retry}
        skeleton={<ListSkeleton rows={4} />}
        empty={
          <EmptyState
            icon={FileText}
            title="Nothing submitted yet"
            description={
              canUpload
                ? "Upload a proposal or chapter draft to start the review cycle."
                : "The student hasn't uploaded anything for review."
            }
          />
        }
      >
        <ul className="divide-y rounded-lg border">
          {query.items.map((s) => (
            <SubmissionRow
              key={s.id}
              projectId={projectId}
              submission={s}
              canReview={canReview}
              onChanged={refresh}
            />
          ))}
        </ul>
        {query.hasMore && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={query.loadMore}
              disabled={query.loadingMore}
            >
              {query.loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </QueryState>
    </div>
  );
}

function SubmissionRow({
  projectId,
  submission: s,
  canReview,
  onChanged,
}: {
  projectId: string;
  submission: SubmissionDoc;
  canReview: boolean;
  onChanged: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const url = await getSubmissionDownloadUrl({
        projectId,
        storagePath: s.storagePath,
      });
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error("Couldn't open file", { description: (err as Error).message });
    } finally {
      setDownloading(false);
    }
  }

  async function setStatus(status: SubmissionStatus) {
    setSaving(true);
    try {
      await api.setSubmissionStatus(projectId, s.id, status);
      toast.success("Review updated");
      onChanged();
    } catch (err) {
      toast.error("Couldn't update", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {s.title}{" "}
          <span className="font-normal text-muted-foreground">v{s.version}</span>
        </p>
        <p className="truncate text-2xs text-muted-foreground">
          {s.fileName} · {formatFileSize(s.fileSize)} · {formatDate(s.createdAt)}
        </p>
      </div>
      <StatusBadge status={s.status} />
      <Button
        variant="ghost"
        size="icon"
        onClick={download}
        disabled={downloading}
        aria-label="Download"
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
      {canReview && (
        <Select
          value={s.status}
          onValueChange={(v) => setStatus(v as SubmissionStatus)}
          disabled={saving}
        >
          <SelectTrigger className="h-8 w-[168px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending_review">Pending review</SelectItem>
            <SelectItem value="changes_requested">Changes requested</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
      )}
    </li>
  );
}
