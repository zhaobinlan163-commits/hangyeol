import { AsyncLocalStorage } from 'node:async_hooks';
import {
  AiJsonParseError,
  normalizeExpressionCoachResponse,
  parseAiJson,
} from '../utils/jsonParse.ts';
import type {
  ChatReplyPayload,
  ExpressionCoachResponse,
  GrammarEvaluation,
  ParsedSentence,
  PronunciationReport,
} from '../types/learning.ts';

export interface DeepSeekChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekRequestOptions {
  messages: DeepSeekChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
  /** DeepSeek V4 的思考模式开关，默认关闭以降低延迟与费用 */
  thinking?: 'enabled' | 'disabled';
}

/**
 * 用户在网页「设置」里填的密钥，通过请求头带到服务端。
 * 用 AsyncLocalStorage 做请求级覆盖，避免改动所有调用链的函数签名。
 */
export interface AiConfigOverride {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const aiConfigStore = new AsyncLocalStorage<AiConfigOverride>();

export function runWithAiConfig<T>(override: AiConfigOverride, fn: () => T): T {
  return aiConfigStore.run(override, fn);
}

function currentAiConfig(): AiConfigOverride {
  return aiConfigStore.getStore() || {};
}

export class DeepSeekHttpError extends Error {
  status: number;
  code: string;
  retryAfterMs?: number;

