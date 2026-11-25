import type { ExpressionCoachResponse } from '../types/learning.ts';

/**
 * Strips markdown code fences, extracts the first balanced JSON object/array,
 * repairs literal unescaped newlines/tabs inside JSON strings, and removes
 * trailing commas before closing brackets/braces.
 */
function stripMarkdownFences(raw: string): string {
  const trimmed = raw.replace(/^\uFEFF/, '').trim();
  const fencedMatch = trimmed.match(/^```(?:json|JSON)?\s*\r?\n?([\s\S]*?)\r?\n?```$/);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }
  const inlineFence = trimmed.match(/```(?:json|JSON)?\s*\r?\n?([\s\S]*?)\r?\n?```/);
  if (inlineFence) {
    return inlineFence[1].trim();
  }
  return trimmed;
}

function extractBalancedJson(raw: string): string {
  const firstObj = raw.indexOf('{');
  const firstArr = raw.indexOf('[');
  let start = -1;
  let openChar = '{';
  let closeChar = '}';

  if (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) {
    start = firstObj;
    openChar = '{';
    closeChar = '}';
  } else if (firstArr !== -1) {
    start = firstArr;
    openChar = '[';
    closeChar = ']';
  }

  if (start === -1) return raw;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === openChar) {
      depth += 1;
    } else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  return raw.slice(start);
}

function repairCommonJsonIssues(input: string): string {
  // Escape literal control characters inside JSON string literals and remove trailing commas outside strings
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
      } else if (ch === '\\') {
        out += ch;
        escaped = true;
      } else if (ch === '"') {
        out += ch;
        inString = false;
      } else if (ch === '\n') {
        out += '\\n';
      } else if (ch === '\r') {
        out += '\\r';
      } else if (ch === '\t') {
        out += '\\t';
      } else {
        out += ch;
      }
    } else {
      if (ch === '"') {
        inString = true;
        out += ch;
      } else if (ch === ',') {
        // Look ahead past whitespace for closing '}' or ']'
        let j = i + 1;
        while (j < input.length && /\s/.test(input[j])) j++;
        if (input[j] === '}' || input[j] === ']') {
          continue;
        }
        out += ch;
      } else {
        out += ch;
      }
    }
  }

  return out;
}

export class AiJsonParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiJsonParseError';
  }
}

export function parseAiJson<T>(text: string | undefined, fallbackError: string): T {
  const cleaned = (text ?? '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    throw new AiJsonParseError(fallbackError);
  }

  // Attempt 1: direct JSON.parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Proceed to resilient extraction & repair
  }

  // Attempt 2: strip markdown fences
  const unfenced = stripMarkdownFences(cleaned);
  try {
    return JSON.parse(unfenced) as T;
  } catch {
    // Proceed to balanced slice
  }

  // Attempt 3: extract first balanced JSON block + repair control chars / trailing commas
  const balanced = extractBalancedJson(unfenced);
  try {
    return JSON.parse(balanced) as T;
  } catch {
    const repaired = repairCommonJsonIssues(balanced);
    try {
      return JSON.parse(repaired) as T;
    } catch {
      throw new AiJsonParseError(`${fallbackError}（模型返回格式异常，请重试）`);
    }
  }
}

export const parseGeminiJson = parseAiJson;

export function normalizeExpressionCoachResponse(raw: unknown): ExpressionCoachResponse {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawTextbook = (obj.textbookExample && typeof obj.textbookExample === 'object'
    ? obj.textbookExample
    : {}) as Record<string, unknown>;
  const rawExpressions = Array.isArray(obj.expressions) ? obj.expressions : [];

  const expressions = rawExpressions
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const kv = (item.keyVocab && typeof item.keyVocab === 'object'
        ? item.keyVocab
        : {}) as Record<string, unknown>;
      return {
        korean: String(item.korean || '').trim(),
        spokenPronunciation: String(item.spokenPronunciation || '').trim(),
        romanization: String(item.romanization || '').trim(),
        chinese: String(item.chinese || '').trim(),
        speechLevel: String(item.speechLevel || '해요체').trim(),
        socialContext: String(item.socialContext || '日常对话').trim(),
        nuanceTip: String(item.nuanceTip || '').trim(),
        keyVocab: {
          word: String(kv.word || '').trim(),
          lemma: String(kv.lemma || kv.word || '').trim(),
          meaningZh: String(kv.meaningZh || '').trim(),
          memriseTip: String(kv.memriseTip || '').trim(),
        },
      };
    })
    .filter((item) => item.korean.length > 0);

  if (expressions.length === 0) {
    throw new AiJsonParseError('地道表达建议返回不完整，请点击重试。');
  }

  return {
    situationSummary: String(obj.situationSummary || '首尔日常社交礼仪与自然表达建议').trim(),
    textbookExample: {
      korean: String(rawTextbook.korean || '').trim(),
      whyStiff: String(rawTextbook.whyStiff || '该直译说法偏书面，日常口语中略显生硬。').trim(),
    },
    expressions,
  };
}
