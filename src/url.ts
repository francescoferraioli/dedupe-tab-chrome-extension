import type { NormalizedUrl, UrlPath } from "./types.js";

const DEDUPE_SCHEMES = new Set(["http:", "https:"]);

export type UrlMatchKind = "exact" | "variant" | "none";

export type UrlPartDifference = Readonly<{
  searchDiffers: boolean;
  hashDiffers: boolean;
}>;

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

const parseEligibleUrl = (rawUrl: string): URL | null => {
  if (!isDedupeEligible(rawUrl)) {
    return null;
  }

  const parsed = new URL(rawUrl);
  parsed.pathname = stripTrailingSlash(parsed.pathname);
  return parsed;
};

const formatOptionalUrlPart = (value: string): string =>
  value.length > 0 ? value : "(none)";

export const normalizeUrl = (rawUrl: string): NormalizedUrl | null => {
  const parsed = parseEligibleUrl(rawUrl);
  if (parsed === null) {
    return null;
  }

  return parsed.toString() as NormalizedUrl;
};

export const normalizeUrlPath = (rawUrl: string): UrlPath | null => {
  const parsed = parseEligibleUrl(rawUrl);
  if (parsed === null) {
    return null;
  }

  parsed.search = "";
  parsed.hash = "";
  return parsed.toString() as UrlPath;
};

export const classifyUrlMatch = (
  left: string,
  right: string,
): UrlMatchKind => {
  const normalizedLeft = normalizeUrl(left);
  const normalizedRight = normalizeUrl(right);
  if (normalizedLeft === null || normalizedRight === null) {
    return "none";
  }

  if (normalizedLeft === normalizedRight) {
    return "exact";
  }

  const pathLeft = normalizeUrlPath(left);
  const pathRight = normalizeUrlPath(right);
  if (pathLeft === null || pathRight === null) {
    return "none";
  }

  return pathLeft === pathRight ? "variant" : "none";
};

export const describeUrlPartDifference = (
  left: string,
  right: string,
): UrlPartDifference => {
  const leftParsed = parseEligibleUrl(left);
  const rightParsed = parseEligibleUrl(right);
  if (leftParsed === null || rightParsed === null) {
    return { searchDiffers: false, hashDiffers: false };
  }

  return {
    searchDiffers: leftParsed.search !== rightParsed.search,
    hashDiffers: leftParsed.hash !== rightParsed.hash,
  };
};

export const formatSearch = (rawUrl: string): string => {
  const parsed = parseEligibleUrl(rawUrl);
  return parsed === null ? "(none)" : formatOptionalUrlPart(parsed.search);
};

export const formatHash = (rawUrl: string): string => {
  const parsed = parseEligibleUrl(rawUrl);
  return parsed === null ? "(none)" : formatOptionalUrlPart(parsed.hash);
};

export const formatPathLabel = (rawUrl: string): string => {
  const path = normalizeUrlPath(rawUrl);
  if (path === null) {
    return rawUrl;
  }

  try {
    const parsed = new URL(path);
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.hostname}${pathname}`;
  } catch {
    return path;
  }
};

export const urlsMatch = (
  left: string,
  right: string,
): boolean => classifyUrlMatch(left, right) === "exact";

/** True when only the hash fragment changed (e.g. /page#a → /page#b or /page#a → /page). */
export const isHashChangeNavigation = (
  previousUrl: string,
  nextUrl: string,
): boolean => {
  try {
    const previous = new URL(previousUrl);
    const next = new URL(nextUrl);
    if (previous.hash === next.hash) {
      return false;
    }

    previous.hash = "";
    next.hash = "";
    return previous.href === next.href;
  } catch {
    return false;
  }
};
