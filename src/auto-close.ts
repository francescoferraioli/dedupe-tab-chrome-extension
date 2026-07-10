import { AUTO_CLOSE_DELAY_MS } from "./config.js";
import { closeTab, focusTab } from "./tab-actions.js";
import type { DuplicateMatch, PendingClosure, TabId } from "./types.js";

const pendingClosures = new Map<string, PendingClosure>();

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
  void chrome.alarms.clear(closureId);
};

const executeAutoClose = async (closureId: string): Promise<void> => {
  const closure = resolvePendingClosure(closureId);
  if (closure === null) {
    return;
  }

  await closeTab(closure.newTabId);
};

const scheduleAutoClose = (closureId: string): void => {
  cancelAutoClose(closureId);

  void chrome.alarms.create(closureId, {
    when: Date.now() + AUTO_CLOSE_DELAY_MS,
  });
};

export const handleAutoCloseAlarm = async (
  alarm: chrome.alarms.Alarm,
): Promise<void> => {
  await executeAutoClose(alarm.name);
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
