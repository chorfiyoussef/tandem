"use client";

import { useRef, useState } from "react";
import { Trash2Icon } from "@/components/icons";
import { toast } from "sonner";
import type { Editor } from "@tiptap/react";
import { RichContent, RichEditor, extractMentionIds, isEmptyDoc, type JSONContent } from "@/components/editor/rich-editor";
import { UserAvatar, displayName } from "@/components/common/user-avatar";
import { useWorkspace } from "@/components/workspace-provider";
import { useMembers } from "@/lib/queries/workspace";
import { useAddComment, useComments, useDeleteComment } from "@/lib/queries/task-details";
import { formatRelative, formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TaskRow } from "@/lib/types";

export function CommentList({ task }: { task: TaskRow }) {
  const { userId, isAdmin } = useWorkspace();
  const { data: comments, isPending } = useComments(task.id);
  const deleteComment = useDeleteComment(task.id);

  if (isPending) return <p className="py-4 text-[13px] text-ink-3">Loading…</p>;
  if (!comments || comments.length === 0) return <p className="py-4 text-[14px] text-ink-3">No comments yet. Start the conversation below.</p>;

  return (
    <ol className="flex flex-col gap-4">
      {comments.map((c) => (
        <li key={c.id} className="group/comment flex gap-2.5">
          <UserAvatar user={c.profiles} size="lg" className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[14px] font-medium">{displayName(c.profiles)}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <time dateTime={c.created_at} className="text-[12px] text-ink-3">
                    {formatRelative(c.created_at)}
                  </time>
                </TooltipTrigger>
                <TooltipContent>{formatDateTime(c.created_at)}</TooltipContent>
              </Tooltip>
              {c.author_id === userId || isAdmin ? (
                <button
                  type="button"
                  aria-label="Delete comment"
                  onClick={() => deleteComment.mutate(c.id)}
                  className="ml-auto text-ink-3 opacity-0 hover:text-destructive group-hover/comment:opacity-100"
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              ) : null}
            </div>
            <RichContent doc={c.body as JSONContent} className="mt-0.5" />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CommentComposer({ task }: { task: TaskRow }) {
  const { workspace, userId, profile } = useWorkspace();
  const { data: members } = useMembers(workspace.id);
  const addComment = useAddComment(task.id);
  const [doc, setDoc] = useState<JSONContent | null>(null);
  const [text, setText] = useState("");
  const [key, setKey] = useState(0);
  const editorRef = useRef<Editor | null>(null);
  const empty = isEmptyDoc(doc);

  async function submit(d = doc, t = text) {
    if (!d || isEmptyDoc(d)) return;
    const mentions = extractMentionIds(d);
    try {
      await addComment.mutateAsync({ workspaceId: workspace.id, authorId: userId, body: { ...d, mentions } as never, bodyText: t.trim() });
      setDoc(null);
      setText("");
      setKey((k) => k + 1);
    } catch {
      toast.error("Couldn't post the comment.");
    }
  }

  return (
    <div className="flex gap-2.5 px-5 py-4 hairline-t">
      <UserAvatar user={profile} size="lg" className="mt-1" />
      <div className="min-w-0 flex-1 rounded-xl bg-muted/50 px-3 py-2 focus-within:bg-muted/70">
        <RichEditor
          key={key}
          value={null}
          members={(members ?? []).map((m) => m.profiles)}
          placeholder="Write a comment… use @ to mention someone"
          onChange={(d, t) => {
            setDoc(d);
            setText(t);
          }}
          onSubmit={(d, t) => submit(d, t)}
          editorRef={editorRef}
        />
        <div className="mt-1.5 flex items-center justify-end gap-2">
          <span className="text-[12px] text-ink-3">
            <Kbd>⌘</Kbd> <Kbd>↵</Kbd> to send
          </span>
          <Button size="sm" onClick={() => submit()} disabled={empty || addComment.isPending}>
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
