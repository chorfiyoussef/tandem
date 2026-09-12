"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { UserAvatar, displayName } from "@/components/common/user-avatar";
import type { ProfileLite } from "@/lib/types";
import { cn } from "@/lib/utils";

export type MentionItem = ProfileLite;

export type MentionListRef = { onKeyDown: (props: SuggestionKeyDownProps) => boolean };

export const MentionList = forwardRef<MentionListRef, SuggestionProps<MentionItem>>(function MentionList({ items, command }, ref) {
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [items]);

  const select = (i: number) => {
    const item = items[i];
    if (item) command({ id: item.id, label: displayName(item) });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setIndex((i) => (i + items.length - 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "ArrowDown") {
        setIndex((i) => (i + 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        select(index);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return <div className="rounded-lg bg-popover px-3 py-2 text-[12px] text-ink-3 shadow-float">No one matches</div>;
  }

  return (
    <div className="flex w-56 flex-col rounded-lg bg-popover p-1 shadow-float">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onMouseEnter={() => setIndex(i)}
          onClick={() => select(i)}
          className={cn("flex h-8 items-center gap-2 rounded-md px-2 text-left text-[13px]", i === index && "bg-muted")}
        >
          <UserAvatar user={item} size="md" />
          <span className="truncate">{displayName(item)}</span>
        </button>
      ))}
    </div>
  );
});
