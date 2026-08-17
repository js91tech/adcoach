"use client";

import { useEffect, useRef } from "react";
import { useAds } from "@/context/AdProvider";

export function CoachThread({ compact = false }: { compact?: boolean }) {
  const { state, ask, confirmPending, dismissPending, busy } = useAds();
  const endRef = useRef<HTMLDivElement>(null);
  const messages = compact ? state.messages.slice(-6) : state.messages;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages.length, busy]);

  return (
    <div className="flex flex-col gap-4">
      {messages.map((m) => (
        <article
          key={m.id}
          className={
            m.role === "user"
              ? "ml-8 rounded-2xl rounded-br-sm bg-forest px-4 py-3 text-sm text-card"
              : "mr-8 rounded-2xl rounded-bl-sm bg-paper-deep/80 px-4 py-3 text-sm leading-6 text-ink"
          }
        >
          <p className="whitespace-pre-wrap">{m.text}</p>
          {m.applied ? (
            <p className="mt-2 text-xs text-good">Done — your ads were updated.</p>
          ) : null}
          {m.needsConfirm && m.pendingActions?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void confirmPending(m.id)}
                className="rounded-lg bg-forest px-3 py-1.5 text-xs font-medium text-card"
              >
                Yes, do it
              </button>
              <button
                type="button"
                onClick={() => dismissPending(m.id)}
                className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs"
              >
                No, leave it
              </button>
              {m.confirmReason ? (
                <p className="basis-full text-xs text-ink-soft">{m.confirmReason}</p>
              ) : null}
            </div>
          ) : null}
          {m.role === "coach" && m.suggestions?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {m.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  className="rounded-full border border-line bg-card px-3 py-1 text-xs text-ink-soft hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </article>
      ))}
      {busy ? (
        <p className="text-sm text-ink-soft">Coach is reading that the way a buyer would…</p>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
