import {
  isVariantPromptChoice,
  type UrlRule,
  type VariantPromptChoice,
} from "./types.js";

export const URL_RULES_STORAGE_KEY = "urlRules";
export const BLACKLIST_REGEXES_STORAGE_KEY = "blacklistRegexes";

/** @deprecated Migrated to {@link BLACKLIST_REGEXES_STORAGE_KEY}. */
const LEGACY_BLACKLIST_REGEX_STORAGE_KEY = "blacklistRegex";

export const DEFAULT_VARIANT_ACTION: VariantPromptChoice = "keep";

export type ExtensionSettings = Readonly<{
  blacklistRegexes: readonly string[];
  rules: readonly UrlRule[];
}>;

export const RULE_ACTION_OPTIONS: ReadonlyArray<{
  value: VariantPromptChoice;
  label: string;
}> = [
  { value: "switch", label: "Switch to existing tab" },
  { value: "switch-and-reload", label: "Switch and reload" },
  { value: "keep", label: "Keep both tabs" },
  { value: "close-other", label: "Close other tab" },
];

export const normalizeBlacklistRegexes = (
  patterns: readonly string[],
): string[] =>
  patterns.map((pattern) => pattern.trim()).filter((pattern) => pattern.length > 0);

export const parseBlacklistRegexesText = (text: string): string[] =>
  normalizeBlacklistRegexes(text.split(/\r?\n/));

export const formatBlacklistRegexesText = (
  patterns: readonly string[],
): string => normalizeBlacklistRegexes(patterns).join("\n");

const toUrlRule = (
  pattern: string,
  action: VariantPromptChoice,
): UrlRule | null => {
  const trimmed = pattern.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return { pattern: trimmed, action };
};

export const normalizeRules = (rules: readonly UrlRule[]): UrlRule[] =>
  rules.flatMap((rule) => {
    const normalized = toUrlRule(rule.pattern, rule.action);
    return normalized === null ? [] : [normalized];
  });

export const compileRegex = (pattern: string): RegExp | null => {
  const trimmed = pattern.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    return new RegExp(trimmed);
  } catch {
    return null;
  }
};

export const findInvalidRegex = (
  patterns: readonly string[],
): string | null => {
  for (const pattern of normalizeBlacklistRegexes(patterns)) {
    if (compileRegex(pattern) === null) {
      return pattern;
    }
  }

  return null;
};

export const findInvalidRulePattern = (
  rules: readonly UrlRule[],
): string | null => findInvalidRegex(normalizeRules(rules).map((rule) => rule.pattern));

export const isUrlBlacklisted = (
  url: string,
  blacklistRegexes: readonly string[],
): boolean =>
  normalizeBlacklistRegexes(blacklistRegexes).some((pattern) => {
    const compiled = compileRegex(pattern);
    return compiled !== null && compiled.test(url);
  });

export const findMatchingRule = (
  url: string,
  rules: readonly UrlRule[],
): UrlRule | null => {
  for (const rule of normalizeRules(rules)) {
    const compiled = compileRegex(rule.pattern);
    if (compiled !== null && compiled.test(url)) {
      return rule;
    }
  }

  return null;
};

export const resolveVariantDefaultAction = (
  url: string,
  rules: readonly UrlRule[],
): VariantPromptChoice =>
  findMatchingRule(url, rules)?.action ?? DEFAULT_VARIANT_ACTION;

const readStoredBlacklistRegexes = (stored: {
  [key: string]: unknown;
}): string[] => {
  const blacklistRegexes = stored[BLACKLIST_REGEXES_STORAGE_KEY];
  if (Array.isArray(blacklistRegexes)) {
    return normalizeBlacklistRegexes(
      blacklistRegexes.filter((pattern): pattern is string => typeof pattern === "string"),
    );
  }

  const legacy = stored[LEGACY_BLACKLIST_REGEX_STORAGE_KEY];
  if (typeof legacy === "string") {
    return normalizeBlacklistRegexes([legacy]);
  }

  return [];
};

const readStoredRules = (
  stored: { [key: string]: unknown },
): { rules: UrlRule[]; skipPatterns: string[] } => {
  const urlRules = stored[URL_RULES_STORAGE_KEY];
  if (!Array.isArray(urlRules)) {
    return { rules: [], skipPatterns: [] };
  }

  const skipPatterns: string[] = [];
  const rules = normalizeRules(
    urlRules.flatMap((rule) => {
      if (typeof rule !== "object" || rule === null) {
        return [];
      }

      if (!("pattern" in rule) || typeof rule.pattern !== "string") {
        return [];
      }

      if (!("action" in rule) || typeof rule.action !== "string") {
        return [];
      }

      if (rule.action === "skip") {
        skipPatterns.push(rule.pattern);
        return [];
      }

      if (!isVariantPromptChoice(rule.action)) {
        return [];
      }

      return [{ pattern: rule.pattern, action: rule.action }];
    }),
  );

  return { rules, skipPatterns };
};

export const readSettings = async (): Promise<ExtensionSettings> => {
  const stored = await chrome.storage.sync.get([
    URL_RULES_STORAGE_KEY,
    BLACKLIST_REGEXES_STORAGE_KEY,
    LEGACY_BLACKLIST_REGEX_STORAGE_KEY,
  ]);
  const { rules, skipPatterns } = readStoredRules(stored);
  const blacklistRegexes = [
    ...readStoredBlacklistRegexes(stored),
    ...normalizeBlacklistRegexes(skipPatterns),
  ];

  return {
    blacklistRegexes: [...new Set(blacklistRegexes)],
    rules,
  };
};

export const writeSettings = async (
  settings: ExtensionSettings,
): Promise<void> => {
  await chrome.storage.sync.set({
    [BLACKLIST_REGEXES_STORAGE_KEY]: normalizeBlacklistRegexes(
      settings.blacklistRegexes,
    ),
    [URL_RULES_STORAGE_KEY]: normalizeRules(settings.rules),
  });
  await chrome.storage.sync.remove(LEGACY_BLACKLIST_REGEX_STORAGE_KEY);
};
