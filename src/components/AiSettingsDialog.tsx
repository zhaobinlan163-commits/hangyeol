import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import {
  DEFAULT_AI_CONFIG,
  clearAiConfig,
  loadAiConfig,
  saveAiConfig,
  type AiConfig,
} from '../utils/api';
import {
  applyProgress,
  collectProgress,
  getProgressCode,
} from '../utils/progressSync';

type StatusTone = 'idle' | 'busy' | 'ok' | 'error';

interface AiSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AiSettingsDialog({ open, onClose, onSaved }: AiSettingsDialogProps) {
  const [config, setConfig] = useState<AiConfig>(DEFAULT_AI_CONFIG);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; text: string }>({
    tone: 'idle',
    text: '',
  });
  const [progressStatus, setProgressStatus] = useState<{ tone: StatusTone; text: string }>({
    tone: 'idle',
    text: '',
  });
  const [progressCode, setProgressCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setConfig(loadAiConfig());
    setStatus({ tone: 'idle', text: '' });
    setProgressStatus({ tone: 'idle', text: '' });
    try {
      setProgressCode(getProgressCode());
    } catch {
      setProgressCode('');
    }
  }, [open]);

  if (!open) return null;

  const buildHeaders = (target: AiConfig): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (target.apiKey.trim()) headers['x-deepseek-key'] = target.apiKey.trim();
    if (target.baseUrl.trim()) headers['x-deepseek-base'] = target.baseUrl.trim();
    if (target.model.trim()) headers['x-deepseek-model'] = target.model.trim();
    return headers;
  };

  const handleTest = async () => {
    if (!config.apiKey.trim()) {
      setStatus({ tone: 'error', text: '先填入 API Key 再测试。' });
      return;
    }
    setStatus({ tone: 'busy', text: '正在连接 DeepSeek…' });
    try {
      const res = await fetch('/api/ai/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildHeaders(config) },
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; model?: string; error?: string };
      if (res.ok && data.ok) {
        setStatus({ tone: 'ok', text: `连接成功，模型 ${data.model || config.model} 可用。` });
      } else {
        setStatus({ tone: 'error', text: data.error || `连接失败（HTTP ${res.status}）。` });
      }
    } catch {
      setStatus({ tone: 'error', text: '网络异常，无法连接服务器。' });
    }
  };

  const handleSave = () => {
    saveAiConfig(config);
    setStatus({ tone: 'ok', text: '已保存到本机浏览器，AI 功能立即生效。' });
    onSaved?.();
  };

  const handleClear = () => {
    clearAiConfig();
    setConfig({ ...DEFAULT_AI_CONFIG });
    setStatus({ tone: 'idle', text: '已清除本机保存的密钥。' });
    onSaved?.();
  };

  // 清空本机学习数据（词库/进度/打卡/聊天），AI Key 与笔记本保留
  const handleResetLearningData = () => {
    const ok = window.confirm(
      '清空本机的词库、学习进度、打卡记录和聊天记录？\nAI Key 和笔记本会保留。此操作不可恢复。'
    );
    if (!ok) return;
    for (const key of [
      'hangyeol_vocab_v1',
      'hangyeol_stats_v2',
      'hangyeol_daily_plan_v1',
      'hangyeol_chat_v1',
      'hangyeol_checkin_v1',
    ]) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
    window.location.reload();
  };

  const handleExport = () => {    try {
      const blob = new Blob([JSON.stringify(collectProgress(), null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `hangyeol-progress-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setProgressStatus({ tone: 'ok', text: '已导出进度文件，换设备时导入即可。' });
    } catch {
      setProgressStatus({ tone: 'error', text: '导出失败，请重试。' });
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as Record<string, unknown>;
      const count = applyProgress(payload);
      if (count === 0) {
        setProgressStatus({ tone: 'error', text: '这个文件里没有可识别的进度数据。' });
        return;
      }
      setProgressStatus({ tone: 'ok', text: `已导入 ${count} 项数据，正在刷新…` });
      window.setTimeout(() => window.location.reload(), 600);
    } catch {
      setProgressStatus({ tone: 'error', text: '文件解析失败，请确认是本应用导出的 JSON。' });
    }
  };

  const handleCloudUpload = async () => {
    const code = progressCode.trim();
    if (!/^[A-Za-z0-9_-]{4,32}$/.test(code)) {
      setProgressStatus({ tone: 'error', text: '存档码需为 4–32 位字母、数字、下划线或短横线。' });
      return;
    }
    setProgressStatus({ tone: 'busy', text: '正在上传存档…' });
    try {
      window.localStorage.setItem('hangyeol_progress_code_v1', code);
      const res = await fetch(`/api/progress/${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectProgress()),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setProgressStatus({ tone: 'ok', text: '已上传，换设备输入同一个存档码就能恢复。' });
      } else {
        setProgressStatus({ tone: 'error', text: data.error || `上传失败（HTTP ${res.status}）。` });
      }
    } catch {
      setProgressStatus({ tone: 'error', text: '上传失败，请检查网络。' });
    }
  };

  const handleCloudDownload = async () => {
    const code = progressCode.trim();
    if (!/^[A-Za-z0-9_-]{4,32}$/.test(code)) {
      setProgressStatus({ tone: 'error', text: '存档码需为 4–32 位字母、数字、下划线或短横线。' });
      return;
    }
    setProgressStatus({ tone: 'busy', text: '正在读取云端存档…' });
    try {
      window.localStorage.setItem('hangyeol_progress_code_v1', code);
      const res = await fetch(`/api/progress/${encodeURIComponent(code)}`);
      const data = (await res.json().catch(() => ({}))) as {
        exists?: boolean;
        data?: Record<string, unknown> | null;
        error?: string;
      };
      if (!res.ok) {
        setProgressStatus({ tone: 'error', text: data.error || `读取失败（HTTP ${res.status}）。` });
        return;
      }
      if (!data.exists || !data.data) {
        setProgressStatus({ tone: 'error', text: '这个存档码下还没有存档。' });
        return;
      }
      const count = applyProgress(data.data);
      setProgressStatus({ tone: 'ok', text: `已恢复 ${count} 项数据，正在刷新…` });
      window.setTimeout(() => window.location.reload(), 600);
    } catch {
      setProgressStatus({ tone: 'error', text: '读取失败，请检查网络。' });
    }
  };

  const toneClass =
    status.tone === 'ok'
      ? 'text-emerald-700'
      : status.tone === 'error'
        ? 'text-rose-600'
        : 'text-slate-500';

  const progressToneClass =
    progressStatus.tone === 'ok'
      ? 'text-emerald-700'
      : progressStatus.tone === 'error'
        ? 'text-rose-600'
        : 'text-slate-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-settings-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg my-8 bg-white rounded-2xl shadow-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 id="ai-settings-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-700" aria-hidden="true" />
            设置 · API 与进度
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* API 配置 */}
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">我的 DeepSeek API</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                只存在本机浏览器，服务器不保存。
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-slate-600">API Key</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  autoComplete="off"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                  className="p-2 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Base URL</span>
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="https://api.deepseek.com"
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">模型</span>
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
                  placeholder="deepseek-flash"
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={status.tone === 'busy'}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5"
              >
                {status.tone === 'busy' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                测试
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                保存
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
              >
                清除
              </button>
            </div>

            {status.text && (
              <p className={`text-xs ${toneClass} flex items-start gap-1.5`}>
                {status.tone === 'error' && <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                <span>{status.text}</span>
              </p>
            )}
          </section>

          <hr className="border-slate-100" />

          {/* 进度存档 */}
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">学习进度</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                存在本机浏览器；换设备用导出或存档码。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> 导出
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer inline-flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> 导入
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                  e.target.value = '';
                }}
              />
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">云存档码（自定，和朋友共用同一台服务器）</span>
                <input
                  type="text"
                  value={progressCode}
                  onChange={(e) => setProgressCode(e.target.value)}
                  placeholder="例如 mimi-2026"
                  className="mt-1 w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloudUpload}
                  className="px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CloudUpload className="w-3.5 h-3.5" /> 上传
                </button>
                <button
                  type="button"
                  onClick={handleCloudDownload}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CloudDownload className="w-3.5 h-3.5" /> 恢复
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                填好存档码后会自动同步（约 8 秒一次），包含词表、进度、打卡日历与每日练习时长；知道存档码的人可读写。
              </p>
            </div>

            {progressStatus.text && (
              <p className={`text-xs ${progressToneClass} flex items-start gap-1.5`}>
                {progressStatus.tone === 'error' && <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                <span>{progressStatus.text}</span>
              </p>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">从零开始？</span>
              <button
                type="button"
                onClick={handleResetLearningData}
                className="text-[11px] font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md cursor-pointer"
              >
                清空本机学习数据
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
