"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@tandem/shared";
import type { ProfileLite } from "@/lib/types";

const PALETTE = ["lavender", "mint", "sky", "peach", "blush", "aqua", "butter", "rose"] as const;

function hueFor(id: string): (typeof PALETTE)[number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Small monograms show one letter; only the large profile avatar shows two. */
const SIZES = {
  xs: { box: "size-3.5", text: "text-[7px]", letters: 1 },
  sm: { box: "size-4", text: "text-[8px]", letters: 1 },
  md: { box: "size-5", text: "text-[9px]", letters: 1 },
  lg: { box: "size-6", text: "text-[10px]", letters: 1 },
  xl: { box: "size-14", text: "text-lg", letters: 2 },
} as const;

export type AvatarSize = keyof typeof SIZES;

export function UserAvatar({ user, className, size = "sm" }: { user: ProfileLite | null | undefined; className?: string; size?: AvatarSize }) {
  const s = SIZES[size];
  const tone = user ? hueFor(user.id) : "gray";
  const letters = initials(user?.full_name, user?.email);
  return (
    <Avatar className={cn(s.box, "shrink-0", className)}>
      {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.full_name ?? ""} /> : null}
      <AvatarFallback className={cn("font-semibold leading-none", s.text, `pastel-${tone}`)}>
        {s.letters === 1 ? letters.charAt(0) : letters}
      </AvatarFallback>
    </Avatar>
  );
}

export function displayName(user: ProfileLite | null | undefined): string {
  if (!user) return "Someone";
  return user.full_name?.trim() || user.email?.split("@")[0] || "Someone";
}
