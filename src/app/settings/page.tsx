import { Suspense } from "react";
import { SettingsView } from "@/components/SettingsView";

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading settings…</p>}>
      <SettingsView />
    </Suspense>
  );
}
