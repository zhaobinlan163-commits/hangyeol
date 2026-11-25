import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  callDeepSeekChat,
  callDeepSeekJson,
  formatFriendlyDeepSeekError,
  getDefaultDeepSeekModel,
  hasConfiguredDeepSeekKey,
  normalizeChatReplyResponse,
  normalizeExpressionCoachResponse,
  normalizeGrammarEvaluationResponse,
  normalizeParsedSentenceResponse,
  normalizePronunciationReportResponse,
  runWithAiConfig,
  type DeepSeekChatMessage,
} from './src/services/deepseekService.ts';
import { fetchYouTubeKoreanCaptions } from './src/services/youtubeCaptions.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCliArg(names: string[]): string | undefined {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    for (const name of names) {
      if (arg === name && argv[i + 1]) {
        return argv[i + 1];
      }
      if (arg.startsWith(`${name}=`)) {
        return arg.slice(name.length + 1);
      }
    }
  }
  return undefined;
}

const isProduction = process.env.NODE_ENV === 'production';
const cliPort = parseCliArg(['--port', '-p']);
const cliHost = parseCliArg(['--host', '-H']);
const PORT = Number(cliPort || (isProduction ? process.env.PORT : undefined) || 3000);
const HOST = cliHost || '0.0.0.0';

function sendApiError(res: Response, err: unknown, fallbackMessage: string) {
  const formatted = formatFriendlyDeepSeekError(err, fallbackMessage);
  return res.status(formatted.status).json({
    error: formatted.error,
    code: formatted.code,
  });
}

interface TtsCacheEntry {
  audioBase64: string;
  mimeType: string;
  engine: 'standard-ko';
}

const ttsMemoryCache = new Map<string, TtsCacheEntry>();
const MAX_TTS_CACHE_ITEMS = 300;

interface OfficialTopikEntry {
  id: string;
  korean: string;
  meaningZh: string;
  english: string;
  pos: string;
  level: string;
  levelNum: number;
  chapter: number;
  hanja: string;
  spokenPronunciation: string;
  isOfficialTopik: boolean;
  officialGrade: string;
  freqRank: number;
  collocation: string;
  memriseTip: string;
}

function loadOfficialTopikBook(): OfficialTopikEntry[] {
  const candidates = [
    path.resolve(__dirname, 'data/topik-official-book.json'),
    path.resolve(process.cwd(), 'data/topik-official-book.json'),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as OfficialTopikEntry[];
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (err) {
        console.error('Failed to parse official TOPIK book:', err);
      }
    }
  }
  return [];
}

const OFFICIAL_TOPIK_WORDS: OfficialTopikEntry[] = loadOfficialTopikBook();
const OFFICIAL_TOPIK_STATS = (() => {
  const levels: Record<string, number> = {
    'TOPIK 1级': 0,
    'TOPIK 2级': 0,
    'TOPIK 3级': 0,
    'TOPIK 4级': 0,
    'TOPIK 5级': 0,
    'TOPIK 6级': 0,
  };
  let officialCount = 0;
  for (const w of OFFICIAL_TOPIK_WORDS) {
    levels[w.level] = (levels[w.level] || 0) + 1;
    if (w.isOfficialTopik) officialCount += 1;
  }
  return {
    total: OFFICIAL_TOPIK_WORDS.length,
    officialCount,
    levels,
  };
})();

function splitTextForStandardTts(text: string, maxLen = 160): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return [clean];
  const chunks: string[] = [];
  let rest = clean;
  while (rest.length > maxLen) {
    let splitIdx = rest.lastIndexOf(' ', maxLen);
    if (splitIdx < 40) splitIdx = maxLen;
    chunks.push(rest.slice(0, splitIdx).trim());
    rest = rest.slice(splitIdx).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function synthesizeStandardKoreanMp3(text: string, slow: boolean): Promise<TtsCacheEntry> {
  const chunks = splitTextForStandardTts(text, 160);
  const buffers: Buffer[] = [];
  const speedParam = slow ? '0.28' : '1';

  for (const chunk of chunks) {
    const ttsUrl =
      `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ko&ttsspeed=${speedParam}&q=${encodeURIComponent(chunk)}`;
    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`Standard Korean TTS HTTP ${response.status}`);
    }
    const arrBuf = await response.arrayBuffer();
    if (arrBuf.byteLength < 64) {
      throw new Error('Standard Korean TTS returned empty audio');
    }
    buffers.push(Buffer.from(arrBuf));
  }

  return {
    audioBase64: Buffer.concat(buffers).toString('base64'),
    mimeType: 'audio/mpeg',
    engine: 'standard-ko',
  };
}

function storeTtsCache(key: string, value: TtsCacheEntry) {
  if (ttsMemoryCache.size >= MAX_TTS_CACHE_ITEMS) {
    const oldestKey = ttsMemoryCache.keys().next().value;
    if (oldestKey) ttsMemoryCache.delete(oldestKey);
  }
  ttsMemoryCache.set(key, value);
}

