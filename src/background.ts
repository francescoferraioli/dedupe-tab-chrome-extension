import {
  handlePromptChoice,
  handlePromptWindowClosed,
  showDuplicatePrompt,
} from "./prompts.js";
import { clearTabPrompts, hasPrompted, markPrompted } from "./session.js";
import { findDuplicateMatch, snapshotTabs } from "./tabs.js";
import { isPromptChoiceMessage, type TabId } from "./types.js";
import { normalizeUrl } from "./url.js";

const evaluateTab = async (tabId: TabId): Promise<void> => {
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

  const match = findDuplicateMatch(snapshots, tabId);
  if (match === null) {
    return;
  }

  if (hasPrompted(tabId, match.normalizedUrl)) {
    return;
  }

  markPrompted(tabId, match.normalizedUrl);
  await showDuplicatePrompt(match);
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

const onTabRemoved = (tabId: TabId): void => {
  clearTabPrompts(tabId);
};

chrome.tabs.onUpdated.addListener(onTabUpdated);
chrome.tabs.onRemoved.addListener(onTabRemoved);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isPromptChoiceMessage(message)) {
    return false;
  }

  void handlePromptChoice(message.promptId, message.choice)
    .then(() => {
      sendResponse({ ok: true });
    })
    .catch(() => {
      sendResponse({ ok: false });
    });

  return true;
});

chrome.windows.onRemoved.addListener((windowId) => {
  void handlePromptWindowClosed(windowId);
});
