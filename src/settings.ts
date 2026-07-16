export const BLACKLIST_REGEXES_STORAGE_KEY = "blacklistRegexes";

/** @deprecated Migrated to {@link BLACKLIST_REGEXES_STORAGE_KEY}. */
const LEGACY_BLACKLIST_REGEX_STORAGE_KEY = "blacklistRegex";

export type ExtensionSettings = Readonly<{
  blacklistRegexes: readonly string[];
}>;

const DEFAULT_SETTINGS: ExtensionSettings = {
  blacklistRegexes: [],
};

export const normalizeBlacklistRegexes = (
  patterns: readonly string[],
): string[] =>
  patterns.map((pattern) => pattern.trim()).filter((pattern) => pattern.length > 0);

export const parseBlacklistRegexesText = (text: string): string[] =>
  normalizeBlacklistRegexes(text.split(/\r?\n/));

export const formatBlacklistRegexesText = (
  patterns: readonly string[],
): string => normalizeBlacklistRegexes(patterns).join("\n");

export const compileBlacklistRegex = (pattern: string): RegExp | null => {
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

export const findInvalidBlacklistRegex = (
  patterns: readonly string[],
): string | null => {
  for (const pattern of normalizeBlacklistRegexes(patterns)) {
    if (compileBlacklistRegex(pattern) === null) {
      return pattern;
    }
  }

  return null;
};

export const isUrlBlacklisted = (
  url: string,
  blacklistRegexes: readonly string[],
): boolean =>
  normalizeBlacklistRegexes(blacklistRegexes).some((pattern) => {
    const compiled = compileBlacklistRegex(pattern);
    return compiled !== null && compiled.test(url);
  });

const readStoredBlacklistRegexes = (stored: {
  [key: string]: unknown;
}): string[] | null => {
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

  return null;
};

export const readSettings = async (): Promise<ExtensionSettings> => {
  const stored = await chrome.storage.sync.get([
    BLACKLIST_REGEXES_STORAGE_KEY,
    LEGACY_BLACKLIST_REGEX_STORAGE_KEY,
  ]);
  const blacklistRegexes = readStoredBlacklistRegexes(stored);

  if (blacklistRegexes === null) {
    return DEFAULT_SETTINGS;
  }

  return { blacklistRegexes };
};

export const writeSettings = async (
  settings: ExtensionSettings,
): Promise<void> => {
  await chrome.storage.sync.set({
    [BLACKLIST_REGEXES_STORAGE_KEY]: normalizeBlacklistRegexes(
      settings.blacklistRegexes,
    ),
  });
  await chrome.storage.sync.remove(LEGACY_BLACKLIST_REGEX_STORAGE_KEY);
};
