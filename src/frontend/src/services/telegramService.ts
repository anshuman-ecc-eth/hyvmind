/**
 * Telegram Bot API client.
 * Handles communication with the Telegram Bot API directly from the frontend.
 */

const TG_API_BASE = "https://api.telegram.org";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TelegramChannel {
  /** Format: tg-{threadId} */
  id: string;
  name: string;
  threadId: number;
}

export interface TelegramMessage {
  messageId: number;
  text: string;
  fromUsername: string | undefined;
  fromId: number;
  /** Unix timestamp in seconds */
  date: number;
  messageThreadId: number | undefined;
}

// ─── Internal Telegram API shapes ─────────────────────────────────────────────

interface TgFrom {
  id: number;
  username?: string;
}

interface TgMessage {
  message_id: number;
  from?: TgFrom;
  text?: string;
  date: number;
  message_thread_id?: number;
}

interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

interface TgGetMeResult {
  id: number;
  username: string;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

/**
 * Calls getMe to retrieve the bot's own user ID and username.
 * The userId is stored in telegramStore for reference but messages from the
 * bot are NOT filtered — they appear in the app like any other message.
 */
export async function getMe(
  botToken: string,
): Promise<{ userId: number; username: string }> {
  const res = await fetch(`${TG_API_BASE}/bot${botToken}/getMe`);
  if (!res.ok) {
    throw new Error(`Telegram getMe failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { ok: boolean; result: TgGetMeResult };
  if (!data.ok) {
    throw new Error("Telegram getMe returned ok=false");
  }
  return { userId: data.result.id, username: data.result.username };
}

/**
 * Fetches new updates (messages) from Telegram using long-polling offset.
 * Returns ALL messages — including bot's own responses to commands — so that
 * the in-app chat reflects the full Telegram conversation.
 */
export async function getUpdates(
  botToken: string,
  offset: number,
  limit = 100,
): Promise<{ messages: TelegramMessage[]; nextOffset: number }> {
  try {
    const url = `${TG_API_BASE}/bot${botToken}/getUpdates?offset=${offset}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Telegram] getUpdates HTTP ${res.status}`);
      return { messages: [], nextOffset: offset };
    }
    const data = (await res.json()) as { ok: boolean; result: TgUpdate[] };
    if (!data.ok || !data.result.length) {
      return { messages: [], nextOffset: offset };
    }

    const messages: TelegramMessage[] = [];
    let nextOffset = offset;

    for (const update of data.result) {
      // Advance offset regardless of whether this update has a message
      nextOffset = update.update_id + 1;

      const msg = update.message;
      // Skip non-message updates or messages without text
      if (!msg || !msg.text) continue;

      messages.push({
        messageId: msg.message_id,
        text: msg.text,
        fromUsername: msg.from?.username,
        fromId: msg.from?.id ?? 0,
        date: msg.date,
        messageThreadId: msg.message_thread_id,
      });
    }

    return { messages, nextOffset };
  } catch (err) {
    console.error("[Telegram] getUpdates error:", err);
    return { messages: [], nextOffset: offset };
  }
}

/**
 * Sends a message (or bot command) to a Telegram chat.
 * When the text is a bot command (e.g. /help), Telegram processes it and the
 * bot's response will appear on the next poll cycle.
 */
export async function sendMessage(
  botToken: string,
  chatId: string,
  text: string,
  threadId?: number,
): Promise<number> {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (threadId) {
    body.message_thread_id = threadId;
  }

  const res = await fetch(`${TG_API_BASE}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(
      `Telegram sendMessage failed: ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as {
    ok: boolean;
    result: { message_id: number };
  };
  if (!data.ok) {
    throw new Error("Telegram sendMessage returned ok=false");
  }

  return data.result.message_id;
}