  constructor(message: string, status: number, code: string, retryAfterMs?: number) {
    super(message);
    this.name = 'DeepSeekHttpError';
    this.status = status;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export function getDeepSeekApiKey(): string {
  const key = (currentAiConfig().apiKey || process.env.DEEPSEEK_API_KEY || '').trim();
  if (!key || key === 'MY_DEEPSEEK_API_KEY') {
    throw new DeepSeekHttpError(
      '还没有可用的 DeepSeek API 密钥：请点右上角「设置」，填入你自己的 API Key（sk- 开头）。',
      503,
      'API_KEY_MISSING'
    );
  }
  return key;
}

export function hasConfiguredDeepSeekKey(): boolean {
  const key = (currentAiConfig().apiKey || process.env.DEEPSEEK_API_KEY || '').trim();
  return Boolean(key && key !== 'MY_DEEPSEEK_API_KEY');
}

export function getDeepSeekChatUrl(): string {
  const rawBase = (currentAiConfig().baseUrl || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com')
    .trim()
    .replace(/\/+$/, '');
  if (rawBase.endsWith('/chat/completions')) {
    return rawBase;
  }
  if (rawBase.endsWith('/v1')) {
    return `${rawBase}/chat/completions`;
  }
  return `${rawBase}/v1/chat/completions`;
}

export function getDefaultDeepSeekModel(): string {
  const model = (currentAiConfig().model || process.env.DEEPSEEK_MODEL || 'deepseek-flash').trim();
  return model || 'deepseek-flash';
}

export function formatFriendlyDeepSeekError(
  err: unknown,
  fallbackMessage: string
): { status: number; error: string; code: string } {
  if (err instanceof DeepSeekHttpError) {
    return {
      status: err.status,
      error: err.message,
      code: err.code,
    };
  }

  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();

  if (rawMessage.includes('DEEPSEEK_API_KEY_MISSING') || rawMessage.includes('API_KEY_MISSING')) {
    return {
      status: 503,
      error: '还没有可用的 DeepSeek API 密钥：请点右上角「设置」，填入你自己的 API Key（sk- 开头）。',
      code: 'API_KEY_MISSING',
    };
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('invalid_api_key') || lower.includes('authentication fails')) {
    return {
      status: 401,
      error: 'DeepSeek 密钥无效或已过期（401）：请到右上角「设置」重新填写 API Key。',
      code: 'API_KEY_INVALID',
    };
  }
  if (lower.includes('402') || lower.includes('insufficient balance') || lower.includes('insufficient_quota')) {
    return {
      status: 402,
      error: 'DeepSeek 账户余额不足（402），请在 DeepSeek 开放平台充值后重试。',
      code: 'INSUFFICIENT_BALANCE',
    };
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return {
      status: 403,
      error: 'DeepSeek 接口权限受限（403），请确认账号与模型权限状态。',
      code: 'PERMISSION_DENIED',
    };
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
    return {
      status: 429,
      error: 'DeepSeek 请求过于频繁（429），请稍等几秒后重试。',
      code: 'RATE_LIMITED',
    };
  }
  if (
    lower.includes('aborted') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    (err instanceof Error && err.name === 'AbortError')
  ) {
    return {
      status: 504,
      error: `${fallbackMessage}（DeepSeek 响应超时，请稍后重试）`,
      code: 'DEEPSEEK_TIMEOUT',
    };
  }
  if (
    lower.includes('fetch failed') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('enotfound') ||
    lower.includes('socket')
  ) {
    return {
      status: 502,
      error: `${fallbackMessage}（无法连接 DeepSeek 服务，请检查网络后重试）`,
      code: 'DEEPSEEK_NETWORK_ERROR',
    };
  }

  return {
    status: 500,
    error: `${fallbackMessage}：${rawMessage.slice(0, 220)}`,
    code: 'INTERNAL_ERROR',
  };
}

export function isRetryableDeepSeekError(err: unknown): boolean {
  if (err instanceof AiJsonParseError) {
    return true;
  }
  if (err instanceof DeepSeekHttpError) {
    if (err.code === 'API_KEY_MISSING' || err.status === 400 || err.status === 401 || err.status === 402 || err.status === 403 || err.status === 404) {
      return false;
    }
    return err.status === 408 || err.status === 429 || err.status >= 500;
  }
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('api_key_missing') || msg.includes('401') || msg.includes('402') || msg.includes('403') || msg.includes('400')) {
    return false;
  }
  return true;
}

function parseRetryAfterMs(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(4000, Math.round(seconds * 1000));
  }
  return undefined;
}

function computeBackoffMs(attemptIndex: number, retryAfterMs?: number): number {
  if (retryAfterMs && retryAfterMs > 0) {
    return retryAfterMs;
  }
  const base = attemptIndex === 0 ? 650 : 1700;
  const jitter = Math.floor(Math.random() * 250);
  return base + jitter;
}

function ensureJsonKeywordInMessages(messages: DeepSeekChatMessage[]): DeepSeekChatMessage[] {
  const hasJsonKeyword = messages.some((m) => /\bjson\b/i.test(m.content));
  if (hasJsonKeyword) {
    return messages;
  }
  if (messages[0]?.role === 'system') {
    return [
      { ...messages[0], content: `${messages[0].content}\n请严格只输出合法的 JSON 对象，不要包含额外说明。` },
      ...messages.slice(1),
    ];
  }
  return [
    { role: 'system', content: '请严格只输出合法的 JSON 对象，不要包含任何 Markdown 代码块以外的说明。' },
    ...messages,
  ];
}

function extractDeepSeekErrorText(rawBody: string, status: number): string {
  const trimmed = rawBody.trim();
  if (!trimmed) return `DeepSeek API HTTP ${status}`;
  if (trimmed.startsWith('<')) {
    return `DeepSeek 上游网关返回异常状态 (${status})`;
  }
  try {
    const parsed = JSON.parse(trimmed) as { error?: { message?: string; code?: string } | string; message?: string };
    if (typeof parsed.error === 'string' && parsed.error) return parsed.error;
    if (parsed.error && typeof parsed.error === 'object' && parsed.error.message) return parsed.error.message;
    if (parsed.message) return parsed.message;
  } catch {
    // Ignore non-JSON error text
  }
  return trimmed.slice(0, 220);
}

async function callDeepSeekOnce(options: DeepSeekRequestOptions): Promise<string> {
  const apiKey = getDeepSeekApiKey();
  const url = getDeepSeekChatUrl();
  const model = options.model || getDefaultDeepSeekModel();
  const timeoutMs = options.timeoutMs ?? 45000;
  const fetchFn = options.fetchImpl ?? fetch;

  const finalMessages = options.jsonMode
    ? ensureJsonKeywordInMessages(options.messages)
    : options.messages;

  const payload: Record<string, unknown> = {
    model,
    messages: finalMessages,
    temperature: options.temperature ?? (options.jsonMode ? 0.3 : 0.6),
    max_tokens: options.maxTokens ?? 2600,
    stream: false,
  };
  // DeepSeek V4 系列默认开启思考模式：会先输出一大段 reasoning_content，
  // 既慢又可能把 max_tokens 吃光导致 content 为空。本应用都是短任务
  // （判分、纠错、抽词），默认关闭；需要时用 options.thinking = 'enabled' 打开。
  // 只对 DeepSeek 模型/官方域名下发该参数，避免兼容第三方 OpenAI 接口时报错。
  let upstreamHost = '';
  try {
    upstreamHost = new URL(url).hostname;
  } catch {
    upstreamHost = '';
  }
  if (/^deepseek/i.test(model) || /(^|\.)deepseek\.com$/i.test(upstreamHost)) {
    payload.thinking = { type: options.thinking ?? 'disabled' };
  }
  if (options.jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: globalThis.Response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new DeepSeekHttpError('DeepSeek 请求超时，请稍后重试。', 504, 'DEEPSEEK_TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const bodyText = await response.text();
  if (!response.ok) {
    const upstreamMsg = extractDeepSeekErrorText(bodyText, response.status);
    const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));

    if (response.status === 401) {
      throw new DeepSeekHttpError(
        'DeepSeek 密钥无效或已过期（401）：请到右上角「设置」重新填写 API Key。',
        401,
        'API_KEY_INVALID'
      );
    }
    if (response.status === 402) {
      throw new DeepSeekHttpError(
        'DeepSeek 账户余额不足（402），请在 DeepSeek 开放平台充值后重试。',
        402,
        'INSUFFICIENT_BALANCE'
      );
    }
    if (response.status === 403) {
      throw new DeepSeekHttpError(
        'DeepSeek 接口权限受限（403），请确认当前 API 密钥权限。',
        403,
        'PERMISSION_DENIED'
      );
    }
    if (response.status === 429) {
      throw new DeepSeekHttpError(
        'DeepSeek 请求频率过高（429），请稍后再试。',
        429,
        'RATE_LIMITED',
        retryAfterMs
      );
    }
    throw new DeepSeekHttpError(
      `DeepSeek 服务暂时不可用 (${response.status})：${upstreamMsg}`,
      response.status,
      `HTTP_${response.status}`,
      retryAfterMs
    );
  }

  let data: {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };
  try {
    data = JSON.parse(bodyText) as typeof data;
  } catch {
    throw new DeepSeekHttpError('DeepSeek 返回了非预期响应格式，请重试。', 502, 'BAD_GATEWAY');
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    const reasoning = (
      data?.choices?.[0]?.message as { reasoning_content?: string } | undefined
    )?.reasoning_content;
    throw new AiJsonParseError(
      reasoning
        ? '模型只输出了思考过程、没有给出回答（思考模式占满了输出上限），请重试。'
        : 'DeepSeek 返回内容为空，请重试。'
    );
  }
  return content;
}

export async function callDeepSeekChat(options: DeepSeekRequestOptions): Promise<string> {
  const maxAttempts = Math.max(1, Math.min(4, options.maxAttempts ?? 3));
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await callDeepSeekOnce(options);
    } catch (err) {
      lastError = err;
      if (!isRetryableDeepSeekError(err) || attempt === maxAttempts - 1) {
        throw err;
      }
      const retryAfterMs = err instanceof DeepSeekHttpError ? err.retryAfterMs : undefined;
      await new Promise((resolve) => setTimeout(resolve, computeBackoffMs(attempt, retryAfterMs)));
    }
  }

