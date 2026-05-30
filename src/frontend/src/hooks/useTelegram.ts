/**
 * useTelegram — React hook that manages the Telegram bridge lifecycle.
 *
 * Responsibilities:
 * - Fetches Telegram config from backend (cached via React Query)
 * - Starts/stops polling Telegram Bot API every 5 seconds when enabled
 * - Transforms incoming Telegram messages into the app's ChatMessage shape
 * - Discovers forum topic channels dynamically from observed thread IDs
 * - Does NOT filter bot messages — bot command responses appear in the app
 */

import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { createActor } from "../backend";
import type { backendInterface } from "../backend";
import { fetchTelegramConfig } from "../services/telegramConfigService";
import * as telegramService from "../services/telegramService";
import type { TelegramMessage } from "../services/telegramService";
import { useTelegramStore } from "../store/telegramStore";
import type { TelegramChatMessage } from "../store/telegramStore";

// ─── Actor helper (mirrors pattern from useQueries.ts) ─────────────────────────

function useBackendActorLocal(): {
  actor: backendInterface | null;
  isFetching: boolean;
} {
  const result = useActor(createActor as Parameters<typeof useActor>[0]);
  return {
    actor: result.actor as backendInterface | null,
    isFetching: result.isFetching,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTelegram() {
  // ── Individual stable selectors (avoids re-rendering on unrelated state changes) ──
  const isEnabled = useTelegramStore((s) => s.isEnabled);
  const isConnected = useTelegramStore((s) => s.isConnected);
  const isLoading = useTelegramStore((s) => s.isLoading);
  const error = useTelegramStore((s) => s.error);
  const channels = useTelegramStore((s) => s.channels);
  const messages = useTelegramStore((s) => s.messages);

  // ── Stable action refs — actions from Zustand are stable by default, but we
  //    capture them in a ref so polling callbacks can call them without being in
  //    any dependency array (prevents circular deps in useCallback/useEffect). ──
  const setEnabled = useTelegramStore((s) => s.setEnabled);
  const setConnected = useTelegramStore((s) => s.setConnected);
  const setLoading = useTelegramStore((s) => s.setLoading);
  const setError = useTelegramStore((s) => s.setError);
  const addChannel = useTelegramStore((s) => s.addChannel);
  const addMessage = useTelegramStore((s) => s.addMessage);
  const setLastOffset = useTelegramStore((s) => s.setLastOffset);
  const setBotUserId = useTelegramStore((s) => s.setBotUserId);

  // Pack mutable store actions into a ref so polling callbacks always have
  // the latest versions without needing to be in dependency arrays.
  const storeActionsRef = useRef({
    setConnected,
    setLoading,
    setError,
    addChannel,
    addMessage,
    setLastOffset,
    setBotUserId,
  });
  useEffect(() => {
    storeActionsRef.current = {
      setConnected,
      setLoading,
      setError,
      addChannel,
      addMessage,
      setLastOffset,
      setBotUserId,
    };
  });

  // Ref for lastOffset — lets polling read the current value without being
  // a dependency of pollTelegram (which would recreate the fn each offset change).
  const lastOffsetRef = useRef(0);
  const lastOffset = useTelegramStore((s) => s.lastOffset);
  useEffect(() => {
    lastOffsetRef.current = lastOffset;
  }, [lastOffset]);

  // Ref for channels — same pattern for dynamic channel discovery guard.
  const channelsRef = useRef(channels);
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  const { actor, isFetching } = useBackendActorLocal();

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  /** Keep latest config available inside interval callbacks without re-creating them */
  const configRef = useRef<{ botToken: string; chatId: string } | null>(null);

  // ── Config query (cached 5 minutes) ─────────────────────────────────────────
  const { data: config } = useQuery({
    queryKey: ["telegramConfig"],
    queryFn: () => (actor ? fetchTelegramConfig(actor) : Promise.resolve(null)),
    enabled: !!actor && !isFetching,
    staleTime: 5 * 60 * 1000,
  });

  // Keep ref in sync so polling callbacks always have the latest value
  useEffect(() => {
    configRef.current = config ?? null;
  }, [config]);

  // ── Message transformer ─────────────────────────────────────────────────────
  const transformMessage = useCallback(
    (msg: TelegramMessage): TelegramChatMessage => ({
      id: `tg-${msg.messageId}`,
      sender: null,
      senderName: msg.fromUsername ? `@${msg.fromUsername}` : "Telegram Bot",
      // Convert Unix seconds → nanoseconds bigint (matches backend ChatMessage timestamp)
      timestamp: BigInt(msg.date) * BigInt(1_000_000_000),
      text: msg.text,
    }),
    [],
  );

  // ── Poll for new updates — stable: no store state in deps, reads via refs ───
  const pollTelegram = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg) return;

    try {
      const { messages: newMessages, nextOffset } =
        await telegramService.getUpdates(
          cfg.botToken,
          lastOffsetRef.current,
          100,
        );

      if (newMessages.length > 0) {
        storeActionsRef.current.setLastOffset(nextOffset);

        for (const msg of newMessages) {
          // Determine which channel this message belongs to
          const channelId = msg.messageThreadId
            ? `tg-${msg.messageThreadId}`
            : "tg-main";
          const threadId = msg.messageThreadId ?? 0;

          // Dynamically discover channels from observed thread IDs
          if (msg.messageThreadId) {
            storeActionsRef.current.addChannel({
              id: channelId,
              name: `Topic ${msg.messageThreadId}`,
              threadId,
            });
          } else if (!channelsRef.current.some((c) => c.id === "tg-main")) {
            storeActionsRef.current.addChannel({
              id: "tg-main",
              name: "Main Chat",
              threadId: 0,
            });
          }

          // Add message — bot messages are NOT filtered (enables unified chat)
          storeActionsRef.current.addMessage(channelId, transformMessage(msg));
        }

        storeActionsRef.current.setConnected(true);
      }
    } catch (err) {
      console.error("[Telegram] Poll error:", err);
      storeActionsRef.current.setError(String(err));
    }
  }, [transformMessage]); // stable: transformMessage is memoized with [] deps

  // ── Start polling — stable: depends only on pollTelegram (stable) ───────────
  const startPolling = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg) return;

    storeActionsRef.current.setLoading(true);
    storeActionsRef.current.setError(null);

    try {
      const { userId } = await telegramService.getMe(cfg.botToken);
      // Store bot user ID for reference (not used for filtering)
      storeActionsRef.current.setBotUserId(userId);
      storeActionsRef.current.setConnected(true);
    } catch {
      storeActionsRef.current.setError(
        "Failed to connect to Telegram. Check your bot token.",
      );
      storeActionsRef.current.setLoading(false);
      return;
    }

    storeActionsRef.current.setLoading(false);

    // Immediate first poll, then interval
    await pollTelegram();
    pollingIntervalRef.current = setInterval(pollTelegram, 5000);
  }, [pollTelegram]); // stable: pollTelegram has stable identity

  // ── Stop polling — stable: no store state in deps ───────────────────────────
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    storeActionsRef.current.setConnected(false);
  }, []); // stable: only uses refs and pollingIntervalRef

  // ── Toggle bridge on/off ─────────────────────────────────────────────────────
  const toggleEnabled = useCallback(() => {
    setEnabled(!isEnabled);
  }, [setEnabled, isEnabled]);

  // ── Effect: react to isEnabled + config changes ───────────────────────────────
  // Depends ONLY on stable values: isEnabled (primitive), config (query result),
  // startPolling (stable useCallback), stopPolling (stable useCallback).
  useEffect(() => {
    if (isEnabled && config) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isEnabled, config, startPolling, stopPolling]);

  // canEnable: true only when backend has a Telegram config
  const canEnable = config !== null && config !== undefined;

  return {
    isEnabled,
    toggleEnabled,
    isConnected,
    isLoading,
    error,
    channels,
    messagesByChannel: messages,
    canEnable,
    /** Exposed so SwarmsView can call telegramService.sendMessage with the real credentials */
    config: config ?? null,
  };
}
