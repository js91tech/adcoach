"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdProvider, useAds } from "@/context/AdProvider";
import { CoachDock } from "./CoachDock";

const nav = [
  { href: "/", label: "Today" },
  { href: "/campaigns", label: "Your ads" },
  { href: "/coach", label: "Coach" },
  { href: "/settings", label: "Settings" },
];

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { connection } = useAds();

  return (
    <div className="min-h-full bg-paper text-ink">
      <div className="mx-auto flex min-h-full max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line px-5 py-8 md:flex">
          <Link href="/" className="display text-2xl leading-none tracking-tight">
            AdCoach
          </Link>
          <p className="mt-2 text-sm text-ink-soft">Facebook ads, in plain English.</p>
          <nav className="mt-10 flex flex-1 flex-col gap-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    active ? "bg-forest text-card" : "text-ink-soft hover:bg-paper-deep hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="rounded-xl border border-line bg-card p-3 text-xs text-ink-soft">
            <p className="font-medium text-ink">
              {connection.status === "connected" ? "Live Facebook account" : "Practice account"}
            </p>
            <p className="mt-1">
              {connection.status === "connected"
                ? connection.adAccountName ?? connection.userName
                : "Connect in Settings when you're ready."}
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-line px-4 py-4 md:hidden">
            <Link href="/" className="display text-xl">
              AdCoach
            </Link>
            <nav className="flex gap-3 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={pathname === item.href ? "text-forest" : "text-ink-soft"}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="flex-1 px-4 pb-36 pt-8 sm:px-8">{children}</main>
          <CoachDock />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AdProvider>
      <ShellInner>{children}</ShellInner>
    </AdProvider>
  );
}
