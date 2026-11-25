import { useCallback, useEffect, useState } from 'react';
import { SEED_VOCAB_CARDS } from '../data/seedData';
import { TOPIK_VOCAB_CARDS } from '../data/topikVocab';
import type {
  ChatMessage,
  DailyStats,
  DailyTargetLevel,
  DailyVocabPlan,
  DailyVocabStage,
  EbbinghausOutcome,
  OfficialTopikWord,
  ParsedToken,
  TopikLevel,
  VocabCard,
} from '../types/learning';
import { getTodayDateKey } from '../utils/korean';
import { applyEbbinghausReview } from '../utils/ebbinghaus';
import {
  applyReviewResult,
  createVocabFromOfficialTopik,
  createVocabFromParsedToken,
  mergeSeedVocab,
  plantNewWord,
} from '../utils/srs';

const VOCAB_STORAGE_KEY = 'hangyeol_vocab_v1';
const STATS_STORAGE_KEY = 'hangyeol_stats_v2';
const CHAT_STORAGE_KEY = 'hangyeol_chat_v1';
const DAILY_PLAN_STORAGE_KEY = 'hangyeol_daily_plan_v1';
const CHECKIN_STORAGE_KEY = 'hangyeol_checkin_v1';

/** 每天练满 15 分钟才计入打卡 */
export const CHECKIN_TARGET_SECONDS = 15 * 60;

const ALL_SEED_VOCAB: VocabCard[] = [...SEED_VOCAB_CARDS, ...TOPIK_VOCAB_CARDS];

const DEFAULT_STATS: DailyStats = {
  streakDays: 0,
  todayReviewed: 0,
  dailyGoal: 15,
  xp: 0,
  todayXp: 0,
  dailyXpGoal: 150,
  todayPracticeSeconds: 0,
  dailyMinutesGoal: 15,
  masteredGrammarIds: [],
  lastStudyDate: getTodayDateKey(),
};

/** 从打卡记录里算连续天数：今天没满 15 分钟就从昨天往前数 */
export function computeCheckinStreak(
  checkins: Record<string, number>,
  todayKey: string,
  targetSeconds = CHECKIN_TARGET_SECONDS
): number {
  const isChecked = (key: string) => (checkins[key] || 0) >= targetSeconds;
  const cursor = new Date(`${todayKey}T00:00:00`);
  if (!isChecked(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  for (;;) {
    const key = getDateKeyFromDate(cursor);
    if (!isChecked(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 3650) break;
  }
  return streak;
}

function getDateKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadInitialCheckins(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(CHECKIN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed || {})) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === 'number' && value > 0) {
        result[key] = Math.floor(value);
      }
    }
    return result;
  } catch {
    return {};
  }
}

function createDefaultDailyPlan(
  dailyCount = 15,
  targetLevel: DailyTargetLevel = 'TOPIK 1级'
): DailyVocabPlan {
  return {
    dateKey: getTodayDateKey(),
    dailyCount,
    targetLevel,
    drawNonce: 0,
    drawnCardIds: [],
    stage1ConfirmedIds: [],
    stage1ForgottenIds: [],
    stage2ReviewedIds: [],
    stage3PassedIds: [],
    stage3FailedIds: [],
  };
}

function loadInitialVocab(): VocabCard[] {
  try {
    const raw = window.localStorage.getItem(VOCAB_STORAGE_KEY);
    if (!raw) return ALL_SEED_VOCAB;
    const parsed = JSON.parse(raw) as VocabCard[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return mergeSeedVocab(parsed, ALL_SEED_VOCAB);
    }
  } catch {
    // Fallback to seed data on corrupted storage
  }
  return ALL_SEED_VOCAB;
}

