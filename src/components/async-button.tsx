"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AsyncButtonProps extends React.ComponentProps<typeof Button> {
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => Promise<unknown> | unknown;
  loadingText?: string;
}

export default function AsyncButton({ onClick, disabled, children, loadingText, ...rest }: AsyncButtonProps) {
  const [running, setRunning] = useState(false);

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (running) return;
    try {
      setRunning(true);
      await onClick(e);
    } finally {
      setRunning(false);
    }
  }, [running, onClick]);

  return (
    <Button {...rest} disabled={running || disabled} onClick={handleClick} aria-busy={running} className={rest.className}>
      <div className="inline-flex items-center gap-2 leading-none">
        {running && <Loader2 className="h-4 w-4 animate-spin align-middle" />}
        <span className="leading-none">{running && loadingText ? loadingText : children}</span>
      </div>
    </Button>
  );
}


