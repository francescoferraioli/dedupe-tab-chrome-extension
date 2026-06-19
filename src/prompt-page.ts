import type { PromptChoice } from "./types.js";

const readSearchParam = (key: string): string | null => {
  const value = new URLSearchParams(window.location.search).get(key);
  return value === null || value.length === 0 ? null : value;
};

const readCountdownSeconds = (): number | null => {
  const rawValue = readSearchParam("countdownSeconds");
  if (rawValue === null) {
    return null;
  }

  const seconds = Number.parseInt(rawValue, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

const sendChoice = async (
  promptId: string,
  choice: PromptChoice,
): Promise<void> => {
  await chrome.runtime.sendMessage({
    type: "prompt-choice",
    promptId,
    choice,
  });

  window.close();
};

const bindCancelButton = (
  element: HTMLButtonElement,
  promptId: string,
): void => {
  element.addEventListener("click", () => {
    void sendChoice(promptId, "keep");
  });
};

const startCountdown = (
  countdownElement: HTMLElement,
  initialSeconds: number,
): void => {
  let remainingSeconds = initialSeconds;
  countdownElement.textContent = String(remainingSeconds);

  const intervalId = window.setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds <= 0) {
      countdownElement.textContent = "0";
      window.clearInterval(intervalId);
      return;
    }

    countdownElement.textContent = String(remainingSeconds);
  }, 1000);
};

const init = (): void => {
  const promptId = readSearchParam("promptId");
  const label = readSearchParam("label");
  const countdownSeconds = readCountdownSeconds();

  if (promptId === null || label === null || countdownSeconds === null) {
    return;
  }

  const labelElement = document.getElementById("label");
  if (labelElement !== null) {
    labelElement.textContent = label;
  }

  const countdownElement = document.getElementById("countdown");
  if (countdownElement !== null) {
    startCountdown(countdownElement, countdownSeconds);
  }

  const cancelButton = document.getElementById("cancel");
  if (!(cancelButton instanceof HTMLButtonElement)) {
    return;
  }

  bindCancelButton(cancelButton, promptId);
};

init();
