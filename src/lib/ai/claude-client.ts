/**
 * Claude Client — shared Anthropic SDK wrapper
 *
 * Every AI feature (product descriptions, expense categorization, analytics
 * insights, theme styling, photo QA, marketing image prompts, legal page
 * drafts, delivery-zone intake) goes through this module. Do not instantiate
 * Anthropic() directly in a route handler — routes should only call the
 * helpers exported here.
 *
 * Model choice: claude-haiku-4-5, deliberately, for every feature in this
 * app. This was a cost-driven decision (see docs/AI_FEATURES_PLAN.md) — do
 * not swap to a different default model without updating that doc's cost
 * tables, since they assume Haiku pricing throughout.
 *
 * Pattern: generate-then-save, not agentic tool-use. Callers pass a system
 * prompt + user content and a JSON schema; this module returns parsed,
 * validated JSON. Callers persist it via Prisma themselves. Claude never
 * calls back into our own API routes.
 */

import Anthropic from '@anthropic-ai/sdk';

export const AI_MODEL = 'claude-haiku-4-5' as const;

let client: Anthropic | null = null;

/**
 * Lazily-constructed singleton. Throws a typed error at call time (not
 * import time) if ANTHROPIC_API_KEY is missing, so a route can catch it and
 * fail soft rather than crashing the whole module graph on boot.
 */
function getClient(): Anthropic {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiConfigError('ANTHROPIC_API_KEY is not set.');
  }

  client = new Anthropic({ apiKey });
  return client;
}

/** Thrown when the client is misconfigured (missing API key, etc.) — a deploy/config problem, not a runtime AI failure. */
export class AiConfigError extends Error {}

/**
 * Thrown for any failure calling Claude (rate limit, overload, refusal,
 * network error, invalid response shape). Callers should catch this
 * specifically and fail soft — per the AI plan's core guardrail, no AI
 * feature may ever block the underlying save/create action it's attached to.
 */
export class AiRequestError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AiRequestError';
  }
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateJsonParams {
  /** Stable system prompt — instructions, tone, output-shape rules. Keep this identical across calls for the same feature; it's the biggest lever on prompt-token overhead when batching. */
  system: string;
  /** The per-request content — what varies each call (product data, expense notes, analytics numbers, etc.) */
  userContent: string;
  /** JSON Schema the response must conform to (draft-2020-12 subset — see Anthropic structured-outputs docs for supported keywords). */
  schema: Record<string, unknown>;
  /** Hard cap on output tokens. Size this per-feature — batched calls need more room than single-item ones. */
  maxTokens: number;
}

export interface GenerateJsonResult<T = unknown> {
  data: T;
  usage: AiUsage;
}

/**
 * Shared call+parse+error-handling path for every structured-JSON variant
 * below (single-turn text, vision, multi-turn conversation). Each variant
 * only differs in how it builds `messages` — this is what actually talks to
 * the API and turns the response into { data, usage } or a typed error.
 */
async function callClaudeForJson<T>(
  messages: Anthropic.MessageParam[],
  system: string,
  schema: Record<string, unknown>,
  maxTokens: number,
): Promise<GenerateJsonResult<T>> {
  const anthropic = getClient();

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
      output_config: {
        format: {
          type: 'json_schema',
          schema,
        },
      },
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new AiRequestError('Claude response contained no text block.');
    }

    let data: T;
    try {
      data = JSON.parse(textBlock.text) as T;
    } catch (parseError) {
      throw new AiRequestError('Claude response was not valid JSON despite output_config.format.', parseError);
    }

    return {
      data,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error) {
    if (error instanceof AiRequestError) throw error;
    throw new AiRequestError(describeAnthropicError(error), error);
  }
}

/**
 * Text-only structured generation — the shape used by every single-turn,
 * non-vision feature (descriptions, expense categorization, analytics
 * insights, theme styling from a text prompt, legal-page drafts).
 */
export async function generateJson<T = unknown>(
  params: GenerateJsonParams,
): Promise<GenerateJsonResult<T>> {
  return callClaudeForJson<T>(
    [{ role: 'user', content: params.userContent }],
    params.system,
    params.schema,
    params.maxTokens,
  );
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateJsonFromConversationParams {
  system: string;
  /** Full history so far, oldest first. Must start with 'user' and alternate — the Messages API is stateless, so callers resend everything each turn. Pass a single synthetic opening user message (e.g. "(begin)") to kick off a conversation with no prior turns. */
  messages: ConversationMessage[];
  schema: Record<string, unknown>;
  maxTokens: number;
}

/**
 * Multi-turn structured generation — for conversational collection flows
 * (onboarding chat, and later the per-product / delivery-zone intake flows
 * that reuse the same pattern — see docs/ONBOARDING_AI_CHAT_PLAN.md). Unlike
 * generateJson/generateJsonFromImage, this is not a one-shot call: the
 * caller is expected to invoke it once per conversation turn, each time
 * with the growing message history, until the schema's own "done" signal
 * (however the caller's schema names it) comes back true.
 */
export async function generateJsonFromConversation<T = unknown>(
  params: GenerateJsonFromConversationParams,
): Promise<GenerateJsonResult<T>> {
  return callClaudeForJson<T>(
    params.messages.map((m) => ({ role: m.role, content: m.content })),
    params.system,
    params.schema,
    params.maxTokens,
  );
}

export interface GenerateJsonFromImageParams extends Omit<GenerateJsonParams, 'userContent'> {
  /** Instructional text alongside the image (e.g. "Analyze this product photo and...") */
  instructionText: string;
  /** Base64-encoded image data, no data: URI prefix. */
  imageBase64: string;
  imageMediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}

/**
 * Vision variant — used by product photo QA (Phase 5) and reference-screenshot
 * theme styling (Theme Track B2). Never used for image *generation* — Claude
 * has no image-generation capability; that stays on the existing Gemini
 * pipeline (see marketing-image prompt writing, which uses generateJson above,
 * not this function).
 */
export async function generateJsonFromImage<T = unknown>(
  params: GenerateJsonFromImageParams,
): Promise<GenerateJsonResult<T>> {
  return callClaudeForJson<T>(
    [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: params.imageMediaType,
              data: params.imageBase64,
            },
          },
          { type: 'text', text: params.instructionText },
        ],
      },
    ],
    params.system,
    params.schema,
    params.maxTokens,
  );
}

// Claude Haiku 4.5 list pricing, USD per token. Keep next to AI_MODEL —
// if the model constant above ever changes, these must change with it.
const HAIKU_INPUT_USD_PER_TOKEN = 1 / 1_000_000;
const HAIKU_OUTPUT_USD_PER_TOKEN = 5 / 1_000_000;

/** USD cost of a call, at Haiku 4.5 list pricing. Every AI route should call this right before recordAiUsage(). */
export function estimateCostUsd(usage: AiUsage): number {
  return usage.inputTokens * HAIKU_INPUT_USD_PER_TOKEN + usage.outputTokens * HAIKU_OUTPUT_USD_PER_TOKEN;
}

function describeAnthropicError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    return `Claude API error (${error.status}): ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error calling Claude.';
}
