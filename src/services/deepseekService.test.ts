import test from 'node:test';
import assert from 'node:assert/strict';
import {
  callDeepSeekJson,
  DeepSeekHttpError,
  formatFriendlyDeepSeekError,
  normalizeChatReplyResponse,
  normalizeGrammarEvaluationResponse,
  normalizeParsedSentenceResponse,
  normalizePronunciationReportResponse,
} from './deepseekService.ts';
import {
  extractYouTubeCaptionTracksFromHtml,
  isAllowedYouTubeCaptionUrl,
  parseYouTubeJson3Events,
  pickPreferredKoreanTrack,
} from './youtubeCaptions.ts';

test('callDeepSeekJson retries on transient 503/429 and malformed JSON then succeeds with normalized data', async () => {
  const prevKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = 'sk-test-valid-mock-key';

  let callCount = 0;
  const mockFetch = (async () => {
    callCount += 1;
    if (callCount === 1) {
      return new Response(JSON.stringify({ error: { message: 'busy' } }), {
        status: 503,
      });
    }
    if (callCount === 2) {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'not valid json {' } }],
        }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                '```json\n{"isNatural":"true","score":92,"correctedSentence":"오늘 날씨가 정말 좋네요.","explanation":"자연스럽습니다."}\n```',
            },
          },
        ],
      }),
      { status: 200 }
    );
  }) as unknown as typeof fetch;

  try {
    const result = await callDeepSeekJson({
      messages: [{ role: 'user', content: 'evaluate' }],
      fallbackError: '批改失败',
      maxAttempts: 3,
      fetchImpl: mockFetch,
      normalize: normalizeGrammarEvaluationResponse,
    });
    assert.equal(callCount, 3);
    assert.equal(result.isNatural, true);
    assert.equal(result.score, 92);
    assert.equal(result.correctedSentence, '오늘 날씨가 정말 좋네요.');
    assert.deepEqual(result.errors, []);
  } finally {
    process.env.DEEPSEEK_API_KEY = prevKey;
  }
});

test('callDeepSeekJson fails immediately without retry on 401/402 auth/balance errors', async () => {
  const prevKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = 'sk-test-invalid';

  let callCount = 0;
  const mockFetch = (async () => {
    callCount += 1;
    return new Response(JSON.stringify({ error: { message: 'Insufficient Balance' } }), {
      status: 402,
    });
  }) as unknown as typeof fetch;

  try {
    await assert.rejects(
      () =>
        callDeepSeekJson({
          messages: [{ role: 'user', content: 'hello' }],
          fallbackError: '失败',
          maxAttempts: 3,
          fetchImpl: mockFetch,
        }),
      (err: unknown) => {
        assert.ok(err instanceof DeepSeekHttpError);
        assert.equal(err.status, 402);
        assert.equal(err.code, 'INSUFFICIENT_BALANCE');
        return true;
      }
    );
    assert.equal(callCount, 1);
  } finally {
    process.env.DEEPSEEK_API_KEY = prevKey;
  }
});

test('formatFriendlyDeepSeekError maps missing key, 401, 402, and 429 cleanly in Chinese', () => {
  const missing = formatFriendlyDeepSeekError(new Error('DEEPSEEK_API_KEY_MISSING'), '操作失败');
  assert.equal(missing.status, 503);
  assert.match(missing.error, /DEEPSEEK_API_KEY/);

  const unauth = formatFriendlyDeepSeekError(new Error('HTTP 401 Unauthorized'), '操作失败');
  assert.equal(unauth.status, 401);
  assert.match(unauth.error, /401/);

  const balance = formatFriendlyDeepSeekError(new Error('402 Insufficient Balance'), '操作失败');
  assert.equal(balance.status, 402);
  assert.match(balance.error, /余额不足/);
});

test('DeepSeek normalizers clamp scores, cast booleans, and fill safe arrays', () => {
  const chat = normalizeChatReplyResponse({
    replyZh: '可以这样说',
    koreanSentences: [{ korean: '아이스 아메리카노 주세요.' }],
    keyVocab: [{ word: '주세요' }],
  });
  assert.equal(chat.koreanSentences.length, 1);
  assert.equal(chat.keyVocab[0].lemma, '주세요');
  assert.equal(chat.grammarNote.pattern, '');

  const pron = normalizePronunciationReportResponse(
    {
      accuracyScore: 140,
      overallSummary: '连音清晰',
      syllableFeedback: [{ segment: '한 잔', status: 'accurate', tip: '不错' }],
    },
    '한 잔 주세요'
  );
  assert.equal(pron.accuracyScore, 100);
  assert.equal(pron.heardKorean, '한 잔 주세요');

  const parsed = normalizeParsedSentenceResponse(
    {
      naturalTranslation: '这杯咖啡真好喝',
      tokens: [{ surface: '커피', isKeyVocab: 'false' }],
    },
    '이 커피 진짜 맛있어요'
  );
  assert.equal(parsed.sentence, '이 커피 진짜 맛있어요');
  assert.equal(parsed.tokens[0].isKeyVocab, false);
});

test('YouTube caption helpers extract Korean tracks, validate hosts, and parse JSON3 events', () => {
  const sampleHtml = `var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"https://www.youtube.com/api/timedtext?v=abc12345678&lang=en","vssId":".en","languageCode":"en"},{"baseUrl":"https://www.youtube.com/api/timedtext?v=abc12345678&lang=ko","vssId":".ko","languageCode":"ko","name":{"simpleText":"韩语"}}]}}};`;
  const tracks = extractYouTubeCaptionTracksFromHtml(sampleHtml);
  assert.equal(tracks.length, 2);
  const preferred = pickPreferredKoreanTrack(tracks);
  assert.equal(preferred?.languageCode, 'ko');
  assert.equal(isAllowedYouTubeCaptionUrl(preferred?.baseUrl || ''), true);
  assert.equal(isAllowedYouTubeCaptionUrl('http://127.0.0.1/secret'), false);

  const cues = parseYouTubeJson3Events({
    events: [
      { tStartMs: 2000, dDurationMs: 3000, segs: [{ utf8: '안녕하세요!' }] },
      { tStartMs: 2500, dDurationMs: 1000, segs: [{ utf8: '안녕하세요!' }] },
      { tStartMs: 6000, dDurationMs: 2500, segs: [{ utf8: '성수동에 왔어요.' }] },
    ],
  });
  assert.equal(cues.length, 2);
  assert.equal(cues[0].startSec, 2);
  assert.equal(cues[1].korean, '성수동에 왔어요.');
});
