import { AUTO_CLOSE_DELAY_MS } from "./config.js";
import type { DuplicateMatch, PendingClosure, TabId } from "./types.js";

const pendingClosures = new Map<string, PendingClosure>();
const autoCloseTimers = new Map<string, ReturnType<typeof setTimeout>>();

const createClosureId = (match: DuplicateMatch): string =>
  `dedupe-${match.newTab.id}-${match.existingTab.id}`;

const registerPendingClosure = (closure: PendingClosure): void => {
  pendingClosures.set(closure.closureId, closure);
};

const resolvePendingClosure = (closureId: string): PendingClosure | null => {
  const closure = pendingClosures.get(closureId) ?? null;
  pendingClosures.delete(closureId);
  return closure;
};

const findPendingClosureByNewTab = (tabId: TabId): PendingClosure | null => {
  for (const closure of pendingClosures.values()) {
    if (closure.newTabId === tabId) {
      return closure;
    }
  }

  return null;
};

const cancelAutoClose = (closureId: string): void => {
  const timer = autoCloseTimers.get(closureId);
  if (timer === undefined) {
    return;
  }

  clearTimeout(timer);
  autoCloseTimers.delete(closureId);
};

const focusTab = async (tabId: TabId): Promise<void> => {
  const tab = await chrome.tabs.get(tabId);
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });
};

const closeDuplicateTab = async (tabId: TabId): Promise<void> => {
  try {
    await chrome.tabs.remove(tabId);
  } catch {
    // Tab may already be gone.
  }
};

const executeAutoClose = async (closureId: string): Promise<void> => {
  autoCloseTimers.delete(closureId);

  const closure = resolvePendingClosure(closureId);
  if (closure === null) {
    return;
  }

  await closeDuplicateTab(closure.newTabId);
};

const scheduleAutoClose = (closureId: string): void => {
  cancelAutoClose(closureId);

  const timer = setTimeout(() => {
    void executeAutoClose(closureId);
  }, AUTO_CLOSE_DELAY_MS);

  autoCloseTimers.set(closureId, timer);
};

export const handleDuplicateTab = async (
  match: DuplicateMatch,
): Promise<void> => {
  const closureId = createClosureId(match);

  await focusTab(match.existingTab.id);

  registerPendingClosure({
    closureId,
    newTabId: match.newTab.id,
    existingTabId: match.existingTab.id,
  });

  scheduleAutoClose(closureId);
};

export const keepDuplicateTab = (tabId: TabId): void => {
  const closure = findPendingClosureByNewTab(tabId);
  if (closure === null) {
    return;
  }

  cancelAutoClose(closure.closureId);
  resolvePendingClosure(closure.closureId);
};

export const clearPendingClosureForTab = (tabId: TabId): void => {
  const closure = findPendingClosureByNewTab(tabId);
  if (closure === null) {
    return;
  }

  cancelAutoClose(closure.closureId);
  resolvePendingClosure(closure.closureId);
};
