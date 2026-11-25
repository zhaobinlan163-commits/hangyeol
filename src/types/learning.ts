export type ActiveTab = 'vocab' | 'live' | 'pronunciation' | 'grammar' | 'video' | 'notes';

export interface StudyNote {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export type GrowthStage = 0 | 1 | 2 | 3 | 4 | 5;

export type TopikLevel = 'TOPIK 1级' | 'TOPIK 2级' | 'TOPIK 3-4级' | 'TOPIK 5-6级' | '日常拓展';

export interface OfficialTopikWord {
  id: string;
  korean: string;
  meaningZh: string;
  english: string;
  pos: string;
  level: 'TOPIK 1级' | 'TOPIK 2级' | 'TOPIK 3级' | 'TOPIK 4级' | 'TOPIK 5级' | 'TOPIK 6级';
  levelNum: number;
  chapter: number;
  hanja: string;
  spokenPronunciation: string;
  isOfficialTopik: boolean;
  officialGrade: string;
  freqRank: number;
  collocation: string;
  collocationZh?: string;
  memriseTip: string;
}

export interface TopikBookStats {
  total: number;
  officialCount: number;
  levels: Record<string, number>;
}

export type DailyTargetLevel =
  | 'all'
  | 'TOPIK 1级'
  | 'TOPIK 2级'
  | 'TOPIK 3级'
  | 'TOPIK 4级'
  | 'TOPIK 5级'
  | 'TOPIK 6级';

export type DailyVocabStage = 'learn' | 'review' | 'check' | 'flashcard';

export type EbbinghausOutcome = 'remembered' | 'vague' | 'forgotten';

export interface DailyVocabPlan {
  dateKey: string;
  dailyCount: number;
  targetLevel: DailyTargetLevel;
  drawNonce: number;
  drawnCardIds: string[];
  stage1ConfirmedIds: string[];
  stage1ForgottenIds: string[];
  stage2ReviewedIds: string[];
  stage3PassedIds: string[];
  stage3FailedIds: string[];
}

export interface VocabCard {
  id: string;
  korean: string;
  lemma: string;
  spokenPronunciation: string;
  romanization: string;
  meaningZh: string;
  pos: string;
  category: '日常口语' | '咖啡餐饮' | '职场社交' | '情感态度' | '视频收藏' | 'TOPIK 核心';
  topikLevel?: TopikLevel;
  memriseTip: string;
  exampleKr: string;
  exampleZh: string;
  stage: GrowthStage;
  nextReviewAt: number;
  correctCount: number;
  wrongCount: number;
  addedFrom?: string;
  /** Ebbinghaus forgetting curve step index (0..8: 5m -> 30m -> 12h -> 1d -> 2d -> 4d -> 7d -> 15d -> 30d) */
  ebbinghausStep?: number;
  /** Automatically marked true whenever user answers wrong or clicks "没记住" */
  isForgotten?: boolean;
  lastReviewedAt?: number;
  lastResult?: EbbinghausOutcome;
}

export interface PronunciationScenario {
  id: string;
  title: string;
  category: string;
  korean: string;
  spokenPronunciation: string;
  romanization: string;
  chinese: string;
  speechLevel: string;
  phoneticFocus: string;
  phoneticDetail: string;
}

export interface PronunciationReport {
  heardKorean: string;
  accuracyScore: number;
  verdictLabel: string;
  overallSummary: string;
  intonationAdvice: string;
  phoneticRules: Array<{
    ruleName: string;
    exampleInSentence: string;
    explanation: string;
  }>;
  syllableFeedback: Array<{
    segment: string;
    expectedPronunciation: string;
    status: 'accurate' | 'needs_work' | 'missed' | string;
    tip: string;
  }>;
  authenticAlternatives: Array<{
    korean: string;
    spokenPronunciation: string;
    chinese: string;
    speechLevel: string;
    socialContext: string;
  }>;
}

export interface ExpressionCoachResponse {
  situationSummary: string;
  textbookExample: {
    korean: string;
    whyStiff: string;
  };
  expressions: Array<{
    korean: string;
    spokenPronunciation: string;
    romanization: string;
    chinese: string;
    speechLevel: string;
    socialContext: string;
    nuanceTip: string;
    keyVocab: {
      word: string;
      lemma: string;
      meaningZh: string;
      memriseTip: string;
    };
  }>;
}

export interface GrammarConjugationRule {
  condition: string;
  formula: string;
  example: string;
}

export interface GrammarLesson {
  id: string;
  pattern: string;
  titleZh: string;
  level: string;
  summary: string;
  conjugationRules: GrammarConjugationRule[];
  nuanceComparison: string;
  examples: Array<{
    korean: string;
    spokenPronunciation: string;
    chinese: string;
  }>;
  challengePromptZh: string;
  hintWords: Array<{ kr: string; zh: string }>;
  sampleAnswerKr: string;
}

export interface GrammarEvaluation {
  isNatural: boolean;
  score: number;
  verdictLabel: string;
  correctedSentence: string;
  spokenPronunciation: string;
  explanation: string;
  errors: Array<{
    original: string;
    suggestion: string;
    reason: string;
  }>;
  nativeUpgrades: Array<{
    korean: string;
    chinese: string;
    tone: string;
  }>;
}

export interface ParsedToken {
  surface: string;
  lemma: string;
  pos: string;
  meaningZh: string;
  memriseTip: string;
  nuance: string;
  isKeyVocab: boolean;
  exampleKr: string;
  exampleZh: string;
}

export interface ParsedGrammarPoint {
  pattern: string;
  meaningZh: string;
  usageNote: string;
  exampleKr: string;
  exampleZh: string;
}

export interface ParsedSentence {
  sentence: string;
  naturalTranslation: string;
  literalTranslation: string;
  speechLevel: string;
  spokenPronunciation: string;
  romanization: string;
  culturalNuance: string;
  tokens: ParsedToken[];
  grammarPoints: ParsedGrammarPoint[];
}

export interface SubtitleCue {
  id: string;
  startSec: number;
  endSec: number;
  korean: string;
  chinese: string;
  preParsed?: ParsedSentence;
}

export interface VideoLesson {
  id: string;
  title: string;
  channel: string;
  durationSec: number;
  level: string;
  topic: string;
  thumbnailUrl: string;
  youtubeId?: string;
  cues: SubtitleCue[];
}

export interface DailyStats {
  streakDays: number;
  todayReviewed: number;
  dailyGoal: number;
  xp: number;
  todayXp: number;
  dailyXpGoal: number;
  todayPracticeSeconds: number;
  dailyMinutesGoal: number;
  masteredGrammarIds: string[];
  lastStudyDate: string;
}

export type TutorRole = 'beginner_teacher' | 'seoul_friend' | 'topik_coach';

export interface ChatKoreanSentence {
  korean: string;
  spokenPronunciation: string;
  chinese: string;
}

export interface ChatKeyVocab {
  word: string;
  lemma: string;
  meaningZh: string;
  memriseTip: string;
}

export interface ChatReplyPayload {
  replyZh: string;
  koreanSentences: ChatKoreanSentence[];
  keyVocab: ChatKeyVocab[];
  grammarNote: {
    pattern: string;
    explanation: string;
  };
  followUpPrompt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  structured?: ChatReplyPayload;
  createdAt: number;
}
