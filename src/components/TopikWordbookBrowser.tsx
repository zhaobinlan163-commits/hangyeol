import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import type { OfficialTopikWord, TopikBookStats } from '../types/learning';
import { safeFetchJson } from '../utils/api';
import { KoreanReadButton } from './KoreanReadButton';

interface TopikWordbookBrowserProps {
  speakKorean: (text: string, opts?: { slow?: boolean }) => Promise<void>;
  isKeyLoading: (text: string, slow?: boolean) => boolean;
  isKeyPlaying: (text: string, slow?: boolean) => boolean;
  hasWordInGarden: (koreanOrLemma: string) => boolean;
  onImportWords: (words: OfficialTopikWord[]) => number;
  onSwitchToGarden: () => void;
}

interface TopikWordsResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: OfficialTopikWord[];
}

const LEVEL_TABS = [
  { id: 'all', label: '全部词书' },
  { id: 'TOPIK 1级', label: 'TOPIK 1级' },
  { id: 'TOPIK 2级', label: 'TOPIK 2级' },
  { id: 'TOPIK 3级', label: 'TOPIK 3级' },
  { id: 'TOPIK 4级', label: 'TOPIK 4级' },
  { id: 'TOPIK 5级', label: 'TOPIK 5级' },
  { id: 'TOPIK 6级', label: 'TOPIK 6级' },
] as const;

const PAGE_SIZE = 24;