function extractKoreanSegmentsForTts(text: string): string[] {
  if (!text.trim()) return [];
  const matches = text.match(/[\uAC00-\uD7A3]+(?:[\s,~!?.'"\-0-9]*[\uAC00-\uD7A3]+)*[.?!~]?/g);
  if (!matches) return [];
  const seen = new Set<string>();
  const results: string[] = [];
  for (const raw of matches) {
    const cleaned = raw.trim().replace(/^[,.\s]+/, '');
    const hangulCount = (cleaned.match(/[\uAC00-\uD7A3]/g) || []).length;
    if (hangulCount >= 2 && !seen.has(cleaned)) {
      seen.add(cleaned);
      results.push(cleaned);
    }
  }
  return results;
}

const app = express();
app.use(express.json({ limit: '16mb' }));

/**
 * 用户在网页「设置」里填的 DeepSeek 配置，通过请求头带上来：
 *   x-deepseek-key / x-deepseek-base / x-deepseek-model
 * 只对本次请求生效，绝不落盘、不写日志。
 */
function sanitizeBaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    const isPrivate =
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    return isPrivate ? undefined : trimmed;
  } catch {
    return undefined;
  }
}

app.use((req: Request, _res: Response, next: NextFunction) => {
  const apiKey = (req.get('x-deepseek-key') || '').trim();
  const model = (req.get('x-deepseek-model') || '').trim();
  const baseUrl = sanitizeBaseUrl(req.get('x-deepseek-base'));
  if (!apiKey && !model && !baseUrl) {
    next();
    return;
  }
  runWithAiConfig({ apiKey: apiKey || undefined, model: model || undefined, baseUrl }, next);
});

// 学习进度云存档（朋友间共用，靠「存档码」区分；无鉴权，别用真密码）
const PROGRESS_DIR = path.resolve(__dirname, 'data/progress');
const PROGRESS_CODE_RE = /^[A-Za-z0-9_-]{4,32}$/;
const MAX_PROGRESS_BYTES = 4 * 1024 * 1024;

app.get('/api/progress/:code', (req: Request, res: Response) => {
  const code = String(req.params.code || '');
  if (!PROGRESS_CODE_RE.test(code)) {
    return res.status(400).json({ error: '存档码需为 4–32 位字母、数字、下划线或短横线。' });
  }
  const file = path.join(PROGRESS_DIR, `${code}.json`);
  if (!fs.existsSync(file)) {
    return res.json({ exists: false, data: null });
  }
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return res.json({ exists: true, data: JSON.parse(raw) });
  } catch {
    return res.status(500).json({ error: '存档读取失败，请重试。' });
  }
});

