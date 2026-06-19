import { classifyUrlMatch, normalizeUrl, normalizeUrlPath } from "./url.js";
import type {
  DuplicateMatch,
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

const toDuplicateMatch = (
  kind: DuplicateMatch["kind"],
  newTab: TabSnapshot,
  existingTab: TabSnapshot,
): DuplicateMatch | null => {
  const normalizedUrl = normalizeUrl(newTab.url);
  if (normalizedUrl === null) {
    return null;
  }

  return {
    kind,
    newTab,
    existingTab,
    normalizedUrl,
  };
};

export const findDuplicateMatch = (
  tabs: readonly TabSnapshot[],
  newTabId: TabId,
): DuplicateMatch | null => {
  const newTab = tabs.find((tab) => tab.id === newTabId);
  if (newTab === undefined) {
    return null;
  }

  const normalizedUrl = normalizeUrl(newTab.url);
  const urlPath = normalizeUrlPath(newTab.url);
  if (normalizedUrl === null || urlPath === null) {
    return null;
  }

  const otherTabs = tabs
    .filter((tab) => tab.id !== newTabId)
    .sort(byMostRecentlyUsed);

  const exactTab = otherTabs.find(
    (tab) => classifyUrlMatch(newTab.url, tab.url) === "exact",
  );
  if (exactTab !== undefined) {
    return toDuplicateMatch("exact", newTab, exactTab);
  }

  const variantTab = otherTabs.find(
    (tab) => classifyUrlMatch(newTab.url, tab.url) === "variant",
  );
  if (variantTab !== undefined) {
    return toDuplicateMatch("variant", newTab, variantTab);
  }

  return null;
};
