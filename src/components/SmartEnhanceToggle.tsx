"use client";

import { useMemo, useState } from "react";
import { enhanceCopy, enhanceCreative, restoreCreative } from "@/lib/creative/enhance";
import type { AdCreative, Objective } from "@/lib/types";

export function SmartEnhanceToggle({
  ad,
  business,
  objective,
  onChange,
}: {
  ad: AdCreative;
  business?: string;
  objective?: Objective;
  onChange: (ad: AdCreative) => void;
}) {
  const [notes, setNotes] = useState<string[]>([]);
  const preview = useMemo(
    () =>
      enhanceCopy({
        headline: ad.rawHeadline ?? ad.headline,
        primaryText: ad.rawPrimaryText ?? ad.primaryText,
        cta: ad.cta,
        business,
        objective,
      }),
    [ad.cta, ad.headline, ad.primaryText, ad.rawHeadline, ad.rawPrimaryText, business, objective],
  );

  const on = Boolean(ad.enhanceOn);

  return (
    <div className="rounded-xl border border-line bg-paper px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Smart text enhancer</p>
          <p className="text-xs text-ink-soft">
            Keeps your meaning. Rewrites for a phone screen: specific, short, a clear ask.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => {
            if (on) {
              onChange(restoreCreative(ad));
              setNotes([]);
            } else {
              const next = enhanceCreative(ad, { business, objective });
              onChange(next);
              setNotes(preview.notes);
            }
          }}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-forest" : "bg-paper-deep"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-card shadow transition ${
              on ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      {on && notes.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-ink-soft">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
