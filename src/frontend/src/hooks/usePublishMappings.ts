import type { PublishedNodeInfo } from "../types/sourceGraph";

const MAPPINGS_KEY_PREFIX = "caffeine_published_mappings_";

export function usePublishMappings() {
  function getMappings(graphId: string): PublishedNodeInfo[] {
    const raw = localStorage.getItem(MAPPINGS_KEY_PREFIX + graphId);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as PublishedNodeInfo[];
    } catch {
      return [];
    }
  }

  function saveMappings(graphId: string, mappings: PublishedNodeInfo[]): void {
    localStorage.setItem(
      MAPPINGS_KEY_PREFIX + graphId,
      JSON.stringify(mappings),
    );
  }

  function clearMappings(graphId: string): void {
    localStorage.removeItem(MAPPINGS_KEY_PREFIX + graphId);
  }

  function isPublished(graphId: string): boolean {
    return localStorage.getItem(MAPPINGS_KEY_PREFIX + graphId) !== null;
  }

  function getMappingsObject(graphId: string): Record<string, string> {
    const mappings = getMappings(graphId);
    return mappings.reduce(
      (acc, m) => {
        acc[m.localName] = m.backendId;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  return {
    getMappings,
    saveMappings,
    clearMappings,
    isPublished,
    getMappingsObject,
  };
}
