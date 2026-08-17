"use client";

import { CoachThread } from "@/components/CoachThread";
import { starterPrompts } from "@/lib/copy";
import { useAds } from "@/context/AdProvider";

export default function CoachPage() {
  const { ask } = useAds();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display text-4xl tracking-tight">Talk to Coach</h1>
      <p className="mt-2 text-ink-soft">
        Describe what you want in plain English. I’ll answer with the math — cost per result,
        whether the sample is big enough, and what I’d move.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {starterPrompts.slice(0, 4).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => void ask(p)}
            className="rounded-full border border-line bg-card px-3 py-1.5 text-left text-xs text-ink-soft hover:text-ink"
          >
            {p}
          </button>
        ))}
      </div>
      <div className="mt-8 pb-8">
        <CoachThread />
      </div>
    </div>
  );
}
