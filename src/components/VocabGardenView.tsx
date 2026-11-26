import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Trash2,
  TrendingUp,
  Volume2,
  X,
} from 'lucide-react';
import type {
  DailyStats,
  DailyTargetLevel,
  DailyVocabPlan,
  DailyVocabStage,
  EbbinghausOutcome,
  OfficialTopikWord,
  TopikLevel,
  VocabCard,
} from '../types/learning';
import { safeFetchJson } from '../utils/api';
import {
  EBBINGHAUS_STEPS,
  buildCheckpointExamQueue,
  buildEbbinghausReviewQueue,
  computeEbbinghausSummary,
  formatEbbinghausStatus,
} from '../utils/ebbinghaus';
import {
  computeGardenSummary,
  countByTopikLevel,
  isCardDue,
} from '../utils/srs';
import { DailyVocabSession } from './DailyVocabSession';
import { CheckinCalendar } from './CheckinCalendar';
import { GrowthStageIcon } from './GrowthStageIcon';
import { KoreanReadButton } from './KoreanReadButton';
import { TopikWordbookBrowser } from './TopikWordbookBrowser';

type FilterMode = 'today' | 'forgotten' | 'all' | 'due' | 'bloomed' | 'video';
type TopikFilter = 'all' | TopikLevel;
type VocabSubView = 'garden' | 'official_book';

const FILTER_LABELS: Record<FilterMode, string> = {
  today: '今日词单',
  forgotten: '没记住',
  all: '全部',
  due: '待复习',
  bloomed: '已掌握',
  video: '视频收藏',
};

const DAILY_COUNT_PRESETS = [10, 15, 20, 30] as const;
const AUTO_SPEAK_STORAGE_KEY = 'hangyeol_auto_speak_v1';

const DAILY_LEVEL_OPTIONS: Array<{ id: DailyTargetLevel; label: string }> = [
  { id: 'all', label: '全部 TOPIK' },
  { id: 'TOPIK 1级', label: 'TOPIK 1级' },
  { id: 'TOPIK 2级', label: 'TOPIK 2级' },
  { id: 'TOPIK 3级', label: 'TOPIK 3级' },
  { id: 'TOPIK 4级', label: 'TOPIK 4级' },
  { id: 'TOPIK 5级', label: 'TOPIK 5级' },
  { id: 'TOPIK 6级', label: 'TOPIK 6级' },
];

const TOPIK_LEVEL_TABS: Array<{ id: TopikFilter; label: string }> = [
  { id: 'all', label: '全部词库' },
  { id: 'TOPIK 1级', label: 'TOPIK 1级' },
  { id: 'TOPIK 2级', label: 'TOPIK 2级' },
  { id: 'TOPIK 3-4级', label: 'TOPIK 3-4级' },
  { id: 'TOPIK 5-6级', label: 'TOPIK 5-6级' },
  { id: '日常拓展', label: '日常拓展' },
];

interface DailyDrawResponse {
  words: OfficialTopikWord[];
  level: string;
  count: number;
  requestedCount: number;
  remainingPoolCount: number;
  totalLevelPoolCount: number;
}

interface VocabGardenViewProps {
  cards: VocabCard[];
  stats: DailyStats;
  dailyPlan: DailyVocabPlan;
  autoLaunchTrigger: number;
  speakKorean: (text: string, opts?: { slow?: boolean }) => Promise<void>;
  isKeyPlaying: (text: string, slow?: boolean) => boolean;
  isKeyLoading: (text: string, slow?: boolean) => boolean;
  onSetDailyConfig: (dailyCount: number, targetLevel: DailyTargetLevel) => void;
  onApplyDailyDrawnWords: (
    words: OfficialTopikWord[],
    level: DailyTargetLevel,
    count: number,
    resetStageProgress?: boolean
  ) => string[];
  onRecordEbbinghausOutcome: (
    cardId: string,
    outcome: EbbinghausOutcome,
    stage: DailyVocabStage
  ) => void;
  onRecordReview: (cardId: string, isCorrect: boolean, isPlanting?: boolean) => void;
  onUpdateMem: (cardId: string, mem: string) => void;
  onAddCustomVocab: (input: {
    korean: string;
    meaningZh: string;
    spokenPronunciation?: string;
    pos?: string;
    memriseTip?: string;
    exampleKr?: string;
    exampleZh?: string;
  }) => { ok: boolean; error?: string };
  hasWordInGarden: (koreanOrLemma: string) => boolean;
  onImportOfficialTopikWords: (words: OfficialTopikWord[]) => number;
  onDeleteCard: (cardId: string) => void;
  checkins: Record<string, number>;
  todayCheckinSeconds: number;
  checkinTargetSeconds: number;
}

