import { normalizeUrl } from "./url.js";
import type {
  DuplicateMatch,
  NormalizedUrl,
  TabId,
  TabSnapshot,
} from "./types.js";

export const toTabSnapshot = (tab: chrome.tabs.Tab): TabSnapshot | null => {
  if (tab.id === undefined || tab.url === undefined) {
    return null;
  }

  return {
    id: tab.id,
    url: tab.url,
    windowId: tab.windowId,
    index: tab.index,
    lastAccessed: tab.lastAccessed ?? 0,
  };
};

export const snapshotTabs = (
  tabs: readonly chrome.tabs.Tab[],
): readonly TabSnapshot[] =>
  tabs.flatMap((tab) => {
    const snapshot = toTabSnapshot(tab);
    return snapshot === null ? [] : [snapshot];
  });

const byMostRecentlyUsed =
  (left: TabSnapshot, right: TabSnapshot): number =>
    right.lastAccessed - left.lastAccessed ||
    left.index - right.index ||
    left.id - right.id;

export const findDuplicateMatch = (
  tabs: readonly TabSnapshot[],
  newTabId: TabId,
): DuplicateMatch | null => {
  const newTab = tabs.find((tab) => tab.id === newTabId);
  if (newTab === undefined) {
    return null;
  }

  const normalizedUrl = normalizeUrl(newTab.url);
  if (normalizedUrl === null) {
    return null;
  }

  const existingTab = tabs
    .filter(
      (tab) =>
        tab.id !== newTabId &&
        normalizeUrl(tab.url) === normalizedUrl,
    )
    .sort(byMostRecentlyUsed)[0];

  if (existingTab === undefined) {
    return null;
  }

  return {
    newTab,
    existingTab,
    normalizedUrl,
  };
};

export const formatTabLabel = (url: NormalizedUrl): string => {
  try {
    const parsed = new URL(url);
    const path =
      parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.hostname}${path}`;
  } catch {
    return url;
  }
};
