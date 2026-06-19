import type { NormalizedUrl, TabId } from "./types.js";

const promptedPairs = new Set<string>();

const pairKey = (
  newTabId: TabId,
  normalizedUrl: NormalizedUrl,
): string => `${newTabId}:${normalizedUrl}`;

export const hasPrompted = (
  newTabId: TabId,
  normalizedUrl: NormalizedUrl,
): boolean => promptedPairs.has(pairKey(newTabId, normalizedUrl));

export const markPrompted = (
  newTabId: TabId,
  normalizedUrl: NormalizedUrl,
): void => {
  promptedPairs.add(pairKey(newTabId, normalizedUrl));
};

export const clearTabPrompts = (tabId: TabId): void => {
  for (const key of promptedPairs) {
    if (key.startsWith(`${tabId}:`)) {
      promptedPairs.delete(key);
    }
  }
};
