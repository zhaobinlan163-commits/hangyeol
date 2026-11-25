import type {
  EbbinghausOutcome,
  GrowthStage,
  VocabCard,
} from '../types/learning';

export interface EbbinghausStepInfo {
  step: number;
  label: string;
  shortLabel: string;
  intervalMs: number;
  phaseNote: string;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Classic Ebbinghaus Forgetting Curve 9-stage review intervals:
 * 5m -> 30m -> 12h -> 1d -> 2d -> 4d -> 7d -> 15d -> 30d
 */
export const EBBINGHAUS_STEPS: readonly EbbinghausStepInfo[] = [
  { step: 0, label: '5 分钟', shortLabel: '5分', intervalMs: 5 * MINUTE_MS, phaseNote: '瞬时记忆巩固' },
  { step: 1, label: '30 分钟', shortLabel: '30分', intervalMs: 30 * MINUTE_MS, phaseNote: '第一遗忘拐点' },
  { step: 2, label: '12 小时', shortLabel: '12时', intervalMs: 12 * HOUR_MS, phaseNote: '当日巩固' },
  { step: 3, label: '1 天', shortLabel: '1天', intervalMs: 1 * DAY_MS, phaseNote: '次日巩固' },
  { step: 4, label: '2 天', shortLabel: '2天', intervalMs: 2 * DAY_MS, phaseNote: '短中期过渡' },
  { step: 5, label: '4 天', shortLabel: '4天', intervalMs: 4 * DAY_MS, phaseNote: '中期强化' },
  { step: 6, label: '7 天', shortLabel: '7天', intervalMs: 7 * DAY_MS, phaseNote: '一周记忆节点' },
  { step: 7, label: '15 天', shortLabel: '15天', intervalMs: 15 * DAY_MS, phaseNote: '半月稳定' },
  { step: 8, label: '30 天', shortLabel: '30天', intervalMs: 30 * DAY_MS, phaseNote: '长期牢固掌握' },
] as const;

export const MAX_EBBINGHAUS_STEP = EBBINGHAUS_STEPS.length - 1;

export function getEffectiveEbbinghausStep(card: VocabCard): number {
  if (typeof card.ebbinghausStep === 'number' && Number.isFinite(card.ebbinghausStep)) {
    return Math.min(MAX_EBBINGHAUS_STEP, Math.max(0, Math.round(card.ebbinghausStep)));
  }
  switch (card.stage) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    case 4:
      return 5;
    case 5:
      return 7;
    default:
      return 0;
  }
}

export function mapEbbinghausStepToGrowthStage(step: number): GrowthStage {
  if (step <= 1) return 1;
  if (step === 2) return 2;
  if (step <= 4) return 3;
  if (step <= 6) return 4;
  return 5;
}

/**
 * Updates a vocabulary card strictly along the Ebbinghaus forgetting curve.
 * - 'remembered': advances step (+1, max 8) and schedules the next Ebbinghaus milestone.
 * - 'vague': steps back 1 level (min 0) and schedules a 30-minute re-check.
 * - 'forgotten' (or any wrong quiz answer): automatically marks `isForgotten = true`,
 *   resets `ebbinghausStep = 0`, schedules immediate 5-minute reinforcement, and increments `wrongCount`.
 */
export function applyEbbinghausReview(
  card: VocabCard,
  outcome: EbbinghausOutcome,
  nowMs: number = Date.now()
): VocabCard {
  const currentStep = getEffectiveEbbinghausStep(card);

  if (outcome === 'forgotten') {
    const stepInfo = EBBINGHAUS_STEPS[0];
    const regressedStage: GrowthStage = card.stage <= 1 ? 1 : ((card.stage - 1) as GrowthStage);
    return {
      ...card,
      stage: regressedStage,
      ebbinghausStep: 0,
      isForgotten: true,
      lastResult: 'forgotten',
      lastReviewedAt: nowMs,
      nextReviewAt: nowMs + stepInfo.intervalMs,
      wrongCount: card.wrongCount + 1,
    };
  }

  if (outcome === 'vague') {
    const nextStep = Math.max(0, currentStep - 1);
    const stepInfo = EBBINGHAUS_STEPS[Math.min(1, nextStep + 1)];
    return {
      ...card,
      stage: mapEbbinghausStepToGrowthStage(nextStep),
      ebbinghausStep: nextStep,
      isForgotten: false,
      lastResult: 'vague',
      lastReviewedAt: nowMs,
      nextReviewAt: nowMs + stepInfo.intervalMs,
      correctCount: card.correctCount + 1,
    };
  }

  // 'remembered'
  const nextStep =
    card.stage === 0 && typeof card.ebbinghausStep !== 'number'
      ? 1
      : Math.min(MAX_EBBINGHAUS_STEP, currentStep + 1);
  const stepInfo = EBBINGHAUS_STEPS[nextStep];

  return {
    ...card,
    stage: mapEbbinghausStepToGrowthStage(nextStep),
    ebbinghausStep: nextStep,
    isForgotten: false,
    lastResult: 'remembered',
    lastReviewedAt: nowMs,
    nextReviewAt: nowMs + stepInfo.intervalMs,
    correctCount: card.correctCount + 1,
  };
}