app.post('/api/progress/:code', (req: Request, res: Response) => {
  const code = String(req.params.code || '');
  if (!PROGRESS_CODE_RE.test(code)) {
    return res.status(400).json({ error: '存档码需为 4–32 位字母、数字、下划线或短横线。' });
  }
  const data = (req.body || {}) as Record<string, unknown>;
  const serialized = JSON.stringify(data);
  if (serialized.length > MAX_PROGRESS_BYTES) {
    return res.status(413).json({ error: '进度数据过大，无法保存。' });
  }
  try {
    fs.mkdirSync(PROGRESS_DIR, { recursive: true });
    fs.writeFileSync(path.join(PROGRESS_DIR, `${code}.json`), serialized, 'utf8');
    return res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch {
    return res.status(500).json({ error: '存档写入失败，请重试。' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    provider: 'deepseek',
    model: getDefaultDeepSeekModel(),
    hasKey: hasConfiguredDeepSeekKey(),
    topikWordbookCount: OFFICIAL_TOPIK_WORDS.length,
  });
});

// 0a. 轻量连通性检查：验证用户在「设置」里填的 API Key 是否真的能用
app.post('/api/ai/verify', async (_req: Request, res: Response) => {
  try {
    const reply = await callDeepSeekChat({
      messages: [{ role: 'user', content: '只回复两个字母：ok' }],
      maxTokens: 32,
      thinking: 'disabled',
      timeoutMs: 25000,
      maxAttempts: 1,
    });
    return res.json({
      ok: true,
      model: getDefaultDeepSeekModel(),
      sample: String(reply || '').slice(0, 40),
    });
  } catch (err) {
    return sendApiError(res, err, '接口连通性检查失败');
  }
});

// 0. Official TOPIK 1–6 Wordbook API (4,056 indexed words)
app.get('/api/topik/stats', (_req: Request, res: Response) => {
  return res.json(OFFICIAL_TOPIK_STATS);
});

app.get('/api/topik/words', (req: Request, res: Response) => {
  const level = String(req.query.level || 'all').trim();
  const q = String(req.query.q || '').trim().toLowerCase();
  const officialOnly = String(req.query.officialOnly || 'false') === 'true';
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(60, Math.max(6, Number(req.query.pageSize) || 24));

  const filtered = OFFICIAL_TOPIK_WORDS.filter((w) => {
    if (level !== 'all' && w.level !== level) return false;
    if (officialOnly && !w.isOfficialTopik) return false;
    if (!q) return true;
    return (
      w.korean.toLowerCase().includes(q) ||
      w.meaningZh.toLowerCase().includes(q) ||
      w.hanja.toLowerCase().includes(q) ||
      w.english.toLowerCase().includes(q) ||
      w.memriseTip.toLowerCase().includes(q)
    );
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return res.json({
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
  });
});

// 0c. Daily TOPIK Vocabulary Auto-Draw (draws N appropriate words from the 4,056-word official book)
app.post('/api/topik/daily-draw', (req: Request, res: Response) => {
  const body = (req.body || {}) as {
    count?: number;
    level?: string;
    excludeWords?: string[];
    seed?: string;
    sequential?: boolean;
  };

  const requestedCount = Math.min(50, Math.max(5, Number(body.count) || 15));
  const level = (body.level || 'all').trim();
  const excludeSet = new Set(
    Array.isArray(body.excludeWords)
      ? body.excludeWords
          .filter((w): w is string => typeof w === 'string')
          .map((w) => w.trim())
          .filter(Boolean)
      : []
  );

  const levelPool = OFFICIAL_TOPIK_WORDS.filter((w) => {
    if (!level || level === 'all') return true;
    if (level === 'TOPIK 3-4级') return w.levelNum === 3 || w.levelNum === 4;
    if (level === 'TOPIK 5-6级') return w.levelNum === 5 || w.levelNum === 6;
    return w.level === level;
  });

  // Sort by official syllabus priority & frequency rank so drawn words are genuinely useful
  const rankedPool = [...levelPool].sort((a, b) => {
    if (a.isOfficialTopik !== b.isOfficialTopik) {
      return a.isOfficialTopik ? -1 : 1;
    }
    if (a.levelNum !== b.levelNum) {
      return a.levelNum - b.levelNum;
    }
    return a.freqRank - b.freqRank;
  });

  const freshPool = rankedPool.filter((w) => !excludeSet.has(w.korean.trim()));
  const activePool =
    freshPool.length >= requestedCount
      ? freshPool
      : [...freshPool, ...rankedPool.filter((w) => excludeSet.has(w.korean.trim()))];

  // 顺序模式：严格按词表顺序取下一批，已学过的词排除在外，保证不重复、不遗漏
  if (body.sequential) {
    const drawnSeq = freshPool.slice(0, requestedCount);
    return res.json({
      words: drawnSeq,
      level,
      count: drawnSeq.length,
      requestedCount,
      sequential: true,
      remainingPoolCount: Math.max(0, freshPool.length - drawnSeq.length),
      totalLevelPoolCount: levelPool.length,
    });
  }

  // Deterministic seeded selection within a suitable high-frequency window
  const seedStr = (body.seed || new Date().toISOString().slice(0, 10)).trim();  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const nextRand = () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return (hash >>> 0) / 4294967296;
  };

  const windowSize = Math.min(activePool.length, Math.max(requestedCount * 4, 80));
  const candidates = activePool.slice(0, windowSize);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }

  const drawn = candidates.slice(0, requestedCount);

  return res.json({
    words: drawn,
    level,
    count: drawn.length,
    requestedCount,
    remainingPoolCount: Math.max(0, freshPool.length - drawn.length),
    totalLevelPoolCount: levelPool.length,
  });
});

// 1. Native Korean TTS: 24kHz standard Korean MP3 synthesizer (fast, cached, zero Gemini dependency)
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, slow = false } = req.body as {
      text?: string;
      slow?: boolean;
    };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: '请提供需要朗读的韩语文本。' });
    }

    const cleanedText = text.trim().slice(0, 400);
    const cacheKey = `${cleanedText}::${slow ? 'slow' : 'normal'}`;
    const cached = ttsMemoryCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const standardAudio = await synthesizeStandardKoreanMp3(cleanedText, Boolean(slow));
    storeTtsCache(cacheKey, standardAudio);
    return res.json(standardAudio);
  } catch (err) {
    return sendApiError(res, err, '韩语语音合成失败');
  }
});

// 1b. Audio Transcription Notice (DeepSeek is a text LLM; browser SpeechRecognition handles live dictation)
app.post('/api/transcribe', (_req: Request, res: Response) => {
  return res.status(400).json({
    error:
      '当前已全面切换为 DeepSeek 文本大模型，不支持直接解析原始录音文件。请使用 Chrome/Edge 浏览器实时语音识别，或直接输入韩语/中文文本。',
    code: 'AUDIO_TRANSCRIBE_UNSUPPORTED',
  });
});