  throw lastError;
}

export async function callDeepSeekJson<T>(
  options: DeepSeekRequestOptions & {
    fallbackError: string;
    normalize?: (raw: unknown) => T;
  }
): Promise<T> {
  const maxAttempts = Math.max(1, Math.min(4, options.maxAttempts ?? 3));
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const content = await callDeepSeekOnce({ ...options, jsonMode: true });
      const parsed = parseAiJson<unknown>(content, options.fallbackError);
      return options.normalize ? options.normalize(parsed) : (parsed as T);
    } catch (err) {
      lastError = err;
      if (!isRetryableDeepSeekError(err) || attempt === maxAttempts - 1) {
        throw err;
      }
      const retryAfterMs = err instanceof DeepSeekHttpError ? err.retryAfterMs : undefined;
      await new Promise((resolve) => setTimeout(resolve, computeBackoffMs(attempt, retryAfterMs)));
    }
  }

  throw lastError;
}

function toBoolean(val: unknown, fallback = false): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const clean = val.trim().toLowerCase();
    if (clean === 'true' || clean === 'yes' || clean === '1') return true;
    if (clean === 'false' || clean === 'no' || clean === '0') return false;
  }
  if (typeof val === 'number') return val !== 0;
  return fallback;
}

function clampScore(val: unknown, fallback = 75): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

