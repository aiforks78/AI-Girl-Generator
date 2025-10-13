import { modelLabel } from "@/lib/labels";

export interface ShareJobLike {
  prompt?: string | null;
  prompt_enhanced?: string | null;
  model_id?: string | null;
  modelId?: string | null;
  title?: string | null;
}

const DESCRIPTION_MIN = 150;
const DESCRIPTION_MAX = 160;

function normalizeWhitespace(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function truncateWords(input: string, maxLen: number): string {
  if (!input) return "";
  if (input.length <= maxLen) return input;
  let slice = input.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > 40) {
    slice = slice.slice(0, lastSpace);
  }
  return slice.trim();
}

function buildPromptSnippet(job?: ShareJobLike | null): string {
  const rawPrompt = normalizeWhitespace(job?.prompt) || normalizeWhitespace(job?.prompt_enhanced);
  if (!rawPrompt) {
    const fallbackTitle = normalizeWhitespace(job?.title);
    return fallbackTitle || "AI girl scene";
  }

  const targetLen = 80;
  const snippet = truncateWords(rawPrompt, targetLen);
  return snippet.length >= 40 ? snippet : rawPrompt;
}

function resolveModelName(job?: ShareJobLike | null): string {
  const rawModel = normalizeWhitespace(job?.model_id) || normalizeWhitespace(job?.modelId);
  if (!rawModel) {
    return "AI girl generator model";
  }
  const label = normalizeWhitespace(modelLabel(rawModel));
  if (!label || label.toLowerCase() === "unknown model") {
    return "AI girl generator model";
  }
  return label;
}

export function buildShareMetaDescription(job?: ShareJobLike | null): string {
  const suffixPrefix = " – generated with ";
  const suffixTail = " on Girl Generator. Remix, download or license in one click.";
  const snippet = buildPromptSnippet(job);
  const modelName = resolveModelName(job);

  const baseSuffix = `${suffixPrefix}${modelName}${suffixTail}`;
  const maxPromptLength = Math.max(30, DESCRIPTION_MAX - baseSuffix.length);
  const promptSnippet = truncateWords(snippet, maxPromptLength);

  let description = `${promptSnippet}${baseSuffix}`;

  if (description.length > DESCRIPTION_MAX) {
    const adjustedPrompt = truncateWords(promptSnippet, DESCRIPTION_MAX - baseSuffix.length);
    description = `${adjustedPrompt}${baseSuffix}`;
  }

  if (description.length < DESCRIPTION_MIN) {
    const filler = "Create photorealistic AI girls for free.";
    const available = DESCRIPTION_MAX - description.length;
    if (available > 5) {
      const fillerSnippet = truncateWords(filler, available).trim();
      if (fillerSnippet) {
        description = `${description} ${fillerSnippet}`.replace(/\s+/g, " ").trim();
      }
    }
  }

  if (description.length > DESCRIPTION_MAX) {
    description = truncateWords(description, DESCRIPTION_MAX);
  }

  return description.trim();
}

export function buildShareMetaTitle(job?: ShareJobLike | null): string {
  const prompt = normalizeWhitespace(job?.prompt) || normalizeWhitespace(job?.prompt_enhanced);
  if (prompt) {
    const truncated = truncateWords(prompt, 60);
    return `${truncated} | Girl Generator`;
  }
  const title = normalizeWhitespace(job?.title);
  if (title) {
    return `${truncateWords(title, 60)} | Girl Generator`;
  }
  return "AI Video Preview | Girl Generator";
}

export function shareMetaHelpersForTesting() {
  return {
    normalizeWhitespace,
    truncateWords,
  };
}
