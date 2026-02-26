import type { TerminalMessage } from '../pages/TerminalPage';

const TERMINAL_SESSION_KEY = 'hyvmind_terminal_session';
const SESSION_VERSION = 3; // Incremented to invalidate old ontology outputs with new TTL/Mermaid logic

interface StoredSession {
  version: number;
  messages: Array<{
    type: string;
    text: string;
    timestamp: number;
    ontologyData?: {
      turtle: string;
      mermaid: string | null;
      mermaidError?: string;
    };
  }>;
}

export function saveTerminalSession(messages: TerminalMessage[]): void {
  try {
    const session: StoredSession = {
      version: SESSION_VERSION,
      messages: messages.map(msg => ({
        type: msg.type,
        text: msg.text,
        timestamp: msg.timestamp,
        ontologyData: msg.ontologyData,
      })),
    };
    localStorage.setItem(TERMINAL_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save terminal session:', error);
  }
}

export function loadTerminalSession(): TerminalMessage[] | null {
  try {
    const stored = localStorage.getItem(TERMINAL_SESSION_KEY);
    if (!stored) return null;

    const session: StoredSession = JSON.parse(stored);
    
    // Check version compatibility
    if (session.version !== SESSION_VERSION) {
      // Clear old session if version mismatch
      clearTerminalSession();
      return null;
    }

    return session.messages.map(msg => ({
      type: msg.type as TerminalMessage['type'],
      text: msg.text,
      timestamp: msg.timestamp,
      ontologyData: msg.ontologyData,
    }));
  } catch (error) {
    console.error('Failed to load terminal session:', error);
    return null;
  }
}

export function clearTerminalSession(): void {
  try {
    localStorage.removeItem(TERMINAL_SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear terminal session:', error);
  }
}
