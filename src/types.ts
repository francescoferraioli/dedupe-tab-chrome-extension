export type TabId = number;

export type NormalizedUrl = string & { readonly __brand: unique symbol };

export type TabSnapshot = Readonly<{
  id: TabId;
  url: string;
  windowId: number;
  index: number;
  lastAccessed: number;
}>;

export type DuplicateMatch = Readonly<{
  newTab: TabSnapshot;
  existingTab: TabSnapshot;
  normalizedUrl: NormalizedUrl;
}>;

export type PendingClosure = Readonly<{
  closureId: string;
  newTabId: TabId;
  existingTabId: TabId;
}>;
