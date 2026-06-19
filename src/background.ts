import {
  handleNotificationButton,
  handleNotificationDismiss,
  showDuplicatePrompt,
} from "./prompts.js";
import { clearTabPrompts, hasPrompted, markPrompted } from "./session.js";
import { findDuplicateMatch, snapshotTabs } from "./tabs.js";
import type { TabId } from "./types.js";

const evaluateTab = async (tabId: TabId): Promise<void> => {
  const tabs = await chrome.tabs.query({});
  const snapshots = snapshotTabs(tabs);
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

chrome.notifications.onButtonClicked.addListener(
  (notificationId, buttonIndex) => {
    void handleNotificationButton(notificationId, buttonIndex);
  },
);

chrome.notifications.onClosed.addListener((notificationId) => {
  void handleNotificationDismiss(notificationId);
});
