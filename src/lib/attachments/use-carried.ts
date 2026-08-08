"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { takePendingFiles } from "./shuttle";
import { uploadAttachment } from "./upload";
import type { AttachmentMeta } from "./upload";

/**
 * Carries files over from the home page into a mode workspace. On mount it
 * grabs any pending files from the shuttle, uploads them to the mode
 * conversation, binds them to the initial message (pill echo + context), and
 * returns their ids so the canvas can feed them into the first auto-generation.
 *
 * - `undefined` while the carry is still resolving (canvases wait on this).
 * - `string[] | null` once resolved (null means no files were carried).
 */
export function useCarriedAttachments(conversationId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ranRef = useRef(false);
  const [carriedIds, setCarriedIds] = useState<string[] | null | undefined>(undefined);

  const attachToInitial = useMutation(
    trpc.conversations.attachInitialAttachments.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.conversations.getById.queryOptions({ id: conversationId })
        );
      },
    })
  );

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const files = takePendingFiles();
    if (files.length === 0) {
      setCarriedIds(null);
      return;
    }

    (async () => {
      try {
        const metas: AttachmentMeta[] = [];
        for (const file of files) {
          metas.push(await uploadAttachment(file, conversationId));
        }
        const ids = metas.map((meta) => meta.id);
        await attachToInitial.mutateAsync({ conversationId, attachmentIds: ids });
        setCarriedIds(ids);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to attach your files");
        setCarriedIds(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return { carriedIds };
}