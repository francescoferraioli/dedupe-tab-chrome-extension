import { VARIANT_PROMPT_AUTO_CLOSE_DELAY_MS } from "./config.js";
import {
  isVariantPromptChoice,
  type VariantPromptChoice,
} from "./types.js";

let resolved = false;

const DEFAULT_TIMEOUT_ACTION: VariantPromptChoice = "keep";

const ACTION_TIMEOUT_LABELS: Record<VariantPromptChoice, string> = {
  switch: "switch to the existing tab",
  "switch-and-reload": "switch and reload",
  keep: "keep both tabs",
  "close-other": "close the other tab",
};

const readSearchParam = (key: string): string | null => {
  const value = new URLSearchParams(window.location.search).get(key);
  return value === null || value.length === 0 ? null : value;
};

const readBooleanParam = (key: string): boolean =>
  readSearchParam(key) === "true";

const readChoiceParam = (
  key: string,
  fallback: VariantPromptChoice,
): VariantPromptChoice => {
  const value = readSearchParam(key);
  return isVariantPromptChoice(value) ? value : fallback;
};

const sendChoice = async (
  promptId: string,
  choice: VariantPromptChoice,
  fromTimeout = false,
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
      ...(fromTimeout ? { fromTimeout: true } : {}),
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

const markPrimaryButton = (
  buttons: Readonly<Record<VariantPromptChoice, HTMLButtonElement>>,
  defaultAction: VariantPromptChoice,
): void => {
  for (const [action, button] of Object.entries(buttons)) {
    button.classList.toggle("primary", action === defaultAction);
  }
};

const init = (): void => {
  const promptId = readSearchParam("promptId");
  const label = readSearchParam("label");
  const newSearch = readSearchParam("newSearch");
  const existingSearch = readSearchParam("existingSearch");
  const newHash = readSearchParam("newHash");
  const existingHash = readSearchParam("existingHash");
  const defaultAction = readChoiceParam("defaultAction", DEFAULT_TIMEOUT_ACTION);

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
  setText(
    "timeout-hint",
    `If you do nothing, this will ${ACTION_TIMEOUT_LABELS[defaultAction]}.`,
  );

  const switchButton = document.getElementById("switch");
  const switchAndReloadButton = document.getElementById("switch-and-reload");
  const closeOtherButton = document.getElementById("close-other");
  const keepButton = document.getElementById("keep");

  if (!(switchButton instanceof HTMLButtonElement)) {
    return;
  }

  if (!(switchAndReloadButton instanceof HTMLButtonElement)) {
    return;
  }

  if (!(closeOtherButton instanceof HTMLButtonElement)) {
    return;
  }

  if (!(keepButton instanceof HTMLButtonElement)) {
    return;
  }

  const buttons = {
    switch: switchButton,
    "switch-and-reload": switchAndReloadButton,
    "close-other": closeOtherButton,
    keep: keepButton,
  };

  markPrimaryButton(buttons, defaultAction);
  bindButton(switchButton, promptId, "switch");
  bindButton(switchAndReloadButton, promptId, "switch-and-reload");
  bindButton(closeOtherButton, promptId, "close-other");
  bindButton(keepButton, promptId, "keep");

  window.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      void sendChoice(promptId, "keep");
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void sendChoice(promptId, defaultAction);
    }
  });

  setTimeout(() => {
    void sendChoice(promptId, defaultAction, true);
  }, VARIANT_PROMPT_AUTO_CLOSE_DELAY_MS);
};

init();
