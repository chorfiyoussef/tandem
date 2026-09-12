"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** A quiet single-line input for naming things in place. Enter saves, Esc cancels, blur saves. */
export function InlineNameInput({
  defaultValue = "",
  placeholder,
  className,
  onSubmit,
  onCancel,
}: {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    const v = value.trim();
    if (save && v) onSubmit(v);
    else onCancel();
  };

  return (
    <input
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      }}
      className={cn(
        "h-7 w-[calc(100%-0.5rem)] rounded-md border border-ring bg-surface px-2 text-[13px] text-ink outline-none ring-3 ring-ring/30",
        className,
      )}
    />
  );
}
