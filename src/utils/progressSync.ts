/**
 * 学习进度的本地收集 / 云端上传与恢复。
 * 词表、统计、每日计划、聊天、打卡日历、笔记本都在这份 payload 里。
 */

export const PROGRESS_KEYS = [
  'hangyeol_vocab_v1',
  'hangyeol_stats_v2',
  'hangyeol_chat_v1',
  'hangyeol_daily_plan_v1',
  'hangyeol_checkin_v1',
  'hangyeol_notes_v1',
] as const;

export const PROGRESS_CODE_KEY = 'hangyeol_progress_code_v1';
export const AUTOSYNC_KEY = 'hangyeol_autosync_v1';

export function getProgressCode(): string {
  try {
    return (window.localStorage.getItem(PROGRESS_CODE_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function setProgressCode(code: string): void {
  try {
    window.localStorage.setItem(PROGRESS_CODE_KEY, code.trim());
  } catch {
    // ignore
  }
}

export function isAutoSyncEnabled(): boolean {
  try {
    return window.localStorage.getItem(AUTOSYNC_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setAutoSyncEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(AUTOSYNC_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

export function collectProgress(): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    app: 'hangyeol',
    version: 2,
  };
  for (const key of PROGRESS_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      payload[key] = JSON.parse(raw);
    } catch {
      // 跳过损坏的键
    }
  }
  return payload;
}

export function applyProgress(payload: Record<string, unknown>): number {
  let restored = 0;
  for (const key of PROGRESS_KEYS) {
    const value = payload[key];
    if (value === undefined) continue;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      restored += 1;
    } catch {
      // ignore
    }
  }
  return restored;
}

export async function uploadProgress(code: string): Promise<{ savedAt?: string; error?: string }> {
  const res = await fetch(`/api/progress/${encodeURIComponent(code)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(collectProgress()),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; savedAt?: string; error?: string };
  if (!res.ok || !data.ok) return { error: data.error || `HTTP ${res.status}` };
  return { savedAt: data.savedAt };
}

export async function downloadProgress(
  code: string
): Promise<{ exists: boolean; data?: Record<string, unknown> | null; error?: string }> {
  const res = await fetch(`/api/progress/${encodeURIComponent(code)}`);
  const data = (await res.json().catch(() => ({}))) as {
    exists?: boolean;
    data?: Record<string, unknown> | null;
    error?: string;
  };
  if (!res.ok) return { exists: false, error: data.error || `HTTP ${res.status}` };
  return { exists: Boolean(data.exists), data: data.data ?? null };
}

/** 本地是否已经有学习数据（用于判断要不要自动拉取云端） */
export function hasLocalLearningData(): boolean {
  try {
    const vocab = window.localStorage.getItem('hangyeol_vocab_v1');
    const parsed = vocab ? (JSON.parse(vocab) as unknown[]) : [];
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}
