"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="This project failed to load"
      description="We hit an error rendering this page. Retrying usually fixes it."
      onRetry={reset}
    />
  );
}
