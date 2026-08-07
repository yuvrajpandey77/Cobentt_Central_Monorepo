/**
 * Cross-page file shuttle.
 *
 * The root page lets users queue attachments before a conversation exists.
 * Since File objects can't be serialized into URLs, we stash them in a
 * module-level store and pick them up when /chat mounts.
 */
export const attachmentShuttle: { files: File[] } = { files: [] };

export function stashPendingFiles(files: File[]): void {
  attachmentShuttle.files = files;
}

export function takePendingFiles(): File[] {
  const files = attachmentShuttle.files;
  attachmentShuttle.files = [];
  return files;
}