export interface EbbinghausStatusDisplay {
  stepIndex: number;
  stepLabel: string;
  phaseNote: string;
  nextReviewText: string;
  isDue: boolean;
  isForgotten: boolean;
}

export function formatEbbinghausStatus(
  card: VocabCard,
  nowMs: number = Date.now()
): EbbinghausStatusDisplay {
  const stepIndex = getEffectiveEbbinghausStep(card);
  const stepInfo = EBBINGHAUS_STEPS[stepIndex];
  const isForgotten = Boolean(card.isForgotten);

  if (card.stage === 0 && !isForgotten && !card.lastReviewedAt) {
    return {
      stepIndex: 0,
      stepLabel: '未初学',
      phaseNote: '等待初学确认',
      nextReviewText: '待初学',
      isDue: false,
      isForgotten: false,
    };
  }

  const diffMs = card.nextReviewAt - nowMs;
  if (isForgotten) {
    return {
      stepIndex: 0,
      stepLabel: `第 1 节点 (${EBBINGHAUS_STEPS[0].shortLabel})`,
      phaseNote: '已标记没记住 · 优先回炉',
      nextReviewText: diffMs <= 0 ? '已到期 · 立即回炉' : `${Math.max(1, Math.ceil(diffMs / MINUTE_MS))}分钟后回炉`,
      isDue: true,
      isForgotten: true,
    };
  }

  if (diffMs <= 0) {
    return {
      stepIndex,
      stepLabel: `节点 ${stepIndex + 1}/9 · ${stepInfo.shortLabel}`,
      phaseNote: stepInfo.phaseNote,
      nextReviewText: '已到期 · 立即复习',
      isDue: true,
      isForgotten: false,
    };
  }

  let nextReviewText = '';
  if (diffMs < HOUR_MS) {
    nextReviewText = `${Math.max(1, Math.ceil(diffMs / MINUTE_MS))} 分钟后复习`;
  } else if (diffMs < DAY_MS) {
    nextReviewText = `${Math.max(1, Math.round(diffMs / HOUR_MS))} 小时后复习`;
  } else {
    nextReviewText = `${Math.max(1, Math.round(diffMs / DAY_MS))} 天后复习`;
  }

  return {
    stepIndex,
    stepLabel: `节点 ${stepIndex + 1}/9 · ${stepInfo.shortLabel}`,
    phaseNote: stepInfo.phaseNote,
    nextReviewText,
    isDue: false,
    isForgotten: false,
  };
}

/**
 * Stage 1 (初学) Mastery Confirmation Algorithm State.
 * Each word starts in `pendingIds`.
 * To graduate from Stage 1, the learner must pass an active confirmation check:
 * - If confirmed correctly -> moves to `confirmedIds`.
 * - If answered wrong OR user taps "没记住" -> automatically recorded in `forgottenIds`,
 *   and re-inserted 2 slots later in `pendingIds` until mastered.
 */
export interface LearnConfirmationState {
  pendingIds: string[];
  confirmedIds: string[];
  forgottenIds: string[];
  attemptsById: Record<string, number>;
}

export function createLearnConfirmationState(cardIds: string[]): LearnConfirmationState {
  const uniqueIds = Array.from(new Set(cardIds.filter(Boolean)));
  return {
    pendingIds: uniqueIds,
    confirmedIds: [],
    forgottenIds: [],
    attemptsById: {},
  };
}

export function advanceLearnConfirmation(
  state: LearnConfirmationState,
  cardId: string,
  isMastered: boolean
): LearnConfirmationState {
  const remaining = state.pendingIds.filter((id, idx) => !(idx === 0 && id === cardId));
  const nextAttempts = {
    ...state.attemptsById,
    [cardId]: (state.attemptsById[cardId] || 0) + 1,
  };

  if (isMastered) {
    const confirmedIds = state.confirmedIds.includes(cardId)
      ? state.confirmedIds
      : [...state.confirmedIds, cardId];
    return {
      pendingIds: remaining,
      confirmedIds,
      forgottenIds: state.forgottenIds,
      attemptsById: nextAttempts,
    };
  }

  // Wrong answer or explicitly "没记住": auto-record as forgotten & re-queue 2 slots later
  const forgottenIds = state.forgottenIds.includes(cardId)
    ? state.forgottenIds
    : [...state.forgottenIds, cardId];

  const insertIndex = Math.min(remaining.length, 2);
  const requeued = [
    ...remaining.slice(0, insertIndex),
    cardId,
    ...remaining.slice(insertIndex),
  ];

  return {
    pendingIds: requeued,
    confirmedIds: state.confirmedIds,
    forgottenIds,
    attemptsById: nextAttempts,
  };
}

