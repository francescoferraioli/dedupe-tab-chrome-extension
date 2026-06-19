import { formatTabLabel } from "./tabs.js";
import type {
  DuplicateMatch,
  PendingPrompt,
  PromptChoice,
  TabId,
} from "./types.js";

const SWITCH_BUTTON = 0;
const KEEP_BUTTON = 1;

const pendingPrompts = new Map<string, PendingPrompt>();

export const createPromptId = (match: DuplicateMatch): string =>
  `dedupe-${match.newTab.id}-${match.existingTab.id}`;

export const registerPendingPrompt = (
  prompt: PendingPrompt,
): void => {
  pendingPrompts.set(prompt.notificationId, prompt);
};

export const resolvePendingPrompt = (
  notificationId: string,
): PendingPrompt | null => {
  const prompt = pendingPrompts.get(notificationId) ?? null;
  pendingPrompts.delete(notificationId);
  return prompt;
};

export const showDuplicatePrompt = async (
  match: DuplicateMatch,
): Promise<void> => {
  const notificationId = createPromptId(match);
  const label = formatTabLabel(match.normalizedUrl);

  registerPendingPrompt({
    notificationId,
    newTabId: match.newTab.id,
    existingTabId: match.existingTab.id,
  });

  await chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='8' fill='%234285f4'/%3E%3Ctext x='24' y='32' text-anchor='middle' font-size='24' fill='white' font-family='sans-serif'%3E%3C/text%3E%3C/svg%3E",
    title: "Duplicate tab detected",
    message: `You already have "${label}" open. Switch to the existing tab instead?`,
    buttons: [
      { title: "Switch to existing tab" },
      { title: "Keep new tab" },
    ],
    requireInteraction: true,
  });
};

export const clearPrompt = async (
  notificationId: string,
): Promise<void> => {
  pendingPrompts.delete(notificationId);
  await chrome.notifications.clear(notificationId);
};

const focusTab = async (tabId: TabId): Promise<void> => {
  const tab = await chrome.tabs.get(tabId);
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });
};

export const applyPromptChoice = async (
  prompt: PendingPrompt,
  choice: PromptChoice,
): Promise<void> => {
  if (choice === "switch") {
    await focusTab(prompt.existingTabId);
    await chrome.tabs.remove(prompt.newTabId);
    return;
  }

  await focusTab(prompt.newTabId);
};

export const choiceFromButtonIndex = (
  buttonIndex: number,
): PromptChoice | null => {
  if (buttonIndex === SWITCH_BUTTON) {
    return "switch";
  }

  if (buttonIndex === KEEP_BUTTON) {
    return "keep";
  }

  return null;
};

export const handleNotificationButton = async (
  notificationId: string,
  buttonIndex: number,
): Promise<void> => {
  const prompt = resolvePendingPrompt(notificationId);
  if (prompt === null) {
    return;
  }

  const choice = choiceFromButtonIndex(buttonIndex);
  if (choice === null) {
    return;
  }

  await applyPromptChoice(prompt, choice);
  await clearPrompt(notificationId);
};

export const handleNotificationDismiss = async (
  notificationId: string,
): Promise<void> => {
  const prompt = resolvePendingPrompt(notificationId);
  if (prompt === null) {
    return;
  }

  await focusTab(prompt.newTabId);
};
