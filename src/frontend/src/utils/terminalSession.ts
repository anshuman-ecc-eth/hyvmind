import type { TerminalMessage } from "../pages/TerminalPage";

const SESSION_VERSION = 5; // Incremented to invalidate old sessions with removed welcome message

function getKey(principal?: string): string {
  const base = "hyvmind_terminal_session";
  if (!principal) return base; // fallback for anonymous
  return `${base}_${principal}`;
}

interface StoredSession {
  version: number;
  messages: Array<{
    type: string;
    text: string;
    timestamp: number;
    ontologyData?: {
      turtleText: string;
      mermaidText: string | null;
      mermaidError?: string;
    };
  }>;
}

export function saveTerminalSession(
  messages: TerminalMessage[],
  principal?: string,
): void {
  try {
    const session: StoredSession = {
      version: SESSION_VERSION,
      messages: messages.map((msg) => ({
        type: msg.type,
        text: msg.text,
        timestamp: msg.timestamp,
        ontologyData: msg.ontologyData,
      })),
    };
    localStorage.setItem(getKey(principal), JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save terminal session:", error);
  }
}

export function loadTerminalSession(
  principal?: string,
): TerminalMessage[] | null {
  try {
    const stored = localStorage.getItem(getKey(principal));
    if (!stored) return null;

    const session: StoredSession = JSON.parse(stored);

    // Check version compatibility
    if (session.version !== SESSION_VERSION) {
      clearTerminalSession(principal);
      return null;
    }

    return session.messages.map((msg) => ({
      type: msg.type as TerminalMessage["type"],
      text: msg.text,
      timestamp: msg.timestamp,
      ontologyData: msg.ontologyData,
    }));
  } catch (error) {
    console.error("Failed to load terminal session:", error);
    return null;
  }
}

export function clearTerminalSession(principal?: string): void {
  try {
    localStorage.removeItem(getKey(principal));
  } catch (error) {
    console.error("Failed to clear terminal session:", error);
  }
}
