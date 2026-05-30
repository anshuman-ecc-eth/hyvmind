/**
 * Zustand store for Telegram bridge state.
 * Telegram messages are stored in-memory only — they are NOT persisted to the
 * Motoko backend. The store resets on page reload.
 */

import { create } from "zustand";
import type { TelegramChannel } from "../services/telegramService";

// ─── Local ChatMessage shape ───────────────────────────────────────────────────
// Mirrors the backend ChatMessage structure but defined locally to avoid
// circular dependency with backend.d.ts.

export interface TelegramChatMessage {
  /** Format: tg-{messageId} */
  id: string;
  /** null for Telegram users (no IC Principal) */
  sender: null;
  senderName: string;
  /** Nanosecond Unix timestamp as bigint */
  timestamp: bigint;
  text: string;
}

// ─── State & Actions interfaces ───────────────────────────────────────────────

interface TelegramState {
  isEnabled: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  channels: TelegramChannel[];
  /** Keyed by channel id, e.g. "tg-123" or "tg-main" */
  messages: Map<string, TelegramChatMessage[]>;
  lastOffset: number;
  botUserId: number | null;
}

interface TelegramActions {
  setEnabled: (enabled: boolean) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setChannels: (channels: TelegramChannel[]) => void;
  addChannel: (channel: TelegramChannel) => void;
  setMessages: (channelId: string, messages: TelegramChatMessage[]) => void;
  addMessage: (channelId: string, message: TelegramChatMessage) => void;
  setLastOffset: (offset: number) => void;
  setBotUserId: (userId: number | null) => void;
  reset: () => void;
}

// ─── Initial state ─────────────────────────────────────────────────────────────

const initialState: TelegramState = {
  isEnabled: false,
  isConnected: false,
  isLoading: false,
  error: null,
  channels: [],
  messages: new Map(),
  lastOffset: 0,
  botUserId: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTelegramStore = create<TelegramState & TelegramActions>(
  (set) => ({
    ...initialState,

    setEnabled: (enabled) => set({ isEnabled: enabled }),
    setConnected: (connected) => set({ isConnected: connected }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setChannels: (channels) => set({ channels }),

    addChannel: (channel) =>
      set((state) => ({
        channels: state.channels.some((c) => c.id === channel.id)
          ? state.channels
          : [...state.channels, channel],
      })),

    setMessages: (channelId, messages) =>
      set((state) => {
        const newMap = new Map(state.messages);
        newMap.set(channelId, messages);
        return { messages: newMap };
      }),

    addMessage: (channelId, message) =>
      set((state) => {
        const existing = state.messages.get(channelId) ?? [];
        // Deduplicate by message id to avoid double-rendering on re-poll
        if (existing.some((m) => m.id === message.id)) return {};
        const newMap = new Map(state.messages);
        newMap.set(channelId, [...existing, message]);
        return { messages: newMap };
      }),

    setLastOffset: (lastOffset) => set({ lastOffset }),
    setBotUserId: (botUserId) => set({ botUserId }),

    reset: () =>
      set({
        ...initialState,
        // Create a fresh Map so the reference changes and subscribers re-render
        messages: new Map(),
      }),
  }),
);
