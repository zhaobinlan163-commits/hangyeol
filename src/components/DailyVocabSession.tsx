import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  HelpCircle,
  Layers,
  Loader2,
  RefreshCw,
  RotateCcw,
  Shuffle,
  Volume2,
  X,
} from 'lucide-react';
import type {
  DailyVocabStage,
  EbbinghausOutcome,
  VocabCard,
} from '../types/learning';
import {
  EBBINGHAUS_STEPS,
  advanceLearnConfirmation,
  createLearnConfirmationState,
  formatEbbinghausStatus,
  getEffectiveEbbinghausStep,
  type LearnConfirmationState,
} from '../utils/ebbinghaus';
import {
  buildMultipleChoiceOptions,
  buildSyllableTiles,
  checkSyllableAnswer,
  type SyllableTile,
} from '../utils/srs';
import { normalizeKoreanInput } from '../utils/korean';
import { GrowthStageIcon } from './GrowthStageIcon';
import { KoreanReadButton } from './KoreanReadButton';

type FlashcardDirection = 'kr_to_zh' | 'zh_to_kr' | 'audio_only';
type ActiveQuizType = 'choice' | 'tiles' | 'typing' | 'flashcard_self';

interface DailyVocabSessionProps {
  stage: DailyVocabStage;
  initialQueue: VocabCard[];
  allCards: VocabCard[];
  speakKorean: (text: string, opts?: { slow?: boolean }) => Promise<void>;
  isKeyPlaying: (text: string, slow?: boolean) => boolean;
  isKeyLoading: (text: string, slow?: boolean) => boolean;
  onRecordOutcome: (cardId: string, outcome: EbbinghausOutcome, stage: DailyVocabStage) => void;
  onExit: () => void;
  onSwitchStage: (nextStage: DailyVocabStage, customQueue?: VocabCard[]) => void;
  autoSpeak?: boolean;
  onToggleAutoSpeak?: () => void;
}

