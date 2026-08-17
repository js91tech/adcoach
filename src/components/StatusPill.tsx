import type { CampaignStatus } from "@/lib/types";

export function StatusPill({ status }: { status: CampaignStatus | "demo" | "connected" }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Running", className: "bg-good/15 text-good" },
    paused: { label: "Paused", className: "bg-ink/8 text-ink-soft" },
    draft: { label: "Draft", className: "bg-gold/25 text-ink" },
    demo: { label: "Demo account", className: "bg-gold/30 text-ink" },
    connected: { label: "Facebook connected", className: "bg-good/15 text-good" },
  };
  const item = map[status] ?? map.paused;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${item.className}`}>
      {item.label}
    </span>
  );
}
