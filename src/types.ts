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

export type PendingPrompt = Readonly<{
  notificationId: string;
  newTabId: TabId;
  existingTabId: TabId;
}>;

export type PromptChoice = "switch" | "keep";
