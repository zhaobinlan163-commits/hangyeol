import test from 'node:test';
import assert from 'node:assert/strict';
import {
  base64ToFloat32Pcm,
  extractKoreanSegments,
  float32ToInt16Pcm,
  int16ToBase64,
} from './pcm';

test('float32ToInt16Pcm clamps out-of-range values and preserves sign', () => {
  const input = new Float32Array([-1.5, -1, 0, 0.5, 1.5]);
  const int16 = float32ToInt16Pcm(input);
  assert.equal(int16[0], -32768);
  assert.equal(int16[1], -32768);
  assert.equal(int16[2], 0);
  assert.ok(Math.abs(int16[3] - 16384) <= 1);
  assert.equal(int16[4], 32767);
});

test('PCM base64 round-trip recovers float32 samples accurately', () => {
  const original = new Float32Array([-0.75, -0.25, 0, 0.25, 0.75]);
  const b64 = int16ToBase64(float32ToInt16Pcm(original));
  const decoded = base64ToFloat32Pcm(b64);
  assert.equal(decoded.length, original.length);
  for (let i = 0; i < original.length; i++) {
    assert.ok(Math.abs(decoded[i] - original[i]) < 0.001);
  }
});

test('extractKoreanSegments extracts unique Korean phrases from bilingual tutor text', () => {
  const msg =
    '请跟我读：안녕하세요, 만나서 반가워요! 这里 안녕하세요 是“你好”，반가워요 是“很高兴见到你”。';
  const segments = extractKoreanSegments(msg);
  assert.deepEqual(segments, [
    '안녕하세요, 만나서 반가워요!',
    '안녕하세요',
    '반가워요',
  ]);
});