/**
 * Builds Stage 2 (艾宾浩斯曲线复习) queue:
 * 1. Words auto-recorded as "没记住" (`isForgotten === true`) always come first.
 * 2. Overdue cards along the Ebbinghaus curve (`nextReviewAt <= nowMs`), most overdue first.
 * 3. Newly learned / today's cards in early short-term Ebbinghaus nodes (`step <= 2`).
 * 4. Remaining learned cards sorted by soonest `nextReviewAt`.
 */
export function buildEbbinghausReviewQueue(
  cards: VocabCard[],
  dailyCardIds: string[] = [],
  nowMs: number = Date.now(),
  limit: number = 15
): VocabCard[] {
  const dailySet = new Set(dailyCardIds);
  const forgotten: VocabCard[] = [];
  const overdue: VocabCard[] = [];
  const earlyDaily: VocabCard[] = [];
  const upcoming: VocabCard[] = [];

  for (const card of cards) {
    if (card.isForgotten) {
      forgotten.push(card);
    } else if (card.stage > 0 && card.nextReviewAt <= nowMs) {
      overdue.push(card);
    } else if (dailySet.has(card.id) && (card.stage > 0 || Boolean(card.lastReviewedAt))) {
      earlyDaily.push(card);
    } else if (card.stage > 0) {
      upcoming.push(card);
    }
  }

  forgotten.sort((a, b) => (b.wrongCount - a.wrongCount) || (a.nextReviewAt - b.nextReviewAt));
  overdue.sort((a, b) => a.nextReviewAt - b.nextReviewAt);
  earlyDaily.sort((a, b) => getEffectiveEbbinghausStep(a) - getEffectiveEbbinghausStep(b));
  upcoming.sort((a, b) => a.nextReviewAt - b.nextReviewAt);

  const combined = [...forgotten, ...overdue, ...earlyDaily, ...upcoming];
  const fallback = combined.length > 0 ? combined : cards;
  return fallback.slice(0, Math.max(1, limit));
}

/**
 * Builds Stage 3 (检查) Checkpoint Exam queue:
 * Strictly checks today's drawn vocabulary + any cards currently flagged as "没记住".
 */
export function buildCheckpointExamQueue(
  cards: VocabCard[],
  dailyCardIds: string[] = [],
  limit: number = 20
): VocabCard[] {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const result: VocabCard[] = [];
  const seen = new Set<string>();

  // 1. Prioritize all "没记住" words first so checkpoint verifies recovery
  for (const card of cards) {
    if (card.isForgotten && !seen.has(card.id)) {
      seen.add(card.id);
      result.push(card);
    }
  }

  // 2. Include today's drawn daily words
  for (const id of dailyCardIds) {
    const card = byId.get(id);
    if (card && !seen.has(card.id)) {
      seen.add(card.id);
      result.push(card);
    }
  }

  // 3. Fallback if user hasn't drawn yet
  if (result.length === 0) {
    for (const card of cards.slice(0, limit)) {
      result.push(card);
    }
  }

  return result.slice(0, Math.max(1, limit));
}

export interface EbbinghausSummary {
  forgottenCount: number;
  dueNowCount: number;
  shortTermCount: number; // steps 0..2 (5m..12h)
  midTermCount: number; // steps 3..5 (1d..4d)
  longTermCount: number; // steps 6..8 (7d..30d)
}

export function computeEbbinghausSummary(
  cards: VocabCard[],
  nowMs: number = Date.now()
): EbbinghausSummary {
  let forgottenCount = 0;
  let dueNowCount = 0;
  let shortTermCount = 0;
  let midTermCount = 0;
  let longTermCount = 0;

  for (const card of cards) {
    if (card.isForgotten) {
      forgottenCount += 1;
      dueNowCount += 1;
      shortTermCount += 1;
      continue;
    }
    if (card.stage === 0 && !card.lastReviewedAt) continue;
    if (card.nextReviewAt <= nowMs) {
      dueNowCount += 1;
    }
    const step = getEffectiveEbbinghausStep(card);
    if (step <= 2) shortTermCount += 1;
    else if (step <= 5) midTermCount += 1;
    else longTermCount += 1;
  }

  return {
    forgottenCount,
    dueNowCount,
    shortTermCount,
    midTermCount,
    longTermCount,
  };
}
