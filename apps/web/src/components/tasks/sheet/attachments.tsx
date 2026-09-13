"use client";

import { useRef, useState } from "react";
import { FileIcon, ImageIcon, PaperclipIcon, XIcon, DownloadIcon } from "@/components/icons";
import { toast } from "sonner";
import { MAX_ATTACHMENT_BYTES } from "@tandem/shared";
import { attachmentUrl, useAttachments, useDeleteAttachment, useUploadAttachment } from "@/lib/queries/task-details";
import { useWorkspace } from "@/components/workspace-provider";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Attachment, TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatBytes(n?: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function Attachments({ task }: { task: TaskRow }) {
  const { workspace, userId, canEdit } = useWorkspace();
  const { data: items } = useAttachments(task.id);
  const upload = useUploadAttachment(task.id);
  const remove = useDeleteAttachment(task.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const list = items ?? [];

  async function handleFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`${file.name} is larger than 25 MB.`);
        continue;
      }
      try {
        await upload.mutateAsync({ file, workspaceId: workspace.id, userId });
      } catch {
        toast.error(`Couldn't upload ${file.name}.`);
      }
    }
  }

  async function open(a: Attachment) {
    const url = await attachmentUrl(a.storage_path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Couldn't open the file.");
  }

  if (list.length === 0 && !canEdit) return null;

  return (
    <section
      className={cn("flex flex-col rounded-lg transition-colors", dragOver && "bg-action-soft/40")}
      onDragOver={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      {list.length > 0 ? (
        <>
          <h3 className="pb-1 text-[13px] font-medium text-ink-2">Attachments</h3>
          <div className="flex flex-wrap gap-2">
            {list.map((a) => (
              <div key={a.id} className="group/att flex h-9 max-w-full items-center gap-2 rounded-lg bg-muted/60 pl-2.5 pr-1.5 text-[13px]">
                {a.mime_type?.startsWith("image/") ? <ImageIcon className="size-3.5 shrink-0 text-ink-3" /> : <FileIcon className="size-3.5 shrink-0 text-ink-3" />}
                <button type="button" onClick={() => open(a)} className="max-w-48 truncate text-left hover:underline">
                  {a.file_name}
                </button>
                <span className="text-ink-3">{formatBytes(a.size_bytes)}</span>
                <button type="button" onClick={() => open(a)} aria-label="Download" className="rounded p-1 text-ink-3 hover:text-ink">
                  <DownloadIcon className="size-3.5" />
                </button>
                {canEdit ? (
                  <button type="button" onClick={() => remove.mutate(a)} aria-label="Remove attachment" className="rounded p-1 text-ink-3 hover:text-destructive">
                    <XIcon className="size-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
      {canEdit ? (
        <div className={cn("flex items-center gap-2", list.length > 0 && "mt-2")}>
          <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          <Button variant="ghost" size="sm" className="-ml-2 text-ink-2" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Spinner className="size-3.5" /> : <PaperclipIcon />}
            {upload.isPending ? "Uploading…" : list.length ? "Add file" : "Attach a file"}
          </Button>
          <span className="text-[12px] text-ink-3">or drop files here</span>
        </div>
      ) : null}
    </section>
  );
}
