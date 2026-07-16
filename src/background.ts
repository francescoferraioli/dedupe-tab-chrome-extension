import {
  clearPendingClosureForTab,
  handleAutoCloseAlarm,
  handleDuplicateTab,
  keepDuplicateTab,
} from "./auto-close.js";
import { clearTabPrompts, hasPrompted, markPrompted } from "./session.js";
import {
  BLACKLIST_REGEXES_STORAGE_KEY,
  isUrlBlacklisted,
  readSettings,
} from "./settings.js";
import { findDuplicateMatch, snapshotTabs } from "./tabs.js";
import {
  clearPendingVariantPromptForTab,
  handleVariantPromptChoice,
  handleVariantPromptWindowClosed,
  showVariantPrompt,
} from "./variant-prompt.js";
import { isVariantPromptChoiceMessage, type TabId } from "./types.js";
import { normalizeUrl } from "./url.js";

let cachedBlacklistRegexes: readonly string[] = [];

const refreshBlacklistCache = async (): Promise<void> => {
  const settings = await readSettings();
  cachedBlacklistRegexes = settings.blacklistRegexes;
};

const blacklistCacheReady = refreshBlacklistCache();

const evaluateTab = async (tabId: TabId): Promise<void> => {
  await blacklistCacheReady;

  const tabs = await chrome.tabs.query({});
  const snapshots = snapshotTabs(tabs);

  const targetTab = snapshots.find((tab) => tab.id === tabId);
  if (targetTab === undefined) {
    return;
  }

  const normalizedUrl = normalizeUrl(targetTab.url);
  if (normalizedUrl === null) {
    return;
  }

  if (isUrlBlacklisted(normalizedUrl, cachedBlacklistRegexes)) {
    return;
  }

  const match = findDuplicateMatch(snapshots, tabId);
  if (match === null) {
    return;
  }

  if (hasPrompted(tabId, match.normalizedUrl)) {
    return;
  }

  markPrompted(tabId, match.normalizedUrl);

  if (match.kind === "exact") {
    await handleDuplicateTab(match);
    return;
  }

  await showVariantPrompt(match);
};

const onTabUpdated = (
  tabId: TabId,
  changeInfo: chrome.tabs.TabChangeInfo,
): void => {
  if (changeInfo.url === undefined) {
    return;
  }

  void evaluateTab(tabId);
};

const onTabActivated = (activeInfo: chrome.tabs.TabActiveInfo): void => {
  keepDuplicateTab(activeInfo.tabId);
};

const onTabRemoved = (tabId: TabId): void => {
  clearPendingClosureForTab(tabId);
  clearPendingVariantPromptForTab(tabId);
  clearTabPrompts(tabId);
};

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  const change = changes[BLACKLIST_REGEXES_STORAGE_KEY];
  if (change === undefined) {
    return;
  }

  cachedBlacklistRegexes = Array.isArray(change.newValue)
    ? change.newValue.filter(
        (pattern): pattern is string => typeof pattern === "string",
      )
    : [];
});

chrome.tabs.onUpdated.addListener(onTabUpdated);
chrome.tabs.onActivated.addListener(onTabActivated);
chrome.tabs.onRemoved.addListener(onTabRemoved);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isVariantPromptChoiceMessage(message)) {
    return false;
  }

  void handleVariantPromptChoice(message.promptId, message.choice)
    .then(() => {
      sendResponse({ ok: true });
    })
    .catch(() => {
      sendResponse({ ok: false });
    });

  return true;
});

chrome.windows.onRemoved.addListener((windowId) => {
  void handleVariantPromptWindowClosed(windowId);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  void handleAutoCloseAlarm(alarm);
});