export function normalizeChatReplyResponse(raw: unknown): ChatReplyPayload {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const replyZh = String(obj.replyZh || obj.reply || '').trim();
  if (!replyZh) {
    throw new AiJsonParseError('AI 私教回复为空，请重试。');
  }

  const rawSentences = Array.isArray(obj.koreanSentences) ? obj.koreanSentences : [];
  const koreanSentences = rawSentences
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
    .map((s) => ({
      korean: String(s.korean || '').trim(),
      spokenPronunciation: String(s.spokenPronunciation || '').trim(),
      chinese: String(s.chinese || '').trim(),
    }))
    .filter((s) => s.korean.length > 0);

  const rawVocab = Array.isArray(obj.keyVocab) ? obj.keyVocab : [];
  const keyVocab = rawVocab
    .filter((v): v is Record<string, unknown> => Boolean(v && typeof v === 'object'))
    .map((v) => ({
      word: String(v.word || '').trim(),
      lemma: String(v.lemma || v.word || '').trim(),
      meaningZh: String(v.meaningZh || '').trim(),
      memriseTip: String(v.memriseTip || '').trim(),
    }))
    .filter((v) => v.word.length > 0);

  const rawGrammar = (obj.grammarNote && typeof obj.grammarNote === 'object'
    ? obj.grammarNote
    : {}) as Record<string, unknown>;

  return {
    replyZh,
    koreanSentences,
    keyVocab,
    grammarNote: {
      pattern: String(rawGrammar.pattern || '').trim(),
      explanation: String(rawGrammar.explanation || '').trim(),
    },
    followUpPrompt: String(obj.followUpPrompt || '').trim(),
  };
}

export function normalizeGrammarEvaluationResponse(raw: unknown): GrammarEvaluation {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const correctedSentence = String(obj.correctedSentence || '').trim();
  const explanation = String(obj.explanation || '').trim();
  if (!correctedSentence && !explanation) {
    throw new AiJsonParseError('语法批改结果不完整，请重试。');
  }

  const score = clampScore(obj.score, 80);
  const isNatural = toBoolean(obj.isNatural, score >= 80);

  const rawErrors = Array.isArray(obj.errors) ? obj.errors : [];
  const errors = rawErrors
    .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === 'object'))
    .map((e) => ({
      original: String(e.original || '').trim(),
      suggestion: String(e.suggestion || '').trim(),
      reason: String(e.reason || '').trim(),
    }))
    .filter((e) => e.original.length > 0 || e.suggestion.length > 0 || e.reason.length > 0);

  const rawUpgrades = Array.isArray(obj.nativeUpgrades) ? obj.nativeUpgrades : [];
  const nativeUpgrades = rawUpgrades
    .filter((u): u is Record<string, unknown> => Boolean(u && typeof u === 'object'))
    .map((u) => ({
      korean: String(u.korean || '').trim(),
      chinese: String(u.chinese || '').trim(),
      tone: String(u.tone || '해요체 · 日常自然').trim(),
    }))
    .filter((u) => u.korean.length > 0);

  return {
    isNatural,
    score,
    verdictLabel: String(obj.verdictLabel || (isNatural ? '地道自然' : '语法需微调')).trim(),
    correctedSentence,
    spokenPronunciation: String(obj.spokenPronunciation || '').trim(),
    explanation: explanation || '已完成语法接续与助词检查。',
    errors,
    nativeUpgrades,
  };
}

