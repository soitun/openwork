/**
 * Run kind classifier for routing chat vs task without UI changes.
 * Uses fast rules first, then LLM fallback if ambiguous.
 */

import { getApiKey, type ApiKeyProvider } from '../store/secureStorage';

export type RunKind = 'chat' | 'task';

export interface RunKindDecision {
  kind: RunKind;
  confidence: number;
  source: 'rules' | 'llm' | 'fallback';
}

const CHAT_PHRASES = new Set([
  'hi',
  'hey',
  'hello',
  'yo',
  'sup',
  "what's up",
  'whats up',
  'thanks',
  'thank you',
  'thx',
  'ok',
  'okay',
  'k',
  'cool',
  'great',
  'nice',
  'awesome',
  'lol',
  'haha',
  'hehe',
  'good morning',
  'good afternoon',
  'good evening',
  'good night',
  'gm',
  'gn',
  'bye',
  'goodbye',
  'see you',
]);

const TASK_CUES = [
  'continue',
  'go ahead',
  'proceed',
  'resume',
  'keep going',
  'carry on',
  'start',
  'run',
  'do it',
  'please do',
  'please continue',
  'please proceed',
  'next',
  'next step',
  'finish',
  'complete',
  'fix',
  'update',
  'add',
  'remove',
  'change',
  'implement',
  'review',
  'summarize',
  'explain',
  'write',
  'build',
  'create',
  'search',
  'find',
  'analyze',
  'check',
  'look up',
  'refactor',
  'debug',
  'test',
  'deploy',
  'install',
  'configure',
  'set up',
  'setup',
];

const CLASSIFIER_PROMPT = `You are a classifier. Decide whether the user message is "chat" or "task".

Definitions:
- "chat": greetings, acknowledgements, thanks, small talk, pleasantries, or social responses with no request to do work.
- "task": a request to do or continue work, change code, use tools, answer a substantive question, or perform actions.

Return ONLY a JSON object with keys:
{"kind": "chat" or "task", "confidence": number between 0 and 1}

If uncertain, choose "task" with confidence 0.5.

User message:
"""\n`;

export async function classifyRunKind(prompt: string): Promise<RunKindDecision> {
  const ruleDecision = classifyWithRules(prompt);
  if (ruleDecision) return ruleDecision;

  const llmDecision = await classifyWithProviders(prompt);
  if (llmDecision) return llmDecision;

  return { kind: 'task', confidence: 0.5, source: 'fallback' };
}

function classifyWithRules(prompt: string): RunKindDecision | null {
  const normalized = normalizePrompt(prompt);
  if (!normalized) return null;

  if (CHAT_PHRASES.has(normalized)) {
    return { kind: 'chat', confidence: 0.9, source: 'rules' };
  }

  if (isOnlyEmojiOrPunctuation(normalized)) {
    return { kind: 'chat', confidence: 0.8, source: 'rules' };
  }

  if (containsTaskCue(normalized)) {
    return { kind: 'task', confidence: 0.8, source: 'rules' };
  }

  return null;
}

function normalizePrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\s"'`~!@#$%^&*()_+=\-[\]{}|\\:;,.<>/?]+/g, '')
    .replace(/[\s"'`~!@#$%^&*()_+=\-[\]{}|\\:;,.<>/?]+$/g, '')
    .trim();
}

function isOnlyEmojiOrPunctuation(value: string): boolean {
  const noWord = value.replace(/[\p{L}\p{N}]/gu, '').trim();
  return noWord.length > 0 && noWord.length >= value.length;
}

function containsTaskCue(value: string): boolean {
  return TASK_CUES.some((cue) => value.includes(cue));
}

async function classifyWithProviders(prompt: string): Promise<RunKindDecision | null> {
  const providers: ApiKeyProvider[] = ['anthropic', 'openai', 'google', 'xai'];

  for (const provider of providers) {
    const apiKey = getApiKey(provider);
    if (!apiKey) continue;

    try {
      const text = await callProvider(provider, apiKey, prompt);
      const decision = parseDecision(text);
      if (decision) return decision;
    } catch (error) {
      console.warn(`[RunKindClassifier] ${provider} failed:`, error);
    }
  }

  return null;
}

async function callProvider(
  provider: ApiKeyProvider,
  apiKey: string,
  prompt: string
): Promise<string> {
  switch (provider) {
    case 'anthropic':
      return callAnthropic(apiKey, prompt);
    case 'openai':
      return callOpenAI(apiKey, prompt);
    case 'google':
      return callGoogle(apiKey, prompt);
    case 'xai':
      return callXAI(apiKey, prompt);
    default:
      return '';
  }
}

async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 80,
      messages: [
        {
          role: 'user',
          content: CLASSIFIER_PROMPT + prompt + '\n"""',
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  return data.content?.[0]?.text || '';
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 80,
      messages: [
        {
          role: 'user',
          content: CLASSIFIER_PROMPT + prompt + '\n"""',
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices?.[0]?.message?.content || '';
}

async function callGoogle(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: CLASSIFIER_PROMPT + prompt + '\n"""' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 80,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callXAI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-3',
      max_tokens: 80,
      messages: [
        {
          role: 'user',
          content: CLASSIFIER_PROMPT + prompt + '\n"""',
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`xAI API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices?.[0]?.message?.content || '';
}

function parseDecision(text: string): RunKindDecision | null {
  const json = extractJson(text);
  if (!json) return null;

  try {
    const parsed = JSON.parse(json) as { kind?: string; confidence?: number };
    const kind = normalizeKind(parsed.kind);
    if (!kind) return null;
    const confidence = clampConfidence(parsed.confidence);
    return { kind, confidence, source: 'llm' };
  } catch {
    return null;
  }
}

function extractJson(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function normalizeKind(value: string | undefined): RunKind | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'chat' || normalized === 'task') return normalized;
  return null;
}

function clampConfidence(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
