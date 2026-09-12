"use client";

import { SPACE_ICONS, SPACE_ICON_FALLBACK, type IconProps } from "@/components/icons";

/** Older rows may still carry icon names from the first release. */
const LEGACY: Record<string, string> = { sparkles: "squares-four" };

export function SpaceIcon({ name, ...props }: { name?: string | null } & Omit<IconProps, "name">) {
  const key = name ? (LEGACY[name] ?? name) : "";
  const Icon = SPACE_ICONS[key] ?? SPACE_ICON_FALLBACK;
  return <Icon {...props} />;
}

export const SPACE_ICON_NAMES = Object.keys(SPACE_ICONS);
