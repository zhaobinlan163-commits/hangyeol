import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  HelpCircle,
  Loader2,
  NotebookPen,
  Search,
  Send,
} from 'lucide-react';
import { DAILY_GRAMMAR_LESSONS } from '../data/seedData';
import { EXTRA_TOPIK_GRAMMAR_LESSONS } from '../data/topikGrammar';
import { TOPIK_GRAMMAR_PACK_1 } from '../data/topikGrammarPack1';
import { TOPIK_GRAMMAR_PACK_2 } from '../data/topikGrammarPack2';
import { TOPIK_GRAMMAR_PACK_3 } from '../data/topikGrammarPack3';
import { TOPIK_GRAMMAR_PACK_4 } from '../data/topikGrammarPack4';
import { TOPIK_GRAMMAR_PACK_5 } from '../data/topikGrammarPack5';
import { TOPIK_GRAMMAR_PACK_6 } from '../data/topikGrammarPack6';
import type { GrammarEvaluation, GrammarLesson } from '../types/learning';
import { safeFetchJson } from '../utils/api';
import { KoreanReadButton } from './KoreanReadButton';

type GrammarLevelFilter = 'all' | 'TOPIK 1级' | 'TOPIK 2级' | 'TOPIK 3-4级' | 'TOPIK 5-6级';

function normalizeGrammarLevel(rawLevel: string): Exclude<GrammarLevelFilter, 'all'> {
  if (rawLevel.includes('1级') || rawLevel.includes('TOPIK I · 实用')) return 'TOPIK 1级';
  if (rawLevel.includes('2级') || rawLevel.includes('TOPIK I · 社交')) return 'TOPIK 2级';
  if (rawLevel.includes('5-6') || rawLevel.includes('5级') || rawLevel.includes('6级')) return 'TOPIK 5-6级';
  return 'TOPIK 3-4级';
}

const LEVEL_ORDER: Record<Exclude<GrammarLevelFilter, 'all'>, number> = {
  'TOPIK 1级': 1,
  'TOPIK 2级': 2,
  'TOPIK 3-4级': 3,
  'TOPIK 5-6级': 4,
};

const ALL_GRAMMAR_LESSONS: Array<GrammarLesson & { normalizedLevel: Exclude<GrammarLevelFilter, 'all'> }> = [
  ...DAILY_GRAMMAR_LESSONS,
  ...EXTRA_TOPIK_GRAMMAR_LESSONS,
  ...TOPIK_GRAMMAR_PACK_1,
  ...TOPIK_GRAMMAR_PACK_2,
  ...TOPIK_GRAMMAR_PACK_3,
  ...TOPIK_GRAMMAR_PACK_4,
  ...TOPIK_GRAMMAR_PACK_5,
  ...TOPIK_GRAMMAR_PACK_6,
]
  .map((lesson) => ({
    ...lesson,
    normalizedLevel: normalizeGrammarLevel(lesson.level),
  }))
  .sort((a, b) => LEVEL_ORDER[a.normalizedLevel] - LEVEL_ORDER[b.normalizedLevel]);

const GRAMMAR_LEVEL_TABS: Array<{ id: GrammarLevelFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'TOPIK 1级', label: '1级' },
  { id: 'TOPIK 2级', label: '2级' },
  { id: 'TOPIK 3-4级', label: '3-4级' },
  { id: 'TOPIK 5-6级', label: '5-6级' },
];

interface GrammarWorkshopViewProps {
  masteredGrammarIds: string[];
  speakKorean: (text: string, opts?: { slow?: boolean }) => Promise<void>;
  isKeyLoading: (text: string, slow?: boolean) => boolean;
  isKeyPlaying: (text: string, slow?: boolean) => boolean;
  onGrammarEvaluated: (grammarId: string, score: number) => void;
  onSaveNote?: (title: string, body: string, options?: { open?: boolean }) => void;
}

interface GrammarAskTurn {
  question: string;
  answerZh: string;
  examples: Array<{ korean: string; chinese: string }>;
  tips: string[];
}

const ASK_QUICK_PROMPTS = [
  '我没记住，用最简单的话再讲一遍',
  '这个和相似的语法有什么区别',
  '给我 3 个生活里的例句',
];

