"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

/**
 * Shared shell for property pickers: a popover with a searchable list.
 * Clicks are stopped from bubbling so pickers can live inside clickable rows.
 */
export function PickerShell({
  trigger,
  open,
  onOpenChange,
  placeholder,
  emptyText = "No matches.",
  children,
  className,
  align = "start",
  search = true,
  footer,
}: {
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  /** Pass null to render nothing when there are no matches. */
  emptyText?: string | null;
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  search?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn("w-60 p-0 shadow-float", className)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Command loop>
          {search ? <CommandInput placeholder={placeholder} autoFocus /> : null}
          <CommandList className="max-h-72">
            {emptyText !== null ? <CommandEmpty>{emptyText}</CommandEmpty> : null}
            <CommandGroup>{children}</CommandGroup>
          </CommandList>
          {footer}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { CommandItem as PickerItem };

/** A quiet button that looks like a value in a property row. */
export function PickerTrigger({
  className,
  placeholder,
  children,
  ...props
}: React.ComponentProps<"button"> & { placeholder?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-md px-1.5 text-left text-[13px] transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 aria-expanded:bg-muted",
        placeholder ? "text-ink-3" : "text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
