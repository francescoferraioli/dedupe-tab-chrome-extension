import {
  findInvalidBlacklistRegex,
  formatBlacklistRegexesText,
  parseBlacklistRegexesText,
  readSettings,
  writeSettings,
} from "./settings.js";

const getRequiredElement = <T extends HTMLElement>(
  id: string,
  guard: (element: HTMLElement) => element is T,
): T => {
  const element = document.getElementById(id);
  if (element === null || !guard(element)) {
    throw new Error(`Missing required element: ${id}`);
  }

  return element;
};

const setStatus = (
  status: HTMLElement,
  message: string,
  kind: "success" | "error" | "",
): void => {
  status.textContent = message;
  status.classList.toggle("success", kind === "success");
  status.classList.toggle("error", kind === "error");
};

const init = async (): Promise<void> => {
  const form = getRequiredElement(
    "settings-form",
    (element): element is HTMLFormElement => element instanceof HTMLFormElement,
  );
  const input = getRequiredElement(
    "blacklist-regexes",
    (element): element is HTMLTextAreaElement =>
      element instanceof HTMLTextAreaElement,
  );
  const status = getRequiredElement(
    "status",
    (element): element is HTMLElement => element instanceof HTMLElement,
  );

  const settings = await readSettings();
  input.value = formatBlacklistRegexesText(settings.blacklistRegexes);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const blacklistRegexes = parseBlacklistRegexesText(input.value);
    const invalidPattern = findInvalidBlacklistRegex(blacklistRegexes);
    if (invalidPattern !== null) {
      setStatus(
        status,
        `Invalid regular expression: ${invalidPattern}`,
        "error",
      );
      return;
    }

    void writeSettings({ blacklistRegexes })
      .then(() => {
        input.value = formatBlacklistRegexesText(blacklistRegexes);
        setStatus(status, "Saved.", "success");
      })
      .catch(() => {
        setStatus(status, "Could not save settings.", "error");
      });
  });
};

void init();
