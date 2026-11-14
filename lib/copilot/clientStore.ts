"use client";

import { useSyncExternalStore } from "react";
import type { AppContext, Source } from "./types";

/* ── Dashboard context: what the user is looking at, registered by the views from real app data ── */

const ctx = new Map<string, AppContext>();
let ctxSnapshot: AppContext[] = [];
const ctxListeners = new Set<() => void>();

/** Register (or with null remove) the app data for one part of the dashboard. Only real values belong here. */
export function setCopilotContext(key: string, value: AppContext | null) {
  if (value) ctx.set(key, value);
  else ctx.delete(key);
  ctxSnapshot = [...ctx.values()];
  ctxListeners.forEach((l) => l());
}

export function useCopilotContext(): AppContext[] {
  return useSyncExternalStore(
    (l) => {
      ctxListeners.add(l);
      return () => {
        ctxListeners.delete(l);
      };
    },
    () => ctxSnapshot,
    () => [],
  );
}

/* ── Conversations, kept in this browser ── */

export type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  cited?: number[];
  grounded?: boolean;
  mode?: "demo" | "llm";
  docs?: number;
  error?: string;
  streaming?: boolean;
  feedback?: "up" | "down";
  /** Labels of the dashboard data sent with this question. */
  usedContext?: string[];
};
export type Thread = { id: string; title: string; updatedAt: number; messages: Msg[] };
type ChatState = { threads: Thread[]; activeId: string | null };

const KEY = "boxco.copilot.v1";
const MAX_THREADS = 30;
const listeners = new Set<() => void>();
let state: ChatState | null = null;

function read(): ChatState {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as ChatState | null;
    if (v && Array.isArray(v.threads)) return { threads: v.threads.slice(0, MAX_THREADS), activeId: v.activeId ?? null };
  } catch {
    // Unreadable storage: start clean.
  }
  return { threads: [], activeId: null };
}

function set(next: ChatState) {
  state = next;
  try {
    // Do not keep half-streamed messages.
    const clean = { ...next, threads: next.threads.map((t) => ({ ...t, messages: t.messages.map((m) => ({ ...m, streaming: false })) })) };
    window.localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    // Storage full or blocked: the chat still works for this visit.
  }
  listeners.forEach((l) => l());
}

const current = (): ChatState => (state ??= read());

export function useChat(): ChatState | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => (state ??= read()),
    () => null,
  );
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const chats = {
  newThread(): string {
    const s = current();
    const t: Thread = { id: uid(), title: "New conversation", updatedAt: Date.now(), messages: [] };
    set({ threads: [t, ...s.threads].slice(0, MAX_THREADS), activeId: t.id });
    return t.id;
  },
  open(id: string) {
    set({ ...current(), activeId: id });
  },
  remove(id: string) {
    const s = current();
    const threads = s.threads.filter((t) => t.id !== id);
    set({ threads, activeId: s.activeId === id ? (threads[0]?.id ?? null) : s.activeId });
  },
  push(threadId: string, m: Omit<Msg, "id">): string {
    const s = current();
    const msg: Msg = { ...m, id: uid() };
    set({
      ...s,
      threads: s.threads.map((t) =>
        t.id === threadId
          ? { ...t, updatedAt: Date.now(), title: t.messages.length === 0 && m.role === "user" ? m.content.slice(0, 60) : t.title, messages: [...t.messages, msg] }
          : t,
      ),
    });
    return msg.id;
  },
  patch(threadId: string, msgId: string, patch: Partial<Msg>) {
    const s = current();
    set({ ...s, threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: t.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) } : t)) });
  },
};
