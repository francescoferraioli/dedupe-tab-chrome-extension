export type TabId = number;

export type NormalizedUrl = string & { readonly __brand: unique symbol };

export type UrlPath = string & { readonly __brand: unique symbol };

export type DuplicateMatchKind = "exact" | "variant";

export type TabSnapshot = Readonly<{
  id: TabId;
  url: string;
  windowId: number;
  index: number;
  lastAccessed: number;
}>;

export type DuplicateMatch = Readonly<{
  kind: DuplicateMatchKind;
  newTab: TabSnapshot;
  existingTab: TabSnapshot;
  normalizedUrl: NormalizedUrl;
}>;

export type PendingClosure = Readonly<{
  closureId: string;
  newTabId: TabId;
  existingTabId: TabId;
}>;

export type VariantPromptChoice =
  | "switch"
  | "switch-and-reload"
  | "keep"
  | "close-other";

export type PendingVariantPrompt = Readonly<{
  promptId: string;
  match: DuplicateMatch;
  windowId?: number;
}>;

export type VariantPromptChoiceMessage = Readonly<{
  type: "variant-prompt-choice";
  promptId: string;
  choice: VariantPromptChoice;
}>;

const VARIANT_PROMPT_CHOICES = new Set<VariantPromptChoice>([
  "switch",
  "switch-and-reload",
  "keep",
  "close-other",
]);

export const isVariantPromptChoiceMessage = (
  value: unknown,
): value is VariantPromptChoiceMessage =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  value.type === "variant-prompt-choice" &&
  "promptId" in value &&
  typeof value.promptId === "string" &&
  "choice" in value &&
  typeof value.choice === "string" &&
  VARIANT_PROMPT_CHOICES.has(value.choice as VariantPromptChoice);