export function TopikWordbookBrowser({
  speakKorean,
  isKeyLoading,
  isKeyPlaying,
  hasWordInGarden,
  onImportWords,
  onSwitchToGarden,
}: TopikWordbookBrowserProps) {
  const [stats, setStats] = useState<TopikBookStats | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [officialOnly, setOfficialOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<OfficialTopikWord[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Load official wordbook stats once
  useEffect(() => {
    let active = true;
    safeFetchJson<TopikBookStats>('/api/topik/stats', undefined, '无法加载 TOPIK 词书统计')
      .then((data) => {
        if (active) setStats(data);
      })
      .catch(() => {
        // Non-blocking fallback
      });
    return () => {
      active = false;
    };
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Fetch paginated words whenever filters change
  const fetchWords = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        level: selectedLevel,
        q: debouncedQuery,
        officialOnly: officialOnly ? 'true' : 'false',
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const data = await safeFetchJson<TopikWordsResponse>(
        `/api/topik/words?${params.toString()}`,
        undefined,
        '加载官方 TOPIK 词书失败'
      );
      setItems(data.items || []);
      setTotalMatches(data.total || 0);
      setTotalPages(Math.max(1, data.totalPages || 1));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '加载词书失败，请检查网络连接。');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevel, debouncedQuery, officialOnly, page]);

  useEffect(() => {
    void fetchWords();
  }, [fetchWords]);

  const handleSelectLevel = (levelId: string) => {
    setSelectedLevel(levelId);
    setPage(1);
    setImportNotice(null);
  };

  const handleToggleOfficialOnly = () => {
    setOfficialOnly((prev) => !prev);
    setPage(1);
    setImportNotice(null);
  };

  const handleImportSingle = (word: OfficialTopikWord) => {
    const added = onImportWords([word]);
    if (added > 0) {
      setImportNotice(`已将「${word.korean} · ${word.meaningZh}」加入你的复习花园！`);
    }
  };

  const unimportedOnPage = items.filter((w) => !hasWordInGarden(w.korean));

  const handleBatchImportPage = () => {
    if (unimportedOnPage.length === 0) return;
    const added = onImportWords(unimportedOnPage);
    if (added > 0) {
      setImportNotice(`已批量导入本页 ${added} 个 TOPIK 新词到你的复习花园，可随时开启间隔重复背诵！`);
    }
  };

  return (
    <section aria-label="TOPIK 官方大纲词书" className="space-y-6">
      {/* Header Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-6 border-b border-slate-100">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-medium text-blue-700 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                国立国语院 (NIKL) + TOPIK 1–6级官方分级词表 · 共{' '}
                <strong className="tabular-nums font-semibold">
                  {stats ? stats.total.toLocaleString() : '4,056'}
                </strong>{' '}
                词
              </span>
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              TOPIK 1–6级官方完整词书
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              完整覆盖初级（TOPIK 1–2级）、中级（TOPIK 3–4级）与高级（TOPIK 5–6级）高频词汇，含中韩双语释义、汉字词源、音变读音与固定搭配。点击任意词汇可直接试听常速/慢速发音，或批量导入到你的忆术家复习花园。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={unimportedOnPage.length === 0 || isLoading}
              onClick={handleBatchImportPage}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              {unimportedOnPage.length > 0
                ? `一键导入本页 ${unimportedOnPage.length} 个新词`
                : '本页词汇已全部在花园中'}
            </button>
            <button
              type="button"
              onClick={onSwitchToGarden}
              className="px-4 py-2.5 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              返回我的复习花园
            </button>
          </div>
        </div>

        {/* Level Tabs Strip */}
        <div className="space-y-3">
          <div
            role="tablist"
            aria-label="TOPIK 官方词书等级筛选"
            className="flex flex-wrap items-center gap-2"
          >
            {LEVEL_TABS.map((tab) => {
              const isActive = selectedLevel === tab.id;
              const count =
                tab.id === 'all'
                  ? stats?.total
                  : stats?.levels?.[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSelectLevel(tab.id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    isActive
                      ? 'bg-blue-700 border-blue-700 text-white font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                  {typeof count === 'number' ? ` (${count.toLocaleString()})` : ''}
                </button>
              );
            })}
          </div>

          {/* Search & Official-Only Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-xl">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="official-topik-search" className="sr-only">
                搜索 TOPIK 官方词书（支持韩语、中文、汉字词或英文）
              </label>
              <input
                id="official-topik-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜索韩语单词、中文释义、汉字词（如：후배 / 经济 / 習慣）……"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={officialOnly}
                  onChange={handleToggleOfficialOnly}
                  className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600 cursor-pointer"
                />
                <span>
                  仅看 NIKL/TOPIK 官方核验高频词 (
                  <span className="tabular-nums font-medium">
                    {stats ? stats.officialCount.toLocaleString() : '2,143'}
                  </span>
                  )
                </span>
              </label>
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
              <span className="tabular-nums text-slate-700 font-medium">
                当前匹配 {totalMatches.toLocaleString()} 词
              </span>
            </div>
          </div>
        </div>

        {/* Import Feedback Toast */}
        {importNotice && (
          <div
            role="status"
            className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900"
          >
            <span className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              {importNotice}
            </span>
            <button
              type="button"
              onClick={onSwitchToGarden}
              className="font-semibold text-emerald-800 hover:underline cursor-pointer shrink-0"
            >
              前往花园立即背诵 →
            </button>
          </div>
        )}
      </div>

      {/* Error State */}
      {loadError && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-sm text-rose-800"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {loadError}
          </span>
          <button
            type="button"
            onClick={() => void fetchWords()}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-rose-200 rounded-lg hover:bg-rose-50 cursor-pointer"
          >
            重新加载
          </button>
        </div>
      )}

      {/* Paginated Word Grid */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-16 flex flex-col items-center justify-center gap-3 text-sm text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-blue-700" aria-hidden="true" />
          <span>正在检索 TOPIK 官方词书……</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center space-y-2">
          <p className="text-sm font-medium text-slate-700">未找到匹配的 TOPIK 词汇</p>
          <p className="text-xs text-slate-500">
            请尝试清空关键词、切换到“全部词书”，或取消勾选“仅看官方核验高频词”。
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          data-testid="topik-official-grid"
        >
          {items.map((word) => {
            const inGarden = hasWordInGarden(word.korean);
            return (
              <article
                key={word.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h2 className="font-kr text-xl font-bold text-slate-900">
                          {word.korean}
                        </h2>
                        <span className="font-mono-tabular text-xs text-blue-700">
                          {word.spokenPronunciation}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-blue-700">{word.level}</span>
                        {word.isOfficialTopik && (
                          <>
                            {' · '}
                            <span className="text-emerald-700 font-medium">
                              {word.officialGrade || '官方大纲'}
                            </span>
                          </>
                        )}
                        {word.pos ? ` · ${word.pos}` : ''}
                        {word.hanja ? ` · 汉字「${word.hanja}」` : ''}
                      </p>
                    </div>

                    <KoreanReadButton
                      text={word.korean}
                      speakKorean={speakKorean}
                      isKeyLoading={isKeyLoading}
                      isKeyPlaying={isKeyPlaying}
                      showSlow
                      compact
                    />
                  </div>

                  <p className="text-base font-semibold text-slate-900">
                    {word.meaningZh}
                    {word.english ? (
                      <span className="text-xs font-normal text-slate-500 ml-2">
                        {word.english}
                      </span>
                    ) : null}
                  </p>

                  {word.collocation && (
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                      <span className="font-kr truncate">
                        搭配：{word.collocation}
                        {word.collocationZh && (
                          <span className="font-sans text-slate-500"> · {word.collocationZh}</span>
                        )}
                      </span>
                      <KoreanReadButton
                        text={word.collocation}
                        speakKorean={speakKorean}
                        isKeyLoading={isKeyLoading}
                        isKeyPlaying={isKeyPlaying}
                        compact
                        label="读搭配"
                      />
                    </div>
                  )}

                  {word.memriseTip && (
                    <p className="text-xs text-slate-600 leading-relaxed">{word.memriseTip}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    第 {word.chapter} 课{word.freqRank > 0 ? ` · 词频 #${word.freqRank}` : ''}
                  </span>
                  {inGarden ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      已在复习花园
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleImportSingle(word)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      加入背词计划
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalMatches > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-600 tabular-nums">
            第 <strong className="text-slate-900">{page}</strong> / {totalPages} 页 · 共{' '}
            <strong className="text-slate-900">{totalMatches.toLocaleString()}</strong> 个 TOPIK 词汇
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors cursor-pointer disabled:cursor-default"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              上一页
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors cursor-pointer disabled:cursor-default"
            >
              下一页
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
