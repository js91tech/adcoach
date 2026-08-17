import type { CoachMath, QuantRow } from "@/lib/types";
import type { Verdict } from "@/lib/coach/quant";
import { verdictLabel } from "@/lib/coach/quant";

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  const styles: Record<Verdict, string> = {
    scale: "bg-good/15 text-good",
    hold: "bg-ink/8 text-ink-soft",
    fix: "bg-warn/15 text-warn",
    pause: "bg-bad/15 text-bad",
    too_soon: "bg-gold/30 text-ink",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[verdict]}`}>
      {verdictLabel(verdict)}
    </span>
  );
}

export function DualShare({
  budgetShare,
  resultShare,
}: {
  budgetShare: number;
  resultShare: number;
}) {
  return (
    <div className="space-y-1.5">
      <Bar label="Share of budget" value={budgetShare} color="bg-gold" />
      <Bar label="Share of results" value={resultShare} color="bg-forest" />
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="flex justify-between text-[11px] text-ink-soft">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-paper-deep">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EfficiencyBar({ value }: { value: number }) {
  const tone = value >= 70 ? "bg-good" : value >= 40 ? "bg-gold" : "bg-bad";
  return (
    <div>
      <div className="flex justify-between text-[11px] text-ink-soft">
        <span>Efficiency</span>
        <span>{value}/100</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-paper-deep">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const toneClass: Record<NonNullable<QuantRow["tone"]>, string> = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  neutral: "text-ink",
};

export function MathCard({ math }: { math: CoachMath }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-line/80 bg-card">
      <div className="border-b border-line px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-clay">{math.title}</p>
        <p className="mt-1 text-xs leading-5 text-ink-soft">{math.summary}</p>
      </div>
      <ul className="divide-y divide-line">
        {math.rows.map((row) => (
          <li key={row.label} className="flex items-start justify-between gap-3 px-3 py-2">
            <div>
              <p className="text-xs text-ink-soft">{row.label}</p>
              {row.hint ? <p className="text-[11px] text-ink-soft/80">{row.hint}</p> : null}
            </div>
            <p className={`text-sm font-medium ${toneClass[row.tone ?? "neutral"]}`}>{row.value}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
