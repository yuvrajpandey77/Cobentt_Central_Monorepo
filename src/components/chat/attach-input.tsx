"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Paperclip, X, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface AttachmentMeta {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  extractedText: string | null;
}

export interface AttachmentPill {
  id: string;
  name: string;
  size: number;
}

interface AttachInputProps {
  /** When present, files upload immediately. When absent, files are queued
   *  locally and uploaded via `uploadPending()` once a conversation exists. */
  conversationId?: string;
  onAttach: (attachment: AttachmentMeta) => void;
  onRemove: (id: string) => void;
  attachments: AttachmentMeta[];
  disabled?: boolean;
  /** Notify the parent about locally-queued (not yet uploaded) files so it can
   *  render pills even before a conversation exists. */
  onPendingChange?: (pills: AttachmentPill[]) => void;
}

export interface AttachInputHandle {
  /** Upload all locally-queued files to the given conversation and return
   *  their metadata. Resolves to [] when there are no pending files. */
  uploadPending: (conversationId: string) => Promise<AttachmentMeta[]>;
  hasPending: () => boolean;
  /** Queue files directly (e.g. carried over from another page). */
  queueFiles: (files: File[]) => void;
  /** All files currently queued locally, in order. */
  getPendingFiles: () => File[];
  /** Remove a single locally-queued file by its pending pill id. */
  removePending: (id: string) => void;
}

const MAX_FILE_BYTES = 20 * 1024 * 1024;

interface PendingFile {
  id: string;
  name: string;
  size: number;
  file: File;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadFile(
  file: File,
  conversationId: string
): Promise<AttachmentMeta> {
  const form = new FormData();
  form.append("file", file);
  form.append("conversationId", conversationId);
  const res = await fetch("/api/attachments/upload", { method: "POST", body: form });
  const data = (await res.json().catch(() => null)) as {
    attachment?: AttachmentMeta;
    error?: string;
  } | null;
  if (!res.ok || !data?.attachment) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.attachment;
}

/** Read-only tiny chip strip used to echo attachments on sent messages. */
export function AttachmentPills({
  pills,
  onRemove,
  className,
  readOnly,
}: {
  pills: AttachmentPill[];
  onRemove?: (id: string) => void;
  className?: string;
  readOnly?: boolean;
}) {
  if (pills.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {pills.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-2 rounded-lg bg-white/[0.06] border border-white/10 px-2 py-1.5"
        >
          <FileText className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
          <span className="text-xs text-white/70 truncate max-w-[140px]">{p.name}</span>
          <span className="text-[10px] text-white/30 flex-shrink-0">{formatBytes(p.size)}</span>
          {!readOnly && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(p.id)}
              className="w-5 h-5 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              title="Remove attachment"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export const AttachInput = forwardRef<AttachInputHandle, AttachInputProps>(
  function AttachInput(
    { conversationId, onAttach, disabled, onPendingChange },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [pending, setPending] = useState<PendingFile[]>([]);
    const pendingRef = useRef<PendingFile[]>([]);
    pendingRef.current = pending;

    const toPills = (files: PendingFile[]): AttachmentPill[] =>
      files.map((p) => ({ id: p.id, name: p.name, size: p.size }));

    const notifyPending = (next: PendingFile[]) => {
      onPendingChange?.(toPills(next));
    };

    // Keep the ref and state in lock-step so hasPending()/getPendingFiles() are
    // accurate synchronously (callers such as the composer read the ref while
    // sending, before React has re-rendered this component).
    const commitPending = (next: PendingFile[]) => {
      pendingRef.current = next;
      setPending(next);
      notifyPending(next);
    };

    const uploadPending = async (targetId: string): Promise<AttachmentMeta[]> => {
      const files = pendingRef.current;
      if (files.length === 0) return [];
      setUploading(true);
      const results: AttachmentMeta[] = [];
      try {
        for (const p of files) {
          try {
            const meta = await uploadFile(p.file, targetId);
            onAttach(meta);
            results.push(meta);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : `Failed to upload ${p.name}`);
          }
        }
        commitPending([]);
        return results;
      } finally {
        setUploading(false);
      }
    };

    const removePending = (id: string) => {
      commitPending(pendingRef.current.filter((p) => p.id !== id));
    };

    useImperativeHandle(ref, () => ({
      uploadPending,
      hasPending: () => pendingRef.current.length > 0,
      queueFiles: (files: File[]) => {
        const valid = files.filter(
          (f) => f && f.size > 0 && f.size <= MAX_FILE_BYTES
        );
        if (valid.length !== files.length) {
          toast.error("One or more files are too large (max 20MB)");
        }
        const next: PendingFile[] = [
          ...pendingRef.current,
          ...valid.map((file) => ({
            id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            size: file.size,
            file,
          })),
        ];
        commitPending(next);
      },
      getPendingFiles: () => pendingRef.current.map((p) => p.file),
      removePending,
    }));

    const pick = () => inputRef.current?.click();

    const handleFiles = async (files: FileList | null) => {
      if (!files || files.length === 0 || disabled) return;
      const file = files[0];
      if (file.size > MAX_FILE_BYTES) {
        toast.error("File too large (max 20MB)");
        return;
      }

      if (conversationId) {
        setUploading(true);
        try {
          const meta = await uploadFile(file, conversationId);
          onAttach(meta);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Upload failed");
        } finally {
          setUploading(false);
        }
      } else {
        const next: PendingFile[] = [
          ...pendingRef.current,
          { id: `pending-${Date.now()}`, name: file.name, size: file.size, file },
        ];
        commitPending(next);
      }
      if (inputRef.current) inputRef.current.value = "";
    };

    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.pptx,.xlsx,.xls,.txt,.md,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={pick}
          disabled={disabled || uploading}
          className="w-9 h-9 flex items-center justify-center rounded-full text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          title="Attach file"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </button>
      </>
    );
  }
);
