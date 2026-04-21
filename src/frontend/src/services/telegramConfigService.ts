/**
 * Fetches Telegram configuration from the backend canister.
 * The backend handles XOR decryption — callers receive plaintext credentials.
 *
 * All functions accept the backend actor as a parameter because this service
 * is used outside of React component lifecycle (e.g. in hooks with useQuery).
 */

import type { backendInterface } from "../backend";

// ─── Config fetch ─────────────────────────────────────────────────────────────

/**
 * Returns plaintext bot token and chat ID if configured, or null if not set.
 * The backend decrypts XOR-encrypted credentials before returning them.
 */
export async function fetchTelegramConfig(
  actor: backendInterface,
): Promise<{ botToken: string; chatId: string } | null> {
  const result = await actor.getTelegramConfig();
  if (!result) return null;
  // Guard against malformed responses where fields may be empty/undefined
  if (!result.botToken || !result.chatId) return null;
  return { botToken: result.botToken, chatId: result.chatId };
}

/**
 * Returns true if a Telegram config (bot token + chat ID) has been stored
 * in the backend by an admin. Used to determine whether the bridge toggle
 * should be enabled for non-admin users.
 */
export async function hasTelegramConfig(
  actor: backendInterface,
): Promise<boolean> {
  return actor.hasTelegramConfig();
}

/**
 * Returns status metadata about the stored Telegram config.
 * Fields are masked — credentials themselves are not exposed here.
 */
export async function fetchTelegramConfigStatus(
  actor: backendInterface,
): Promise<{
  hasToken: boolean;
  hasChatId: boolean;
  updatedAt: bigint | null;
  updatedBy: string | null;
}> {
  const result = await actor.getTelegramConfigStatus();
  return {
    hasToken: Boolean(result.hasToken),
    hasChatId: Boolean(result.hasChatId),
    updatedAt: result.updatedAt ?? null,
    updatedBy: result.updatedBy ?? null,
  };
}
