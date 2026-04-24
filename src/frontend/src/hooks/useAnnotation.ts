import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnnotationAction,
  AnnotationPath,
  AnnotationSession,
  TokenAnnotation,
} from "../types/annotation";

const STORAGE_KEY = "annotation-drafts";
const MAX_UNDO = 50;
const AUTO_SAVE_INTERVAL_MS = 30_000;

// ── helpers ──────────────────────────────────────────────────────────────────

function loadDrafts(): AnnotationSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnnotationSession[]) : [];
  } catch {
    return [];
  }
}

function saveDrafts(sessions: AnnotationSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // quota exceeded — silently fail
  }
}

function upsertDraft(session: AnnotationSession): void {
  const all = loadDrafts();
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    all[idx] = session;
  } else {
    all.push(session);
  }
  saveDrafts(all);
}

function makeId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyAction(
  session: AnnotationSession,
  action: AnnotationAction,
): AnnotationSession {
  const updated = { ...session, annotations: [...session.annotations] };
  switch (action.type) {
    case "CREATE_TOKEN":
      updated.annotations.push(action.token);
      break;
    case "DELETE_TOKEN":
      updated.annotations = updated.annotations.filter(
        (a) => a.id !== action.token.id,
      );
      break;
    case "UPDATE_TOKEN":
      updated.annotations = updated.annotations.map((a) =>
        a.id === action.tokenId ? { ...a, ...action.updates } : a,
      );
      break;
    case "ADD_LINK": {
      updated.annotations = updated.annotations.map((a) =>
        a.id === action.interpId
          ? {
              ...a,
              linkedLawTokenIds: a.linkedLawTokenIds.includes(action.lawId)
                ? a.linkedLawTokenIds
                : [...a.linkedLawTokenIds, action.lawId],
            }
          : a,
      );
      break;
    }
    case "REMOVE_LINK":
      updated.annotations = updated.annotations.map((a) =>
        a.id === action.interpId
          ? {
              ...a,
              linkedLawTokenIds: a.linkedLawTokenIds.filter(
                (id) => id !== action.lawId,
              ),
            }
          : a,
      );
      break;
  }
  updated.updatedAt = Date.now();
  return updated;
}

function invertAction(
  action: AnnotationAction,
  session: AnnotationSession,
): AnnotationAction {
  switch (action.type) {
    case "CREATE_TOKEN":
      return { type: "DELETE_TOKEN", token: action.token };
    case "DELETE_TOKEN":
      return { type: "CREATE_TOKEN", token: action.token };
    case "UPDATE_TOKEN": {
      const current = session.annotations.find((a) => a.id === action.tokenId);
      return {
        type: "UPDATE_TOKEN",
        tokenId: action.tokenId,
        updates: action.previous,
        previous: current ? { ...action.updates } : {},
      };
    }
    case "ADD_LINK":
      return {
        type: "REMOVE_LINK",
        interpId: action.interpId,
        lawId: action.lawId,
      };
    case "REMOVE_LINK":
      return {
        type: "ADD_LINK",
        interpId: action.interpId,
        lawId: action.lawId,
      };
  }
}

// ── hook ─────────────────────────────────────────────────────────────────────