export function VocabGardenView({
  cards,
  stats,
  dailyPlan,
  autoLaunchTrigger,
  speakKorean,
  isKeyPlaying,
  isKeyLoading,
  onSetDailyConfig,
  onApplyDailyDrawnWords,
  onRecordEbbinghausOutcome,
  onRecordReview,
  onUpdateMem,
  onAddCustomVocab,
  hasWordInGarden,
  onImportOfficialTopikWords,
  onDeleteCard,
  checkins,
  todayCheckinSeconds,
  checkinTargetSeconds,
}: VocabGardenViewProps) {
  const [subView, setSubView] = useState<VocabSubView>('garden');
  const [filter, setFilter] = useState<FilterMode>('today');
  const [topikFilter, setTopikFilter] = useState<TopikFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(cards[0]?.id ?? null);
  const [editingMemId, setEditingMemId] = useState<string | null>(null);
  const [memDraft, setMemDraft] = useState('');

  // Adjustable daily quota draft (syncs with dailyPlan)
  const [draftCount, setDraftCount] = useState<number>(dailyPlan.dailyCount);
  const [draftLevel, setDraftLevel] = useState<DailyTargetLevel>(dailyPlan.targetLevel);

  // 闪卡自动朗读：开关存在 localStorage，进入会话后沿用
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(AUTO_SPEAK_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  // 词表折叠三档：全部 / 只显示 6 个 / 全部收起（手机默认 6 个）
  const [listMode, setListMode] = useState<'all' | 'six' | 'none'>(() => {
    try {
      return window.matchMedia('(min-width: 1024px)').matches ? 'all' : 'six';
    } catch {
      return 'all';
    }
  });
  const LIST_PREVIEW_COUNT = 6;

  // 筛选条折叠：手机默认收起成一行
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(() => {
    try {
      return window.matchMedia('(min-width: 640px)').matches;
    } catch {
      return true;
    }
  });
  const [isDrawingDaily, setIsDrawingDaily] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [drawPoolMeta, setDrawPoolMeta] = useState<{
    remainingPoolCount: number;
    totalLevelPoolCount: number;
  } | null>(null);

  // Active 3-Stage / Flashcard Session State
  const [activeSession, setActiveSession] = useState<{
    stage: DailyVocabStage;
    queue: VocabCard[];
  } | null>(null);

  // Custom word form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKorean, setNewKorean] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newPronunciation, setNewPronunciation] = useState('');
  const [newMem, setNewMem] = useState('');
  const [newExampleKr, setNewExampleKr] = useState('');
  const [newExampleZh, setNewExampleZh] = useState('');
  const [addFormError, setAddFormError] = useState<string | null>(null);

  useEffect(() => {
    setDraftCount(dailyPlan.dailyCount);
    setDraftLevel(dailyPlan.targetLevel);
  }, [dailyPlan.dailyCount, dailyPlan.targetLevel]);

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const todayDrawnCards = useMemo(() => {
    return dailyPlan.drawnCardIds
      .map((id) => cardById.get(id))
      .filter((c): c is VocabCard => Boolean(c));
  }, [dailyPlan.drawnCardIds, cardById]);

  const forgottenCards = useMemo(
    () => cards.filter((c) => Boolean(c.isForgotten)),
    [cards]
  );

  const ebbinghausSummary = useMemo(() => computeEbbinghausSummary(cards), [cards]);

  const drawDailyTopikDeck = useCallback(
    async (countToDraw: number, levelToDraw: DailyTargetLevel, forceNewBatch = false) => {
      setIsDrawingDaily(true);
      setDrawError(null);
      try {
        const learnedWordsToExclude = cards.map((c) => c.korean);

        const seed = `${dailyPlan.dateKey}-${levelToDraw}-${countToDraw}-${
          forceNewBatch ? dailyPlan.drawNonce + 1 + Date.now() % 997 : dailyPlan.drawNonce
        }`;

        const data = await safeFetchJson<DailyDrawResponse>(
          '/api/topik/daily-draw',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              count: countToDraw,
              level: levelToDraw,
              excludeWords: learnedWordsToExclude,
              sequential: true,
              seed,
            }),
          },
          '从 TOPIK 官方词库抽取今日词单失败'
        );

        if (!data.words || data.words.length === 0) {
          setDrawError('这个级别里没有更多新词了：可以切换 TOPIK 等级，或明天再来。');
          return;
        }

        const ids = onApplyDailyDrawnWords(data.words, levelToDraw, countToDraw, true);
        setDrawPoolMeta({
          remainingPoolCount: data.remainingPoolCount,
          totalLevelPoolCount: data.totalLevelPoolCount,
        });
        if (ids.length > 0) {
          setSelectedCardId(ids[0]);
        }
      } catch (err) {
        setDrawError(err instanceof Error ? err.message : '抽取今日 TOPIK 单词失败，请重试。');
      } finally {
        setIsDrawingDaily(false);
      }
    },
    [cards, dailyPlan.dateKey, dailyPlan.drawNonce, onApplyDailyDrawnWords]
  );

  // 不再自动抽词：新用户词库为空，由用户点「抽取 N 词」开始

  const launchStage = useCallback(
    (stage: DailyVocabStage, customQueue?: VocabCard[]) => {
      if (customQueue && customQueue.length > 0) {
        setActiveSession({ stage, queue: customQueue });
        return;
      }

      if (stage === 'learn') {
        const unconfirmedToday = todayDrawnCards.filter(
          (c) => !dailyPlan.stage1ConfirmedIds.includes(c.id)
        );
        const queue =
          unconfirmedToday.length > 0
            ? unconfirmedToday
            : todayDrawnCards.length > 0
            ? todayDrawnCards
            : cards.slice(0, dailyPlan.dailyCount);
        if (queue.length > 0) {
          setActiveSession({ stage: 'learn', queue });
        }
        return;
      }

      if (stage === 'review') {
        const queue = buildEbbinghausReviewQueue(
          cards,
          dailyPlan.drawnCardIds,
          Date.now(),
          Math.max(10, dailyPlan.dailyCount)
        );
        if (queue.length > 0) {
          setActiveSession({ stage: 'review', queue });
        }
        return;
      }

      if (stage === 'check') {
        const queue = buildCheckpointExamQueue(
          cards,
          dailyPlan.drawnCardIds,
          Math.max(10, dailyPlan.dailyCount + 5)
        );
        if (queue.length > 0) {
          setActiveSession({ stage: 'check', queue });
        }
        return;
      }

      // stage === 'flashcard'
      const queue =
        todayDrawnCards.length > 0
          ? todayDrawnCards
          : cards.slice(0, dailyPlan.dailyCount);
      if (queue.length > 0) {
        setActiveSession({ stage: 'flashcard', queue });
      }
    },
    [cards, dailyPlan.dailyCount, dailyPlan.drawnCardIds, dailyPlan.stage1ConfirmedIds, todayDrawnCards]
  );

  useEffect(() => {
    if (autoLaunchTrigger > 0) {
      setSubView('garden');
      launchStage('review');
    }
  }, [autoLaunchTrigger, launchStage]);

  const scopedByTopikCards = useMemo(() => {
    if (topikFilter === 'all') return cards;
    return cards.filter((c) => (c.topikLevel || '日常拓展') === topikFilter);
  }, [cards, topikFilter]);

  const topikCounts = useMemo(() => countByTopikLevel(cards), [cards]);
  const summary = useMemo(() => computeGardenSummary(scopedByTopikCards), [scopedByTopikCards]);

  const todayIdSet = useMemo(() => new Set(dailyPlan.drawnCardIds), [dailyPlan.drawnCardIds]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const basePool =
      filter === 'today'
        ? todayDrawnCards
        : filter === 'forgotten'
        ? forgottenCards
        : scopedByTopikCards;

    return basePool.filter((card) => {
      if (filter === 'due' && !isCardDue(card) && !card.isForgotten) return false;
      if (filter === 'bloomed' && card.stage !== 5) return false;
      if (filter === 'video' && card.category !== '视频收藏') return false;
      if (!q) return true;
      return (
        card.korean.toLowerCase().includes(q) ||
        card.lemma.toLowerCase().includes(q) ||
        card.meaningZh.toLowerCase().includes(q) ||
        card.memriseTip.toLowerCase().includes(q) ||
        (card.topikLevel || '').toLowerCase().includes(q)
      );
    });
  }, [filter, todayDrawnCards, forgottenCards, scopedByTopikCards, searchQuery]);

  const visibleCards =
    listMode === 'all'
      ? filteredCards
      : listMode === 'six'
      ? filteredCards.slice(0, LIST_PREVIEW_COUNT)
      : [];

  const inspectedCard =
    filteredCards.find((c) => c.id === selectedCardId) ?? filteredCards[0] ?? cards[0] ?? null;

  const inspectedIndex = inspectedCard
    ? filteredCards.findIndex((c) => c.id === inspectedCard.id)
    : -1;
  const goToNeighborCard = (delta: number) => {
    if (inspectedIndex < 0) return;
    const next = filteredCards[inspectedIndex + delta];
    if (next) setSelectedCardId(next.id);
  };

  const inspectedEbbinghaus = inspectedCard ? formatEbbinghausStatus(inspectedCard) : null;

  const handleAddCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onAddCustomVocab({
      korean: newKorean,
      meaningZh: newMeaning,
      spokenPronunciation: newPronunciation,
      memriseTip: newMem,
      exampleKr: newExampleKr,
      exampleZh: newExampleZh,
    });
    if (!res.ok) {
      setAddFormError(res.error || '添加失败');
      return;
    }
    setAddFormError(null);
    setNewKorean('');
    setNewMeaning('');
    setNewPronunciation('');
    setNewMem('');
    setNewExampleKr('');
    setNewExampleZh('');
    setShowAddForm(false);
  };

  const stage1ConfirmedTodayCount = useMemo(
    () => dailyPlan.stage1ConfirmedIds.filter((id) => todayIdSet.has(id)).length,
    [dailyPlan.stage1ConfirmedIds, todayIdSet]
  );

  const stage3PassedTodayCount = useMemo(
    () => dailyPlan.stage3PassedIds.filter((id) => todayIdSet.has(id)).length,
    [dailyPlan.stage3PassedIds, todayIdSet]
  );

  const configChanged =
    draftCount !== dailyPlan.dailyCount || draftLevel !== dailyPlan.targetLevel;

  // Render Active 3-Stage or Flashcard Session
  if (activeSession) {
    return (
      <DailyVocabSession
        stage={activeSession.stage}
        initialQueue={activeSession.queue}
        allCards={cards}
        speakKorean={speakKorean}
        isKeyPlaying={isKeyPlaying}
        isKeyLoading={isKeyLoading}
        onRecordOutcome={onRecordEbbinghausOutcome}
        onExit={() => setActiveSession(null)}
        onSwitchStage={(nextStage, customQueue) => launchStage(nextStage, customQueue)}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={() => {
          const next = !autoSpeak;
          setAutoSpeak(next);
          try {
            window.localStorage.setItem(AUTO_SPEAK_STORAGE_KEY, next ? '1' : '0');
          } catch {
            // ignore
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top 2-Mode Switcher: Daily Plan & Garden vs 4,056-Word Official TOPIK Book */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="词库模式切换"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'garden'}
            onClick={() => setSubView('garden')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
              subView === 'garden'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sprout className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            每日背词 ({cards.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'official_book'}
            onClick={() => setSubView('official_book')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
              subView === 'official_book'
                ? 'bg-white text-blue-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-700" aria-hidden="true" />
            官方词书 (4,056)
          </button>
        </div>

        {subView === 'garden' && (
          <button
            type="button"
            onClick={() => setSubView('official_book')}
            className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
          >
            浏览全部词书 →
          </button>
        )}
      </div>

      {subView === 'official_book' ? (
        <TopikWordbookBrowser
          speakKorean={speakKorean}
          isKeyLoading={isKeyLoading}
          isKeyPlaying={isKeyPlaying}
          hasWordInGarden={hasWordInGarden}
          onImportWords={onImportOfficialTopikWords}
          onSwitchToGarden={() => setSubView('garden')}
        />
      ) : (
        <div className="space-y-6">
          {/* Daily TOPIK Quota Adjuster + 3-Stage Ebbinghaus Console */}
          <section
            aria-label="今日 TOPIK 每日背词计划"
            className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-7 space-y-4 sm:space-y-6"
          >
            {/* Header + Adjustable Daily Quota Controls */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-2 max-w-xl">
                <p className="text-xs font-medium text-blue-700 tabular-nums">
                  {dailyPlan.dateKey} · 连续打卡 {stats.streakDays} 天 · 按词表顺序学
                </p>
                <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  每日任务
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  按词表顺序学 {dailyPlan.dailyCount} 个新词：初学 → 复习 → 巩固。
                </p>
              </div>

              {/* Adjustable Quota & Level Control Panel */}
              <div className="w-full lg:w-[440px] p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3.5 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="daily-vocab-quota-slider"
                    className="text-xs font-semibold text-slate-700"
                  >
                    每天
                  </label>
                  <span
                    data-testid="daily-quota-readout"
                    className="text-sm font-bold text-blue-700 tabular-nums"
                  >
                    {draftCount} 词 / 天
                  </span>
                </div>

                <input
                  id="daily-vocab-quota-slider"
                  type="range"
                  min={5}
                  max={50}
                  step={1}
                  value={draftCount}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDraftCount(next);
                    onSetDailyConfig(next, draftLevel);
                  }}
                  className="w-full accent-blue-700 cursor-pointer"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5">
                    {DAILY_COUNT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setDraftCount(preset);
                          onSetDailyConfig(preset, draftLevel);
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer tabular-nums ${
                          draftCount === preset
                            ? 'bg-blue-700 border-blue-700 text-white font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {preset}词
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label htmlFor="daily-level-select" className="sr-only">
                      抽词 TOPIK 级别
                    </label>
                    <select
                      id="daily-level-select"
                      value={draftLevel}
                      onChange={(e) => {
                        const lvl = e.target.value as DailyTargetLevel;
                        setDraftLevel(lvl);
                        onSetDailyConfig(draftCount, lvl);
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      {DAILY_LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    闪卡自动朗读
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoSpeak}
                    onClick={() => {
                      const next = !autoSpeak;
                      setAutoSpeak(next);
                      try {
                        window.localStorage.setItem(AUTO_SPEAK_STORAGE_KEY, next ? '1' : '0');
                      } catch {
                        // ignore
                      }
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-colors cursor-pointer ${
                      autoSpeak
                        ? 'bg-blue-700 border-blue-700 text-white'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {autoSpeak ? '已开启' : '已关闭'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    已抽 {todayDrawnCards.length}
                    {drawPoolMeta ? ` · 余 ${drawPoolMeta.remainingPoolCount}` : ''}
                  </span>
                  <button
                    type="button"
                    disabled={isDrawingDaily}
                    data-testid="draw-daily-words-btn"
                    onClick={() => void drawDailyTopikDeck(draftCount, draftLevel, true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isDrawingDaily ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {configChanged || todayDrawnCards.length === 0
                      ? `抽取 ${draftCount} 词`
                      : '换一批'}
                  </button>
                </div>

                {drawError && (
                  <p role="alert" className="text-xs text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {drawError}
                  </p>
                )}
              </div>
            </div>

            {/* 3-Stage Memorization Pipeline + Flashcard Aid Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {/* Stage 1: Initial Learning + Confirmation Algorithm */}
              <div className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-2.5 sm:gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-blue-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      初学
                    </span>
                    <span className="text-slate-500 tabular-nums font-medium">
                      {stage1ConfirmedTodayCount}/{todayDrawnCards.length || dailyPlan.dailyCount} 已确认
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="launch-stage-learn"
                  disabled={isDrawingDaily}
                  onClick={() => launchStage('learn')}
                  className="w-full py-2.5 px-3 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  {stage1ConfirmedTodayCount > 0 && stage1ConfirmedTodayCount < todayDrawnCards.length
                    ? `继续 (剩 ${todayDrawnCards.length - stage1ConfirmedTodayCount})`
                    : '开始初学'}
                </button>
              </div>

              {/* Stage 2: Ebbinghaus Curve Review */}
              <div className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-2.5 sm:gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-amber-700 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                      复习
                    </span>
                    <span className="text-amber-700 tabular-nums font-semibold">
                      {ebbinghausSummary.dueNowCount} 词待复习
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="launch-stage-review"
                  onClick={() => launchStage('review')}
                  className="w-full py-2.5 px-3 text-xs font-semibold text-slate-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                >
                  开始复习
                </button>
              </div>

              {/* Stage 3: Final Checkpoint Test */}
              <div className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-2.5 sm:gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />巩固</span>
                    <span className="text-slate-500 tabular-nums font-medium">
                      {stage3PassedTodayCount}/{todayDrawnCards.length || dailyPlan.dailyCount} 通过
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="launch-stage-check"
                  onClick={() => launchStage('check')}
                  className="w-full py-2.5 px-3 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                >
                  开始巩固
                </button>
              </div>

                            {/* Stage 4: 闪卡 */}
              <div className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-2.5 sm:gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                      闪卡
                    </span>
                    <span className="text-slate-500 tabular-nums font-medium">
                      {todayDrawnCards.length || dailyPlan.dailyCount} 词
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="launch-flashcard-today"
                  onClick={() => launchStage('flashcard')}
                  className="w-full py-2.5 px-3 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  开始闪卡
                </button>
              </div>
            </div>

              {/* Ebbinghaus Curve Summary Strip */}
            <div className="hidden lg:grid pt-4 border-t border-slate-100 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">没记住 · 待优先回炉</p>
                <p className="text-xl font-bold text-rose-700 tabular-nums mt-0.5">
                  {ebbinghausSummary.forgottenCount}{' '}
                  <span className="text-xs font-normal text-slate-500">词 (5分钟节点)</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">短期巩固 (5分–12时)</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {ebbinghausSummary.shortTermCount}{' '}
                  <span className="text-xs font-normal text-slate-500">词</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">中期强化 (1天–4天)</p>
                <p className="text-xl font-bold text-blue-700 tabular-nums mt-0.5">
                  {ebbinghausSummary.midTermCount}{' '}
                  <span className="text-xs font-normal text-slate-500">词</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">长期牢固 (7天–30天)</p>
                <p className="text-xl font-bold text-emerald-700 tabular-nums mt-0.5">
                  {ebbinghausSummary.longTermCount}{' '}
                  <span className="text-xs font-normal text-slate-500">词 · 正确率 {summary.accuracyPercent}%</span>
                </p>
              </div>
            </div>
          </section>

          <CheckinCalendar
            checkins={checkins}
            todaySeconds={todayCheckinSeconds}
            targetSeconds={checkinTargetSeconds}
            streakDays={stats.streakDays}
          />

          {/* Two-Zone Wordbook & Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Zone: Filterable Vocab List (7 cols) */}
            <section
              aria-label="词汇列表"
              className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5"
            >
              {/* 手机端：一行筛选摘要 */}
              <div className="flex items-center justify-between gap-2 sm:hidden">
                <button
                  type="button"
                  onClick={() => setFiltersExpanded((v) => !v)}
                  aria-expanded={filtersExpanded}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                  筛选 · {FILTER_LABELS[filter]}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      filtersExpanded ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(true);
                    setFiltersExpanded(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  添加
                </button>
              </div>

              <div
                className={
                  filtersExpanded ? 'space-y-4' : 'hidden sm:block sm:space-y-4'
                }
              >
              {/* Filter Segmented Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                  {(
                    [
                      ['today', `今日词单 (${todayDrawnCards.length})`],
                      ['forgotten', `没记住 (${forgottenCards.length})`],
                      ['all', `全部 (${scopedByTopikCards.length})`],
                      ['due', `待复习 (${ebbinghausSummary.dueNowCount})`],
                      ['bloomed', `已掌握 (${summary.bloomedCount})`],
                      ['video', '视频收藏'],
                    ] as Array<[FilterMode, string]>
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                        filter === key
                          ? 'bg-white text-slate-900 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddForm((v) => !v)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  添加单词
                </button>
              </div>

              {/* TOPIK Level Selector Strip (shown when browsing full garden) */}
              {filter !== 'today' && filter !== 'forgotten' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {TOPIK_LEVEL_TABS.map((tab) => {
                    const isActive = topikFilter === tab.id;
                    const count = topikCounts[tab.id] ?? 0;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTopikFilter(tab.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                          isActive
                            ? 'bg-blue-700 border-blue-700 text-white font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {tab.label} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search Box */}
              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <label htmlFor="vocab-search" className="sr-only">
                  搜索韩语单词或中文释义
                </label>
                <input
                  id="vocab-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索韩语词汇、释义或助记法……"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
              </div>

              {/* Inline Add Custom Word Form */}
              {showAddForm && (
                <form
                  onSubmit={handleAddCustomSubmit}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">添加自定义韩语词汇</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      aria-label="关闭添加单词表单"
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="new-vocab-kr" className="block text-xs font-medium text-slate-600 mb-1">
                        韩语词汇 *
                      </label>
                      <input
                        id="new-vocab-kr"
                        type="text"
                        value={newKorean}
                        onChange={(e) => setNewKorean(e.target.value)}
                        placeholder="例如：단골"
                        className="font-kr w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-vocab-zh" className="block text-xs font-medium text-slate-600 mb-1">
                        中文释义 *
                      </label>
                      <input
                        id="new-vocab-zh"
                        type="text"
                        value={newMeaning}
                        onChange={(e) => setNewMeaning(e.target.value)}
                        placeholder="例如：常客 / 老主顾"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-vocab-pron" className="block text-xs font-medium text-slate-600 mb-1">
                        实际读音标注（可选）
                      </label>
                      <input
                        id="new-vocab-pron"
                        type="text"
                        value={newPronunciation}
                        onChange={(e) => setNewPronunciation(e.target.value)}
                        placeholder="例如：[단골]"
                        className="font-kr w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-vocab-mem" className="block text-xs font-medium text-slate-600 mb-1">
                        记忆助记法（可选）
                      </label>
                      <input
                        id="new-vocab-mem"
                        type="text"
                        value={newMem}
                        onChange={(e) => setNewMem(e.target.value)}
                        placeholder="写下你的谐音或画面联想"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-vocab-exkr" className="block text-xs font-medium text-slate-600 mb-1">
                        韩语例句（可选）
                      </label>
                      <input
                        id="new-vocab-exkr"
                        type="text"
                        value={newExampleKr}
                        onChange={(e) => setNewExampleKr(e.target.value)}
                        placeholder="여기는 제 단골 카페예요."
                        className="font-kr w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-vocab-exzh" className="block text-xs font-medium text-slate-600 mb-1">
                        例句中文（可选）
                      </label>
                      <input
                        id="new-vocab-exzh"
                        type="text"
                        value={newExampleZh}
                        onChange={(e) => setNewExampleZh(e.target.value)}
                        placeholder="这里是我常去的咖啡店。"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                  {addFormError && (
                    <p role="alert" className="text-xs text-rose-600">
                      {addFormError}
                    </p>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                    >
                      播种进词库
                    </button>
                  </div>
                </form>
              )}

              {/* 词表标题 + 三档折叠 */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  词表{' '}
                  <span className="text-xs font-normal text-slate-500 tabular-nums">
                    {filteredCards.length} 词
                  </span>
                </span>
                <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                  {(
                    [
                      ['all', '全部'],
                      ['six', '6 个'],
                      ['none', '收起'],
                    ] as Array<['all' | 'six' | 'none', string]>
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setListMode(mode)}
                      aria-pressed={listMode === mode}
                      className={`px-2 py-1 text-[11px] font-medium rounded-md cursor-pointer transition-colors ${
                        listMode === mode
                          ? 'bg-white text-slate-900 font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Word Rows */}
              {listMode === 'none' ? (
                <p className="text-xs text-slate-400 py-2">
                  词表已收起（{filteredCards.length} 词），点上方「全部 / 6 个」展开。
                </p>
              ) : filteredCards.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  {filter === 'forgotten'
                    ? '太棒了！目前没有标记为「没记住」的错词。'
                    : filter === 'today' && isDrawingDaily
                    ? '正在从 TOPIK 官方词库抽取今日词单……'
                    : '当前筛选条件下暂无词汇。可点击上方按钮抽取今日词单，或切换筛选查看全部词库。'}
                </div>
              ) : (
                <ul className="divide-y divide-slate-100" data-testid="vocab-list">
                  {visibleCards.map((card) => {
                    const isSelected = inspectedCard?.id === card.id;
                    const ebStatus = formatEbbinghausStatus(card);
                    const isConfirmedToday = dailyPlan.stage1ConfirmedIds.includes(card.id);
                    return (
                      <li key={card.id}>
                        <div
                          className={`flex items-center justify-between gap-4 py-3.5 px-3 -mx-3 rounded-xl transition-colors ${
                            isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedCardId(card.id)}
                            className="flex-1 min-w-0 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
                          >
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-kr text-base font-bold text-slate-900">
                                {card.korean}
                              </span>
                              <span className="font-mono-tabular text-xs text-slate-500">
                                {card.spokenPronunciation}
                              </span>
                              {card.topikLevel && (
                                <span className="text-[11px] font-medium text-blue-700">
                                  · {card.topikLevel}
                                </span>
                              )}
                              {card.isForgotten ? (
                                <span className="text-xs font-semibold text-rose-700">
                                  · 没记住 ({ebStatus.nextReviewText})
                                </span>
                              ) : isConfirmedToday && filter === 'today' ? (
                                <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-0.5">
                                  · <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> 已初学确认
                                </span>
                              ) : ebStatus.isDue ? (
                                <span className="text-xs font-medium text-amber-700">
                                  · 曲线到期
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm text-slate-600 truncate mt-0.5">
                              {card.meaningZh}
                            </p>
                          </button>

                          <div className="flex items-center gap-3 shrink-0">
                            <GrowthStageIcon stage={card.stage} />
                            <button
                              type="button"
                              onClick={() => speakKorean(card.korean)}
                              aria-label={`听 ${card.korean} 发音`}
                              className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              {isKeyLoading(card.korean) ? (
                                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Volume2 className="w-4 h-4" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {listMode !== 'all' && filteredCards.length > visibleCards.length && (
                <button
                  type="button"
                  onClick={() => setListMode('all')}
                  className="w-full py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                >
                  显示全部 {filteredCards.length} 词
                </button>
              )}
            </section>

            {/* Right Zone: Selected Word Detail + Ebbinghaus Curve Card (5 cols) */}
            <aside
              aria-label="词汇详情与艾宾浩斯进度"
              className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 lg:sticky lg:top-24"
            >
              {inspectedCard && inspectedEbbinghaus ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => goToNeighborCard(-1)}
                      disabled={inspectedIndex <= 0}
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                      上一个
                    </button>
                    <span className="tabular-nums">
                      {inspectedIndex >= 0 ? inspectedIndex + 1 : 0} / {filteredCards.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => goToNeighborCard(1)}
                      disabled={inspectedIndex < 0 || inspectedIndex >= filteredCards.length - 1}
                      className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      下一个
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 flex-wrap">
                        {inspectedCard.topikLevel && (
                          <>
                            <span className="font-semibold text-blue-700">
                              {inspectedCard.topikLevel}
                            </span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span>{inspectedCard.pos}</span>
                        {inspectedCard.addedFrom && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{inspectedCard.addedFrom}</span>
                          </>
                        )}
                      </div>
                      <h2 className="font-kr text-3xl font-bold text-slate-900">
                        {inspectedCard.korean}
                      </h2>
                      <p className="font-mono-tabular text-sm text-blue-700 mt-1">
                        {inspectedCard.spokenPronunciation}
                        {inspectedCard.lemma !== inspectedCard.korean
                          ? ` · 原形 ${inspectedCard.lemma}`
                          : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => speakKorean(inspectedCard.korean, { slow: false })}
                        aria-label={`正常语速朗读 ${inspectedCard.korean}`}
                        className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      >
                        常速听
                      </button>
                      <button
                        type="button"
                        onClick={() => speakKorean(inspectedCard.korean, { slow: true })}
                        aria-label={`慢速清晰朗读 ${inspectedCard.korean}`}
                        className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        慢速
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">中文释义</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {inspectedCard.meaningZh}
                      </p>
                    </div>

                    {/* Ebbinghaus Curve Card Status */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700">
                          艾宾浩斯进度 · {inspectedEbbinghaus.stepLabel}
                        </span>
                        <span
                          className={`font-semibold ${
                            inspectedEbbinghaus.isForgotten
                              ? 'text-rose-700'
                              : inspectedEbbinghaus.isDue
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {inspectedEbbinghaus.nextReviewText}
                        </span>
                      </div>
                      <div className="grid grid-cols-9 gap-1">
                        {EBBINGHAUS_STEPS.map((node) => {
                          const isCurrent = node.step === inspectedEbbinghaus.stepIndex;
                          const isDone = node.step < inspectedEbbinghaus.stepIndex;
                          return (
                            <div
                              key={node.step}
                              className={`text-center py-0.5 rounded text-[10px] font-medium tabular-nums border ${
                                isCurrent
                                  ? inspectedCard.isForgotten
                                    ? 'bg-rose-600 text-white border-rose-600'
                                    : 'bg-blue-700 text-white border-blue-700'
                                  : isDone
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-white text-slate-500 border-slate-200'
                              }`}
                            >
                              {node.shortLabel}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                        <GrowthStageIcon stage={inspectedCard.stage} />
                        <span>
                          记住 {inspectedCard.correctCount} 次 · 没记住 {inspectedCard.wrongCount} 次
                        </span>
                      </div>
                    </div>

                    {/* Editable Memrise Mem */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-700">记忆助记法 (我的 Mem)</p>
                        {editingMemId !== inspectedCard.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMemId(inspectedCard.id);
                              setMemDraft(inspectedCard.memriseTip);
                            }}
                            className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                          >
                            编辑助记
                          </button>
                        )}
                      </div>

                      {editingMemId === inspectedCard.id ? (
                        <div className="space-y-2">
                          <label htmlFor="mem-editor" className="sr-only">
                            编辑记忆法
                          </label>
                          <textarea
                            id="mem-editor"
                            rows={3}
                            value={memDraft}
                            onChange={(e) => setMemDraft(e.target.value)}
                            className="w-full p-3 text-sm bg-white border border-blue-400 rounded-xl focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingMemId(null)}
                              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (memDraft.trim()) {
                                  onUpdateMem(inspectedCard.id, memDraft);
                                }
                                setEditingMemId(null);
                              }}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                            >
                              保存助记
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          {inspectedCard.memriseTip}
                        </p>
                      )}
                    </div>

                    {/* Daily Example Sentence */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-700">真实语境例句</p>
                        <KoreanReadButton
                          text={inspectedCard.exampleKr}
                          speakKorean={speakKorean}
                          isKeyLoading={isKeyLoading}
                          isKeyPlaying={isKeyPlaying}
                          showSlow
                          compact
                          label="朗读例句"
                        />
                      </div>
                      <p className="font-kr text-base font-medium text-slate-900 break-keep">
                        {inspectedCard.exampleKr}
                      </p>
                      <p className="text-sm text-slate-600">{inspectedCard.exampleZh}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onRecordEbbinghausOutcome(inspectedCard.id, 'remembered', 'review')
                          }
                          className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                        >
                          推进曲线 (+1 节点)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onRecordEbbinghausOutcome(inspectedCard.id, 'forgotten', 'review')
                          }
                          className="px-3 py-2 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                        >
                          标为没记住
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteCard(inspectedCard.id)}
                        aria-label={`从词库移除 ${inspectedCard.korean}`}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        移除
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  选择左侧任意词汇查看音变、艾宾浩斯节点、助记法与例句。
                </p>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
