import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WorkspaceNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas px-4 text-center">
      <p className="text-[15px] font-medium text-ink">This page doesn’t exist, or you don’t have access.</p>
      <p className="text-[13px] text-ink-2">Check the link, or ask an admin to add you to the workspace.</p>
      <Button asChild variant="outline" className="mt-2">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
