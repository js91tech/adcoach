"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAds } from "@/context/AdProvider";
import { CoachThread } from "./CoachThread";

export function CoachDock() {
  const pathname = usePathname();
  const { ask, busy } = useAds();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCoachPage = pathname === "/coach";

  useEffect(() => {
    if (onCoachPage) setOpen(false);
  }, [onCoachPage]);

  async function submit(text?: string) {
    const next = (text ?? value).trim();
    if (!next) return;
    setValue("");
    if (!onCoachPage) setOpen(true);
    await ask(next);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 md:left-56">
      <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-8">
        {open && !onCoachPage ? (
          <div className="mb-3 max-h-[46vh] overflow-hidden rounded-2xl border border-line bg-card shadow-[0_20px_50px_rgba(31,26,22,0.12)]">
            <div className="flex items-center justify-between border-b border-line px-4 py-2">
              <p className="text-sm font-medium">Coach</p>
              <button
                type="button"
                className="text-xs text-ink-soft hover:text-ink"
                onClick={() => setOpen(false)}
              >
                Hide
              </button>
            </div>
            <div className="max-h-[38vh] overflow-y-auto px-4 py-3">
              <CoachThread compact />
            </div>
          </div>
        ) : null}

        <form
          className="flex items-center gap-2 rounded-2xl border border-line bg-card p-2 shadow-[0_12px_40px_rgba(31,26,22,0.08)]"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Tell Coach what you want — “pause the holiday ads,” “$20 a day to people nearby”…"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-ink-soft/70"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="rounded-xl bg-forest px-4 py-2 text-sm font-medium text-card disabled:opacity-40"
          >
            {busy ? "Thinking…" : "Do it"}
          </button>
        </form>
      </div>
    </div>
  );
}
