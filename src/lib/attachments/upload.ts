export interface AttachmentMeta {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  extractedText: string | null;
}

export async function uploadAttachment(
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