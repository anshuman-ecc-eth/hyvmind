import type { QueryClient } from "@tanstack/react-query";
import type { NodeId, backendInterface } from "../backend";

export interface CommandResult {
  success: boolean;
  message: string;
}

// localStorage key for archived node IDs
const ARCHIVED_NODES_KEY = "hyvmind_archived_nodes";

// Archive utilities
export function getArchivedNodeIds(): Set<string> {
  try {
    const stored = localStorage.getItem(ARCHIVED_NODES_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return new Set<string>(parsed);
    return new Set();
  } catch {
    return new Set();
  }
}

export function archiveNodeById(nodeId: string): void {
  const archived = getArchivedNodeIds();
  archived.add(nodeId);
  localStorage.setItem(
    ARCHIVED_NODES_KEY,
    JSON.stringify(Array.from(archived)),
  );
}

export function unarchiveNodeById(nodeId: string): void {
  const archived = getArchivedNodeIds();
  archived.delete(nodeId);
  localStorage.setItem(
    ARCHIVED_NODES_KEY,
    JSON.stringify(Array.from(archived)),
  );
}

export function isNodeArchived(nodeId: string): boolean {
  return getArchivedNodeIds().has(nodeId);
}

export async function executeCommand(
  command: string,
  _fields: Record<string, string | string[]>,
): Promise<CommandResult> {
  switch (command) {
    default:
      return {
        success: false,
        message: `Error: Unknown command /${command}. Type /help for available commands.`,
      };
  }
}

/**
 * Archive a node by calling the backend archiveNode() method.
 * On success, also updates localStorage for UI badge state and invalidates React Query cache.
 */
export async function executeArchiveCommand(
  nodeId: NodeId,
  displayName: string,
  displayType: string,
  actor: backendInterface,
  queryClient: QueryClient,
): Promise<CommandResult> {
  try {
    await actor.archiveNode(nodeId);

    // Keep localStorage in sync for UI badge state (secondary, non-authoritative)
    archiveNodeById(nodeId);

    // Invalidate graph data queries so GraphView and TreeView refresh immediately
    queryClient.invalidateQueries({ queryKey: ["graphData"] });

    return {
      success: true,
      message: `${displayType} "${displayName}" archived successfully. It will no longer appear in the graph or list views.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Error: Failed to archive ${displayType} "${displayName}": ${message}`,
    };
  }
}
