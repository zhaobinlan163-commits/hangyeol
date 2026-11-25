import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { VocabCard } from '../types/learning';
import {
  EBBINGHAUS_STEPS,
  advanceLearnConfirmation,
  applyEbbinghausReview,
  buildCheckpointExamQueue,
  buildEbbinghausReviewQueue,
  computeEbbinghausSummary,
  createLearnConfirmationState,
  formatEbbinghausStatus,
} from './ebbinghaus';

function makeCard(overrides: Partial<VocabCard> = {}): VocabCard {
  return {
    id: 'c-1',
    korean: '약속',
    lemma: '약속',
    spokenPronunciation: '[약쏙]',
    romanization: 'yaksok',
    meaningZh: '约定',
    pos: '名词',
    category: 'TOPIK 核心',
    topikLevel: 'TOPIK 1级',
    memriseTip: '汉字词「约束/约定」',
    exampleKr: '오늘 저녁에 약속이 있어요.',
    exampleZh: '今天晚上有约。',
    stage: 0,
    nextReviewAt: 1_000_000,
    correctCount: 0,
    wrongCount: 0,
    ...overrides,
  };
}

describe('Ebbinghaus Forgetting Curve Scheduler', () => {
  it('advances step-by-step along the 9 classic Ebbinghaus intervals when remembered', () => {
    const baseTime = 10_000_000;
    let card = makeCard({ stage: 0, ebbinghausStep: 0 });

    for (let expectedStep = 1; expectedStep < EBBINGHAUS_STEPS.length; expectedStep++) {
      card = applyEbbinghausReview(card, 'remembered', baseTime);
      assert.equal(card.ebbinghausStep, expectedStep);
      assert.equal(card.isForgotten, false);
      assert.equal(card.lastResult, 'remembered');
      assert.equal(card.nextReviewAt, baseTime + EBBINGHAUS_STEPS[expectedStep].intervalMs);
    }

    // Caps at max step (30 days)
    const capped = applyEbbinghausReview(card, 'remembered', baseTime);
    assert.equal(capped.ebbinghausStep, EBBINGHAUS_STEPS.length - 1);
    assert.equal(capped.stage, 5);
  });

  it('automatically records forgotten ("没记住") on wrong answer and resets to 5-minute Ebbinghaus step 0', () => {
    const now = 50_000_000;
    const learnedCard = makeCard({
      stage: 4,
      ebbinghausStep: 5,
      correctCount: 6,
      wrongCount: 0,
      isForgotten: false,
    });

    const updated = applyEbbinghausReview(learnedCard, 'forgotten', now);
    assert.equal(updated.isForgotten, true);
    assert.equal(updated.lastResult, 'forgotten');
    assert.equal(updated.ebbinghausStep, 0);
    assert.equal(updated.wrongCount, 1);
    assert.equal(updated.nextReviewAt, now + 5 * 60 * 1000);
    assert.equal(updated.stage, 3);
  });

  it('handles vague recall by stepping back gently and scheduling 30-minute reinforcement', () => {
    const now = 60_000_000;
    const card = makeCard({ stage: 3, ebbinghausStep: 3, correctCount: 3 });
    const updated = applyEbbinghausReview(card, 'vague', now);
    assert.equal(updated.ebbinghausStep, 2);
    assert.equal(updated.isForgotten, false);
    assert.equal(updated.lastResult, 'vague');
    assert.equal(updated.nextReviewAt, now + 30 * 60 * 1000);
  });
});

describe('Stage 1 Mastery Confirmation Re-Queue Algorithm', () => {
  it('re-queues forgotten words 2 slots later and records them in forgottenIds until confirmed', () => {
    const initial = createLearnConfirmationState(['w1', 'w2', 'w3', 'w4']);
    assert.deepEqual(initial.pendingIds, ['w1', 'w2', 'w3', 'w4']);

    // User misses w1 -> auto-recorded as forgotten & re-inserted after w2, w3
    const afterMiss = advanceLearnConfirmation(initial, 'w1', false);
    assert.deepEqual(afterMiss.forgottenIds, ['w1']);
    assert.deepEqual(afterMiss.confirmedIds, []);
    assert.deepEqual(afterMiss.pendingIds, ['w2', 'w3', 'w1', 'w4']);

    // User confirms w2 and w3
    const afterW2 = advanceLearnConfirmation(afterMiss, 'w2', true);
    const afterW3 = advanceLearnConfirmation(afterW2, 'w3', true);
    assert.deepEqual(afterW3.confirmedIds, ['w2', 'w3']);
    assert.equal(afterW3.pendingIds[0], 'w1');

    // User finally confirms w1
    const afterW1Confirm = advanceLearnConfirmation(afterW3, 'w1', true);
    assert.deepEqual(afterW1Confirm.confirmedIds, ['w2', 'w3', 'w1']);
    assert.deepEqual(afterW1Confirm.pendingIds, ['w4']);
    // Forgotten record persists for tracking
    assert.deepEqual(afterW1Confirm.forgottenIds, ['w1']);
  });
});

describe('Stage 2 & Stage 3 Queues + Summary', () => {
  it('prioritizes forgotten words first, then overdue Ebbinghaus cards, then upcoming cards', () => {
    const now = 100_000_000;
    const cards: VocabCard[] = [
      makeCard({ id: 'future', stage: 3, ebbinghausStep: 4, nextReviewAt: now + 86_400_000 }),
      makeCard({ id: 'overdue-new', stage: 2, ebbinghausStep: 2, nextReviewAt: now - 10_000 }),
      makeCard({ id: 'overdue-old', stage: 3, ebbinghausStep: 3, nextReviewAt: now - 900_000 }),
      makeCard({ id: 'forgotten', stage: 1, ebbinghausStep: 0, isForgotten: true, wrongCount: 2, nextReviewAt: now + 60_000 }),
    ];

    const queue = buildEbbinghausReviewQueue(cards, [], now, 10);
    assert.deepEqual(
      queue.map((c) => c.id),
      ['forgotten', 'overdue-old', 'overdue-new', 'future']
    );

    const summary = computeEbbinghausSummary(cards, now);
    assert.equal(summary.forgottenCount, 1);
    assert.equal(summary.dueNowCount, 3);
  });

  it('builds Stage 3 checkpoint queue from forgotten words + today drawn words without duplicates', () => {
    const cards: VocabCard[] = [
      makeCard({ id: 'd1', isForgotten: false }),
      makeCard({ id: 'd2', isForgotten: true }),
      makeCard({ id: 'old-weak', isForgotten: true }),
      makeCard({ id: 'other', isForgotten: false }),
    ];

    const exam = buildCheckpointExamQueue(cards, ['d1', 'd2'], 10);
    assert.deepEqual(
      exam.map((c) => c.id),
      ['d2', 'old-weak', 'd1']
    );
  });

  it('formats human-readable Ebbinghaus status for due, future, and forgotten cards', () => {
    const now = 100_000_000;
    const forgottenStatus = formatEbbinghausStatus(
      makeCard({ stage: 1, isForgotten: true, nextReviewAt: now + 4 * 60 * 1000 }),
      now
    );
    assert.equal(forgottenStatus.isForgotten, true);
    assert.equal(forgottenStatus.isDue, true);
    assert.match(forgottenStatus.nextReviewText, /分钟后回炉/);

    const futureStatus = formatEbbinghausStatus(
      makeCard({ stage: 3, ebbinghausStep: 4, nextReviewAt: now + 2 * 24 * 60 * 60 * 1000 }),
      now
    );
    assert.equal(futureStatus.isDue, false);
    assert.match(futureStatus.nextReviewText, /2 天后复习/);
  });
});
