import { useEffect, useRef, useState } from 'react';
import {
  applyProgress,
  downloadProgress,
  getProgressCode,
  hasLocalLearningData,
  isAutoSyncEnabled,
  uploadProgress,
} from '../utils/progressSync';

/**
 * 自动同步：设置过「云存档码」后，学习数据变化会在后台静默上传；
 * 换设备首次进入且本地为空时，自动拉取云端存档。
 *
 * version 是外部传入的「数据指纹」，变化才会触发上传（避免每秒都发）。
 */
export function useAutoSync(version: string) {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const restoredRef = useRef(false);

  // 新设备：本地没数据就自动从云端恢复一次
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const code = getProgressCode();
    if (!code || !isAutoSyncEnabled() || hasLocalLearningData()) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await downloadProgress(code);
        if (cancelled || !res.exists || !res.data) return;
        const count = applyProgress(res.data);
        if (count > 0) window.location.reload();
      } catch {
        // 忽略：下次有变化再同步
      }
    })();

    return () => {
      cancelled = true;
    };
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
            setLastSyncedAt(r.savedAt);
            setSyncError(null);
          } else if (r.error) {
            setSyncError(r.error);
          }
        })
        .catch(() => setSyncError('网络异常'));
    }, 8000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [version]);

  return { lastSyncedAt, syncError };
}