export function useAnnotation(sessionId?: string) {
  const [session, setSession] = useState<AnnotationSession | null>(null);
  const sessionRef = useRef<AnnotationSession | null>(null);

  // Keep ref in sync so interval closure always sees current session
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Load session on mount
  useEffect(() => {
    const drafts = loadDrafts();
    if (sessionId) {
      const found = drafts.find((s) => s.id === sessionId);
      setSession(found ?? null);
    } else if (drafts.length > 0) {
      // Load the most recently updated draft
      const latest = drafts.reduce((a, b) =>
        a.updatedAt > b.updatedAt ? a : b,
      );
      setSession(latest);
    }
  }, [sessionId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const id = setInterval(() => {
      if (sessionRef.current) {
        upsertDraft(sessionRef.current);
      }
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // ── mutation helpers ───────────────────────────────────────────────────────

  const dispatch = useCallback((action: AnnotationAction) => {
    setSession((prev) => {
      if (!prev) return prev;
      const inverse = invertAction(action, prev);
      const newUndoStack = [...prev.undoStack, inverse].slice(-MAX_UNDO);
      const updated = applyAction(prev, action);
      return { ...updated, undoStack: newUndoStack, redoStack: [] };
    });
  }, []);

  const createToken = useCallback(
    (annotation: Omit<TokenAnnotation, "id">) => {
      const token: TokenAnnotation = { ...annotation, id: makeId() };
      dispatch({ type: "CREATE_TOKEN", token });
    },
    [dispatch],
  );

  const deleteToken = useCallback((id: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const token = prev.annotations.find((a) => a.id === id);
      if (!token) return prev;
      const inverse = invertAction({ type: "DELETE_TOKEN", token }, prev);
      const newUndoStack = [...prev.undoStack, inverse].slice(-MAX_UNDO);
      const updated = applyAction(prev, { type: "DELETE_TOKEN", token });
      return { ...updated, undoStack: newUndoStack, redoStack: [] };
    });
  }, []);

  const updateToken = useCallback(
    (id: string, updates: Partial<TokenAnnotation>) => {
      setSession((prev) => {
        if (!prev) return prev;
        const current = prev.annotations.find((a) => a.id === id);
        if (!current) return prev;
        const action: AnnotationAction = {
          type: "UPDATE_TOKEN",
          tokenId: id,
          updates,
          previous: Object.fromEntries(
            Object.keys(updates).map((k) => [
              k,
              current[k as keyof TokenAnnotation],
            ]),
          ) as Partial<TokenAnnotation>,
        };
        const newUndoStack = [
          ...prev.undoStack,
          invertAction(action, prev),
        ].slice(-MAX_UNDO);
        const updated = applyAction(prev, action);
        return { ...updated, undoStack: newUndoStack, redoStack: [] };
      });
    },
    [],
  );

  const addLink = useCallback(
    (interpId: string, lawId: string) => {
      dispatch({ type: "ADD_LINK", interpId, lawId });
    },
    [dispatch],
  );

  const removeLink = useCallback(
    (interpId: string, lawId: string) => {
      dispatch({ type: "REMOVE_LINK", interpId, lawId });
    },
    [dispatch],
  );

  const undo = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.undoStack.length === 0) return prev;
      const stack = [...prev.undoStack];
      const action = stack.pop()!;
      const forward = invertAction(action, prev);
      const newRedoStack = [...prev.redoStack, forward].slice(-MAX_UNDO);
      const updated = applyAction(prev, action);
      return { ...updated, undoStack: stack, redoStack: newRedoStack };
    });
  }, []);

  const redo = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.redoStack.length === 0) return prev;
      const stack = [...prev.redoStack];
      const action = stack.pop()!;
      const inverse = invertAction(action, prev);
      const newUndoStack = [...prev.undoStack, inverse].slice(-MAX_UNDO);
      const updated = applyAction(prev, action);
      return { ...updated, undoStack: newUndoStack, redoStack: stack };
    });
  }, []);

  const saveDraft = useCallback(() => {
    if (sessionRef.current) {
      upsertDraft(sessionRef.current);
    }
  }, []);

  const initSession = useCallback(
    (
      url: string,
      title: string,
      rawText: string,
      tokens: string[],
      path: AnnotationPath,
    ) => {
      const newSession: AnnotationSession = {
        id: makeId(),
        url,
        title,
        rawText,
        tokens,
        path,
        annotations: [],
        undoStack: [],
        redoStack: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSession(newSession);
      upsertDraft(newSession);
    },
    [],
  );

  return {
    session,
    setSession,
    createToken,
    deleteToken,
    updateToken,
    addLink,
    removeLink,
    undo,
    redo,
    canUndo: (session?.undoStack.length ?? 0) > 0,
    canRedo: (session?.redoStack.length ?? 0) > 0,
    saveDraft,
    initSession,
  };
}

// ── standalone draft utilities (for SourcesView draft list) ──────────────────

export function getAllDrafts(): Pick<
  AnnotationSession,
  "id" | "title" | "url" | "updatedAt"
>[] {
  return loadDrafts().map(({ id, title, url, updatedAt }) => ({
    id,
    title,
    url,
    updatedAt,
  }));
}

export function deleteDraft(id: string): void {
  const all = loadDrafts().filter((s) => s.id !== id);
  saveDrafts(all);
}
