import { handleDuplicateTab } from "./auto-close.js";
import { VARIANT_PROMPT_AUTO_CLOSE_DELAY_MS } from "./config.js";
import { closeTab, focusTab } from "./tab-actions.js";
import type {
  DuplicateMatch,
  PendingVariantPrompt,
  VariantPromptChoice,
  TabId,
} from "./types.js";
import {
  describeUrlPartDifference,
  formatHash,
  formatPathLabel,
  formatSearch,
} from "./url.js";

const pendingVariantPrompts = new Map<string, PendingVariantPrompt>();
const promptAutoCloseTimers = new Map<string, ReturnType<typeof setTimeout>>();

const createPromptId = (match: DuplicateMatch): string =>
  `variant-${match.newTab.id}-${match.existingTab.id}`;

const cancelPromptAutoClose = (promptId: string): void => {
  const timer = promptAutoCloseTimers.get(promptId);
  if (timer === undefined) {
    return;
  }

  clearTimeout(timer);
  promptAutoCloseTimers.delete(promptId);
};

const schedulePromptAutoClose = (
  promptId: string,
  windowId: number,
): void => {
  cancelPromptAutoClose(promptId);

  const timer = setTimeout(() => {
    promptAutoCloseTimers.delete(promptId);
    void closePromptWindow(windowId);
  }, VARIANT_PROMPT_AUTO_CLOSE_DELAY_MS);

  promptAutoCloseTimers.set(promptId, timer);
};

const registerPendingVariantPrompt = (
  prompt: PendingVariantPrompt,
): void => {
  pendingVariantPrompts.set(prompt.promptId, prompt);
};

const resolvePendingVariantPrompt = (
  promptId: string,
): PendingVariantPrompt | null => {
  const prompt = pendingVariantPrompts.get(promptId) ?? null;
  pendingVariantPrompts.delete(promptId);
  return prompt;
};

const findPendingVariantPromptByWindow = (
  windowId: number,
): PendingVariantPrompt | null => {
  for (const prompt of pendingVariantPrompts.values()) {
    if (prompt.windowId === windowId) {
      return prompt;
    }
  }

  return null;
};

const buildPromptUrl = (prompt: PendingVariantPrompt): string => {
  const { newTab, existingTab } = prompt.match;
  const difference = describeUrlPartDifference(newTab.url, existingTab.url);
  const url = new URL(chrome.runtime.getURL("variant-prompt.html"));

  url.searchParams.set("promptId", prompt.promptId);
  url.searchParams.set("label", formatPathLabel(newTab.url));
  url.searchParams.set("newSearch", formatSearch(newTab.url));
  url.searchParams.set("existingSearch", formatSearch(existingTab.url));
  url.searchParams.set("newHash", formatHash(newTab.url));
  url.searchParams.set("existingHash", formatHash(existingTab.url));
  url.searchParams.set("showSearch", String(difference.searchDiffers));
  url.searchParams.set("showHash", String(difference.hashDiffers));

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

export const showVariantPrompt = async (
  match: DuplicateMatch,
): Promise<void> => {
  const promptId = createPromptId(match);

  try {
    const pendingPrompt: PendingVariantPrompt = {
      promptId,
      match,
    };

    const promptWindow = await chrome.windows.create({
      url: buildPromptUrl(pendingPrompt),
      type: "popup",
      width: 460,
      height: 320,
      focused: true,
    });

    if (promptWindow.id === undefined) {
      throw new Error("Variant prompt window was created without an id");
    }

    registerPendingVariantPrompt({
      promptId,
      match,
      windowId: promptWindow.id,
    });

    schedulePromptAutoClose(promptId, promptWindow.id);
  } catch (error) {
    cancelPromptAutoClose(promptId);
    pendingVariantPrompts.delete(promptId);
    throw error;
  }
};

export const handleVariantPromptChoice = async (
  promptId: string,
  choice: VariantPromptChoice,
): Promise<void> => {
  cancelPromptAutoClose(promptId);

  const prompt = resolvePendingVariantPrompt(promptId);
  if (prompt === null) {
    return;
  }

  if (choice === "switch") {
    await closePromptWindow(prompt.windowId);
    await handleDuplicateTab(prompt.match);
    return;
  }

  if (choice === "close-other") {
    await focusTab(prompt.match.newTab.id);
    await closeTab(prompt.match.existingTab.id);
    await closePromptWindow(prompt.windowId);
    return;
  }

  await focusTab(prompt.match.newTab.id);
  await closePromptWindow(prompt.windowId);
};

export const handleVariantPromptWindowClosed = async (
  windowId: number,
): Promise<void> => {
  const prompt = findPendingVariantPromptByWindow(windowId);
  if (prompt === null) {
    return;
  }

  await handleVariantPromptChoice(prompt.promptId, "keep");
};

export const clearPendingVariantPromptForTab = (tabId: TabId): void => {
  for (const [promptId, prompt] of pendingVariantPrompts) {
    if (
      prompt.match.newTab.id === tabId ||
      prompt.match.existingTab.id === tabId
    ) {
      pendingVariantPrompts.delete(promptId);
      cancelPromptAutoClose(promptId);
      void closePromptWindow(prompt.windowId);
    }
  }
};
