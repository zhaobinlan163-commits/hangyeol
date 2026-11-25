import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExpressionCoachResponse, parseGeminiJson } from './jsonParse';
import { parseFetchJsonResponse } from './api';
import { downsampleTo16kHz } from './pcm';

test('parseGeminiJson parses clean JSON and markdown-fenced JSON without Unexpected token', () => {
  const fenced = '```json\n{"situationSummary":"首尔咖啡店常用礼貌语","expressions":[{"korean":"아이스 아메리카노 한 잔 주세요."}]}\n```';
  const parsed = parseGeminiJson<{ situationSummary: string; expressions: Array<{ korean: string }> }>(
    fenced,
    '解析失败'
  );
  assert.equal(parsed.situationSummary, '首尔咖啡店常用礼貌语');
  assert.equal(parsed.expressions[0].korean, '아이스 아메리카노 한 잔 주세요.');
});

test('parseGeminiJson extracts balanced JSON surrounded by prose and repairs trailing commas and literal newlines', () => {
  const messy = `好的，以下是结构化结果：
  {
    "situationSummary": "对店员用 해요체 最自然，
语气柔和。",
    "expressions": [
      { "korean": "얼음 적게 넣어 주세요.", },
    ],
  }
  希望有帮助！`;

  const parsed = parseGeminiJson<{ situationSummary: string; expressions: Array<{ korean: string }> }>(
    messy,
    '解析失败'
  );
  assert.match(parsed.situationSummary, /对店员用 해요체/);
  assert.equal(parsed.expressions.length, 1);
  assert.equal(parsed.expressions[0].korean, '얼음 적게 넣어 주세요.');
});

test('normalizeExpressionCoachResponse fills safe defaults and rejects empty expressions', () => {
  const normalized = normalizeExpressionCoachResponse({
    situationSummary: '咖啡点单礼仪',
    textbookExample: { korean: '얼음을 조금만 주세요' },
    expressions: [
      {
        korean: '얼음 좀 적게 넣어 주세요.',
        chinese: '冰请帮我少放一点。',
      },
    ],
  });
  assert.equal(normalized.expressions.length, 1);
  assert.equal(normalized.expressions[0].speechLevel, '해요체');
  assert.equal(normalized.textbookExample.korean, '얼음을 조금만 주세요');
  assert.ok(normalized.textbookExample.whyStiff.length > 0);

  assert.throws(
    () => normalizeExpressionCoachResponse({ situationSummary: 'empty', expressions: [] }),
    /地道表达建议返回不完整/
  );
});

test('parseFetchJsonResponse converts HTML 502/404 responses into clean Chinese errors instead of Unexpected token', async () => {
  await assert.rejects(
    () =>
      parseFetchJsonResponse(
        {
          ok: false,
          status: 502,
          text: async () => '<!DOCTYPE html><html><body>502 Bad Gateway</body></html>',
        },
        '获取地道表达失败'
      ),
    (err: Error) => {
      assert.doesNotMatch(err.message, /Unexpected token/i);
      assert.match(err.message, /获取地道表达失败/);
      assert.match(err.message, /502/);
      return true;
    }
  );

  await assert.rejects(
    () =>
      parseFetchJsonResponse(
        {
          ok: true,
          status: 200,
          text: async () => '<!DOCTYPE html><html><head><title>App</title></head></html>',
        },
        '获取地道表达失败'
      ),
    (err: Error) => {
      assert.doesNotMatch(err.message, /Unexpected token/i);
      assert.match(err.message, /异常页面/);
      return true;
    }
  );
});

test('parseFetchJsonResponse surfaces server JSON error message on non-2xx responses', async () => {
  await assert.rejects(
    () =>
      parseFetchJsonResponse(
        {
          ok: false,
          status: 403,
          text: async () => JSON.stringify({ error: '当前项目的 Gemini API 免费层未开通（403）' }),
        },
        '获取地道表达失败'
      ),
    /免费层未开通/
  );
});

test('downsampleTo16kHz preserves 16kHz input and accurately downsamples 48kHz to 16kHz', () => {
  const pcm16k = new Float32Array([0.1, -0.2, 0.3, -0.4]);
  assert.strictEqual(downsampleTo16kHz(pcm16k, 16000), pcm16k);

  // 48kHz -> 16kHz (3:1 ratio), constant signal of 0.5 stays 0.5 with 1/3 sample count
  const pcm48k = new Float32Array(480).fill(0.5);
  const resampled = downsampleTo16kHz(pcm48k, 48000);
  assert.equal(resampled.length, 160);
  assert.ok(Math.abs(resampled[0] - 0.5) < 1e-6);
  assert.ok(Math.abs(resampled[159] - 0.5) < 1e-6);
});
