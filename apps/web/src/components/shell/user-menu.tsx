"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronsUpDownIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon, UserIcon } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar, displayName } from "@/components/common/user-avatar";
import { useWorkspace } from "@/components/workspace-provider";
import { createClient } from "@/lib/supabase/client";

export function UserMenu() {
  const { profile, href } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 text-left transition-colors hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <UserAvatar user={profile} size="md" />
          <span className="min-w-0 flex-1 truncate">{displayName(profile)}</span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 text-ink-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-ink-2">{profile.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={href("/settings/profile")}>
            <UserIcon />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[12px] text-ink-3">Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <SunIcon /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
