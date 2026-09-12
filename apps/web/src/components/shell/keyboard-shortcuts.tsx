"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUi } from "@/stores/ui";
import { useWorkspace } from "@/components/workspace-provider";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable || !!el.closest("[contenteditable=true]");
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const { href } = useWorkspace();
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const openNewTask = useUi((s) => s.openNewTask);
  const chord = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (meta && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      if (meta || e.altKey || isTyping(e.target)) return;
      if (document.querySelector("[role=dialog][data-state=open], [data-slot=sheet-content][data-state=open]")) return;

      const now = Date.now();
      if (chord.current && now - chord.current.at < 800 && chord.current.key === "g") {
        chord.current = null;
        if (e.key === "h") router.push(href());
        else if (e.key === "i") router.push(href("/inbox"));
        else if (e.key === "s") router.push(href("/settings"));
        return;
      }
      if (e.key === "g") {
        chord.current = { key: "g", at: now };
        return;
      }
      if (e.key === "c") {
        e.preventDefault();
        openNewTask();
      } else if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, href, setPaletteOpen, toggleSidebar, openNewTask]);

  return null;
}
