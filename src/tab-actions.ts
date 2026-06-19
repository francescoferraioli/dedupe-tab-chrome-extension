import type { TabId } from "./types.js";

export const focusTab = async (tabId: TabId): Promise<void> => {
  const tab = await chrome.tabs.get(tabId);
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });
};

export const closeTab = async (tabId: TabId): Promise<void> => {
  try {
    await chrome.tabs.remove(tabId);
  } catch {
    // Tab may already be gone.
  }
};
