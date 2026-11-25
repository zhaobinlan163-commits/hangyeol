import { useEffect, useRef, useState } from 'react';
import {
  downloadProgress,
  getProgressCode,
  isAutoSyncEnabled,
  markSynced,
  mergeProgress,
  uploadProgress,
} from '../utils/progressSync';

const RESTORE_FLAG = 'hangyeol_auto_restored_v1';

/**
 * 自动同步：
 * - 页面打开时把云端数据「合并」进本地（打卡日历按较大值合并，不会覆盖本机时长）
 * - 设置过存档码后，数据变化约 8 秒后静默上传
 */
export function useAutoSync(version: string) {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const restoredRef = useRef(false);

  // 打开页面时合并云端存档（每个会话只做一次）
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const code = getProgressCode();
    if (!code || !isAutoSyncEnabled()) return;
    try {
      if (window.sessionStorage.getItem(RESTORE_FLAG) === '1') return;
      window.sessionStorage.setItem(RESTORE_FLAG, '1');
    } catch {
      // ignore
    }

    void (async () => {
      try {
        const res = await downloadProgress(code);
        if (!res.exists || !res.data) return;
        const changed = mergeProgress(res.data);
        if (changed > 0) window.location.reload();
      } catch {
        // 网络异常就等下一条数据再同步
      }
    })();
  }, []);

  // 数据变化后 8 秒静默上传
  useEffect(() => {
    if (!isAutoSyncEnabled()) return;
    const code = getProgressCode();
    if (!code) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      uploadProgress(code)
        .then((r) => {
          if (r.savedAt) {
            markSynced(r.savedAt);
            setLastSyncedAt(r.savedAt);
          }
        })
        .catch(() => {
          // 静默失败，下次变化再试
        });
    }, 8000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [version]);

  return { lastSyncedAt };
}