export function GrammarWorkshopView({
  masteredGrammarIds,
  speakKorean,
  isKeyLoading,
  isKeyPlaying,
  onGrammarEvaluated,
  onSaveNote,
}: GrammarWorkshopViewProps) {
  const [levelFilter, setLevelFilter] = useState<GrammarLevelFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(ALL_GRAMMAR_LESSONS[0].id);
  const [sentenceInput, setSentenceInput] = useState('');
  const [showSample, setShowSample] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<GrammarEvaluation | null>(null);
  const [askInput, setAskInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [listMode, setListMode] = useState<'all' | 'half' | 'none'>('half');
  const [askLog, setAskLog] = useState<GrammarAskTurn[]>([]);
  const [savedTurns, setSavedTurns] = useState<number[]>([]);

  const levelCounts = useMemo(() => {
    const counts: Record<GrammarLevelFilter, number> = {
      all: ALL_GRAMMAR_LESSONS.length,
      'TOPIK 1级': 0,
      'TOPIK 2级': 0,
      'TOPIK 3-4级': 0,
      'TOPIK 5-6级': 0,
    };
    for (const item of ALL_GRAMMAR_LESSONS) {
      counts[item.normalizedLevel] += 1;
    }
    return counts;
  }, []);

  const filteredLessons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_GRAMMAR_LESSONS.filter((lesson) => {
      if (levelFilter !== 'all' && lesson.normalizedLevel !== levelFilter) return false;
      if (!q) return true;
      return (
        lesson.pattern.toLowerCase().includes(q) ||
        lesson.titleZh.toLowerCase().includes(q) ||
        lesson.summary.toLowerCase().includes(q)
      );
    });
  }, [levelFilter, searchQuery]);

  const visibleLessons =
    listMode === 'all'
      ? filteredLessons
      : listMode === 'half'
      ? filteredLessons.slice(0, Math.max(6, Math.ceil(filteredLessons.length / 2)))
      : [];

  const activeLesson =
    ALL_GRAMMAR_LESSONS.find((g) => g.id === selectedId) ?? filteredLessons[0] ?? ALL_GRAMMAR_LESSONS[0];

  const handleSelectLesson = (id: string) => {
    setSelectedId(id);
    setSentenceInput('');
    setShowSample(false);
    setEvalError(null);
    setEvaluation(null);
    setAskLog([]);
    setAskError(null);
    setAskInput('');
    setSavedTurns([]);
  };

  // 切换语法点时清空答疑记录
  useEffect(() => {
    setAskLog([]);
    setAskError(null);
    setSavedTurns([]);
  }, [selectedId]);

  const handleAsk = async (rawQuestion?: string) => {
    const question = (rawQuestion ?? askInput).trim();
    if (!question) {
      setAskError('先输入你想问的问题。');
      return;
    }
    setAskError(null);
    setIsAsking(true);
    try {
      const data = await safeFetchJson<{
        answerZh: string;
        examples: Array<{ korean: string; chinese: string }>;
        tips: string[];
      }>(
        '/api/grammar/ask',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pattern: activeLesson.pattern,
            level: activeLesson.level,
            summary: activeLesson.summary,
            question,
          }),
        },
        'AI 老师没有回答上来'
      );
      setAskLog((prev) => [
        ...prev.slice(-5),
        {
          question,
          answerZh: data.answerZh || '（没有返回内容）',
          examples: Array.isArray(data.examples) ? data.examples : [],
          tips: Array.isArray(data.tips) ? data.tips : [],
        },
      ]);
      setAskInput('');
    } catch (err) {
      setAskError(err instanceof Error ? err.message : '语法答疑失败，请重试。');
    } finally {
      setIsAsking(false);
    }
  };


  const handleInsertHint = (phrase: string) => {
    setSentenceInput((prev) => (prev.trim() ? `${prev.trim()} ${phrase}` : phrase));
    if (evalError) setEvalError(null);
  };

  const handleSubmitSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvalError(null);
    if (!sentenceInput.trim()) {
      setEvalError('请先根据造句任务输入一句韩语后再提交 AI 批改。');
      return;
    }

    setIsEvaluating(true);
    try {
      const data = await safeFetchJson<GrammarEvaluation>(
        '/api/grammar/evaluate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grammarPattern: activeLesson.pattern,
            grammarMeaning: activeLesson.titleZh,
            promptChinese: activeLesson.challengePromptZh,
            userSentence: sentenceInput.trim(),
          }),
        },
        '语法批改失败'
      );
      setEvaluation(data);
      onGrammarEvaluated(activeLesson.id, data.score);
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : '语法造句批改失败，请稍后重试。');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            语法工坊 · TOPIK 高频语法点
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            收录 {ALL_GRAMMAR_LESSONS.length} 个高频语法点（TOPIK 1–6 级），含接续表、辨析、朗读例句与造句批改。
          </p>
        </div>
        <p className="text-xs font-medium text-slate-600 tabular-nums shrink-0">
          已掌握语法：{masteredGrammarIds.length} / {ALL_GRAMMAR_LESSONS.length}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Syllabus Column (4 cols) */}
        <aside aria-label="TOPIK 语法目录" className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <h2 className="text-xs font-semibold text-slate-600">
              语法 ({filteredLessons.length})
            </h2>
            <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
              {([
                ['all', '全部'],
                ['half', '一半'],
                ['none', '收起'],
              ] as Array<['all' | 'half' | 'none', string]>).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setListMode(mode)}
                  aria-pressed={listMode === mode}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-md cursor-pointer ${
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

          {/* TOPIK Level Filter */}
          <div
            role="tablist"
            aria-label="语法等级筛选"
            className="flex flex-wrap items-center gap-1.5"
          >
            {GRAMMAR_LEVEL_TABS.map((tab) => {
              const isActive = levelFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setLevelFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    isActive
                      ? 'bg-blue-700 border-blue-700 text-white font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab.label} ({levelCounts[tab.id]})
                </button>
              );
            })}
          </div>

          {/* Grammar Search Box */}
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="grammar-search" className="sr-only">
              搜索韩语语法或中文含义
            </label>
            <input
              id="grammar-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索语法（如：-거든 / 因为 / 敬语）……"
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          {filteredLessons.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">未找到匹配的语法条目。</p>
          ) : listMode === 'none' ? (
            <p className="py-6 text-center text-xs text-slate-400">列表已收起，点上方「全部 / 一半」展开。</p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-1" data-testid="grammar-list">
              {visibleLessons.map((lesson, idx) => {
                const isSelected = lesson.id === activeLesson.id;
                const isMastered = masteredGrammarIds.includes(lesson.id);
                const numLabel = String(idx + 1).padStart(2, '0');
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectLesson(lesson.id)}
                      className={`w-full text-left p-3 rounded-xl transition-colors cursor-pointer my-1 ${
                        isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-kr text-sm font-bold text-slate-900">
                          {numLabel}. {lesson.pattern}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium shrink-0 ${
                            isMastered ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {isMastered ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              已练
                            </>
                          ) : (
                            <>
                              <Circle className="w-3.5 h-3.5" aria-hidden="true" />
                              待练
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{lesson.titleZh}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {lesson.level === lesson.normalizedLevel
                          ? lesson.level
                          : `${lesson.normalizedLevel} · ${lesson.level}`}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Right Detail & Interactive Sentence Composition (8 cols) */}
        <section aria-label="语法讲解与造句练习" className="lg:col-span-8 space-y-6">
          {/* Grammar Explanation Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <p className="text-xs text-blue-700 font-medium">{activeLesson.level}</p>
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="font-kr text-2xl sm:text-3xl font-bold text-slate-900">
                  {activeLesson.pattern}
                </h2>
                <span className="text-base font-semibold text-slate-700">
                  {activeLesson.titleZh}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{activeLesson.summary}</p>
            </div>

            {/* Conjugation Rules Table */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-700">接续形态表</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3.5 font-semibold">词干条件</th>
                      <th className="py-2.5 px-3.5 font-semibold">变化公式</th>
                      <th className="py-2.5 px-3.5 font-semibold">变换实例</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {activeLesson.conjugationRules.map((rule, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3.5 font-medium whitespace-nowrap">{rule.condition}</td>
                        <td className="py-2.5 px-3.5 font-kr text-blue-700 font-semibold whitespace-nowrap">
                          {rule.formula}
                        </td>
                        <td className="py-2.5 px-3.5 font-kr">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>{rule.example}</span>
                            <KoreanReadButton
                              text={rule.example.replace(/→/g, ', ')}
                              speakKorean={speakKorean}
                              isKeyLoading={isKeyLoading}
                              isKeyPlaying={isKeyPlaying}
                              compact
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Nuance Tip */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <p className="text-xs font-semibold text-slate-700">母语语感与易混辨析</p>
              <p className="text-sm text-slate-700 leading-relaxed">{activeLesson.nuanceComparison}</p>
            </div>

            {/* Example Sentences with Native Audio */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-700">首尔日常例句</h3>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {activeLesson.examples.map((ex, i) => (
                  <div key={i} className="p-3.5 flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-0.5 flex-1 min-w-[200px]">
                      <p className="font-kr text-base font-semibold text-slate-900 break-keep">{ex.korean}</p>
                      <p className="font-mono-tabular text-xs text-blue-700">{ex.spokenPronunciation}</p>
                      <p className="text-sm text-slate-600">{ex.chinese}</p>
                    </div>
                    <KoreanReadButton
                      text={ex.korean}
                      speakKorean={speakKorean}
                      isKeyLoading={isKeyLoading}
                      isKeyPlaying={isKeyPlaying}
                      showSlow
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Sentence-Making Practice Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-blue-700">每日造句实战</p>
              <h3 className="text-lg font-bold text-slate-900">{activeLesson.challengePromptZh}</h3>
            </div>

            {/* Clickable Korean Prompt Helpers */}
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500">点击词汇快速填入输入框：</p>
              <div className="flex flex-wrap gap-2">
                {activeLesson.hintWords.map((hw) => (
                  <button
                    key={hw.kr}
                    type="button"
                    onClick={() => handleInsertHint(hw.kr)}
                    className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-800 text-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="font-kr font-semibold">{hw.kr}</span>{' '}
                    <span className="text-slate-500">({hw.zh})</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmitSentence} className="space-y-4">
              <div>
                <label htmlFor="grammar-sentence-input" className="sr-only">
                  输入你的韩语造句
                </label>
                <textarea
                  id="grammar-sentence-input"
                  rows={3}
                  value={sentenceInput}
                  onChange={(e) => {
                    setSentenceInput(e.target.value);
                    if (evalError) setEvalError(null);
                  }}
                  placeholder={`尝试用 ${activeLesson.pattern} 写出完整韩语句子……`}
                  className="font-kr w-full p-4 text-base bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
                {evalError && (
                  <p role="alert" className="text-xs text-rose-600 mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {evalError}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowSample((v) => !v)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  {showSample ? '隐藏参考范句' : '查看参考范句'}
                </button>

                <button
                  type="submit"
                  disabled={isEvaluating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  {isEvaluating ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="w-4 h-4" aria-hidden="true" />
                  )}
                  {isEvaluating ? 'AI 老师批改中…' : '提交 AI 语法批改'}
                </button>
              </div>

              {showSample && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">参考范句</p>
                    <p className="font-kr text-sm font-semibold text-slate-900 mt-0.5 break-keep">
                      {activeLesson.sampleAnswerKr}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <KoreanReadButton
                      text={activeLesson.sampleAnswerKr}
                      speakKorean={speakKorean}
                      isKeyLoading={isKeyLoading}
                      isKeyPlaying={isKeyPlaying}
                      showSlow
                      compact
                    />
                    <button
                      type="button"
                      onClick={() => setSentenceInput(activeLesson.sampleAnswerKr)}
                      className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      填入试改
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* AI Evaluation Result */}
            {evaluation && (
              <div className="pt-5 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-900 tabular-nums">
                      {evaluation.score} 分
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        evaluation.isNatural ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {evaluation.verdictLabel}
                    </span>
                  </div>
                  <KoreanReadButton
                    text={evaluation.correctedSentence}
                    speakKorean={speakKorean}
                    isKeyLoading={isKeyLoading}
                    isKeyPlaying={isKeyPlaying}
                    showSlow
                    compact
                    label="朗读修正句"
                  />
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <p className="text-xs font-medium text-emerald-800">推荐标准修正句</p>
                  <p className="font-kr text-lg font-bold text-slate-900 break-keep">
                    {evaluation.correctedSentence}
                  </p>
                  <p className="font-mono-tabular text-xs text-emerald-800">
                    {evaluation.spokenPronunciation}
                  </p>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">{evaluation.explanation}</p>

                {evaluation.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-700">助词与接续修正明细</p>
                    <ul className="space-y-2">
                      {evaluation.errors.map((errItem, idx) => (
                        <li
                          key={idx}
                          className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl text-xs space-y-1"
                        >
                          <p className="font-kr text-slate-900">
                            <span className="line-through text-rose-700">{errItem.original}</span> →{' '}
                            <strong className="text-emerald-800">{errItem.suggestion}</strong>
                          </p>
                          <p className="text-slate-600">{errItem.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluation.nativeUpgrades.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-700">首尔本地人更地道的说法</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {evaluation.nativeUpgrades.map((up, i) => (
                        <div key={i} className="p-3.5 border border-slate-200 rounded-xl space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-kr text-sm font-bold text-slate-900 break-keep">{up.korean}</p>
                            <KoreanReadButton
                              text={up.korean}
                              speakKorean={speakKorean}
                              isKeyLoading={isKeyLoading}
                              isKeyPlaying={isKeyPlaying}
                              showSlow
                              compact
                            />
                          </div>
                          <p className="text-xs text-slate-600">{up.chinese}</p>
                          <p className="text-[11px] text-slate-400">{up.tone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI 答疑 */}
            <div className="pt-5 border-t border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-700" aria-hidden="true" />
                  问 AI
                </h3>
                {onSaveNote && (
                  <button
                    type="button"
                    onClick={() =>
                      onSaveNote(
                        `${activeLesson.pattern} · ${activeLesson.titleZh}`,
                        `${activeLesson.summary}\n\n我的笔记：\n`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <NotebookPen className="w-3.5 h-3.5" aria-hidden="true" />
                    记到笔记本
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ASK_QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isAsking}
                    onClick={() => void handleAsk(prompt)}
                    className="px-2.5 py-1.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {askLog.length > 0 && (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {askLog.map((turn, index) => (
                    <div key={`${turn.question}-${index}`} className="space-y-1.5">
                      <p className="text-xs font-medium text-slate-500">你：{turn.question}</p>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <p className="text-sm text-slate-800 leading-relaxed">{turn.answerZh}</p>
                        {turn.examples.length > 0 && (
                          <ul className="space-y-1">
                            {turn.examples.map((example, i) => (
                              <li key={i} className="text-xs text-slate-700">
                                <span className="font-kr font-semibold text-slate-900">
                                  {example.korean}
                                </span>
                                <span className="text-slate-500"> — {example.chinese}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {turn.tips.length > 0 && (
                          <ul className="text-[11px] text-emerald-800 space-y-0.5">
                            {turn.tips.map((tip, i) => (
                              <li key={i}>· {tip}</li>
                            ))}
                          </ul>
                        )}
                        {onSaveNote && (
                          <div className="flex justify-end pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                const lines = [`问题：${turn.question}`, `回答：${turn.answerZh}`];
                                if (turn.examples.length > 0) {
                                  lines.push('', '例句：');
                                  for (const example of turn.examples) {
                                    lines.push(`- ${example.korean} — ${example.chinese}`);
                                  }
                                }
                                if (turn.tips.length > 0) {
                                  lines.push('', '提示：');
                                  for (const tip of turn.tips) lines.push(`· ${tip}`);
                                }
                                onSaveNote(
                                  `${activeLesson.pattern} · ${turn.question.slice(0, 18)}`,
                                  lines.join('\n'),
                                  { open: false }
                                );
                                setSavedTurns((prev) =>
                                  prev.includes(index) ? prev : [...prev, index]
                                );
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                                savedTurns.includes(index)
                                  ? 'text-emerald-700 bg-emerald-50'
                                  : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                              }`}
                            >
                              <NotebookPen className="w-3 h-3" aria-hidden="true" />
                              {savedTurns.includes(index) ? '已存入' : '存到笔记本'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {askError && (
                <p role="alert" className="text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {askError}
                </p>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAsk();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  placeholder="没看懂？直接问，比如「什么时候用这个」"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isAsking}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg cursor-pointer"
                >
                  {isAsking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  提问
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
