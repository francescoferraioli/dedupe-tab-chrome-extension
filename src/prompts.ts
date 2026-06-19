import { AUTO_CLOSE_DELAY_MS, AUTO_CLOSE_DELAY_SECONDS } from "./config.js";
import { formatTabLabel } from "./tabs.js";
import type {
  DuplicateMatch,
  PendingPrompt,
  PromptChoice,
  TabId,
} from "./types.js";

const pendingPrompts = new Map<string, PendingPrompt>();
const autoCloseTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const createPromptId = (match: DuplicateMatch): string =>
  `dedupe-${match.newTab.id}-${match.existingTab.id}`;

export const registerPendingPrompt = (
  prompt: PendingPrompt,
): void => {
  pendingPrompts.set(prompt.promptId, prompt);
};

export const resolvePendingPrompt = (
  promptId: string,
): PendingPrompt | null => {
  const prompt = pendingPrompts.get(promptId) ?? null;
  pendingPrompts.delete(promptId);
  return prompt;
};

export const findPendingPromptByWindow = (
  windowId: number,
): PendingPrompt | null => {
  for (const prompt of pendingPrompts.values()) {
    if (prompt.windowId === windowId) {
      return prompt;
    }
  }

  return null;
};

const cancelAutoClose = (promptId: string): void => {
  const timer = autoCloseTimers.get(promptId);
  if (timer === undefined) {
    return;
  }

  clearTimeout(timer);
  autoCloseTimers.delete(promptId);
};

const buildPromptUrl = (
  promptId: string,
  label: string,
): string => {
  const url = new URL(chrome.runtime.getURL("prompt.html"));
  url.searchParams.set("promptId", promptId);
  url.searchParams.set("label", label);
  url.searchParams.set(
    "countdownSeconds",
    String(AUTO_CLOSE_DELAY_SECONDS),
  );
  return url.toString();
};

const closePromptWindow = async (
  windowId: number | undefined,
): Promise<void> => {
  if (windowId === undefined) {
    return;
  }

  try {
    await chrome.windows.remove(windowId);
  } catch {
    // Window may already be closed.
  }
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

const executeAutoClose = async (promptId: string): Promise<void> => {
  autoCloseTimers.delete(promptId);

  const prompt = resolvePendingPrompt(promptId);
  if (prompt === null) {
    return;
  }

  await closeDuplicateTab(prompt.newTabId);
  await closePromptWindow(prompt.windowId);
};

const scheduleAutoClose = (promptId: string): void => {
  cancelAutoClose(promptId);

  const timer = setTimeout(() => {
    void executeAutoClose(promptId);
  }, AUTO_CLOSE_DELAY_MS);

  autoCloseTimers.set(promptId, timer);
};

export const showDuplicatePrompt = async (
  match: DuplicateMatch,
): Promise<void> => {
  const promptId = createPromptId(match);
  const label = formatTabLabel(match.normalizedUrl);
  const promptUrl = buildPromptUrl(promptId, label);

  await focusTab(match.existingTab.id);

  try {
    const promptWindow = await chrome.windows.create({
      url: promptUrl,
      type: "popup",
      width: 440,
      height: 240,
      focused: true,
    });

    if (promptWindow.id === undefined) {
      throw new Error("Prompt window was created without an id");
    }

    registerPendingPrompt({
      promptId,
      newTabId: match.newTab.id,
      existingTabId: match.existingTab.id,
      windowId: promptWindow.id,
    });

    scheduleAutoClose(promptId);
  } catch (error) {
    cancelAutoClose(promptId);
    pendingPrompts.delete(promptId);
    throw error;
  }
};

export const applyPromptChoice = async (
  prompt: PendingPrompt,
  choice: PromptChoice,
): Promise<void> => {
  if (choice === "switch") {
    await focusTab(prompt.existingTabId);
    await closeDuplicateTab(prompt.newTabId);
    return;
  }

  await focusTab(prompt.newTabId);
};

export const handlePromptChoice = async (
  promptId: string,
  choice: PromptChoice,
): Promise<void> => {
  cancelAutoClose(promptId);

  const prompt = resolvePendingPrompt(promptId);
  if (prompt === null) {
    return;
  }

  await applyPromptChoice(prompt, choice);
  await closePromptWindow(prompt.windowId);
};

export const handlePromptWindowClosed = async (
  windowId: number,
): Promise<void> => {
  const prompt = findPendingPromptByWindow(windowId);
  if (prompt === null) {
    return;
  }

  cancelAutoClose(prompt.promptId);
  resolvePendingPrompt(prompt.promptId);
  await focusTab(prompt.newTabId);
};
