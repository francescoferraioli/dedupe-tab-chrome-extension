import {
  RULE_ACTION_OPTIONS,
  findInvalidRegex,
  findInvalidRulePattern,
  formatBlacklistRegexesText,
  normalizeRules,
  parseBlacklistRegexesText,
  readSettings,
  writeSettings,
} from "./settings.js";
import {
  isVariantPromptChoice,
  type UrlRule,
  type VariantPromptChoice,
} from "./types.js";

const EMPTY_RULE: UrlRule = { pattern: "", action: "switch-and-reload" };

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

const createActionSelect = (
  selected: VariantPromptChoice,
): HTMLSelectElement => {
  const select = document.createElement("select");
  select.className = "rule-action";
  select.setAttribute("aria-label", "Default action");

  for (const option of RULE_ACTION_OPTIONS) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    element.selected = option.value === selected;
    select.append(element);
  }

  return select;
};

const createIconButton = (label: string, extraClass: string): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon ${extraClass}`;
  button.textContent = label;
  return button;
};

const readAction = (value: string): VariantPromptChoice =>
  isVariantPromptChoice(value) ? value : "switch-and-reload";

const readRulesFromDom = (list: HTMLElement): UrlRule[] =>
  Array.from(list.querySelectorAll<HTMLElement>(".rule")).map((row) => {
    const patternInput = row.querySelector(".rule-pattern");
    const actionSelect = row.querySelector(".rule-action");
    const pattern =
      patternInput instanceof HTMLInputElement ? patternInput.value : "";
    const action =
      actionSelect instanceof HTMLSelectElement
        ? readAction(actionSelect.value)
        : "switch-and-reload";

    return { pattern, action };
  });

const renderRules = (list: HTMLElement, rules: readonly UrlRule[]): void => {
  list.replaceChildren();

  const rows = rules.length === 0 ? [EMPTY_RULE] : rules;

  for (const [index, rule] of rows.entries()) {
    const row = document.createElement("div");
    row.className = "rule";

    const patternInput = document.createElement("input");
    patternInput.type = "text";
    patternInput.className = "rule-pattern";
    patternInput.spellcheck = false;
    patternInput.autocomplete = "off";
    patternInput.placeholder = "github\\.com";
    patternInput.setAttribute("aria-label", "Regex");
    patternInput.value = rule.pattern;

    const moveUp = createIconButton("Up", "move-up");
    moveUp.setAttribute("aria-label", "Move rule up");
    moveUp.disabled = index === 0;

    const moveDown = createIconButton("Down", "move-down");
    moveDown.setAttribute("aria-label", "Move rule down");
    moveDown.disabled = index === rows.length - 1;

    const remove = createIconButton("Remove", "remove-rule");
    remove.setAttribute("aria-label", "Remove rule");

    row.append(
      patternInput,
      createActionSelect(rule.action),
      moveUp,
      moveDown,
      remove,
    );
    list.append(row);
  }
};

const moveRule = (
  rules: readonly UrlRule[],
  fromIndex: number,
  offset: number,
): UrlRule[] => {
  const toIndex = fromIndex + offset;
  if (toIndex < 0 || toIndex >= rules.length) {
    return [...rules];
  }

  return rules.map((rule, index) => {
    if (index === fromIndex) {
      return rules[toIndex] ?? rule;
    }

    if (index === toIndex) {
      return rules[fromIndex] ?? rule;
    }

    return rule;
  });
};

const init = async (): Promise<void> => {
  const form = getRequiredElement(
    "settings-form",
    (element): element is HTMLFormElement => element instanceof HTMLFormElement,
  );
  const blacklistInput = getRequiredElement(
    "blacklist-regexes",
    (element): element is HTMLTextAreaElement =>
      element instanceof HTMLTextAreaElement,
  );
  const list = getRequiredElement(
    "rules",
    (element): element is HTMLElement => element instanceof HTMLElement,
  );
  const addButton = getRequiredElement(
    "add-rule",
    (element): element is HTMLButtonElement =>
      element instanceof HTMLButtonElement,
  );
  const status = getRequiredElement(
    "status",
    (element): element is HTMLElement => element instanceof HTMLElement,
  );

  const settings = await readSettings();
  blacklistInput.value = formatBlacklistRegexesText(settings.blacklistRegexes);
  renderRules(list, settings.rules);

  addButton.addEventListener("click", () => {
    renderRules(list, [...readRulesFromDom(list), EMPTY_RULE]);
  });

  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const row = target.closest(".rule");
    if (!(row instanceof HTMLElement)) {
      return;
    }

    const rules = readRulesFromDom(list);
    const index = Array.from(list.children).indexOf(row);
    if (index < 0) {
      return;
    }

    if (target.classList.contains("remove-rule")) {
      renderRules(
        list,
        rules.filter((_, ruleIndex) => ruleIndex !== index),
      );
      return;
    }

    if (target.classList.contains("move-up")) {
      renderRules(list, moveRule(rules, index, -1));
      return;
    }

    if (target.classList.contains("move-down")) {
      renderRules(list, moveRule(rules, index, 1));
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const blacklistRegexes = parseBlacklistRegexesText(blacklistInput.value);
    const invalidBlacklistPattern = findInvalidRegex(blacklistRegexes);
    if (invalidBlacklistPattern !== null) {
      setStatus(
        status,
        `Invalid regular expression: ${invalidBlacklistPattern}`,
        "error",
      );
      return;
    }

    const rules = normalizeRules(readRulesFromDom(list));
    const invalidRulePattern = findInvalidRulePattern(rules);
    if (invalidRulePattern !== null) {
      setStatus(
        status,
        `Invalid regular expression: ${invalidRulePattern}`,
        "error",
      );
      return;
    }

    void writeSettings({ blacklistRegexes, rules })
      .then(() => {
        blacklistInput.value = formatBlacklistRegexesText(blacklistRegexes);
        renderRules(list, rules);
        setStatus(status, "Saved.", "success");
      })
      .catch(() => {
        setStatus(status, "Could not save settings.", "error");
      });
  });
};

void init();
