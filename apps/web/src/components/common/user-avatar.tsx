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

export function UserAvatar({
  user,
  className,
  size = "sm",
}: {
  user: ProfileLite | null | undefined;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const sizes = { xs: "size-4 text-[8px]", sm: "size-5 text-[9px]", md: "size-6 text-[10px]", lg: "size-8 text-xs", xl: "size-14 text-lg" };
  const tone = user ? hueFor(user.id) : "gray";
  return (
    <Avatar className={cn(sizes[size], "shrink-0", className)}>
      {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.full_name ?? ""} /> : null}
      <AvatarFallback className={cn("font-medium", `pastel-${tone}`)}>
        {initials(user?.full_name, user?.email)}
      </AvatarFallback>
    </Avatar>
  );
}

export function displayName(user: ProfileLite | null | undefined): string {
  if (!user) return "Someone";
  return user.full_name?.trim() || user.email?.split("@")[0] || "Someone";
}