// 1c. Multi-turn Korean AI Tutor Chatbot via DeepSeek
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { history = [], message, tutorRole = 'beginner_teacher' } = req.body as {
      history?: Array<{ role: 'user' | 'model' | 'assistant'; text: string }>;
      message?: string;
      tutorRole?: 'beginner_teacher' | 'seoul_friend' | 'topik_coach';
    };

    if (!message || !message.trim()) {
      return res.status(400).json({ error: '请输入你想和韩语老师讨论的问题或句子。' });
    }

    const rolePromptMap: Record<string, string> = {
      beginner_teacher:
        '你是「한결 선생님（韩洁老师）」，一位温柔耐心的首尔韩语老师，专门辅导中国韩语初学者。每次回答都用清晰友好的简体中文解释，并自然给出1-2句最地道实用的韩语示范句（附带实际连音读音 [발음]）、核心词汇忆术家记忆法，以及简短语法点。',
      seoul_friend:
        '你是住在首尔圣水洞的韩国同龄朋友「민지」，性格开朗风趣。你会用日常自然的首尔口语（해요체为主，偶尔对比亲近的 반말）陪用户聊天、纠正生硬表达，并用简体中文解释韩国年轻人真正怎么说话。',
      topik_coach:
        '你是专业的 TOPIK 韩国语能力考试教研教练。针对用户的提问，结合 TOPIK I（1-2级）与 TOPIK II（3-6级）高频考点，用简体中文解析词汇辨析、汉字词规律、接续语法和书面/口语差异，并给出标准例句。',
    };

    const systemContent = `${rolePromptMap[tutorRole] || rolePromptMap.beginner_teacher}

请严格返回合法 JSON 对象（不要输出 Markdown 以外的多余正文），字段结构如下：
{
  "replyZh": "简体中文主回复（自然连贯，结合多轮上下文记忆回答问题或给出纠错反馈）",
  "koreanSentences": [
    {
      "korean": "值得跟读的韩语句子",
      "spokenPronunciation": "[实际连音口语读音]",
      "chinese": "中文释义"
    }
  ],
  "keyVocab": [
    {
      "word": "原文词形",
      "lemma": "词典原形",
      "meaningZh": "中文释义",
      "memriseTip": "忆术家风格谐音/汉字词/画面记忆法"
    }
  ],
  "grammarNote": {
    "pattern": "核心语法或表达点（无则留空字符串）",
    "explanation": "语法接续与语境说明"
  },
  "followUpPrompt": "引导用户继续下一轮练习的简短中文建议或韩语接龙提示"
}`;

    const recentHistory = Array.isArray(history) ? history.slice(-16) : [];
    const messages: DeepSeekChatMessage[] = [
      { role: 'system', content: systemContent },
      ...recentHistory
        .filter(
          (m) =>
            m &&
            (m.role === 'user' || m.role === 'model' || m.role === 'assistant') &&
            typeof m.text === 'string' &&
            m.text.trim()
        )
        .map((m) => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text.trim().slice(0, 1200),
        })),
      {
        role: 'user',
        content: message.trim().slice(0, 1500),
      },
    ];

    const parsed = await callDeepSeekJson({
      messages,
      temperature: 0.5,
      fallbackError: 'AI 私教回复为空',
      normalize: normalizeChatReplyResponse,
    });
    return res.json(parsed);
  } catch (err) {
    return sendApiError(res, err, 'AI 韩语私教对话失败');
  }
});