export function normalizePronunciationReportResponse(
  raw: unknown,
  fallbackTargetKorean = ''
): PronunciationReport {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const overallSummary = String(obj.overallSummary || '').trim();
  const heardKorean = String(obj.heardKorean || fallbackTargetKorean).trim();
  if (!overallSummary && !heardKorean) {
    throw new AiJsonParseError('发音诊断结果不完整，请重试。');
  }

  const accuracyScore = clampScore(obj.accuracyScore, 80);

  const rawRules = Array.isArray(obj.phoneticRules) ? obj.phoneticRules : [];
  const phoneticRules = rawRules
    .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object'))
    .map((r) => ({
      ruleName: String(r.ruleName || '音变规则').trim(),
      exampleInSentence: String(r.exampleInSentence || '').trim(),
      explanation: String(r.explanation || '').trim(),
    }))
    .filter((r) => r.explanation.length > 0 || r.exampleInSentence.length > 0);

  const rawSyllables = Array.isArray(obj.syllableFeedback) ? obj.syllableFeedback : [];
  const syllableFeedback = rawSyllables
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
    .map((s) => {
      const rawStatus = String(s.status || 'accurate').trim();
      const status =
        rawStatus === 'needs_work' || rawStatus === 'missed' || rawStatus === 'accurate'
          ? rawStatus
          : 'accurate';
      return {
        segment: String(s.segment || '').trim(),
        expectedPronunciation: String(s.expectedPronunciation || '').trim(),
        status,
        tip: String(s.tip || '').trim(),
      };
    })
    .filter((s) => s.segment.length > 0);

  const rawAlternatives = Array.isArray(obj.authenticAlternatives) ? obj.authenticAlternatives : [];
  const authenticAlternatives = rawAlternatives
    .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === 'object'))
    .map((a) => ({
      korean: String(a.korean || '').trim(),
      spokenPronunciation: String(a.spokenPronunciation || '').trim(),
      chinese: String(a.chinese || '').trim(),
      speechLevel: String(a.speechLevel || '해요체').trim(),
      socialContext: String(a.socialContext || '首尔日常对话').trim(),
    }))
    .filter((a) => a.korean.length > 0);

  return {
    heardKorean,
    accuracyScore,
    verdictLabel: String(obj.verdictLabel || (accuracyScore >= 85 ? '地道自然' : '连音与收音可继续打磨')).trim(),
    overallSummary: overallSummary || '已完成目标韩语句的连音、收音与语调分析。',
    intonationAdvice: String(obj.intonationAdvice || '句尾保持平稳略降，重音落在语义核心词上。').trim(),
    phoneticRules,
    syllableFeedback,
    authenticAlternatives,
  };
}

export function normalizeParsedSentenceResponse(
  raw: unknown,
  fallbackSentence = ''
): ParsedSentence {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const sentence = String(fallbackSentence || obj.sentence || '').trim();
  const naturalTranslation = String(obj.naturalTranslation || '').trim();
  if (!sentence || !naturalTranslation) {
    throw new AiJsonParseError('台词解析返回不完整，请点击重试。');
  }

  const rawTokens = Array.isArray(obj.tokens) ? obj.tokens : [];
  const tokens = rawTokens
    .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
    .map((t) => ({
      surface: String(t.surface || '').trim(),
      lemma: String(t.lemma || t.surface || '').trim(),
      pos: String(t.pos || '词汇').trim(),
      meaningZh: String(t.meaningZh || '').trim(),
      memriseTip: String(t.memriseTip || '').trim(),
      nuance: String(t.nuance || '').trim(),
      isKeyVocab: toBoolean(t.isKeyVocab, true),
      exampleKr: String(t.exampleKr || '').trim(),
      exampleZh: String(t.exampleZh || '').trim(),
    }))
    .filter((t) => t.surface.length > 0);

  const rawGrammar = Array.isArray(obj.grammarPoints) ? obj.grammarPoints : [];
  const grammarPoints = rawGrammar
    .filter((g): g is Record<string, unknown> => Boolean(g && typeof g === 'object'))
    .map((g) => ({
      pattern: String(g.pattern || '').trim(),
      meaningZh: String(g.meaningZh || '').trim(),
      usageNote: String(g.usageNote || '').trim(),
      exampleKr: String(g.exampleKr || '').trim(),
      exampleZh: String(g.exampleZh || '').trim(),
    }))
    .filter((g) => g.pattern.length > 0);

  return {
    sentence,
    naturalTranslation,
    literalTranslation: String(obj.literalTranslation || naturalTranslation).trim(),
    speechLevel: String(obj.speechLevel || '해요체').trim(),
    spokenPronunciation: String(obj.spokenPronunciation || `[${sentence}]`).trim(),
    romanization: String(obj.romanization || '').trim(),
    culturalNuance: String(obj.culturalNuance || '').trim(),
    tokens,
    grammarPoints,
  };
}

export { normalizeExpressionCoachResponse };
export type { ExpressionCoachResponse };
