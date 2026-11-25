import type {
  GrowthStage,
  OfficialTopikWord,
  ParsedToken,
  TopikLevel,
  VocabCard,
} from '../types/learning';

export interface GrowthStageInfo {
  stage: GrowthStage;
  label: string;
  shortLabel: string;
  intervalHours: number;
}

export const GROWTH_STAGES: Record<GrowthStage, GrowthStageInfo> = {
  0: { stage: 0, label: '未播种', shortLabel: '种子', intervalHours: 0 },
  1: { stage: 1, label: '已播种', shortLabel: '播种', intervalHours: 4 },
  2: { stage: 2, label: '发芽中', shortLabel: '发芽', intervalHours: 12 },
  3: { stage: 3, label: '抽叶中', shortLabel: '抽叶', intervalHours: 24 },
  4: { stage: 4, label: '含苞待放', shortLabel: '含苞', intervalHours: 72 },
  5: { stage: 5, label: '盛放掌握', shortLabel: '盛放', intervalHours: 168 },
};

const HOUR_MS = 60 * 60 * 1000;

export function isCardDue(card: VocabCard, nowMs: number = Date.now()): boolean {
  if (card.stage === 0) return false;
  return card.nextReviewAt <= nowMs;
}

export function applyReviewResult(
  card: VocabCard,
  isCorrect: boolean,
  nowMs: number = Date.now()
): VocabCard {
  const nextStage: GrowthStage = isCorrect
    ? (Math.min(5, card.stage + 1) as GrowthStage)
    : (Math.max(1, card.stage - 1) as GrowthStage);

  const intervalHours = isCorrect ? GROWTH_STAGES[nextStage].intervalHours : 1;

  return {
    ...card,
    stage: nextStage,
    nextReviewAt: nowMs + intervalHours * HOUR_MS,
    correctCount: card.correctCount + (isCorrect ? 1 : 0),
    wrongCount: card.wrongCount + (isCorrect ? 0 : 1),
  };
}

export function plantNewWord(card: VocabCard, nowMs: number = Date.now()): VocabCard {
  const stage: GrowthStage = card.stage === 0 ? 1 : card.stage;
  return {
    ...card,
    stage,
    nextReviewAt: nowMs + GROWTH_STAGES[stage].intervalHours * HOUR_MS,
    correctCount: card.correctCount + 1,
  };
}

export interface GardenSummary {
  total: number;
  unplanted: number;
  dueCount: number;
  growingCount: number;
  bloomedCount: number;
  accuracyPercent: number;
}

export function computeGardenSummary(cards: VocabCard[], nowMs: number = Date.now()): GardenSummary {
  let unplanted = 0;
  let dueCount = 0;
  let growingCount = 0;
  let bloomedCount = 0;
  let totalCorrect = 0;
  let totalAttempts = 0;

  for (const card of cards) {
    if (card.stage === 0) {
      unplanted += 1;
    } else if (card.stage === 5) {
      bloomedCount += 1;
      if (card.nextReviewAt <= nowMs) {
        dueCount += 1;
      }
    } else {
      growingCount += 1;
      if (card.nextReviewAt <= nowMs) {
        dueCount += 1;
      }
    }
    totalCorrect += card.correctCount;
    totalAttempts += card.correctCount + card.wrongCount;
  }

  return {
    total: cards.length,
    unplanted,
    dueCount,
    growingCount,
    bloomedCount,
    accuracyPercent: totalAttempts === 0 ? 100 : Math.round((totalCorrect / totalAttempts) * 100),
  };
}

export function getReviewQueue(cards: VocabCard[], mode: 'learn' | 'review' | 'speed', nowMs: number = Date.now()): VocabCard[] {
  if (mode === 'learn') {
    const unplanted = cards.filter((c) => c.stage === 0);
    if (unplanted.length > 0) return unplanted.slice(0, 6);
    return [...cards].sort((a, b) => a.stage - b.stage).slice(0, 6);
  }

  const due = cards.filter((c) => isCardDue(c, nowMs));
  const planted = cards.filter((c) => c.stage > 0);
  const pool = due.length >= 4 ? due : [...due, ...planted.filter((c) => !due.some((d) => d.id === c.id))];
  const fallbackPool = pool.length > 0 ? pool : cards;
  const limit = mode === 'speed' ? 8 : 6;
  return fallbackPool.slice(0, limit);
}

const DISTRACTOR_SYLLABLES = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '하', '고', '서', '요', '지', '만', '에', '도', '는'];

export interface SyllableTile {
  id: string;
  char: string;
}

export function buildSyllableTiles(koreanWord: string, seedOffset: number = 0): SyllableTile[] {
  const cleanChars = Array.from(koreanWord.replace(/\s+/g, ''));
  const distractorCount = Math.min(3, Math.max(2, 6 - cleanChars.length));
  const extras: string[] = [];

  for (let i = 0; i < DISTRACTOR_SYLLABLES.length && extras.length < distractorCount; i++) {
    const candidate = DISTRACTOR_SYLLABLES[(i + seedOffset + cleanChars.length * 3) % DISTRACTOR_SYLLABLES.length];
    if (!cleanChars.includes(candidate) && !extras.includes(candidate)) {
      extras.push(candidate);
    }
  }

  const combined = [...cleanChars, ...extras].map((char, idx) => ({
    id: `tile-${idx}-${char}`,
    char,
  }));

  // Deterministic Fisher-Yates shuffle based on word code points + seedOffset
  let hash = seedOffset + 17;
  for (const ch of cleanChars) {
    hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  }

  for (let i = combined.length - 1; i > 0; i--) {
    hash = (hash * 48271) % 2147483647;
    const j = hash % (i + 1);
    const tmp = combined[i];
    combined[i] = combined[j];
    combined[j] = tmp;
  }

  return combined;
}