function loadInitialStats(): DailyStats {
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw) as Partial<DailyStats>;
    const today = getTodayDateKey();
    if (parsed.lastStudyDate !== today) {
      return {
        ...DEFAULT_STATS,
        ...parsed,
        todayReviewed: 0,
        todayXp: 0,
        todayPracticeSeconds: 0,
        lastStudyDate: today,
      };
    }
    return {
      ...DEFAULT_STATS,
      ...parsed,
      todayXp: typeof parsed.todayXp === 'number' ? parsed.todayXp : DEFAULT_STATS.todayXp,
      dailyXpGoal: typeof parsed.dailyXpGoal === 'number' ? parsed.dailyXpGoal : DEFAULT_STATS.dailyXpGoal,
      todayPracticeSeconds:
        typeof parsed.todayPracticeSeconds === 'number'
          ? parsed.todayPracticeSeconds
          : DEFAULT_STATS.todayPracticeSeconds,
      dailyMinutesGoal:
        typeof parsed.dailyMinutesGoal === 'number'
          ? parsed.dailyMinutesGoal
          : DEFAULT_STATS.dailyMinutesGoal,
    };
  } catch {
    return DEFAULT_STATS;
  }
}

function loadInitialDailyPlan(): DailyVocabPlan {
  const today = getTodayDateKey();
  try {
    const raw = window.localStorage.getItem(DAILY_PLAN_STORAGE_KEY);
    if (!raw) return createDefaultDailyPlan();
    const parsed = JSON.parse(raw) as Partial<DailyVocabPlan>;
    const count =
      typeof parsed.dailyCount === 'number'
        ? Math.min(50, Math.max(5, Math.round(parsed.dailyCount)))
        : 15;
    const level: DailyTargetLevel = parsed.targetLevel || 'TOPIK 1级';
    if (parsed.dateKey !== today) {
      return createDefaultDailyPlan(count, level);
    }
    return {
      dateKey: today,
      dailyCount: count,
      targetLevel: level,
      drawNonce: typeof parsed.drawNonce === 'number' ? parsed.drawNonce : 0,
      drawnCardIds: Array.isArray(parsed.drawnCardIds) ? parsed.drawnCardIds : [],
      stage1ConfirmedIds: Array.isArray(parsed.stage1ConfirmedIds) ? parsed.stage1ConfirmedIds : [],
      stage1ForgottenIds: Array.isArray(parsed.stage1ForgottenIds) ? parsed.stage1ForgottenIds : [],
      stage2ReviewedIds: Array.isArray(parsed.stage2ReviewedIds) ? parsed.stage2ReviewedIds : [],
      stage3PassedIds: Array.isArray(parsed.stage3PassedIds) ? parsed.stage3PassedIds : [],
      stage3FailedIds: Array.isArray(parsed.stage3FailedIds) ? parsed.stage3FailedIds : [],
    };
  } catch {
    return createDefaultDailyPlan();
  }
}

function loadInitialChat(): ChatMessage[] {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (Array.isArray(parsed)) return parsed.slice(-40);
  } catch {
    // Ignore corrupted chat storage
  }
  return [];
}

