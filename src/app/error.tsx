"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Previously this rendered an empty <div>,
 * so any production crash showed a blank page with only a console error.
 * Now it shows a recoverable message with a retry action.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route-error]", error.message, error.digest ? `(digest: ${error.digest})` : "");
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        The page hit an unexpected error. Your data is safe — try again.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