export function checkSyllableAnswer(selectedChars: string[], targetKorean: string): boolean {
  const normalizedTarget = targetKorean.replace(/\s+/g, '');
  const normalizedSelected = selectedChars.join('').replace(/\s+/g, '');
  return normalizedSelected === normalizedTarget;
}

export function buildMultipleChoiceOptions(
  target: VocabCard,
  allCards: VocabCard[],
  maxOptions: number = 4
): VocabCard[] {
  const distractors = allCards.filter((c) => c.id !== target.id && c.meaningZh !== target.meaningZh);
  const picked: VocabCard[] = [target];
  let seed = target.korean.charCodeAt(0) || 7;

  const copy = [...distractors];
  while (picked.length < maxOptions && copy.length > 0) {
    seed = (seed * 37 + 11) % 997;
    const idx = seed % copy.length;
    picked.push(copy.splice(idx, 1)[0]);
  }

  // Deterministic order so target isn't always first
  for (let i = picked.length - 1; i > 0; i--) {
    seed = (seed * 53 + 7) % 997;
    const j = seed % (i + 1);
    const tmp = picked[i];
    picked[i] = picked[j];
    picked[j] = tmp;
  }
  return picked;
}

export function createVocabFromParsedToken(
  token: ParsedToken,
  sourceLabel: string,
  nowMs: number = Date.now()
): VocabCard {
  const baseWord = (token.lemma || token.surface).trim();
  return {
    id: `video-${baseWord}-${nowMs}`,
    korean: baseWord,
    lemma: baseWord,
    spokenPronunciation: `[${baseWord}]`,
    romanization: '',
    meaningZh: token.meaningZh,
    pos: token.pos || '词汇',
    category: '视频收藏',
    topikLevel: '日常拓展',
    memriseTip: token.memriseTip || token.nuance || '结合视频台词原句画面进行联想记忆。',
    exampleKr: token.exampleKr || token.surface,
    exampleZh: token.exampleZh || token.meaningZh,
    stage: 0,
    nextReviewAt: nowMs,
    correctCount: 0,
    wrongCount: 0,
    addedFrom: sourceLabel,
  };
}

/**
 * Merges newly added TOPIK/seed vocabulary cards into stored user cards
 * while preserving SRS progress and backfilling topikLevel metadata.
 */
export function mergeSeedVocab(storedCards: VocabCard[], seedCards: VocabCard[]): VocabCard[] {
  const seedById = new Map(seedCards.map((c) => [c.id, c]));
  const existingIds = new Set<string>();
  const existingWords = new Set<string>();

  const merged: VocabCard[] = storedCards.map((card) => {
    existingIds.add(card.id);
    existingWords.add(card.korean.trim());
    const matchingSeed = seedById.get(card.id);
    if (matchingSeed && !card.topikLevel) {
      return { ...card, topikLevel: matchingSeed.topikLevel };
    }
    return card;
  });

  for (const seed of seedCards) {
    if (!existingIds.has(seed.id) && !existingWords.has(seed.korean.trim())) {
      merged.push(seed);
    }
  }
  return merged;
}

export function countByTopikLevel(cards: VocabCard[]): Record<string, number> {
  const counts: Record<string, number> = {
    all: cards.length,
    'TOPIK 1级': 0,
    'TOPIK 2级': 0,
    'TOPIK 3-4级': 0,
    'TOPIK 5-6级': 0,
    '日常拓展': 0,
  };
  for (const card of cards) {
    const lvl = card.topikLevel || '日常拓展';
    counts[lvl] = (counts[lvl] || 0) + 1;
  }
  return counts;
}

export function mapOfficialLevelToTopikGroup(levelNum: number): TopikLevel {
  if (levelNum <= 1) return 'TOPIK 1级';
  if (levelNum === 2) return 'TOPIK 2级';
  if (levelNum <= 4) return 'TOPIK 3-4级';
  return 'TOPIK 5-6级';
}

export function createVocabFromOfficialTopik(
  word: OfficialTopikWord,
  nowMs: number = Date.now()
): VocabCard {
  const baseWord = word.korean.trim();
  const topikGroup = mapOfficialLevelToTopikGroup(word.levelNum);
  const exampleKr = word.collocation ? `${word.collocation}` : baseWord;
  const exampleZh = word.collocation
    ? `高频搭配「${word.collocation}」— ${word.meaningZh}`
    : word.meaningZh;

  return {
    id: `topik-book-${word.id}`,
    korean: baseWord,
    lemma: baseWord,
    spokenPronunciation: word.spokenPronunciation || `[${baseWord}]`,
    romanization: '',
    meaningZh: word.meaningZh,
    pos: word.pos || '词汇',
    category: 'TOPIK 核心',
    topikLevel: topikGroup,
    memriseTip:
      word.memriseTip ||
      (word.hanja
        ? `汉字词「${word.hanja}」，属于 ${word.level} 核心词表。`
        : `${word.level} 官方大纲核心词，建议结合常速/慢速跟读三遍强化记忆。`),
    exampleKr,
    exampleZh,
    stage: 0,
    nextReviewAt: nowMs,
    correctCount: 0,
    wrongCount: 0,
    addedFrom: `TOPIK 官方词书 · ${word.level}`,
  };
}

