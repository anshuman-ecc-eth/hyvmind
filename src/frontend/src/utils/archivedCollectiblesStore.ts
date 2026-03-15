const KEY_PREFIX = "hyvmind:hiddenCollectibles:";

export function getHiddenCollectibleIds(principal: string): Set<string> {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + principal);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set<string>(parsed);
  } catch {
    // ignore parse errors
  }
  return new Set();
}

export function setHiddenCollectibleIds(
  principal: string,
  ids: Set<string>,
): void {
  try {
    localStorage.setItem(
      KEY_PREFIX + principal,
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // ignore storage errors
  }
}

export function clearHiddenCollectibleIds(principal: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + principal);
  } catch {
    // ignore
  }
}
