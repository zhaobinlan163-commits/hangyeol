import test from 'node:test';
import assert from 'node:assert/strict';
import {
  containsHangul,
  extractYouTubeId,
  formatSeconds,
  normalizeKoreanInput,
  parseTranscriptText,
} from './korean';

test('extractYouTubeId parses standard watch, short, shorts, embed, and raw IDs', () => {
  assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('https://youtu.be/abcDEF12345?t=30'), 'abcDEF12345');
  assert.equal(extractYouTubeId('https://youtube.com/shorts/ZyX98765432'), 'ZyX98765432');
  assert.equal(extractYouTubeId('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('https://example.com/not-youtube'), null);
  assert.equal(extractYouTubeId(''), null);
});

test('parseTranscriptText handles SRT format, timestamped lines, and plain Korean lines', () => {
  const srt = `1
00:00:02,000 --> 00:00:05,500
여기 아메리카노 한 잔 주세요.
请给我一杯美式咖啡。

2
00:00:06,000 --> 00:00:09,000
얼음 적게 넣어 주세요.
请少放一点冰。`;

  const srtCues = parseTranscriptText(srt);
  assert.equal(srtCues.length, 2);
  assert.equal(srtCues[0].startSec, 2);
  assert.equal(srtCues[0].korean, '여기 아메리카노 한 잔 주세요.');
  assert.equal(srtCues[0].chinese, '请给我一杯美式咖啡。');

  const stamped = parseTranscriptText('[00:15] 진짜 오랜만이에요!\n[01:02] 요즘 어떻게 지내요?');
  assert.equal(stamped.length, 2);
  assert.equal(stamped[0].startSec, 15);
  assert.equal(stamped[1].startSec, 62);
  assert.equal(stamped[1].korean, '요즘 어떻게 지내요?');

  const plain = parseTranscriptText('오늘 날씨 진짜 좋다\n같이 밥 먹을래요?');
  assert.equal(plain.length, 2);
  assert.equal(plain[1].korean, '같이 밥 먹을래요?');

  const webvtt = `WEBVTT
Kind: captions
Language: ko

00:00:01.000 --> 00:00:04.500 align:start position:0%
<c>여기</c> <00:00:02.000><c>진짜</c> 맛있어요!

00:00:05.000 --> 00:00:08.000
다음에 또 올래요.`;
  const vttCues = parseTranscriptText(webvtt);
  assert.equal(vttCues.length, 2);
  assert.equal(vttCues[0].startSec, 1);
  assert.equal(vttCues[0].korean, '여기 진짜 맛있어요!');
  assert.equal(vttCues[1].korean, '다음에 또 올래요.');

  const ytTranscript = `0:04\n안녕하세요 여러분!\n0:12\n오늘은 카페에 왔어요.`;
  const ytCues = parseTranscriptText(ytTranscript);
  assert.equal(ytCues.length, 2);
  assert.equal(ytCues[0].startSec, 4);
  assert.equal(ytCues[1].startSec, 12);
  assert.equal(ytCues[1].korean, '오늘은 카페에 왔어요.');
});

test('formatSeconds formats mm:ss cleanly', () => {
  assert.equal(formatSeconds(0), '00:00');
  assert.equal(formatSeconds(65), '01:05');
  assert.equal(formatSeconds(-4), '00:00');
});

test('containsHangul and normalizeKoreanInput handle Korean and punctuation', () => {
  assert.equal(containsHangul('안녕하세요!'), true);
  assert.equal(containsHangul('hello 123'), false);
  assert.equal(normalizeKoreanInput('  같이   먹어요!  '), '같이 먹어요');
});