// 2. Real-time Pronunciation & Phonetics Evaluation via DeepSeek
app.post('/api/pronunciation/analyze', async (req: Request, res: Response) => {
  try {
    const {
      spokenText,
      targetKorean,
      targetChinese,
      scenarioContext,
    } = req.body as {
      audioBase64?: string;
      mimeType?: string;
      spokenText?: string;
      targetKorean?: string;
      targetChinese?: string;
      scenarioContext?: string;
    };

    if (!targetKorean || !targetKorean.trim()) {
      return res.status(400).json({ error: '请先选择或输入需要练习的韩语目标句子。' });
    }
    if (!spokenText || !spokenText.trim()) {
      return res.status(400).json({
        error:
          'DeepSeek 接口不支持直接解码原始录音音频。请允许浏览器实时语音识别生成“实时识别预览”，或在下方输入你读出的韩语文本后再开始诊断。',
        code: 'SPOKEN_TEXT_REQUIRED',
      });
    }

    const cleanTarget = targetKorean.trim();
    const cleanSpoken = spokenText.trim();

    const promptText = `你是一位首尔母语者出身的韩语语音学与口语教练。请用简体中文对学习者的韩语跟读转写与目标句进行细致、专业、友好的语音学对比诊断。
目标韩语句子: "${cleanTarget}"
中文含义: "${(targetChinese || '').trim()}"
场景语境: "${(scenarioContext || '日常首尔对话').trim()}"
学习者实际读出/语音识别文本: "${cleanSpoken}"

请严格输出合法 JSON 对象，字段如下：
{
  "heardKorean": "实际识别到的韩语内容及读音方括号标注",
  "accuracyScore": 0到100之间的整数,
  "verdictLabel": "简短中文评价标签，如地道自然/整体清晰，连音需微调/收音与紧音需加强",
  "overallSummary": "整体发音与完成度点评（简体中文）",
  "intonationAdvice": "首尔标准语的高低重音与句尾语调建议",
  "phoneticRules": [
    {
      "ruleName": "音变规则名称，如 연음화(连音化)/경음화(紧音化)/비음화(鼻音化)",
      "exampleInSentence": "本句对应片段",
      "explanation": "发音口型与变化说明"
    }
  ],
  "syllableFeedback": [
    {
      "segment": "句中词组或音节片段",
      "expectedPronunciation": "[实际连读音]",
      "status": "accurate 或 needs_work 或 missed",
      "tip": "具体发音纠错或保持建议"
    }
  ],
  "authenticAlternatives": [
    {
      "korean": "同场景首尔日常替代地道表达",
      "spokenPronunciation": "[实际读音]",
      "chinese": "中文含义",
      "speechLevel": "해요체 / 반말 / 합쇼체",
      "socialContext": "适用对象与场合"
    }
  ]
}`;

    const parsed = await callDeepSeekJson({
      messages: [
        {
          role: 'system',
          content: '你是专业的韩语语音学与首尔口语教练，请只输出合法的 JSON 格式诊断报告。',
        },
        { role: 'user', content: promptText },
      ],
      temperature: 0.3,
      fallbackError: '发音诊断返回为空',
      normalize: (raw) => normalizePronunciationReportResponse(raw, cleanSpoken),
    });
    return res.json(parsed);
  } catch (err) {
    return sendApiError(res, err, '发音分析失败');
  }
});

