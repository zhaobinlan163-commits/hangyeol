import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeDailyOverview, formatPracticeDuration } from './dailyOverview';
import { countByTopikLevel, mergeSeedVocab } from './srs';
import { TOPIK_VOCAB_CARDS } from '../data/topikVocab';
import { SEED_VOCAB_CARDS } from '../data/seedData';
import type { DailyStats, VocabCard } from '../types/learning';

describe('formatPracticeDuration', () => {
  it('formats seconds under 1 minute', () => {
    assert.equal(formatPracticeDuration(42), '42 秒');
    assert.equal(formatPracticeDuration(0), '0 秒');
  });

  it('formats minutes and padded seconds under 1 hour', () => {
    assert.equal(formatPracticeDuration(425), '7 分 05 秒');
    assert.equal(formatPracticeDuration(60), '1 分 00 秒');
  });

  it('formats hours and remaining minutes over 1 hour', () => {
    assert.equal(formatPracticeDuration(3900), '1 小时 5 分');
  });
});

describe('computeDailyOverview', () => {
  const baseStats: DailyStats = {
    streakDays: 6,
    todayReviewed: 4,
    dailyGoal: 12,
    xp: 280,
    todayXp: 75,
    dailyXpGoal: 150,
    todayPracticeSeconds: 420,
    dailyMinutesGoal: 15,
    masteredGrammarIds: [],
    lastStudyDate: '2026-11-23',
  };

  it('calculates XP progress and encouragement accurately', () => {
    const res = computeDailyOverview(baseStats);
    assert.equal(res.xpPercent, 50);
    assert.equal(res.minutesStudied, 7);
    assert.equal(res.formattedDuration, '7 分 00 秒');
    assert.equal(res.goalCompleted, false);
    assert.match(res.encouragement, /6 天/);
  });

  it('detects completed daily goal and caps percentages at 100', () => {
    const res = computeDailyOverview({
      ...baseStats,
      todayXp: 210,
      todayReviewed: 15,
    });
    assert.equal(res.xpPercent, 100);
    assert.equal(res.wordsPercent, 100);
    assert.equal(res.goalCompleted, true);
    assert.match(res.encouragement, /全部达成/);
  });
});

describe('TOPIK vocabulary bank & mergeSeedVocab', () => {
  it('covers TOPIK 1级, 2级, 3-4级, and 5-6级 with unique IDs and non-empty fields', () => {
    const combined = [...SEED_VOCAB_CARDS, ...TOPIK_VOCAB_CARDS];
    const counts = countByTopikLevel(combined);
    assert.ok(counts['TOPIK 1级'] >= 12);
    assert.ok(counts['TOPIK 2级'] >= 12);
    assert.ok(counts['TOPIK 3-4级'] >= 14);
    assert.ok(counts['TOPIK 5-6级'] >= 10);

    const ids = new Set(combined.map((c) => c.id));
    assert.equal(ids.size, combined.length);
    for (const card of TOPIK_VOCAB_CARDS) {
      assert.ok(card.korean.trim().length > 0);
      assert.ok(card.spokenPronunciation.startsWith('['));
      assert.ok(card.meaningZh.trim().length > 0);
      assert.ok(card.memriseTip.trim().length > 0);
      assert.ok(card.exampleKr.trim().length > 0);
    }
  });

  it('preserves stored SRS stage while appending newly added TOPIK seed words', () => {
    const stored: VocabCard[] = [
      {
        ...SEED_VOCAB_CARDS[0],
        topikLevel: undefined,
        stage: 5,
        correctCount: 9,
      },
    ];
    const merged = mergeSeedVocab(stored, [...SEED_VOCAB_CARDS, ...TOPIK_VOCAB_CARDS]);
    assert.equal(merged[0].stage, 5);
    assert.equal(merged[0].correctCount, 9);
    assert.equal(merged[0].topikLevel, 'TOPIK 1级');
    assert.equal(merged.length, SEED_VOCAB_CARDS.length + TOPIK_VOCAB_CARDS.length);
  });
});
