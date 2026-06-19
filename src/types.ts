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
  promptId: string;
  newTabId: TabId;
  existingTabId: TabId;
  windowId?: number;
}>;

export type PromptChoice = "switch" | "keep";

export type PromptChoiceMessage = Readonly<{
  type: "prompt-choice";
  promptId: string;
  choice: PromptChoice;
}>;

export const isPromptChoiceMessage = (
  value: unknown,
): value is PromptChoiceMessage =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  value.type === "prompt-choice" &&
  "promptId" in value &&
  typeof value.promptId === "string" &&
  "choice" in value &&
  (value.choice === "switch" || value.choice === "keep");