// 3. Authentic Everyday Korean Expression Coach via DeepSeek
app.post('/api/expression/suggest', async (req: Request, res: Response) => {
  try {
    const { situation, userInput, tonePreference = '日常礼貌 (해요체)' } = req.body as {
      situation?: string;
      userInput?: string;
      tonePreference?: string;
    };

    if (!userInput || !userInput.trim()) {
      return res.status(400).json({ error: '请输入你想表达的中文意思或韩语句子。' });
    }

    const prompt = `你是生活在首尔的韩语日常口语教练，擅长把生硬的“教科书式韩语”或中文直译转化为韩国年轻人、上班族、本地居民每天真实脱口而出的地道韩语表达。请用简体中文解释。

社交场景/话题: "${(situation || '首尔日常社交').trim()}"
用户想表达的内容（中文或待润色的韩语）: "${userInput.trim()}"
偏好语气: "${tonePreference}"

请严格输出合法 JSON 对象，字段结构如下：
{
  "situationSummary": "一句话概括该语境的韩国社交礼仪要点",
  "textbookExample": {
    "korean": "教科书或中文直译的生硬韩语句",
    "whyStiff": "中文说明为什么在韩国日常交流中听起来不够自然"
  },
  "expressions": [
    {
      "korean": "地道日常韩语表达",
      "spokenPronunciation": "[方括号实际连音读法]",
      "romanization": "罗马音辅助读音",
      "chinese": "自然中文含义",
      "speechLevel": "해요체 / 반말 / 합쇼체",
      "socialContext": "什么时候对谁说最合适",
      "nuanceTip": "细微语感差异与使用提醒",
      "keyVocab": {
        "word": "核心词原文形式",
        "lemma": "词典原形",
        "meaningZh": "中文释义",
        "memriseTip": "忆术家风格记忆法"
      }
    }
  ]
}
请返回 3~4 条由自然到进阶的 expressions。`;

    const parsed = await callDeepSeekJson({
      messages: [
        {
          role: 'system',
          content: '你是首尔母语日常韩语教练，请只输出严格符合要求的 JSON 对象。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      fallbackError: '地道表达建议返回为空',
      normalize: normalizeExpressionCoachResponse,
    });

    return res.json(parsed);
  } catch (err) {
    return sendApiError(res, err, '获取地道表达建议失败');
  }
});

// 4. Daily Grammar & Sentence-Making Evaluation via DeepSeek
app.post('/api/grammar/evaluate', async (req: Request, res: Response) => {
  try {
    const { grammarPattern, grammarMeaning, promptChinese, userSentence } = req.body as {
      grammarPattern?: string;
      grammarMeaning?: string;
      promptChinese?: string;
      userSentence?: string;
    };

    if (!userSentence || !userSentence.trim()) {
      return res.status(400).json({ error: '请先输入你的韩语造句再提交批改。' });
    }

    const prompt = `你是一位严谨又鼓励人的首尔韩语语法教师。请批改学生的韩语造句练习，并用简体中文给出清晰反馈。
目标语法点: "${grammarPattern || ''}" (${grammarMeaning || ''})
中文造句任务: "${promptChinese || ''}"
学生提交的韩语句子: "${userSentence.trim()}"

请严格输出合法 JSON 对象，字段结构如下：
{
  "isNatural": true或false布尔值,
  "score": 0到100之间的整数,
  "verdictLabel": "简短中文评价标签",
  "correctedSentence": "最标准的修正后韩语句",
  "spokenPronunciation": "[修正句的实际连音口语读音]",
  "explanation": "对目标语法接续、助词、时态与敬语的中文点评",
  "errors": [
    {
      "original": "原句中有问题的片段",
      "suggestion": "修改建议",
      "reason": "错误原因说明"
    }
  ],
  "nativeUpgrades": [
    {
      "korean": "首尔本地人在同语境下更地道的日常升级表达",
      "chinese": "中文释义",
      "tone": "敬语层级与语气说明"
    }
  ]
}
如无错误，errors 返回空数组 []；请提供 2 条 nativeUpgrades。`;

    const parsed = await callDeepSeekJson({
      messages: [
        {
          role: 'system',
          content: '你是专业的 TOPIK 与日常韩语语法教师，请只输出严格符合要求的 JSON 对象。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      fallbackError: '语法批改返回为空',
      normalize: normalizeGrammarEvaluationResponse,
    });
    return res.json(parsed);
  } catch (err) {
    return sendApiError(res, err, '语法造句批改失败');
  }
});

// 4b. 语法答疑：针对某个语法点自由提问（「没记住」「有什么区别」）
interface GrammarAskResult {
  answerZh: string;
  examples: Array<{ korean: string; chinese: string }>;
  tips: string[];
}

function normalizeGrammarAsk(raw: unknown): GrammarAskResult {
  const obj = (raw || {}) as Record<string, unknown>;
  const examples = Array.isArray(obj.examples)
    ? obj.examples
        .slice(0, 4)
        .map((entry) => {
          const item = (entry || {}) as Record<string, unknown>;
          return {
            korean: String(item.korean || '').trim(),
            chinese: String(item.chinese || '').trim(),
          };
        })
        .filter((entry) => entry.korean)
    : [];
  const tips = Array.isArray(obj.tips)
    ? obj.tips
        .slice(0, 5)
        .map((tip) => String(tip || '').trim())
        .filter(Boolean)
    : [];
  return {
    answerZh: String(obj.answerZh || obj.answer || '').trim(),
    examples,
    tips,
  };
}

app.post('/api/grammar/ask', async (req: Request, res: Response) => {
  try {
    const { pattern, level, summary, question } = req.body as {
      pattern?: string;
      level?: string;
      summary?: string;
      question?: string;
    };

    if (!question || !question.trim()) {
      return res.status(400).json({ error: '先输入你想问的问题。' });
    }

    const prompt = `你是耐心细致的韩语语法老师，正在辅导中国学习者。
当前语法点: "${pattern || ''}" (${level || ''})
语法要点: "${summary || ''}"
学生的问题: "${question.trim()}"

要求：用简体中文回答，直接解决问题，不要客套。
- answerZh：核心解释，控制在 120 字以内，说清"怎么用、什么时候用"
- examples：2-3 个生活化韩语例句，配中文意思
- tips：1-3 条记忆技巧或易错提醒

请严格输出合法 JSON 对象：
{"answerZh":"...","examples":[{"korean":"...","chinese":"..."}],"tips":["..."]}`;

    const parsed = await callDeepSeekJson({
      messages: [
        {
          role: 'system',
          content: '你是专业的韩语语法教师，请只输出严格符合要求的 JSON 对象。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      maxTokens: 900,
      fallbackError: '语法答疑返回为空',
      normalize: normalizeGrammarAsk,
    });

    return res.json(parsed);
  } catch (err) {
    return sendApiError(res, err, '语法答疑失败');
  }
});

// 5. YouTube / Video Real-time Korean Sentence Linguistic Parser via DeepSeek
app.post('/api/video/parse', async (req: Request, res: Response) => {
  try {
    const { sentence, videoTitle, contextLine } = req.body as {
      sentence?: string;
      videoTitle?: string;
      contextLine?: string;
    };

    if (!sentence || !sentence.trim()) {
      return res.status(400).json({ error: '请输入或选择一句韩语视频台词进行解析。' });
    }

    const cleanSentence = sentence.trim();
    const prompt = `你是专为中文学习者设计的 YouTube 韩语视频实时伴学解析引擎（风格参考 Memrise 忆术家的词汇助记 + 专业形态素语法拆解）。
视频背景: "${(videoTitle || '韩语日常视频').trim()}"
上下文参考: "${(contextLine || '').trim()}"
待解析韩语句子: "${cleanSentence}"

请全面拆解这句韩语，所有解释使用简体中文，并严格输出合法 JSON 对象：
{
  "sentence": "${cleanSentence}",
  "naturalTranslation": "流畅自然的中文意译",
  "literalTranslation": "按韩语语序逐块直译，帮助理解结构",
  "speechLevel": "敬语等级说明（如 해요체 非格式体敬语 / 반말 平语 / 합쇼체 格式体敬语）",
  "spokenPronunciation": "[发生连音/紧音/鼻音等音变后的实际口语发音]",
  "romanization": "罗马音辅助读音",
  "culturalNuance": "口语缩略、语气词或韩国日常文化小贴士",
  "tokens": [
    {
      "surface": "句中原文词形",
      "lemma": "词典原形（动词形容词还原为 -다 形式）",
      "pos": "词性（动词/形容词/名词/副词/助词）",
      "meaningZh": "中文释义",
      "memriseTip": "忆术家风格的谐音/汉字词源/画面联想记忆法",
      "nuance": "语感或搭配提醒",
      "isKeyVocab": true,
      "exampleKr": "简短日常韩语例句",
      "exampleZh": "例句中文翻译"
    }
  ],
  "grammarPoints": [
    {
      "pattern": "句中核心语法或词尾如 -(으)ㄴ/는데",
      "meaningZh": "中文功能或含义",
      "usageNote": "接续规则与语境说明",
      "exampleKr": "语法例句",
      "exampleZh": "例句中文翻译"
    }
  ]
}`;

    const parsed = await callDeepSeekJson({
      messages: [
        {
          role: 'system',
          content: '你是韩语视频台词形态素与 Memrise 词汇助记解析引擎，请只输出严格符合要求的 JSON 对象。',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      fallbackError: '台词解析返回为空',
      normalize: (raw) => normalizeParsedSentenceResponse(raw, cleanSentence),
    });
    return res.json(parsed);
  } catch (err) {
    return sendApiError(res, err, '视频韩语台词解析失败');
  }
});

// 6. Video Audio Parse Notice (DeepSeek text model does not decode audio blobs directly)
app.post('/api/video/audio-parse', (_req: Request, res: Response) => {
  return res.status(400).json({
    error:
      'DeepSeek 文本接口暂不支持直接解码外放录音音频。请使用“导入字幕（支持 .srt/.vtt 文件上传与 YouTube 转写复制）”，或在 Chrome 中点击“语音收音解析”直接转写韩语句子。',
    code: 'VIDEO_AUDIO_UNSUPPORTED',
  });
});

// 7. YouTube metadata lookup via oEmbed (server-side, strict videoId check)
app.post('/api/video/oembed', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.body as { videoId?: string };
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return res.status(400).json({ error: '无效的 YouTube 视频 ID。' });
    }
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const r = await fetch(oembedUrl, { signal: AbortSignal.timeout(4500) });
    if (!r.ok) {
      return res.json({ videoId, title: `YouTube 视频 (${videoId})`, author: 'YouTube 频道' });
    }
    const data = (await r.json()) as { title?: string; author_name?: string };
    return res.json({
      videoId,
      title: data.title || `YouTube 视频 (${videoId})`,
      author: data.author_name || 'YouTube 频道',
    });
  } catch {
    return res.json({
      videoId: req.body?.videoId || '',
      title: '外部 YouTube 视频',
      author: 'YouTube 频道',
    });
  }
});

// 7b. YouTube Korean Caption Track Auto-Fetch (server-side, strict videoId & host validation)
app.post('/api/video/youtube-captions', async (req: Request, res: Response) => {
  const { videoId } = req.body as { videoId?: string };
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: '无效的 YouTube 视频 ID。' });
  }
  const result = await fetchYouTubeKoreanCaptions(videoId);
  return res.json(result);
});

function buildBeginnerTutorInstruction(topic: string): string {
  return `你是「한결 선생님（韩洁老师）」，一位温柔、耐心、亲切的韩国首尔母语老师，专门面向【中国韩语初学者】进行一对一实时语音对话陪练。

本次电话练习主题：${topic}

你必须严格遵守以下教学陪练节奏：
1. 开场：接通后先用自然亲切的简体中文向学生问好，简短介绍今天主题，然后教学生第 1 句简短、地道、最实用的日常韩语。
2. 领读引导：每次只教 1 句核心韩语（用完整韩文写出，如 안녕하세요, 만나서 반가워요.），并用中文提醒学生注意连音/收音要点，邀请学生跟读或回答。
3. 实时纠音与鼓励：学生开口或发来句子后，先真诚表扬鼓励，再用通俗中文指出发音/语序/助词细节。
4. 必讲单词与语法拆解：每教或练完一句，务必简明扼要用中文点出【核心韩语词义】和【基础语法/词尾（如 은/는, 이/가, -아/어요, 주세요）】。
5. 每次回复控制精炼（120~220字），适合电话语音对话听读节奏，不要长篇大论。`;
}

// Guarantee /api/* routes always return JSON (never fall through to HTML SPA or HTML error pages)
app.use('/api', (_req: Request, res: Response) => {
  return res.status(404).json({
    error: '请求的后端接口不存在，请刷新页面后重试。',
    code: 'API_NOT_FOUND',
  });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    return sendApiError(res, err, '接口请求格式或处理异常');
  }
  return next(err);
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/api/live-tutor' });

  wss.on('connection', async (clientWs: WebSocket, req) => {
    const reqUrl = new URL(req.url || '/api/live-tutor', `http://${req.headers.host || 'localhost'}`);
    const topic = reqUrl.searchParams.get('topic') || '零基础日常寒暄';
    const slowSpeech = reqUrl.searchParams.get('slow') === 'true';

    let isClosed = false;
    let errorSent = false;

    const sendSafe = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(JSON.stringify(payload));
        } catch {
          // Ignore send failure on closing socket
        }
      }
    };

    const sendErrorAndClose = (err: unknown, fallbackMessage: string) => {
      if (!errorSent) {
        errorSent = true;
        const friendly = formatFriendlyDeepSeekError(err, fallbackMessage);
        sendSafe({ error: friendly.error, code: friendly.code });
      }
      if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
        setTimeout(() => {
          try {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.close(1011, 'DeepSeek Tutor error');
            }
          } catch {
            // Ignore close error
          }
        }, 60);
      }
    };

    clientWs.on('error', () => {
      isClosed = true;
    });

    if (!hasConfiguredDeepSeekKey()) {
      sendErrorAndClose(
        new Error('DEEPSEEK_API_KEY_MISSING'),
        '接通 DeepSeek 实时陪练失败'
      );
      return;
    }

    const conversationHistory: DeepSeekChatMessage[] = [
      { role: 'system', content: buildBeginnerTutorInstruction(topic) },
    ];

    let turnQueue: Promise<void> = Promise.resolve();

    const processUserTurn = (userText: string) => {
      turnQueue = turnQueue.then(async () => {
        if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

        try {
          sendSafe({ tutorThinking: true });
          const cleanTurn = userText.trim().slice(0, 1200);
          conversationHistory.push({ role: 'user', content: cleanTurn });

          // Keep history compact (system + last 16 messages)
          const windowedMessages: DeepSeekChatMessage[] = [
            conversationHistory[0],
            ...conversationHistory.slice(1).slice(-16),
          ];

          const replyText = await callDeepSeekChat({
            messages: windowedMessages,
            temperature: 0.65,
            maxTokens: 900,
            jsonMode: false,
            timeoutMs: 40000,
          });

          if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

          conversationHistory.push({ role: 'assistant', content: replyText });
          sendSafe({ tutorThinking: false, outputTranscript: replyText });

          // Synthesize native Korean pronunciation audio for Korean demonstration sentences in the reply
          const koreanSegments = extractKoreanSegmentsForTts(replyText).slice(0, 3);
          const wantSlow = slowSpeech || cleanTurn.includes('慢');
          for (const seg of koreanSegments) {
            if (isClosed || clientWs.readyState !== WebSocket.OPEN) break;
            try {
              const cacheKey = `${seg}::${wantSlow ? 'slow' : 'normal'}`;
              let audioEntry = ttsMemoryCache.get(cacheKey);
              if (!audioEntry) {
                audioEntry = await synthesizeStandardKoreanMp3(seg, wantSlow);
                storeTtsCache(cacheKey, audioEntry);
              }
              sendSafe({
                audio: audioEntry.audioBase64,
                audioMimeType: audioEntry.mimeType,
                spokenSentence: seg,
              });
            } catch {
              // Non-fatal: transcript already delivered cleanly
            }
          }
        } catch (err) {
          sendSafe({ tutorThinking: false });
          sendErrorAndClose(err, 'DeepSeek 实时陪练对话异常');
        }
      });
    };

    // Signal ready immediately and kick off teacher's opening greeting turn
    sendSafe({ type: 'ready', provider: 'deepseek' });
    processUserTurn(
      `电话已接通！请你作为中国韩语初学者的老师，热情用中文打招呼，先教我今天主题「${topic}」的第 1 句实用韩语并引导我跟读。`
    );

    clientWs.on('message', (raw) => {
      if (isClosed) return;
      try {
        const parsed = JSON.parse(raw.toString()) as { text?: string };
        if (parsed.text && parsed.text.trim()) {
          processUserTurn(parsed.text.trim());
        }
      } catch {
        // Ignore malformed client frame
      }
    });

    clientWs.on('close', () => {
      isClosed = true;
    });
  });

  httpServer.listen(PORT, HOST, () => {
    console.log(`HanGyeol server running on http://${HOST}:${PORT}`);
  });
}

startServer();