function addUniqueId(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

export function useLearningStore() {
  const [vocabCards, setVocabCards] = useState<VocabCard[]>(loadInitialVocab);
  const [stats, setStats] = useState<DailyStats>(loadInitialStats);
  const [dailyPlan, setDailyPlan] = useState<DailyVocabPlan>(loadInitialDailyPlan);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(loadInitialChat);
  const [checkins, setCheckins] = useState<Record<string, number>>(loadInitialCheckins);

  useEffect(() => {
    try {
      window.localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(vocabCards));
    } catch {
      // Ignore storage quota errors
    }
  }, [vocabCards]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Ignore storage quota errors
    }
  }, [stats]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DAILY_PLAN_STORAGE_KEY, JSON.stringify(dailyPlan));
    } catch {
      // Ignore storage quota errors
    }
  }, [dailyPlan]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages.slice(-40)));
    } catch {
      // Ignore storage quota errors
    }
  }, [chatMessages]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(checkins));
    } catch {
      // Ignore storage quota errors
    }
  }, [checkins]);

  // Active study duration tracker (ticks every second while page is visible)
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        const today = getTodayDateKey();
        setStats((prev) => ({
          ...prev,
          todayPracticeSeconds: (prev.todayPracticeSeconds || 0) + 1,
          lastStudyDate: today,
        }));
        setCheckins((prev) => ({
          ...prev,
          [today]: (prev[today] || 0) + 1,
        }));
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // 连续打卡天数＝从今天（或昨天）往前连续「满 15 分钟」的天数
  useEffect(() => {
    const streak = computeCheckinStreak(checkins, getTodayDateKey());
    setStats((prev) => (prev.streakDays === streak ? prev : { ...prev, streakDays: streak }));
  }, [checkins]);

  const setDailyVocabConfig = useCallback(
    (dailyCount: number, targetLevel: DailyTargetLevel) => {
      const clamped = Math.min(50, Math.max(5, Math.round(dailyCount)));
      setDailyPlan((prev) => ({
        ...prev,
        dateKey: getTodayDateKey(),
        dailyCount: clamped,
        targetLevel,
      }));
      setStats((prev) => ({
        ...prev,
        dailyGoal: clamped,
      }));
    },
    []
  );

  const applyDailyDrawnWords = useCallback(
    (
      words: OfficialTopikWord[],
      level: DailyTargetLevel,
      count: number,
      resetStageProgress = true
    ): string[] => {
      const clamped = Math.min(50, Math.max(5, Math.round(count)));
      const now = Date.now();
      const resolvedIds: string[] = [];

      setVocabCards((prev) => {
        const byKorean = new Map<string, VocabCard>();
        for (const card of prev) {
          byKorean.set(card.korean.trim(), card);
        }

        const newCards: VocabCard[] = [];
        for (const word of words) {
          const key = word.korean.trim();
          if (!key) continue;
          const existing = byKorean.get(key);
          if (existing) {
            resolvedIds.push(existing.id);
          } else {
            const created = createVocabFromOfficialTopik(word, now);
            created.ebbinghausStep = 0;
            created.isForgotten = false;
            byKorean.set(key, created);
            newCards.push(created);
            resolvedIds.push(created.id);
          }
        }
        return newCards.length > 0 ? [...newCards, ...prev] : prev;
      });

      // Compute deterministic IDs synchronously as well for plan update
      const existingByKorean = new Map<string, VocabCard>();
      for (const card of vocabCards) {
        existingByKorean.set(card.korean.trim(), card);
      }
      const planCardIds: string[] = [];
      for (const word of words) {
        const key = word.korean.trim();
        if (!key) continue;
        const existing = existingByKorean.get(key);
        planCardIds.push(existing ? existing.id : `topik-book-${word.id}`);
      }

      setDailyPlan((prev) => ({
        dateKey: getTodayDateKey(),
        dailyCount: clamped,
        targetLevel: level,
        drawNonce: prev.drawNonce + 1,
        drawnCardIds: planCardIds,
        stage1ConfirmedIds: resetStageProgress ? [] : prev.stage1ConfirmedIds,
        stage1ForgottenIds: resetStageProgress ? [] : prev.stage1ForgottenIds,
        stage2ReviewedIds: resetStageProgress ? [] : prev.stage2ReviewedIds,
        stage3PassedIds: resetStageProgress ? [] : prev.stage3PassedIds,
        stage3FailedIds: resetStageProgress ? [] : prev.stage3FailedIds,
      }));

      setStats((prev) => ({
        ...prev,
        dailyGoal: clamped,
      }));

      return planCardIds;
    },
    [vocabCards]
  );

  const recordEbbinghausOutcome = useCallback(
    (cardId: string, outcome: EbbinghausOutcome, stagePhase: DailyVocabStage) => {
      const now = Date.now();
      const xpGain = outcome === 'remembered' ? 15 : outcome === 'vague' ? 10 : 5;

      setVocabCards((prev) =>
        prev.map((card) =>
          card.id === cardId ? applyEbbinghausReview(card, outcome, now) : card
        )
      );

      setDailyPlan((prev) => {
        const next = { ...prev, dateKey: getTodayDateKey() };
        if (stagePhase === 'learn') {
          if (outcome === 'remembered') {
            next.stage1ConfirmedIds = addUniqueId(prev.stage1ConfirmedIds, cardId);
          } else if (outcome === 'forgotten') {
            next.stage1ForgottenIds = addUniqueId(prev.stage1ForgottenIds, cardId);
          }
        } else if (stagePhase === 'review' || stagePhase === 'flashcard') {
          next.stage2ReviewedIds = addUniqueId(prev.stage2ReviewedIds, cardId);
          if (outcome === 'forgotten') {
            next.stage1ForgottenIds = addUniqueId(prev.stage1ForgottenIds, cardId);
          }
        } else if (stagePhase === 'check') {
          if (outcome === 'remembered') {
            next.stage3PassedIds = addUniqueId(prev.stage3PassedIds, cardId);
            next.stage3FailedIds = prev.stage3FailedIds.filter((id) => id !== cardId);
          } else {
            next.stage3FailedIds = addUniqueId(prev.stage3FailedIds, cardId);
          }
        }
        return next;
      });

      setStats((prev) => ({
        ...prev,
        todayReviewed: prev.todayReviewed + 1,
        xp: prev.xp + xpGain,
        todayXp: (prev.todayXp || 0) + xpGain,
        lastStudyDate: getTodayDateKey(),
      }));
    },
    []
  );

  const recordVocabReview = useCallback((cardId: string, isCorrect: boolean, isPlanting = false) => {
    const now = Date.now();
    const xpGain = isCorrect ? 15 : 5;
    setVocabCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) return card;
        if (!isCorrect) {
          return applyEbbinghausReview(card, 'forgotten', now);
        }
        return isPlanting ? plantNewWord(card, now) : applyReviewResult(card, isCorrect, now);
      })
    );
    setStats((prev) => ({
      ...prev,
      todayReviewed: prev.todayReviewed + 1,
      xp: prev.xp + xpGain,
      todayXp: (prev.todayXp || 0) + xpGain,
      lastStudyDate: getTodayDateKey(),
    }));
  }, []);

  const updateVocabMem = useCallback((cardId: string, memriseTip: string) => {
    setVocabCards((prev) =>
      prev.map((card) => (card.id === cardId ? { ...card, memriseTip: memriseTip.trim() } : card))
    );
  }, []);

  const hasWordInGarden = useCallback(
    (koreanOrLemma: string) => {
      const normalized = koreanOrLemma.trim();
      return vocabCards.some(
        (c) => c.korean === normalized || c.lemma === normalized
      );
    },
    [vocabCards]
  );

  const addVocabFromToken = useCallback(
    (token: ParsedToken, sourceLabel: string): boolean => {
      const key = (token.lemma || token.surface).trim();
      if (!key) return false;
      let added = false;
      setVocabCards((prev) => {
        if (prev.some((c) => c.korean === key || c.lemma === key)) {
          return prev;
        }
        added = true;
        return [createVocabFromParsedToken(token, sourceLabel), ...prev];
      });
      if (added) {
        setStats((prev) => ({
          ...prev,
          xp: prev.xp + 10,
          todayXp: (prev.todayXp || 0) + 10,
        }));
      }
      return added;
    },
    []
  );

  const addCustomVocab = useCallback(
    (input: {
      korean: string;
      meaningZh: string;
      spokenPronunciation?: string;
      pos?: string;
      memriseTip?: string;
      exampleKr?: string;
      exampleZh?: string;
      category?: VocabCard['category'];
      topikLevel?: TopikLevel;
    }): { ok: boolean; error?: string } => {
      const korean = input.korean.trim();
      const meaningZh = input.meaningZh.trim();
      if (!korean || !meaningZh) {
        return { ok: false, error: '请填写韩语词汇和中文释义。' };
      }
      if (vocabCards.some((c) => c.korean === korean || c.lemma === korean)) {
        return { ok: false, error: `词库中已经存在「${korean}」。` };
      }

      const now = Date.now();
      const newCard: VocabCard = {
        id: `custom-${now}`,
        korean,
        lemma: korean,
        spokenPronunciation: input.spokenPronunciation?.trim() || `[${korean}]`,
        romanization: '',
        meaningZh,
        pos: input.pos?.trim() || '日常表达',
        category: input.category || '日常口语',
        topikLevel: input.topikLevel || '日常拓展',
        memriseTip: input.memriseTip?.trim() || '结合日常真实场景反复跟读三遍强化记忆。',
        exampleKr: input.exampleKr?.trim() || korean,
        exampleZh: input.exampleZh?.trim() || meaningZh,
        stage: 0,
        ebbinghausStep: 0,
        isForgotten: false,
        nextReviewAt: now,
        correctCount: 0,
        wrongCount: 0,
        addedFrom: '手动添加',
      };

      setVocabCards((prev) => [newCard, ...prev]);
      setStats((prev) => ({
        ...prev,
        xp: prev.xp + 10,
        todayXp: (prev.todayXp || 0) + 10,
      }));
      return { ok: true };
    },
    [vocabCards]
  );

  const importOfficialTopikWords = useCallback(
    (words: OfficialTopikWord[]): number => {
      if (!words.length) return 0;
      const now = Date.now();
      const existingKeys = new Set<string>();
      for (const card of vocabCards) {
        existingKeys.add(card.korean.trim());
        existingKeys.add(card.lemma.trim());
      }

      const toAdd: VocabCard[] = [];
      for (const word of words) {
        const key = word.korean.trim();
        if (!key || existingKeys.has(key)) continue;
        existingKeys.add(key);
        toAdd.push(createVocabFromOfficialTopik(word, now));
      }

      if (toAdd.length === 0) return 0;

      setVocabCards((prev) => [...toAdd, ...prev]);
      setStats((prev) => ({
        ...prev,
        xp: prev.xp + 5,
        todayXp: (prev.todayXp || 0) + 5,
      }));
      return toAdd.length;
    },
    [vocabCards]
  );

  const deleteVocabCard = useCallback((cardId: string) => {
    setVocabCards((prev) => prev.filter((c) => c.id !== cardId));
  }, []);

  const markGrammarPracticed = useCallback((grammarId: string, score: number) => {
    const xpGain = score >= 80 ? 25 : 12;
    setStats((prev) => {
      const already = prev.masteredGrammarIds.includes(grammarId);
      const nextIds =
        score >= 70 && !already
          ? [...prev.masteredGrammarIds, grammarId]
          : prev.masteredGrammarIds;
      return {
        ...prev,
        masteredGrammarIds: nextIds,
        xp: prev.xp + xpGain,
        todayXp: (prev.todayXp || 0) + xpGain,
        todayReviewed: prev.todayReviewed + 1,
      };
    });
  }, []);

  const awardActivityXp = useCallback((points: number) => {
    setStats((prev) => ({
      ...prev,
      xp: prev.xp + points,
      todayXp: (prev.todayXp || 0) + points,
    }));
  }, []);

  const appendChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages((prev) => [...prev.slice(-39), msg]);
  }, []);

  const clearChatMessages = useCallback(() => {
    setChatMessages([]);
  }, []);

  return {
    vocabCards,
    stats,
    dailyPlan,
    chatMessages,
    checkins,
    todayCheckinSeconds: checkins[getTodayDateKey()] || 0,
    checkinTargetSeconds: CHECKIN_TARGET_SECONDS,
    setDailyVocabConfig,
    applyDailyDrawnWords,
    recordEbbinghausOutcome,
    recordVocabReview,
    updateVocabMem,
    hasWordInGarden,
    addVocabFromToken,
    addCustomVocab,
    importOfficialTopikWords,
    deleteVocabCard,
    markGrammarPracticed,
    awardActivityXp,
    appendChatMessage,
    clearChatMessages,
  };
}
