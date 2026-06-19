import type { NormalizedUrl } from "./types.js";

const DEDUPE_SCHEMES = new Set(["http:", "https:"]);

const isDedupeEligible = (url: string): boolean => {
  try {
    return DEDUPE_SCHEMES.has(new URL(url).protocol);
  } catch {
    return false;
  }
};

const stripTrailingSlash = (pathname: string): string =>
  pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;

export const normalizeUrl = (rawUrl: string): NormalizedUrl | null => {
  if (!isDedupeEligible(rawUrl)) {
    return null;
  }

  const parsed = new URL(rawUrl);
  parsed.hash = "";
  parsed.pathname = stripTrailingSlash(parsed.pathname);

  return parsed.toString() as NormalizedUrl;
};

export const urlsMatch = (
  left: string,
  right: string,
): boolean => {
  const normalizedLeft = normalizeUrl(left);
  const normalizedRight = normalizeUrl(right);

  return (
    normalizedLeft !== null &&
    normalizedRight !== null &&
    normalizedLeft === normalizedRight
  );
};
