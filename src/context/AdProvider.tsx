"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { applyActions } from "@/lib/coach/apply";
import { uid } from "@/lib/format";
import { seedState } from "@/lib/seed";
import type {
  AppState,
  ChatMessage,
  CoachAction,
  CoachResult,
  ConnectionState,
} from "@/lib/types";

const STORAGE_KEY = "adcoach-state-v2";

type AdContextValue = {
  state: AppState;
  connection: ConnectionState;
  busy: boolean;
  ask: (text: string) => Promise<void>;
  confirmPending: (messageId: string) => Promise<void>;
  dismissPending: (messageId: string) => void;
  applyLocal: (actions: CoachAction[]) => void;
  resetDemo: () => void;
  refreshConnection: () => Promise<void>;
  importFromMeta: () => Promise<string | null>;
};

const AdContext = createContext<AdContextValue | null>(null);

function loadState(): AppState {
  if (typeof window === "undefined") return seedState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState;
    return JSON.parse(raw) as AppState;
  } catch {
    return seedState;
  }
}

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(seedState);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({
    status: "demo",
    configured: false,
  });

  const refreshConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/meta/status");
      const json = (await res.json()) as ConnectionState;
      setConnection(json);
    } catch {
      setConnection({ status: "demo", configured: false });
    }
  }, []);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
    void refreshConnection();
  }, [refreshConnection]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const syncMeta = useCallback(
    async (actions: CoachAction[], campaigns: AppState["campaigns"]) => {
      if (connection.status !== "connected" || actions.length === 0) return;
      try {
        const res = await fetch("/api/meta/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actions, campaigns }),
        });
        const json = (await res.json()) as { notes?: string[]; error?: string };
        const note = json.error ?? json.notes?.filter(Boolean).join(" ");
        if (note) {
          setState((prev) => ({
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: uid("msg"),
                role: "coach",
                text: `Facebook: ${note}`,
                createdAt: new Date().toISOString(),
              },
            ],
          }));
        }
      } catch {
        setState((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: uid("msg"),
              role: "coach",
              text: "Saved here, but I couldn't reach Facebook. Check Settings.",
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      }
    },
    [connection.status],
  );

  const ask = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      const userMsg: ChatMessage = {
        id: uid("msg"),
        role: "user",
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({ ...prev, messages: [...prev.messages, userMsg] }));
      setBusy(true);
      try {
        const snapshot = state;
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            context: {
              campaigns: snapshot.campaigns,
              account: snapshot.account,
              connection,
            },
          }),
        });
        const result = (await res.json()) as CoachResult;
        const coachMsg: ChatMessage = {
          id: uid("msg"),
          role: "coach",
          text: result.reply,
          createdAt: new Date().toISOString(),
          needsConfirm: result.needsConfirm && result.actions.length > 0,
          confirmReason: result.confirmReason,
          pendingActions: result.actions,
          applied: false,
          suggestions: result.suggestions,
          math: result.math,
        };

        let campaignsForMeta = snapshot.campaigns;
        setState((prev) => {
          let next: AppState = { ...prev, messages: [...prev.messages, coachMsg] };
          if (!result.needsConfirm && result.actions.length) {
            next = applyActions(next, result.actions);
            next = {
              ...next,
              messages: next.messages.map((m) =>
                m.id === coachMsg.id ? { ...m, applied: true, pendingActions: undefined } : m,
              ),
            };
            campaignsForMeta = next.campaigns;
          }
          return next;
        });

        if (!result.needsConfirm && result.actions.length) {
          await syncMeta(result.actions, campaignsForMeta);
        }
      } catch {
        setState((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: uid("msg"),
              role: "coach",
              text: "I couldn't reach the coach service. Try again in a moment.",
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      } finally {
        setBusy(false);
      }
    },
    [busy, connection, state, syncMeta],
  );

  const confirmPending = useCallback(
    async (messageId: string) => {
      const msg = state.messages.find((m) => m.id === messageId);
      if (!msg?.pendingActions?.length) return;
      const actions = msg.pendingActions;
      let campaignsForMeta = state.campaigns;
      setState((prev) => {
        let next = applyActions(prev, actions);
        next = {
          ...next,
          messages: next.messages.map((m) =>
            m.id === messageId
              ? { ...m, applied: true, needsConfirm: false, pendingActions: undefined }
              : m,
          ),
        };
        campaignsForMeta = next.campaigns;
        return next;
      });
      await syncMeta(actions, campaignsForMeta);
    },
    [state.campaigns, state.messages, syncMeta],
  );

  const dismissPending = useCallback((messageId: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              needsConfirm: false,
              pendingActions: undefined,
              text: `${m.text}\n\nOkay — I left everything as it was.`,
            }
          : m,
      ),
    }));
  }, []);

  const applyLocal = useCallback((actions: CoachAction[]) => {
    setState((prev) => applyActions(prev, actions));
  }, []);

  const resetDemo = useCallback(() => {
    setState(seedState);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const importFromMeta = useCallback(async () => {
    try {
      const res = await fetch("/api/meta/campaigns");
      const json = (await res.json()) as { campaigns?: AppState["campaigns"]; error?: string };
      if (json.error) return json.error;
      if (json.campaigns) {
        setState((prev) => applyActions(prev, [{ type: "import_campaigns", campaigns: json.campaigns! }]));
      }
      return null;
    } catch {
      return "Could not load campaigns from Facebook.";
    }
  }, []);

  const value = useMemo(
    () => ({
      state,
      connection,
      busy,
      ask,
      confirmPending,
      dismissPending,
      applyLocal,
      resetDemo,
      refreshConnection,
      importFromMeta,
    }),
    [
      applyLocal,
      ask,
      busy,
      confirmPending,
      connection,
      dismissPending,
      importFromMeta,
      refreshConnection,
      resetDemo,
      state,
    ],
  );

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

export function useAds() {
  const ctx = useContext(AdContext);
  if (!ctx) throw new Error("useAds must be used inside AdProvider");
  return ctx;
}
