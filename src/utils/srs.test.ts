import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyReviewResult,
  buildMultipleChoiceOptions,
  buildSyllableTiles,
  checkSyllableAnswer,
  computeGardenSummary,
  createVocabFromOfficialTopik,
  createVocabFromParsedToken,
  getReviewQueue,
  isCardDue,
  mapOfficialLevelToTopikGroup,
  plantNewWord,
} from './srs';
import { DAILY_GRAMMAR_LESSONS, PRONUNCIATION_SCENARIOS } from '../data/seedData';
import { EXTRA_TOPIK_GRAMMAR_LESSONS } from '../data/topikGrammar';
import type { OfficialTopikWord, VocabCard } from '../types/learning';

const NOW = 1_800_000_000_000;

function makeCard(overrides: Partial<VocabCard> = {}): VocabCard {
  return {
    id: 'w1',
    korean: '괜찮아요',
    lemma: '괜찮다',
    spokenPronunciation: '[괜차나요]',
    romanization: 'gwaenchanayo',
    meaningZh: '没关系 / 还不错',
    pos: '形容词',
    category: '日常口语',
    memriseTip: '听起来像“管他呢哟”——管他呢，没关系！',
    exampleKr: '저는 다 괜찮아요.',
    exampleZh: '我都可以，没关系。',
    stage: 1,
    nextReviewAt: NOW - 1000,
    correctCount: 1,
    wrongCount: 0,
    ...overrides,
  };
}

test('applyReviewResult advances stage on correct answer and regresses on wrong answer', () => {
  const card = makeCard({ stage: 2 });
  const promoted = applyReviewResult(card, true, NOW);
  assert.equal(promoted.stage, 3);
  assert.equal(promoted.correctCount, 2);
  assert.equal(promoted.nextReviewAt, NOW + 24 * 60 * 60 * 1000);

  const regressed = applyReviewResult(card, false, NOW);
  assert.equal(regressed.stage, 1);
  assert.equal(regressed.wrongCount, 1);
  assert.equal(regressed.nextReviewAt, NOW + 1 * 60 * 60 * 1000);
});

test('applyReviewResult caps stage at 5 and floors at 1', () => {
  const bloomed = makeCard({ stage: 5 });
  assert.equal(applyReviewResult(bloomed, true, NOW).stage, 5);

  const seedling = makeCard({ stage: 1 });
  assert.equal(applyReviewResult(seedling, false, NOW).stage, 1);
});

test('plantNewWord moves unplanted seed (stage 0) to stage 1', () => {
  const seed = makeCard({ stage: 0, correctCount: 0 });
  assert.equal(isCardDue(seed, NOW), false);
  const planted = plantNewWord(seed, NOW);
  assert.equal(planted.stage, 1);
  assert.equal(planted.correctCount, 1);
  assert.equal(isCardDue(planted, NOW), false);
});

test('computeGardenSummary computes counts and accuracy accurately', () => {
  const cards = [
    makeCard({ id: '1', stage: 0, correctCount: 0, wrongCount: 0 }),
    makeCard({ id: '2', stage: 2, nextReviewAt: NOW - 500, correctCount: 3, wrongCount: 1 }),
    makeCard({ id: '3', stage: 5, nextReviewAt: NOW + 50000, correctCount: 5, wrongCount: 0 }),
  ];
  const summary = computeGardenSummary(cards, NOW);
  assert.equal(summary.total, 3);
  assert.equal(summary.unplanted, 1);
  assert.equal(summary.dueCount, 1);
  assert.equal(summary.growingCount, 1);
  assert.equal(summary.bloomedCount, 1);
  assert.equal(summary.accuracyPercent, 89);
});

test('buildSyllableTiles includes all target syllables plus distractors and validates correctly', () => {
  const tiles = buildSyllableTiles('커피숍', 2);
  const chars = tiles.map((t) => t.char);
  assert.ok(chars.includes('커'));
  assert.ok(chars.includes('피'));
  assert.ok(chars.includes('숍'));
  assert.ok(tiles.length >= 5);
  assert.equal(checkSyllableAnswer(['커', '피', '숍'], '커피숍'), true);
  assert.equal(checkSyllableAnswer(['커', '숍', '피'], '커피숍'), false);
});

test('buildMultipleChoiceOptions always includes target and distinct distractors', () => {
  const c1 = makeCard({ id: '1', korean: '하나', meaningZh: '一' });
  const c2 = makeCard({ id: '2', korean: '둘', meaningZh: '二' });
  const c3 = makeCard({ id: '3', korean: '셋', meaningZh: '三' });
  const c4 = makeCard({ id: '4', korean: '넷', meaningZh: '四' });
  const options = buildMultipleChoiceOptions(c1, [c1, c2, c3, c4], 4);
  assert.equal(options.length, 4);
  assert.ok(options.some((o) => o.id === '1'));
});

