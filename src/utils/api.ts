/**
 * Safe JSON fetch utility that prevents raw "Unexpected token '<'" errors
 * when an API endpoint, proxy, or gateway returns HTML or plain text.
 *
 * 同时负责把用户在网页「设置」里填的 DeepSeek 配置随请求带给后端
 * （请求头 x-deepseek-key / x-deepseek-base / x-deepseek-model），
 * 这样每个人可以用自己的 API Key，而服务器不需要保存任何密钥。
 */

export interface ResponseLike {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const AI_CONFIG_STORAGE_KEY = 'hangyeol_ai_config_v1';

export const DEFAULT_AI_CONFIG: AiConfig = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-flash',
};

export function loadAiConfig(): AiConfig {
  try {
    const raw = window.localStorage.getItem(AI_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : '',
      baseUrl: (typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim()) || DEFAULT_AI_CONFIG.baseUrl,
      model: (typeof parsed.model === 'string' && parsed.model.trim()) || DEFAULT_AI_CONFIG.model,
    };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAiConfig(config: AiConfig): void {
  try {
    window.localStorage.setItem(
      AI_CONFIG_STORAGE_KEY,
      JSON.stringify({
        apiKey: config.apiKey.trim(),
        baseUrl: config.baseUrl.trim() || DEFAULT_AI_CONFIG.baseUrl,
        model: config.model.trim() || DEFAULT_AI_CONFIG.model,
      })
    );
  } catch {
    // Ignore storage quota errors — UI still works for this session
  }
}

export function clearAiConfig(): void {
  try {
    window.localStorage.removeItem(AI_CONFIG_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function hasUserApiKey(): boolean {
  return loadAiConfig().apiKey.length > 0;
}

export function buildAiHeaders(): Record<string, string> {
  const config = loadAiConfig();
  const headers: Record<string, string> = {};
  if (config.apiKey) headers['x-deepseek-key'] = config.apiKey;
  if (config.baseUrl) headers['x-deepseek-base'] = config.baseUrl;
  if (config.model) headers['x-deepseek-model'] = config.model;
  return headers;
}

export async function parseFetchJsonResponse<T>(
  res: ResponseLike,
  fallbackError: string
): Promise<T> {
  const rawText = (await res.text()).replace(/^\uFEFF/, '').trim();

  if (!rawText) {
    if (!res.ok) {
      throw new Error(`${fallbackError}（HTTP ${res.status}）`);
    }
    throw new Error(`${fallbackError}（服务返回为空，请稍后重试）`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const looksLikeHtml =
      rawText.startsWith('<!DOCTYPE') ||
      rawText.startsWith('<html') ||
      rawText.startsWith('<HTML') ||
      rawText.startsWith('<');
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error(`${fallbackError}（服务响应超时或正在重启，HTTP ${res.status}，请稍后再试）`);
    }
    if (looksLikeHtml || res.status === 404) {
      throw new Error(`${fallbackError}（后端接口返回异常页面，请刷新页面或重启服务后重试）`);
    }
    throw new Error(`${fallbackError}（响应数据解析失败，请稍后重试）`);
  }

  if (!res.ok) {
    const errMsg =
      parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as { error?: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : `${fallbackError}（HTTP ${res.status}）`;
    throw new Error(errMsg);
  }

  return parsed as T;
}

export async function safeFetchJson<T>(
  url: string,
  init: RequestInit | undefined,
  fallbackError: string
): Promise<T> {
  const headers = new Headers(init?.headers);
  const aiHeaders = buildAiHeaders();
  for (const [key, value] of Object.entries(aiHeaders)) {
    if (!headers.has(key)) headers.set(key, value);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    throw new Error(`${fallbackError}（网络连接中断，请检查网络或服务状态后重试）`);
  }
  return parseFetchJsonResponse<T>(res, fallbackError);
}