export function DailyVocabSession({
  stage,
  initialQueue,
  allCards,
  speakKorean,
  isKeyPlaying,
  isKeyLoading,
  onRecordOutcome,
  onExit,
  onSwitchStage,
  autoSpeak = false,
  onToggleAutoSpeak,
}: DailyVocabSessionProps) {
  const cardMap = useMemo(() => {
    const map = new Map<string, VocabCard>();
    for (const c of allCards) map.set(c.id, c);
    for (const c of initialQueue) {
      if (!map.has(c.id)) map.set(c.id, c);
    }
    return map;
  }, [allCards, initialQueue]);

  // Stage 1 (初学) uses mastery confirmation re-queue state
  const [learnState, setLearnState] = useState<LearnConfirmationState>(() =>
    createLearnConfirmationState(initialQueue.map((c) => c.id))
  );
  // Phase inside Stage 1: 'study' (flashcard preview) -> 'confirm' (active confirmation quiz)
  const [learnPhase, setLearnPhase] = useState<'study' | 'confirm'>('study');

  // Stage 2 / Stage 3 / Flashcard queue
  const [queueIds, setQueueIds] = useState<string[]>(() => initialQueue.map((c) => c.id));
  const [currentIdx, setCurrentIdx] = useState(0);

  // 巩固阶段分两轮：先选词，再打字（打字轮可跳过）
  const [checkPhase, setCheckPhase] = useState<'select' | 'type'>('select');
  const [showTypePrompt, setShowTypePrompt] = useState(false);

  // Flashcard / Quick-Draw Card interactive state
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashDirection, setFlashDirection] = useState<FlashcardDirection>('kr_to_zh');

  // Active quiz state
  const [selectedTiles, setSelectedTiles] = useState<SyllableTile[]>([]);
  const [typingInput, setTypingInput] = useState('');
  const [typingError, setTypingError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    status: 'remembered' | 'vague' | 'forgotten';
    title: string;
    detail: string;
    requeued?: boolean;
  } | null>(null);

  // Session summary tracking
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const [forgottenIds, setForgottenIds] = useState<string[]>([]);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  // Reset cleanly whenever stage or initialQueue changes
  useEffect(() => {
    const ids = initialQueue.map((c) => c.id);
    setLearnState(createLearnConfirmationState(ids));
    setLearnPhase('study');
    setQueueIds(ids);
    setCurrentIdx(0);
    setIsFlipped(false);
    setSelectedTiles([]);
    setTypingInput('');
    setTypingError(null);
    setFeedback(null);
    setPassedIds([]);
    setForgottenIds([]);
    setTotalAttempts(0);
    setCorrectAttempts(0);
    setSessionDone(false);
    setCheckPhase('select');
    setShowTypePrompt(false);
  }, [stage, initialQueue]);

  const activeCardId =
    stage === 'learn' ? learnState.pendingIds[0] ?? null : queueIds[currentIdx] ?? null;
  const activeCard = activeCardId ? cardMap.get(activeCardId) ?? null : null;

  const totalUniqueWords = initialQueue.length;
  const progressPercent = useMemo(() => {
    if (sessionDone) return 100;
    if (stage === 'learn') {
      return Math.round((learnState.confirmedIds.length / Math.max(1, totalUniqueWords)) * 100);
    }
    return Math.round(((currentIdx + (feedback ? 1 : 0)) / Math.max(1, queueIds.length)) * 100);
  }, [sessionDone, stage, learnState.confirmedIds.length, totalUniqueWords, currentIdx, feedback, queueIds.length]);

  // Decide quiz format cleanly per stage & attempt
  const currentQuizType: ActiveQuizType = useMemo(() => {
    if (!activeCard) return 'choice';
    const cleanLen = activeCard.korean.replace(/\s+/g, '').length;
    if (stage === 'flashcard') return 'flashcard_self';
    if (stage === 'learn') {
      const attempt = learnState.attemptsById[activeCard.id] || 0;
      if (attempt % 2 === 1 && cleanLen >= 2 && cleanLen <= 6) {
        return 'tiles';
      }
      return 'choice';
    }
    if (stage === 'review') {
      // Alternate Quick-Draw Flashcard -> Choice -> Syllable Tiles
      const mod = currentIdx % 3;
      if (mod === 0) return 'flashcard_self';
      if (mod === 1) return 'choice';
      return cleanLen >= 2 && cleanLen <= 6 ? 'tiles' : 'choice';
    }
    // stage === 'check'（巩固）：第一轮只考选词，第二轮才打字
    if (checkPhase === 'type') return 'typing';
    const mod = currentIdx % 3;
    if (mod === 0) return 'choice';
    if (mod === 1 && cleanLen >= 2 && cleanLen <= 6) return 'tiles';
    return 'choice';
  }, [activeCard, stage, learnState.attemptsById, currentIdx, checkPhase]);

  // 自动朗读：每张卡只自动播一次，翻面或重听都交给手动按钮
  const autoSpokeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoSpeak || sessionDone) return;
    const card = activeCardId ? cardMap.get(activeCardId) : null;
    const text = card?.korean?.trim();
    if (!text) return;

    const showKey = `${stage}:${activeCardId}:${currentIdx}`;
    if (autoSpokeRef.current === showKey) return;

    const isStudyFront = stage === 'learn' && learnPhase === 'study';
    const isFlashFront =
      currentQuizType === 'flashcard_self' &&
      !isFlipped &&
      (flashDirection === 'kr_to_zh' || flashDirection === 'audio_only');
    if (!isStudyFront && !isFlashFront) return;
    if (isKeyPlaying(text)) return;

    autoSpokeRef.current = showKey;
    const timer = window.setTimeout(() => {
      void speakKorean(text);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    autoSpeak,
    activeCardId,
    cardMap,
    currentIdx,
    currentQuizType,
    flashDirection,
    isFlipped,
    isKeyPlaying,
    learnPhase,
    sessionDone,
    speakKorean,
    stage,
  ]);

  const choiceOptions = useMemo(() => {
    if (!activeCard) return [];
    return buildMultipleChoiceOptions(activeCard, allCards, 4);
  }, [activeCard, allCards]);

  const syllableTiles = useMemo(() => {
    if (!activeCard) return [];
    const offset = stage === 'learn' ? learnState.confirmedIds.length + totalAttempts : currentIdx;
    return buildSyllableTiles(activeCard.korean, offset);
  }, [activeCard, stage, learnState.confirmedIds.length, totalAttempts, currentIdx]);

  // Keyboard shortcut: Space flips flashcard when not typing in an input
  useEffect(() => {
    const isFlashcardVisible =
      !sessionDone &&
      !feedback &&
      ((stage === 'learn' && learnPhase === 'study') || currentQuizType === 'flashcard_self');
    if (!isFlashcardVisible) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sessionDone, feedback, stage, learnPhase, currentQuizType]);

  const resetCardInputs = () => {
    setIsFlipped(false);
    setSelectedTiles([]);
    setTypingInput('');
    setTypingError(null);
    setFeedback(null);
  };

  const handleShuffleDeck = () => {
    if (stage === 'learn' || queueIds.length <= 1) return;
    const remaining = queueIds.slice(currentIdx);
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = remaining[i];
      remaining[i] = remaining[j];
      remaining[j] = tmp;
    }
    setQueueIds([...queueIds.slice(0, currentIdx), ...remaining]);
    resetCardInputs();
  };

  const submitOutcome = (outcome: EbbinghausOutcome, _customDetail?: string) => {
    if (!activeCard || feedback) return;

    onRecordOutcome(activeCard.id, outcome, stage);
    setTotalAttempts((t) => t + 1);

    if (outcome === 'remembered') {
      setCorrectAttempts((c) => c + 1);
      setPassedIds((prev) => (prev.includes(activeCard.id) ? prev : [...prev, activeCard.id]));
    } else if (outcome === 'forgotten') {
      setForgottenIds((prev) => (prev.includes(activeCard.id) ? prev : [...prev, activeCard.id]));
    }

    const nextStepIdx =
      outcome === 'forgotten'
        ? 0
        : outcome === 'vague'
        ? Math.max(0, getEffectiveEbbinghausStep(activeCard) - 1)
        : Math.min(EBBINGHAUS_STEPS.length - 1, getEffectiveEbbinghausStep(activeCard) + 1);
    const nextIntervalLabel =
      outcome === 'forgotten'
        ? EBBINGHAUS_STEPS[0].label
        : outcome === 'vague'
        ? EBBINGHAUS_STEPS[1].label
        : EBBINGHAUS_STEPS[nextStepIdx].label;

    if (stage === 'learn') {
      const isMastered = outcome === 'remembered';
      setFeedback({
        status: outcome,
        title: isMastered
          ? `下次复习：${nextIntervalLabel}后`
          : '没记住 · 稍后重学',
        detail: '',
        requeued: !isMastered,
      });
      return;
    }

    if (stage === 'review' || stage === 'flashcard') {
      const requeueReview = outcome === 'forgotten' && stage === 'review';
      if (requeueReview) {
        setQueueIds((prev) => [...prev, activeCard.id]);
      }
      setFeedback({
        status: outcome,
        title:
          outcome === 'remembered'
            ? `下次复习：${nextIntervalLabel}后`
            : outcome === 'vague'
            ? '模糊 · 30 分钟后复习'
            : '没记住 · 5 分钟后复习',
        detail: '',
        requeued: requeueReview,
      });
      return;
    }

    // stage === 'check'
    setFeedback({
      status: outcome,
      title:
        outcome === 'remembered'
          ? `下次复习：${nextIntervalLabel}后`
          : '没记住 · 5 分钟后复习',
      detail: '',
    });
  };

  const handleAdvance = () => {
    if (!activeCard) return;

    if (stage === 'learn') {
      const wasMastered = feedback?.status === 'remembered';
      const nextState = advanceLearnConfirmation(learnState, activeCard.id, wasMastered);
      setLearnState(nextState);
      resetCardInputs();
      setLearnPhase('study');
      if (nextState.pendingIds.length === 0) {
        setSessionDone(true);
      }
      return;
    }

    const nextIdx = currentIdx + 1;
    resetCardInputs();

    // 巩固：选词轮结束后，先问要不要进入打字轮
    if (stage === 'check' && checkPhase === 'select') {
      if (nextIdx >= queueIds.length) {
        setShowTypePrompt(true);
        return;
      }
      setCurrentIdx(nextIdx);
      return;
    }

    if (nextIdx >= queueIds.length) {
      setSessionDone(true);
    } else {
      setCurrentIdx(nextIdx);
    }
  };

  const startTypeRound = () => {
    setShowTypePrompt(false);
    setCheckPhase('type');
    setCurrentIdx(0);
    resetCardInputs();
  };

  const skipTypeRound = () => {
    setShowTypePrompt(false);
    setSessionDone(true);
  };

  // 手动切换单词（初学阶段顺序由算法控制，不开放手动跳转）
  const canNavigate = stage !== 'learn' && !sessionDone && queueIds.length > 1;
  const handlePrevCard = () => {
    if (!canNavigate || currentIdx <= 0) return;
    resetCardInputs();
    setCurrentIdx((i) => Math.max(0, i - 1));
  };
  const handleNextCard = () => {
    if (!canNavigate || currentIdx >= queueIds.length - 1) return;
    resetCardInputs();
    setCurrentIdx((i) => Math.min(queueIds.length - 1, i + 1));
  };

  // Stage 1: user taps "还没记住" directly on flashcard preview
  const handleLearnMarkNotYet = () => {
    if (!activeCard || feedback) return;
    submitOutcome(
      'forgotten',
      `已将「${activeCard.korean} · ${activeCard.meaningZh}」自动记录为「没记住」，并放回队列稍后重学与确认。`
    );
  };

  const handleToggleTile = (tile: SyllableTile) => {
    if (feedback) return;
    const exists = selectedTiles.some((t) => t.id === tile.id);
    if (exists) {
      setSelectedTiles((prev) => prev.filter((t) => t.id !== tile.id));
    } else {
      setSelectedTiles((prev) => [...prev, tile]);
    }
  };

  const handleSubmitTiles = () => {
    if (!activeCard || selectedTiles.length === 0) return;
    const ok = checkSyllableAnswer(
      selectedTiles.map((t) => t.char),
      activeCard.korean
    );
    submitOutcome(ok ? 'remembered' : 'forgotten');
  };

  const handleSubmitTyping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) return;
    const cleaned = normalizeKoreanInput(typingInput);
    if (!cleaned) {
      setTypingError('请输入对应的韩语拼写，或点击左侧“想不起来”。');
      return;
    }
    setTypingError(null);
    const targetClean = normalizeKoreanInput(activeCard.korean);
    const lemmaClean = normalizeKoreanInput(activeCard.lemma);
    const isOk = cleaned === targetClean || cleaned === lemmaClean;
    submitOutcome(isOk ? 'remembered' : 'forgotten');
  };

  const stageMeta = {
    learn: {
      stepTag: '初学',
      title: '初学 · 认词与确认',
      subtitle: '',
    },
    review: {
      stepTag: '复习',
      title: '复习 · 到点回看',
      subtitle: '',
    },
    check: {
      stepTag: '巩固',
      title: '巩固 · 不看提示抽测',
      subtitle: '',
    },
    flashcard: {
      stepTag: '闪卡',
      title: '闪卡',
      subtitle: '',
    },
  }[stage];

  const forgottenCardObjects = useMemo(
    () =>
      forgottenIds
        .map((id) => cardMap.get(id))
        .filter((c): c is VocabCard => Boolean(c)),
    [forgottenIds, cardMap]
  );

  const activeEbbinghausStatus = activeCard ? formatEbbinghausStatus(activeCard) : null;
  const activeStepIndex = activeCard ? getEffectiveEbbinghausStep(activeCard) : 0;

  const renderFlashcardBox = (isStage1Intro: boolean) => {
    if (!activeCard) return null;

    const showKoreanFront = isStage1Intro || flashDirection === 'kr_to_zh';
    const showChineseFront = !isStage1Intro && flashDirection === 'zh_to_kr';
    const showAudioFront = !isStage1Intro && flashDirection === 'audio_only';

    return (
      <div className="space-y-4">
        {/* Flashcard Direction + Shuffle Controls (shown in flashcard / review quick-draw) */}
        {!isStage1Intro && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              role="group"
              aria-label="抽背卡方向"
              className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              {(
                [
                  ['kr_to_zh', '看韩想中'],
                  ['zh_to_kr', '看中想韩'],
                  ['audio_only', '听音盲抽'],
                ] as Array<[FlashcardDirection, string]>
              ).map(([dir, label]) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => {
                    setFlashDirection(dir);
                    setIsFlipped(false);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    flashDirection === dir
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
              onClick={handleShuffleDeck}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
              随机抽卡
            </button>
          </div>
        )}

        {/* Interactive Flip Flashcard */}
        <div
          data-testid="vocab-flashcard"
          className={`rounded-2xl border transition-colors ${
            isFlipped
              ? 'bg-slate-50/70 border-blue-200'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          {/* Card Header Metadata */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-semibold text-blue-700">
                {activeCard.topikLevel || 'TOPIK 核心'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeCard.pos}</span>
              <span className="font-semibold text-slate-900 tabular-nums ml-1">
                {stage === 'learn'
                  ? `${learnState.confirmedIds.length}/${totalUniqueWords}`
                  : `${Math.min(currentIdx + 1, queueIds.length)}/${queueIds.length}`}
              </span>
              {(stage === 'review' || stage === 'flashcard') && (
                <span className="flex items-center gap-1">
                  {EBBINGHAUS_STEPS.map((node) => {
                    const isCurrent = node.step === activeStepIndex;
                    const isReached = node.step < activeStepIndex;
                    return (
                      <span
                        key={node.step}
                        className={`h-1.5 w-1.5 rounded-full ${
                          isCurrent
                            ? activeCard.isForgotten
                              ? 'bg-rose-500'
                              : 'bg-blue-600'
                            : isReached
                            ? 'bg-emerald-400'
                            : 'bg-slate-200'
                        }`}
                      />
                    );
                  })}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsFlipped((v) => !v)}
              data-testid="flashcard-flip-btn"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer whitespace-nowrap shrink-0"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              {isFlipped ? '翻回' : '翻转'}
            </button>
          </div>

          {/* Card Body */}
          <div
            onClick={() => setIsFlipped((v) => !v)}
            role="button"
            tabIndex={0}
            aria-label={isFlipped ? '闪卡背面，点击翻回正面' : '闪卡正面，点击翻转查看释义'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setIsFlipped((v) => !v);
              }
            }}
            className="p-3 sm:p-8 cursor-pointer select-none min-h-[170px] sm:min-h-[220px] flex flex-col justify-between gap-2 sm:gap-6"
          >
            {!isFlipped ? (
              <div className="flex flex-col items-center justify-center text-center py-6 space-y-4">
                {showKoreanFront && (
                  <>
                    <p className="text-xs font-medium text-slate-500">
                      {isStage1Intro ? '初学闪卡正面 · 先听读音再翻卡记释义' : '抽背卡正面 · 先回忆中文含义再翻卡'}
                    </p>
                    <h2 className="font-kr text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
                      {activeCard.korean}
                    </h2>
                    <p className="font-mono-tabular text-sm text-blue-700">
                      {activeCard.spokenPronunciation}
                      {activeCard.romanization ? ` · ${activeCard.romanization}` : ''}
                    </p>
                  </>
                )}

                {showChineseFront && (
                  <>
                    <p className="text-xs font-medium text-slate-500">
                      看中文想韩文 · 先在脑中拼出韩语与发音
                    </p>
                    <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 break-words">
                      {activeCard.meaningZh}
                    </h2>
                    <p className="text-xs text-slate-500">
                      词性：{activeCard.pos} · {activeCard.topikLevel || 'TOPIK 核心'}
                    </p>
                  </>
                )}

                {showAudioFront && (
                  <>
                    <p className="text-xs font-medium text-slate-500">
                      听音盲抽 · 点击播放后回忆韩文拼写与中文意思
                    </p>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-3 pt-2"
                    >
                      <button
                        type="button"
                        onClick={() => speakKorean(activeCard.korean, { slow: false })}
                        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl cursor-pointer"
                      >
                        {isKeyLoading(activeCard.korean, false) ? (
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Volume2 className="w-4 h-4" aria-hidden="true" />
                        )}
                        播放常速发音
                      </button>
                      <button
                        type="button"
                        onClick={() => speakKorean(activeCard.korean, { slow: true })}
                        className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                      >
                        慢速拆读
                      </button>
                    </div>
                  </>
                )}

                {!showAudioFront && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 pt-1"
                  >
                    <button
                      type="button"
                      onClick={() => speakKorean(activeCard.korean, { slow: false })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                    >
                      {isKeyLoading(activeCard.korean, false) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {isKeyPlaying(activeCard.korean, false) ? '播放中' : '标准发音'}
                    </button>
                    <button
                      type="button"
                      onClick={() => speakKorean(activeCard.korean, { slow: true })}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      慢速拆读
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-5 min-w-0" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-kr text-2xl sm:text-3xl font-bold text-slate-900 break-words">
                      {activeCard.korean}
                    </h2>
                    <p className="font-mono-tabular text-sm text-blue-700 mt-1">
                      {activeCard.spokenPronunciation}
                      {activeCard.lemma !== activeCard.korean ? ` · 原形 ${activeCard.lemma}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => speakKorean(activeCard.korean, { slow: false })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      常速
                    </button>
                    <button
                      type="button"
                      onClick={() => speakKorean(activeCard.korean, { slow: true })}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      慢速
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 space-y-3.5">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">中文核心释义</p>
                    <p className="text-lg sm:text-xl font-bold text-slate-900 break-words">{activeCard.meaningZh}</p>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/80">
                    <p className="text-xs font-semibold text-slate-600 mb-1">记忆助记法 (Mem)</p>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed break-words">{activeCard.memriseTip}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs text-slate-500">语境例句 / 高频搭配</p>
                      <KoreanReadButton
                        text={activeCard.exampleKr}
                        speakKorean={speakKorean}
                        isKeyLoading={isKeyLoading}
                        isKeyPlaying={isKeyPlaying}
                        showSlow
                        compact
                      />
                    </div>
                    <p className="font-kr text-base font-medium text-slate-900 break-keep">
                      {activeCard.exampleKr}
                    </p>
                    <p className="text-sm text-slate-600 mt-0.5">{activeCard.exampleZh}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer for Flashcard */}
        {!feedback && (
          <div className="flex items-center justify-center gap-3 pt-1">
            {isStage1Intro ? (
              <>
                <button
                  type="button"
                  onClick={handleLearnMarkNotYet}
                  data-testid="learn-mark-forgotten-btn"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">没记住</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFlipped(false);
                    setLearnPhase('confirm');
                  }}
                  data-testid="learn-start-confirm-btn"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">进入确认</span>
                  <ArrowRight className="hidden sm:block w-4 h-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <div className="w-full space-y-2">
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => submitOutcome('forgotten')}
                    data-testid="flashcard-rate-forgotten"
                    className="py-3 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-sm font-semibold transition-colors cursor-pointer flex flex-col items-center gap-0.5"
                  >
                    <span className="inline-flex items-center gap-1">
                      <X className="w-4 h-4" aria-hidden="true" />
                      <span className="hidden sm:inline">没记住</span>
                    </span>
                    <span className="hidden sm:block text-[11px] font-normal text-rose-700">5 分钟后</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => submitOutcome('vague')}
                    data-testid="flashcard-rate-vague"
                    className="py-3 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-sm font-semibold transition-colors cursor-pointer flex flex-col items-center gap-0.5"
                  >
                    <span className="hidden sm:inline">模糊</span>
                    <AlertCircle className="w-4 h-4 sm:hidden" aria-hidden="true" />
                    <span className="hidden sm:block text-[11px] font-normal text-amber-800">30 分钟后</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => submitOutcome('remembered')}
                    data-testid="flashcard-rate-remembered"
                    className="py-3 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-sm font-semibold transition-colors cursor-pointer flex flex-col items-center gap-0.5"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-4 h-4" aria-hidden="true" />
                      <span className="hidden sm:inline">记住</span>
                    </span>
                    <span className="hidden sm:block text-[11px] font-normal text-emerald-800">
                      推进至 {EBBINGHAUS_STEPS[Math.min(EBBINGHAUS_STEPS.length - 1, activeStepIndex + 1)].shortLabel}后
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section aria-label={stageMeta.title} className="max-w-3xl mx-auto py-2">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 space-y-6">
        {/* Session Header */}
        <div className="flex items-center gap-2 pb-2 sm:pb-3 border-b border-slate-100 sm:items-start sm:justify-between">
          <button
            type="button"
            onClick={onExit}
            aria-label="返回每日背词"
            className="sm:hidden p-1 -ml-1 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="hidden sm:block text-xs font-semibold text-blue-700">{stageMeta.stepTag}</p>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 truncate">{stageMeta.title}</h1>

          </div>
          <div className="flex items-center gap-1.5 shrink-0 justify-end">
            {onToggleAutoSpeak && (
              <button
                type="button"
                role="switch"
                aria-checked={autoSpeak}
                onClick={onToggleAutoSpeak}
                aria-label="自动发音"
                title="卡片出现时自动朗读韩语"
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 sm:px-2.5 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  autoSpeak
                    ? 'bg-blue-700 border-blue-700 text-white'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">自动发音{autoSpeak ? '开' : '关'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onExit}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              返回每日背词
            </button>
          </div>
        </div>

        {/* 选词轮结束后：询问是否进入打字轮 */}
        {showTypePrompt && (
          <div className="p-6 border border-slate-200 rounded-xl text-center space-y-3">
            <p className="text-sm font-semibold text-slate-900">选词轮完成</p>
            <p className="text-xs text-slate-500">要不要再来一轮打字？打字更难，但记得更牢。</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={startTypeRound}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                开始打字
              </button>
              <button
                type="button"
                onClick={skipTypeRound}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                跳过
              </button>
            </div>
          </div>
        )}

        {/* 手动切词：上一个 / 下一个 */}
        {stage !== 'learn' && !sessionDone && !showTypePrompt && (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrevCard}
              disabled={!canNavigate || currentIdx <= 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" aria-hidden="true" />
              上一个
            </button>
            <span className="text-xs text-slate-500 tabular-nums">
              {Math.min(currentIdx + 1, queueIds.length)} / {queueIds.length}
            </span>
            <button
              type="button"
              onClick={handleNextCard}
              disabled={!canNavigate || currentIdx >= queueIds.length - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer"
            >
              下一个
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Session Completed Scorecard */}
        {sessionDone ? (
          <div className="py-6 space-y-6" data-testid="session-complete-view">
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold text-emerald-700">
                {stage === 'learn'
                  ? '初学完成'
                  : stage === 'review'
                  ? '复习完成'
                  : stage === 'check'
                  ? '巩固完成'
                  : '闪卡完成'}
              </p>
              <h2 className="text-2xl font-bold text-slate-900 tabular-nums">
                完成 {totalAttempts} 次检验，正确率{' '}
                {totalAttempts === 0 ? 100 : Math.round((correctAttempts / totalAttempts) * 100)}%
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                错的词已记为「没记住」，5 分钟后优先复习。
              </p>
            </div>

            {forgottenCardObjects.length > 0 && (
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-rose-900 flex items-center gap-1.5">
                    <X className="w-4 h-4 text-rose-700" aria-hidden="true" />
                    错词 ({forgottenCardObjects.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => onSwitchStage('flashcard', forgottenCardObjects)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-800 bg-white border border-rose-300 hover:bg-rose-100 rounded-lg cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                    立即闪卡重练
                  </button>
                </div>
                <ul className="divide-y divide-rose-200/70">
                  {forgottenCardObjects.map((card) => (
                    <li
                      key={card.id}
                      className="py-2 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-kr font-bold text-slate-900">{card.korean}</span>
                        <span className="text-xs text-slate-500 ml-2">{card.spokenPronunciation}</span>
                        <span className="text-slate-700 ml-2">{card.meaningZh}</span>
                      </div>
                      <span className="text-xs font-medium text-rose-700 whitespace-nowrap shrink-0">
                        5分钟后艾宾浩斯回炉
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {stage === 'learn' && (
                <button
                  type="button"
                  onClick={() => onSwitchStage('review')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl cursor-pointer"
                >
                  进入复习
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              {stage === 'review' && (
                <button
                  type="button"
                  onClick={() => onSwitchStage('check')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl cursor-pointer"
                >
                  进入巩固
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onSwitchStage(stage)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                再练一轮
              </button>
              <button
                type="button"
                onClick={onExit}
                className="px-4 py-2.5 text-sm font-semibold text-slate-900 border border-slate-300 hover:bg-slate-50 rounded-xl cursor-pointer"
              >
                返回每日背词面板
              </button>
            </div>
          </div>
        ) : activeCard ? (
          <div className="space-y-6">
            {/* Stage 1 Step A: Flashcard Preview */}
            {stage === 'learn' && learnPhase === 'study' && renderFlashcardBox(true)}

            {/* Flashcard / Quick-Draw Card Mode (Stage 2 quick-draw or Standalone Flashcard) */}
            {(stage === 'flashcard' || (stage === 'review' && currentQuizType === 'flashcard_self')) &&
              renderFlashcardBox(false)}

            {/* Active Quiz: Multiple Choice */}
            {((stage === 'learn' && learnPhase === 'confirm' && currentQuizType === 'choice') ||
              (stage === 'review' && currentQuizType === 'choice') ||
              (stage === 'check' && currentQuizType === 'choice')) && (
              <div className="space-y-5" data-testid="quiz-choice-panel">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-blue-700 mb-1.5">
                      {stage === 'learn'
                        ? '确认学会检验 · 选出正确的中文释义（选错自动记为没记住）'
                        : stage === 'check'
                        ? '巩固 · 选出最准确的中文释义'
                        : '艾宾浩斯主动回想 · 选择正确释义'}
                    </p>
                    <h2 className="font-kr text-3xl sm:text-4xl font-bold text-slate-900">
                      {activeCard.korean}
                    </h2>
                    <p className="font-mono-tabular text-sm text-slate-500 mt-1">
                      {activeCard.spokenPronunciation}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakKorean(activeCard.korean)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer shrink-0"
                  >
                    <Volume2 className="w-4 h-4" aria-hidden="true" />
                    听发音
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {choiceOptions.map((option) => {
                    const isCorrectOption = option.id === activeCard.id;
                    let stateStyle =
                      'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-slate-900';
                    if (feedback) {
                      if (isCorrectOption) {
                        stateStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                      } else {
                        stateStyle = 'border-slate-200 bg-slate-50 text-slate-400';
                      }
                    }
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={Boolean(feedback)}
                        data-correct={isCorrectOption ? 'true' : 'false'}
                        onClick={() => submitOutcome(isCorrectOption ? 'remembered' : 'forgotten')}
                        className={`text-left p-4 rounded-xl border text-sm font-medium transition-colors cursor-pointer disabled:cursor-default ${stateStyle}`}
                      >
                        {option.meaningZh}
                      </button>
                    );
                  })}
                </div>

                {!feedback && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => submitOutcome('forgotten')}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-700 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      想不起来（直接记为没记住并看答案）
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Active Quiz: Hangul Syllable Tiles */}
            {((stage === 'learn' && learnPhase === 'confirm' && currentQuizType === 'tiles') ||
              (stage === 'review' && currentQuizType === 'tiles') ||
              (stage === 'check' && currentQuizType === 'tiles')) && (
              <div className="space-y-5" data-testid="quiz-tiles-panel">
                <div>
                  <p className="text-xs font-medium text-blue-700 mb-1.5">
                    {stage === 'learn'
                      ? '确认学会检验 · 按顺序拼出对应韩文（拼错自动记为没记住）'
                      : '音节拼装回想 · 依次点击韩文字块拼出单词'}
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">{activeCard.meaningZh}</h2>
                  {stage !== 'check' && (
                    <p className="text-xs text-slate-500 mt-1">
                      提示：{activeCard.pos} · {activeCard.memriseTip}
                    </p>
                  )}
                </div>

                <div className="min-h-[64px] p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center flex-wrap gap-2">
                  {selectedTiles.length === 0 ? (
                    <span className="text-sm text-slate-400">点击下方音节块依次拼出韩语……</span>
                  ) : (
                    selectedTiles.map((tile) => (
                      <button
                        key={tile.id}
                        type="button"
                        disabled={Boolean(feedback)}
                        onClick={() => handleToggleTile(tile)}
                        className="font-kr px-3.5 py-2 text-lg font-semibold bg-white border border-blue-300 text-blue-800 rounded-lg hover:bg-blue-50 cursor-pointer"
                      >
                        {tile.char}
                      </button>
                    ))
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {syllableTiles.map((tile) => {
                    const used = selectedTiles.some((t) => t.id === tile.id);
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        disabled={used || Boolean(feedback)}
                        onClick={() => handleToggleTile(tile)}
                        className={`font-kr min-w-[48px] min-h-[48px] px-3.5 py-2 text-lg font-semibold rounded-xl border transition-colors cursor-pointer ${
                          used
                            ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-default'
                            : 'bg-white border-slate-300 text-slate-900 hover:border-blue-500 hover:text-blue-700'
                        }`}
                      >
                        {tile.char}
                      </button>
                    );
                  })}
                </div>

                {!feedback && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setSelectedTiles([])}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        清空
                      </button>
                      <button
                        type="button"
                        onClick={() => submitOutcome('forgotten')}
                        className="text-xs text-slate-500 hover:text-rose-700 cursor-pointer"
                      >
                        想不起来（记为没记住）
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={selectedTiles.length === 0}
                      onClick={handleSubmitTiles}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-xl transition-colors cursor-pointer"
                    >
                      提交确认
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Active Quiz: Direct Typing (Stage 3 Check) */}
            {stage === 'check' && currentQuizType === 'typing' && (
              <form onSubmit={handleSubmitTyping} className="space-y-5" data-testid="quiz-typing-panel">
                <div>
                  <p className="text-xs font-medium text-blue-700 mb-1.5">
                    巩固 · 直接键入对应的韩语词汇
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">{activeCard.meaningZh}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    词性：{activeCard.pos} · {activeCard.topikLevel || 'TOPIK 核心'}
                  </p>
                </div>

                <div>
                  <label htmlFor="daily-check-typing-input" className="sr-only">
                    输入韩语单词
                  </label>
                  <input
                    id="daily-check-typing-input"
                    type="text"
                    value={typingInput}
                    disabled={Boolean(feedback)}
                    onChange={(e) => {
                      setTypingInput(e.target.value);
                      if (typingError) setTypingError(null);
                    }}
                    placeholder="请输入对应的韩文拼写……"
                    className="font-kr w-full px-4 py-3 text-lg bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                  {typingError && (
                    <p role="alert" className="text-xs text-rose-600 mt-1.5">
                      {typingError}
                    </p>
                  )}
                </div>

                {!feedback && (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => submitOutcome('forgotten')}
                      className="text-sm text-slate-500 hover:text-rose-700 cursor-pointer"
                    >
                      想不起来（记为没记住并看答案）
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors cursor-pointer"
                    >
                      提交
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* Answer Feedback Banner */}
            {feedback && (
              <div
                role="status"
                data-testid="session-feedback-banner"
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                  feedback.status === 'remembered'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : feedback.status === 'vague'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {feedback.status === 'remembered' ? (
                    <Check className="w-4 h-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  ) : feedback.status === 'vague' ? (
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" aria-hidden="true" />
                  ) : (
                    <X className="w-4 h-4 shrink-0 text-rose-700" aria-hidden="true" />
                  )}
                  <p className="text-xs sm:text-sm font-semibold break-keep">{feedback.title}</p>
                </div>
                <button
                  type="button"
                  onClick={handleAdvance}
                  data-testid="session-next-btn"
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                >
                  继续下一词
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
