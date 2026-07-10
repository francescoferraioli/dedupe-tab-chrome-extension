import { VARIANT_PROMPT_AUTO_CLOSE_DELAY_MS } from "./config.js";
import type { VariantPromptChoice } from "./types.js";

let resolved = false;

const readSearchParam = (key: string): string | null => {
  const value = new URLSearchParams(window.location.search).get(key);
  return value === null || value.length === 0 ? null : value;
};

const readBooleanParam = (key: string): boolean =>
  readSearchParam(key) === "true";

const sendChoice = async (
  promptId: string,
  choice: VariantPromptChoice,
): Promise<void> => {
  if (resolved) {
    return;
  }

  resolved = true;

  try {
    await chrome.runtime.sendMessage({
      type: "variant-prompt-choice",
      promptId,
      choice,
    });
  } catch {
    // Background may already have handled this prompt.
  }

  window.close();
};

const bindButton = (
  element: HTMLButtonElement,
  promptId: string,
  choice: VariantPromptChoice,
): void => {
  element.addEventListener("click", () => {
    void sendChoice(promptId, choice);
  });
};

const setText = (elementId: string, value: string): void => {
  const element = document.getElementById(elementId);
  if (element !== null) {
    element.textContent = value;
  }
};

const setSectionVisible = (elementId: string, visible: boolean): void => {
  const element = document.getElementById(elementId);
  if (element !== null) {
    element.hidden = !visible;
  }
};

const init = (): void => {
  const promptId = readSearchParam("promptId");
  const label = readSearchParam("label");
  const newSearch = readSearchParam("newSearch");
  const existingSearch = readSearchParam("existingSearch");
  const newHash = readSearchParam("newHash");
  const existingHash = readSearchParam("existingHash");

  if (
    promptId === null ||
    label === null ||
    newSearch === null ||
    existingSearch === null ||
    newHash === null ||
    existingHash === null
  ) {
    return;
  }

  setText("label", label);
  setText("new-search", newSearch);
  setText("existing-search", existingSearch);
  setText("new-hash", newHash);
  setText("existing-hash", existingHash);
  setSectionVisible("search-section", readBooleanParam("showSearch"));
  setSectionVisible("hash-section", readBooleanParam("showHash"));

  const switchButton = document.getElementById("switch");
  const closeOtherButton = document.getElementById("close-other");
  const keepButton = document.getElementById("keep");

  if (!(switchButton instanceof HTMLButtonElement)) {
    return;
  }

  if (!(closeOtherButton instanceof HTMLButtonElement)) {
    return;
  }

  if (!(keepButton instanceof HTMLButtonElement)) {
    return;
  }

  bindButton(switchButton, promptId, "switch");
  bindButton(closeOtherButton, promptId, "close-other");
  bindButton(keepButton, promptId, "keep");

  setTimeout(() => {
    void sendChoice(promptId, "keep");
  }, VARIANT_PROMPT_AUTO_CLOSE_DELAY_MS);
};

init();