test('getReviewQueue prioritizes unplanted in learn mode and due cards in review mode', () => {
  const c1 = makeCard({ id: 'unplanted', stage: 0 });
  const c2 = makeCard({ id: 'due', stage: 2, nextReviewAt: NOW - 100 });
  const c3 = makeCard({ id: 'future', stage: 4, nextReviewAt: NOW + 100000 });
  assert.equal(getReviewQueue([c1, c2, c3], 'learn', NOW)[0].id, 'unplanted');
  assert.equal(getReviewQueue([c1, c2, c3], 'review', NOW)[0].id, 'due');
});

test('createVocabFromParsedToken creates unplanted video-collection card', () => {
  const card = createVocabFromParsedToken(
    {
      surface: '분위기가',
      lemma: '분위기',
      pos: '名词',
      meaningZh: '氛围、气氛',
      memriseTip: '汉字词“氛围气”，发音接近“分微气”',
      nuance: '常用于夸赞咖啡馆或餐厅环境',
      isKeyVocab: true,
      exampleKr: '여기 분위기 진짜 좋아요.',
      exampleZh: '这里氛围真不错。',
    },
    '圣水洞咖啡探店 Vlog',
    NOW
  );
  assert.equal(card.korean, '분위기');
  assert.equal(card.category, '视频收藏');
  assert.equal(card.stage, 0);
});

test('mapOfficialLevelToTopikGroup and createVocabFromOfficialTopik map TOPIK 1-6 levels cleanly', () => {
  assert.equal(mapOfficialLevelToTopikGroup(1), 'TOPIK 1级');
  assert.equal(mapOfficialLevelToTopikGroup(2), 'TOPIK 2级');
  assert.equal(mapOfficialLevelToTopikGroup(3), 'TOPIK 3-4级');
  assert.equal(mapOfficialLevelToTopikGroup(4), 'TOPIK 3-4级');
  assert.equal(mapOfficialLevelToTopikGroup(5), 'TOPIK 5-6级');
  assert.equal(mapOfficialLevelToTopikGroup(6), 'TOPIK 5-6级');

  const sampleOfficial: OfficialTopikWord = {
    id: 'topik-5-001',
    korean: '경제',
    meaningZh: '经济',
    english: 'economy',
    pos: '名词',
    level: 'TOPIK 5级',
    levelNum: 5,
    chapter: 1,
    hanja: '經濟',
    spokenPronunciation: '[경제]',
    isOfficialTopik: true,
    officialGrade: '中级',
    freqRank: 120,
    collocation: '경제가 발전하다',
    memriseTip: '汉字词「經濟」，TOPIK II 高频核心词。',
  };
  const card = createVocabFromOfficialTopik(sampleOfficial, NOW);
  assert.equal(card.korean, '경제');
  assert.equal(card.topikLevel, 'TOPIK 5-6级');
  assert.equal(card.category, 'TOPIK 核心');
  assert.equal(card.stage, 0);
  assert.equal(card.exampleKr, '경제가 발전하다');
});

test('official TOPIK wordbook dataset, 30-lesson grammar syllabus, and 8 pronunciation scenarios are intact', () => {
  const allGrammar = [...DAILY_GRAMMAR_LESSONS, ...EXTRA_TOPIK_GRAMMAR_LESSONS];
  const uniqueGrammarIds = new Set(allGrammar.map((g) => g.id));
  assert.equal(allGrammar.length, 30);
  assert.equal(uniqueGrammarIds.size, 30);
  assert.ok(PRONUNCIATION_SCENARIOS.length >= 8);

  const bookPath = path.resolve(process.cwd(), 'data/topik-official-book.json');
  assert.ok(fs.existsSync(bookPath), 'data/topik-official-book.json should exist');
  const words = JSON.parse(fs.readFileSync(bookPath, 'utf8')) as OfficialTopikWord[];
  assert.ok(words.length >= 4000, `expected >= 4000 TOPIK words, got ${words.length}`);
  const levels = new Set(words.map((w) => w.level));
  for (const lvl of ['TOPIK 1级', 'TOPIK 2级', 'TOPIK 3级', 'TOPIK 4级', 'TOPIK 5级', 'TOPIK 6级']) {
    assert.ok(levels.has(lvl as OfficialTopikWord['level']), `missing level ${lvl}`);
  }
});

